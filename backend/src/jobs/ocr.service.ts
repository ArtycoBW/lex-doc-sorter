import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as path from 'path';
import Tesseract = require('tesseract.js');
import { decodePossiblyMojibakeFileName } from './file-name.util';

const MIN_EMBEDDED_TEXT_LENGTH = 24;
const MAX_OCR_TEXT_LENGTH = 120_000;

@Injectable()
export class OcrService implements OnModuleDestroy {
  private readonly logger = new Logger(OcrService.name);
  private readonly enabled = process.env.OCR_ENABLED !== 'false';
  private readonly languages = process.env.OCR_LANGUAGES || 'rus+eng';
  private readonly maxPdfPages = Number(process.env.OCR_MAX_PDF_PAGES || 3);
  private workerPromise?: Promise<Tesseract.Worker>;
  private recognitionQueue = Promise.resolve();

  async extractText(
    originalBuffer: Buffer,
    originalName: string,
    preparedImageBuffer?: Buffer,
  ) {
    if (!this.enabled) {
      return null;
    }

    const extension = path
      .extname(decodePossiblyMojibakeFileName(originalName))
      .toLowerCase();

    if (extension === '.pdf') {
      return this.extractPdfText(originalBuffer);
    }

    return this.safeRecognizeImage(preparedImageBuffer || originalBuffer);
  }

  async onModuleDestroy() {
    const worker = await this.workerPromise?.catch(() => null);
    await worker?.terminate().catch(() => undefined);
  }

  private async extractPdfText(buffer: Buffer) {
    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      disableFontFace: true,
    });

    try {
      const textResult = await parser.getText({
        lineEnforce: true,
        pageJoiner: '\n',
      });
      const embeddedText = this.normalizeText(textResult.text);

      if (embeddedText.length >= MIN_EMBEDDED_TEXT_LENGTH) {
        return embeddedText;
      }

      const screenshotResult = await parser.getScreenshot({
        desiredWidth: 1800,
        first: this.maxPdfPages,
        imageBuffer: true,
        imageDataUrl: false,
      });
      const pageTexts: string[] = [];

      for (const page of screenshotResult.pages) {
        const pageText = await this.safeRecognizeImage(Buffer.from(page.data));

        if (pageText) {
          pageTexts.push(pageText);
        }
      }

      return this.normalizeText(pageTexts.join('\n\n')) || null;
    } catch (error) {
      this.logger.warn(
        `OCR PDF failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  private async safeRecognizeImage(buffer: Buffer) {
    try {
      const text = await this.recognizeImage(buffer);
      return this.normalizeText(text) || null;
    } catch (error) {
      this.logger.warn(
        `OCR image failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private recognizeImage(buffer: Buffer) {
    const run = this.recognitionQueue.then(async () => {
      const worker = await this.getWorker();
      const result = await worker.recognize(
        buffer,
        { rotateAuto: true },
        { text: true },
      );

      return result.data.text;
    });

    this.recognitionQueue = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  }

  private getWorker() {
    if (!this.workerPromise) {
      Tesseract.setLogging(false);
      this.workerPromise = Tesseract.createWorker(this.languages, undefined, {
        cachePath: process.env.OCR_CACHE_PATH,
      }).then(async (worker) => {
        await worker.setParameters({
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: '3' as Tesseract.PSM,
          user_defined_dpi: '300',
        });

        return worker;
      });
    }

    return this.workerPromise;
  }

  private normalizeText(text: string) {
    return text
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_OCR_TEXT_LENGTH);
  }
}
