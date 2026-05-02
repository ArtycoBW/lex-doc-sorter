import { Injectable, Logger } from '@nestjs/common';
import { FileStatus } from '@prisma/client';
import fontkit = require('@pdf-lib/fontkit');
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ImagePreprocessingService } from './image-preprocessing.service';

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const PAGE_MARGIN = 10;
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const IMAGE_QUALITY_STEPS = [82, 72, 62];
const IMAGE_WIDTH = 1800;

@Injectable()
export class PdfBuilderService {
  private readonly logger = new Logger(PdfBuilderService.name);
  private fontBytesPromise?: Promise<Uint8Array | null>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imagePreprocessing: ImagePreprocessingService,
  ) {}

  async buildSearchableGroupPdfs(userId: string, jobId: string) {
    const job = await this.prisma.sortingJob.findUnique({
      where: { id: jobId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      return;
    }

    const groups = new Map<number, typeof job.files>();

    for (const file of job.files) {
      if (file.status !== FileStatus.COMPLETED) {
        continue;
      }

      const key = file.groupIndex ?? file.orderIndex;
      groups.set(key, [...(groups.get(key) || []), file]);
    }

    for (const [groupIndex, files] of groups) {
      const outputName = `group_${String(groupIndex + 1).padStart(3, '0')}.pdf`;
      const outputKey = `output/${userId}/${jobId}/${outputName}`;
      const oldOutputKeys = Array.from(
        new Set(
          files
            .flatMap((file) => [file.outputPdfPath, file.processedPath])
            .filter((key): key is string => Boolean(key) && key !== outputKey),
        ),
      );

      const outputBuffer = await this.buildGroupPdf(files);
      const storedOutputKey = await this.storage.upload(
        outputKey,
        outputBuffer,
        'application/pdf',
      );

      await this.prisma.processedFile.updateMany({
        where: { id: { in: files.map((file) => file.id) } },
        data: {
          outputPdfPath: storedOutputKey,
          processedPath: storedOutputKey,
        },
      });

      await Promise.allSettled(oldOutputKeys.map((key) => this.storage.delete(key)));
    }
  }

  private async buildGroupPdf(files: Array<{ originalPath: string; originalName: string; ocrText: string | null }>) {
    let latest: Buffer | null = null;

    for (const quality of IMAGE_QUALITY_STEPS) {
      const pdf = await PDFDocument.create();
      pdf.registerFontkit(fontkit);
      const font = await this.loadSearchFont(pdf);

      for (const file of files) {
        const buffer = await this.storage.download(file.originalPath);
        await this.appendFile(pdf, file.originalName, buffer, file.ocrText, font, quality);
      }

      latest = Buffer.from(await pdf.save({ useObjectStreams: true }));

      if (latest.byteLength <= MAX_OUTPUT_BYTES) {
        return latest;
      }
    }

    this.logger.warn(
      `Searchable PDF is larger than 10 MB after compression: ${latest?.byteLength || 0} bytes`,
    );

    if (!latest) {
      throw new Error('Не удалось собрать PDF');
    }

    return latest;
  }

  private async appendFile(
    targetPdf: PDFDocument,
    originalName: string,
    buffer: Buffer,
    ocrText: string | null,
    font: PDFFont | null,
    imageQuality: number,
  ) {
    const extension = path.extname(originalName).toLowerCase();

    if (extension === '.pdf') {
      const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await targetPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices(),
      );

      copiedPages.forEach((page, index) => {
        targetPdf.addPage(page);

        if (index === 0) {
          this.drawSearchableText(page, ocrText, font);
        }
      });

      return;
    }

    const prepared = await this.imagePreprocessing.prepareDocumentImage(buffer);
    const imageBuffer = await this.imagePreprocessing.compressForPdf(
      prepared,
      IMAGE_WIDTH,
      imageQuality,
    );
    const image = await targetPdf.embedJpg(imageBuffer);
    const page = targetPdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const maxWidth = A4_WIDTH - PAGE_MARGIN * 2;
    const maxHeight = A4_HEIGHT - PAGE_MARGIN * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;

    page.drawImage(image, {
      x: (A4_WIDTH - width) / 2,
      y: (A4_HEIGHT - height) / 2,
      width,
      height,
    });
    this.drawSearchableText(page, ocrText, font);
  }

  private drawSearchableText(page: PDFPage, text: string | null, font: PDFFont | null) {
    if (!text || !font) {
      return;
    }

    const normalized = text.replace(/\s+/g, ' ').trim().slice(0, 24_000);

    if (!normalized) {
      return;
    }

    const lines = this.chunkText(normalized, 110);
    let y = page.getHeight() - PAGE_MARGIN;

    for (const line of lines) {
      if (y <= PAGE_MARGIN) {
        break;
      }

      page.drawText(line, {
        x: PAGE_MARGIN,
        y,
        size: 1,
        font,
        color: rgb(1, 1, 1),
        opacity: 0.01,
        lineHeight: 1.2,
      });
      y -= 1.2;
    }
  }

  private chunkText(text: string, maxLength: number) {
    const chunks: string[] = [];

    for (let index = 0; index < text.length; index += maxLength) {
      chunks.push(text.slice(index, index + maxLength));
    }

    return chunks;
  }

  private async loadSearchFont(pdf: PDFDocument) {
    const fontBytes = await this.getFontBytes();

    if (!fontBytes) {
      return null;
    }

    return pdf.embedFont(fontBytes, { subset: true });
  }

  private getFontBytes() {
    if (!this.fontBytesPromise) {
      this.fontBytesPromise = this.findFontBytes();
    }

    return this.fontBytesPromise;
  }

  private async findFontBytes() {
    const configuredPath = process.env.PDF_TEXT_FONT_PATH;
    const candidates = [
      configuredPath,
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      'C:\\Windows\\Fonts\\arial.ttf',
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      try {
        return await fs.readFile(candidate);
      } catch {
        continue;
      }
    }

    this.logger.warn('PDF text font not found; searchable layer will be skipped');
    return null;
  }
}
