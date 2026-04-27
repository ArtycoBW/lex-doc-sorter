import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileStatus, JobStatus, Prisma } from '@prisma/client';
import archiver = require('archiver');
import { PDFDocument } from 'pdf-lib';
import sharp = require('sharp');
import { Response } from 'express';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const IMAGE_QUALITY_STEPS = [85, 75, 65, 55, 45];
const IMAGE_WIDTH_STEPS = [2480, 2000, 1600, 1200, 900];

type JobWithFiles = Prisma.SortingJobGetPayload<{
  include: { files: { orderBy: { orderIndex: 'asc' } } };
}>;

type ProcessResult = {
  outputBuffer: Buffer;
  pageCount: number;
};

@Injectable()
export class BasicProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async processJob(userId: string, jobId: string) {
    const job = await this.getOwnedJob(userId, jobId);

    if (job.files.length === 0) {
      throw new BadRequestException('Загрузите файлы перед обработкой');
    }

    if (job.status === JobStatus.PROCESSING) {
      throw new BadRequestException('Задание уже обрабатывается');
    }

    await this.prisma.sortingJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PROCESSING,
        processedFiles: 0,
        errorMessage: null,
      },
    });

    await this.prisma.processedFile.updateMany({
      where: { jobId: job.id },
      data: {
        status: FileStatus.PROCESSING,
        errorMessage: null,
      },
    });

    let completedCount = 0;

    for (const file of job.files) {
      try {
        const outputName = this.buildOutputFileName(
          file.processedName || file.originalName,
          file.orderIndex,
        );
        const outputKey = `output/${userId}/${job.id}/${outputName}`;
        const originalBuffer = await this.storage.download(file.originalPath);
        const result = await this.processFile(originalBuffer, file.originalName);
        const storedOutputKey = await this.storage.upload(
          outputKey,
          result.outputBuffer,
          'application/pdf',
        );

        await this.prisma.processedFile.update({
          where: { id: file.id },
          data: {
            status: FileStatus.COMPLETED,
            processedName: outputName,
            processedPath: storedOutputKey,
            outputPdfPath: storedOutputKey,
            pageCount: result.pageCount,
            errorMessage: null,
          },
        });

        completedCount += 1;

        await this.prisma.sortingJob.update({
          where: { id: job.id },
          data: { processedFiles: completedCount },
        });
      } catch (error) {
        await this.prisma.processedFile.update({
          where: { id: file.id },
          data: {
            status: FileStatus.FAILED,
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Не удалось обработать файл',
          },
        });
      }
    }

    const finalStatus =
      completedCount === job.files.length ? JobStatus.COMPLETED : JobStatus.FAILED;

    const updatedJob = await this.prisma.sortingJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        processedFiles: completedCount,
        errorMessage:
          finalStatus === JobStatus.FAILED
            ? 'Часть файлов не удалось обработать'
            : null,
      },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    return this.serializeJob(updatedJob);
  }

  async streamJobArchive(userId: string, jobId: string, response: Response) {
    const job = await this.getOwnedJob(userId, jobId);
    const files = job.files.filter((file) => Boolean(file.outputPdfPath));

    if (files.length === 0) {
      throw new BadRequestException('Сначала обработайте файлы');
    }

    const archiveName = this.buildArchiveName(job.id);

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${archiveName}"`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(response);

    for (const file of files) {
      const outputPath = file.outputPdfPath;
      if (!outputPath) {
        continue;
      }

      const buffer = await this.storage.download(outputPath);
      archive.append(buffer, {
        name: this.buildOutputFileName(
          file.processedName || file.originalName,
          file.orderIndex,
        ),
      });
    }

    await archive.finalize();
  }

  private async getOwnedJob(userId: string, jobId: string) {
    const job = await this.prisma.sortingJob.findFirst({
      where: { id: jobId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      throw new NotFoundException('Задание не найдено');
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому заданию');
    }

    return job;
  }

  private async processFile(
    originalBuffer: Buffer,
    originalName: string,
  ): Promise<ProcessResult> {
    const extension = path.extname(originalName).toLowerCase();

    if (extension === '.pdf') {
      return this.normalizePdf(originalBuffer);
    }

    return this.imageToPdf(originalBuffer);
  }

  private async normalizePdf(buffer: Buffer): Promise<ProcessResult> {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const outputBuffer = Buffer.from(
      await pdf.save({ useObjectStreams: true }),
    );

    return {
      outputBuffer,
      pageCount: pdf.getPageCount(),
    };
  }

  private async imageToPdf(buffer: Buffer): Promise<ProcessResult> {
    let bestResult: Buffer | null = null;

    for (const width of IMAGE_WIDTH_STEPS) {
      for (const quality of IMAGE_QUALITY_STEPS) {
        const imageBuffer = await sharp(buffer, { failOn: 'none' })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        const pdfBuffer = await this.createSinglePagePdf(imageBuffer);

        bestResult = pdfBuffer;

        if (pdfBuffer.byteLength <= MAX_OUTPUT_BYTES) {
          return {
            outputBuffer: pdfBuffer,
            pageCount: 1,
          };
        }
      }
    }

    if (!bestResult) {
      throw new BadRequestException('Не удалось подготовить изображение');
    }

    if (bestResult.byteLength > MAX_OUTPUT_BYTES) {
      throw new BadRequestException(
        'Не удалось сжать файл до лимита 10 МБ',
      );
    }

    return {
      outputBuffer: bestResult,
      pageCount: 1,
    };
  }

  private async createSinglePagePdf(imageBuffer: Buffer) {
    const pdf = await PDFDocument.create();
    const image = await pdf.embedJpg(imageBuffer);
    const page = pdf.addPage([image.width, image.height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    return Buffer.from(await pdf.save({ useObjectStreams: true }));
  }

  private buildOutputFileName(name: string, orderIndex: number) {
    const fallback = `document_${String(orderIndex + 1).padStart(3, '0')}`;
    const extension = path.extname(name).toLowerCase();
    const rawBase =
      extension === '.pdf' ? path.basename(name, extension) : path.basename(name);
    const base = this.sanitizeFileName(rawBase) || fallback;
    const prefixed = /^\d{3}[_-]/.test(base)
      ? base
      : `${String(orderIndex + 1).padStart(3, '0')}_${base}`;

    return `${prefixed}.pdf`;
  }

  private buildArchiveName(jobId: string) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `lexdoc_${stamp}_${jobId.slice(0, 8)}.zip`;
  }

  private sanitizeFileName(name: string) {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
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
