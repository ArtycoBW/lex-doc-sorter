import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileStatus, JobStatus, Prisma } from '@prisma/client';
import archiver = require('archiver');
import { Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentDetectionService } from './document-detection.service';
import { decodePossiblyMojibakeFileName } from './file-name.util';
import { ImagePreprocessingService } from './image-preprocessing.service';
import { OcrService } from './ocr.service';
import { PdfBuilderService } from './pdf-builder.service';
import type { ImageProcessorJob } from './processing-queue.service';

const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const IMAGE_QUALITY_STEPS = [85, 75, 65, 55, 45];
const IMAGE_WIDTH_STEPS = [2480, 2000, 1600, 1200, 900];
const FINISHED_FILE_STATUSES = new Set<FileStatus>([
  FileStatus.COMPLETED,
  FileStatus.FAILED,
  FileStatus.SKIPPED,
]);

type JobWithFiles = Prisma.SortingJobGetPayload<{
  include: { files: { orderBy: { orderIndex: 'asc' } } };
}>;

type ProcessResult = {
  outputBuffer: Buffer;
  pageCount: number;
  ocrBuffer?: Buffer;
};

@Injectable()
export class BasicProcessingService {
  private readonly finalizingJobs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imagePreprocessing: ImagePreprocessingService,
    private readonly ocr: OcrService,
    private readonly documentDetection: DocumentDetectionService,
    private readonly pdfBuilder: PdfBuilderService,
  ) {}

  async getJob(userId: string, jobId: string) {
    return this.serializeJob(await this.getOwnedJob(userId, jobId));
  }

  async getProgress(userId: string, jobId: string) {
    const job = await this.getOwnedJob(userId, jobId);
    const processedFiles = job.files.filter((file) =>
      FINISHED_FILE_STATUSES.has(file.status),
    ).length;
    const totalFiles = job.totalFiles || job.files.length;

    return {
      jobId: job.id,
      status: job.status,
      processedFiles,
      totalFiles,
      percent: totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0,
    };
  }

  async prepareJobForProcessing(userId: string, jobId: string) {
    const job = await this.getOwnedJob(userId, jobId);

    if (job.files.length === 0) {
      throw new BadRequestException('Загрузите файлы перед обработкой');
    }

    if (job.status === JobStatus.PROCESSING) {
      throw new BadRequestException('Задание уже обрабатывается');
    }

    await this.prisma.$transaction([
      this.prisma.sortingJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.PROCESSING,
          processedFiles: 0,
          errorMessage: null,
        },
      }),
      this.prisma.processedFile.updateMany({
        where: { jobId: job.id },
        data: {
          status: FileStatus.PROCESSING,
          processedPath: null,
          outputPdfPath: null,
          errorMessage: null,
        },
      }),
    ]);

    return this.getOwnedJob(userId, job.id);
  }

  async cancelJob(userId: string, jobId: string) {
    const job = await this.getOwnedJob(userId, jobId);

    if (
      job.status !== JobStatus.UPLOADING &&
      job.status !== JobStatus.PROCESSING &&
      job.status !== JobStatus.PENDING
    ) {
      return this.serializeJob(job);
    }

    await this.prisma.$transaction([
      this.prisma.processedFile.updateMany({
        where: {
          jobId: job.id,
          status: { in: [FileStatus.PENDING, FileStatus.PROCESSING] },
        },
        data: {
          status: FileStatus.SKIPPED,
          errorMessage: 'Отменено пользователем',
        },
      }),
      this.prisma.sortingJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: 'Обработка отменена пользователем',
          processedFiles: job.files.length,
        },
      }),
    ]);

    return this.getJob(userId, job.id);
  }

  async processQueuedFile(payload: ImageProcessorJob) {
    const file = await this.prisma.processedFile.findFirst({
      where: { id: payload.fileId, jobId: payload.jobId },
      include: { job: true },
    });

    if (!file || file.job.userId !== payload.userId) {
      throw new NotFoundException('Файл не найден');
    }

    if (
      file.job.status !== JobStatus.PROCESSING ||
      file.status !== FileStatus.PROCESSING
    ) {
      return;
    }

    try {
      const originalName = decodePossiblyMojibakeFileName(file.originalName);
      const outputName = this.buildOutputFileName(
        decodePossiblyMojibakeFileName(file.processedName || originalName),
        file.orderIndex,
      );
      const outputKey = `output/${payload.userId}/${payload.jobId}/${outputName}`;
      const originalBuffer = await this.storage.download(file.originalPath);
      const result = await this.processFile(originalBuffer, originalName);
      const ocrText = await this.ocr.extractText(
        originalBuffer,
        originalName,
        result.ocrBuffer,
      );
      const storedOutputKey = await this.storage.upload(
        outputKey,
        result.outputBuffer,
        'application/pdf',
      );

      const freshFile = await this.prisma.processedFile.findUnique({
        where: { id: file.id },
        include: { job: true },
      });

      if (
        !freshFile ||
        freshFile.job.status !== JobStatus.PROCESSING ||
        freshFile.status !== FileStatus.PROCESSING
      ) {
        await this.storage.delete(storedOutputKey);
        return;
      }

      await this.prisma.processedFile.update({
        where: { id: file.id },
        data: {
          status: FileStatus.COMPLETED,
          processedName: outputName,
          processedPath: storedOutputKey,
          outputPdfPath: storedOutputKey,
          ocrText,
          pageCount: result.pageCount,
          errorMessage: null,
        },
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
    } finally {
      await this.finalizeJobIfFinished(payload.jobId);
    }
  }

  async streamJobArchive(userId: string, jobId: string, response: Response) {
    const job = await this.getOwnedJob(userId, jobId);
    const files = Array.from(
      job.files
        .filter((file) => Boolean(file.outputPdfPath))
        .reduce((uniqueFiles, file) => {
          if (file.outputPdfPath && !uniqueFiles.has(file.outputPdfPath)) {
            uniqueFiles.set(file.outputPdfPath, file);
          }

          return uniqueFiles;
        }, new Map<string, (typeof job.files)[number]>())
        .values(),
    );

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
          decodePossiblyMojibakeFileName(file.processedName || file.originalName),
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

  private async finalizeJobIfFinished(jobId: string) {
    if (this.finalizingJobs.has(jobId)) {
      return;
    }

    const job = await this.prisma.sortingJob.findUnique({
      where: { id: jobId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      return;
    }

    if (job.status !== JobStatus.PROCESSING) {
      return;
    }

    const processedFiles = job.files.filter((file) =>
      FINISHED_FILE_STATUSES.has(file.status),
    ).length;

    if (processedFiles < job.files.length) {
      await this.prisma.sortingJob.update({
        where: { id: job.id },
        data: { processedFiles },
      });
      return;
    }

    const hasFailedFiles = job.files.some(
      (file) => file.status === FileStatus.FAILED,
    );

    this.finalizingJobs.add(jobId);

    try {
      if (!hasFailedFiles) {
        await this.documentDetection.detectJobGroups(job.id);
        await this.pdfBuilder.buildSearchableGroupPdfs(job.userId, job.id);
      }

      await this.prisma.sortingJob.update({
        where: { id: job.id },
        data: {
          status: hasFailedFiles ? JobStatus.FAILED : JobStatus.COMPLETED,
          processedFiles,
          errorMessage: hasFailedFiles
            ? 'Часть файлов не удалось обработать'
            : null,
        },
      });
    } finally {
      this.finalizingJobs.delete(jobId);
    }
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
    const preparedBuffer =
      await this.imagePreprocessing.prepareDocumentImage(buffer);
    let bestResult: Buffer | null = null;

    for (const width of IMAGE_WIDTH_STEPS) {
      for (const quality of IMAGE_QUALITY_STEPS) {
        const imageBuffer = await this.imagePreprocessing.compressForPdf(
          preparedBuffer,
          width,
          quality,
        );
        const pdfBuffer = await this.createSinglePagePdf(imageBuffer);

        bestResult = pdfBuffer;

        if (pdfBuffer.byteLength <= MAX_OUTPUT_BYTES) {
          return {
            outputBuffer: pdfBuffer,
            pageCount: 1,
            ocrBuffer: preparedBuffer,
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
      ocrBuffer: preparedBuffer,
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
    const decodedName = decodePossiblyMojibakeFileName(name);
    const extension = path.extname(decodedName).toLowerCase();
    const rawBase =
      extension === '.pdf'
        ? path.basename(decodedName, extension)
        : path.basename(decodedName);
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
        originalName: decodePossiblyMojibakeFileName(file.originalName),
        processedName: file.processedName
          ? decodePossiblyMojibakeFileName(file.processedName)
          : file.processedName,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      })),
    };
  }
}
