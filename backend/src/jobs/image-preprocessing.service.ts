import { BadRequestException, Injectable } from '@nestjs/common';
import sharp = require('sharp');

const PREVIEW_MAX_EDGE = 3000;

@Injectable()
export class ImagePreprocessingService {
  async prepareDocumentImage(buffer: Buffer) {
    try {
      return await sharp(buffer, { failOn: 'none' })
        .rotate()
        .flatten({ background: '#ffffff' })
        .resize({
          width: PREVIEW_MAX_EDGE,
          height: PREVIEW_MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .trim({ background: '#ffffff', threshold: 14 })
        .normalize({ lower: 1, upper: 99 })
        .modulate({ brightness: 1.04, saturation: 0.92 })
        .median(1)
        .sharpen({ sigma: 0.7, m1: 0.8, m2: 1.6 })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    } catch {
      try {
        return await sharp(buffer, { failOn: 'none' })
          .rotate()
          .flatten({ background: '#ffffff' })
          .resize({
            width: PREVIEW_MAX_EDGE,
            height: PREVIEW_MAX_EDGE,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 92, mozjpeg: true })
          .toBuffer();
      } catch {
        throw new BadRequestException('Не удалось подготовить изображение');
      }
    }
  }

  async compressForPdf(buffer: Buffer, width: number, quality: number) {
    return sharp(buffer, { failOn: 'none' })
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
}
