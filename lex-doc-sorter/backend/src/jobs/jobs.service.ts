import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, rename, rm } from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

const MAX_PAGE_SIZE = 50;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

type JobWithFiles = Prisma.SortingJobGetPayload<{
  include: { files: { orderBy: { orderIndex: 'asc' } } };
}>;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createJob(userId: string) {
    const job = await this.prisma.sortingJob.create({
      data: { userId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    return this.serializeJob(job);
  }

  async listJobs(userId: string, pageInput?: string, limitInput?: string) {
    const page = this.parsePositiveInt(pageInput, 1);
    const limit = Math.min(
      this.parsePositiveInt(limitInput, 10),
      MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * limit;

    const [total, jobs] = await this.prisma.$transaction([
      this.prisma.sortingJob.count({ where: { userId } }),
      this.prisma.sortingJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { files: { orderBy: { orderIndex: 'asc' } } },
      }),
    ]);

    return {
      items: jobs.map((job) => this.serializeJob(job)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getJob(userId: string, jobId: string) {
    const job = await this.prisma.sortingJob.findFirst({
      where: { id: jobId, userId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      throw new NotFoundException('Задание не найдено');
    }

    return this.serializeJob(job);
  }

  async uploadFiles(
    userId: string,
    jobId: string,
    files: Express.Multer.File[] = [],
  ) {
    if (!files.length) {
      throw new BadRequestException('Выберите хотя бы один файл');
    }

    const job = await this.prisma.sortingJob.findFirst({
      where: { id: jobId, userId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      await this.removeUploadedTempFiles(files);
      throw new NotFoundException('Задание не найдено');
    }

    const unsupportedFile = files.find(
      (file) => !ALLOWED_MIME_TYPES.has(file.mimetype),
    );

    if (unsupportedFile) {
      await this.removeUploadedTempFiles(files);
      throw new BadRequestException(
        `Формат файла ${unsupportedFile.originalname} не поддерживается`,
      );
    }

    await this.prisma.sortingJob.update({
      where: { id: job.id },
      data: { status: JobStatus.UPLOADING, errorMessage: null },
    });

    const storageRoot = this.getStorageRoot();
    const originalsDir = path.join(storageRoot, userId, job.id, 'originals');
    await mkdir(originalsDir, { recursive: true });

    const existingCount = job.files.length;
    const createdFileData: Prisma.ProcessedFileCreateManyInput[] = [];
    const movedPaths: string[] = [];

    try {
      for (const [index, file] of files.entries()) {
        const orderIndex = existingCount + index;
        const originalName = this.normalizeOriginalName(file.originalname);
        const storedName = this.buildStoredFileName(orderIndex, originalName);
        const targetPath = path.join(originalsDir, storedName);

        await rename(file.path, targetPath);
        movedPaths.push(targetPath);

        createdFileData.push({
          jobId: job.id,
          originalName,
          originalPath: this.toStoredPath(targetPath),
          sizeBytes: file.size,
          pageCount: 1,
          orderIndex,
        });
      }

      await this.prisma.$transaction([
        this.prisma.processedFile.createMany({ data: createdFileData }),
        this.prisma.sortingJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.PENDING,
            totalFiles: { increment: createdFileData.length },
            errorMessage: null,
          },
        }),
      ]);

      return this.getJob(userId, job.id);
    } catch (error) {
      await Promise.allSettled([
        this.removeUploadedTempFiles(files),
        ...movedPaths.map((filePath) => rm(filePath, { force: true })),
      ]);

      await this.prisma.sortingJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Не удалось сохранить файлы',
        },
      });

      throw error;
    }
  }

  async updateFileName(
    userId: string,
    jobId: string,
    fileId: string,
    processedName: string,
  ) {
    await this.ensureJobOwner(userId, jobId);

    const file = await this.prisma.processedFile.findFirst({
      where: { id: fileId, jobId },
    });

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    const updatedFile = await this.prisma.processedFile.update({
      where: { id: file.id },
      data: { processedName: this.normalizeManualName(processedName) },
    });

    return updatedFile;
  }

  async deleteJob(userId: string, jobId: string) {
    await this.ensureJobOwner(userId, jobId);

    await this.prisma.sortingJob.delete({ where: { id: jobId } });

    const jobDir = path.join(this.getStorageRoot(), userId, jobId);
    await rm(jobDir, { recursive: true, force: true });

    return { message: 'Задание удалено' };
  }

  private async ensureJobOwner(userId: string, jobId: string) {
    const job = await this.prisma.sortingJob.findFirst({
      where: { id: jobId },
      select: { id: true, userId: true },
    });

    if (!job) {
      throw new NotFoundException('Задание не найдено');
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому заданию');
    }
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private getStorageRoot() {
    return path.resolve(
      process.cwd(),
      this.config.get<string>('STORAGE_PATH') || './uploads',
    );
  }

  private normalizeOriginalName(name: string) {
    const fallback = 'document';
    const baseName = path.basename(name || fallback);
    const sanitized = baseName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();

    return sanitized || fallback;
  }

  private normalizeManualName(name: string) {
    const sanitized = name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sanitized) {
      throw new BadRequestException('Имя файла не может быть пустым');
    }

    return sanitized;
  }

  private buildStoredFileName(orderIndex: number, originalName: string) {
    const number = String(orderIndex + 1).padStart(3, '0');
    const extension = path.extname(originalName);
    const nameWithoutExtension =
      path.basename(originalName, extension).slice(0, 80) || 'document';

    return `${number}_${randomUUID()}_${nameWithoutExtension}${extension}`;
  }

  private toStoredPath(filePath: string) {
    return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  }

  private async removeUploadedTempFiles(files: Express.Multer.File[]) {
    await Promise.allSettled(
      files
        .filter((file) => Boolean(file.path))
        .map((file) => rm(file.path, { force: true })),
    );
  }

  private serializeJob(job: JobWithFiles) {
    return {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      files: job.files.map((file) => ({
        ...file,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      })),
    };
  }
}
