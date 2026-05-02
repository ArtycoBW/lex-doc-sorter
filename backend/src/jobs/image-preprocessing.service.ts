import { BadRequestException, Injectable } from '@nestjs/common';
import sharp = require('sharp');

const PREVIEW_MAX_EDGE = 3000;
const CROP_DETECTION_MAX_EDGE = 900;

type DocumentCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

@Injectable()
export class ImagePreprocessingService {
  async prepareDocumentImage(buffer: Buffer) {
    try {
      const crop = await this.detectDocumentCrop(buffer);
      let image = sharp(buffer, { failOn: 'none' }).rotate();

      if (crop) {
        image = image.extract(crop);
      }

      return await image
        .flatten({ background: '#ffffff' })
        .resize({
          width: PREVIEW_MAX_EDGE,
          height: PREVIEW_MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .trim({ background: '#ffffff', threshold: 22 })
        .modulate({ brightness: 1.03, saturation: 0.82 })
        .gamma(1.04)
        .sharpen({ sigma: 0.6, m1: 0.45, m2: 1.1 })
        .jpeg({ quality: 90, mozjpeg: true })
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

  private async detectDocumentCrop(buffer: Buffer): Promise<DocumentCrop | null> {
    try {
      const orientedMetadata = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .metadata();
      const sourceWidth = orientedMetadata.width ?? 0;
      const sourceHeight = orientedMetadata.height ?? 0;

      if (!sourceWidth || !sourceHeight) {
        return null;
      }

      const { data, info } = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize({
          width: CROP_DETECTION_MAX_EDGE,
          height: CROP_DETECTION_MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const width = info.width;
      const height = info.height;
      const channels = info.channels;
      const pixelCount = width * height;
      const mask = new Uint8Array(pixelCount);

      for (let index = 0; index < pixelCount; index += 1) {
        const offset = index * channels;
        const r = data[offset] ?? 0;
        const g = data[offset + 1] ?? r;
        const b = data[offset + 2] ?? r;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (luminance > 188 && max - min < 72) {
          mask[index] = 1;
        }
      }

      const stack = new Int32Array(pixelCount);
      let best: {
        area: number;
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
      } | null = null;

      for (let index = 0; index < pixelCount; index += 1) {
        if (mask[index] !== 1) {
          continue;
        }

        let pointer = 0;
        let length = 0;
        let area = 0;
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;

        stack[length++] = index;
        mask[index] = 2;

        while (pointer < length) {
          const current = stack[pointer++];
          const x = current % width;
          const y = Math.floor(current / width);

          area += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);

          const neighbors = [
            x > 0 ? current - 1 : -1,
            x < width - 1 ? current + 1 : -1,
            y > 0 ? current - width : -1,
            y < height - 1 ? current + width : -1,
          ];

          for (const next of neighbors) {
            if (next >= 0 && mask[next] === 1) {
              mask[next] = 2;
              stack[length++] = next;
            }
          }
        }

        if (area < pixelCount * 0.025) {
          continue;
        }

        if (!best || area > best.area) {
          best = { area, minX, minY, maxX, maxY };
        }
      }

      if (!best || best.area < pixelCount * 0.05) {
        return null;
      }

      const detectedWidth = best.maxX - best.minX + 1;
      const detectedHeight = best.maxY - best.minY + 1;
      const coversMostFrame =
        detectedWidth > width * 0.94 && detectedHeight > height * 0.94;

      if (coversMostFrame) {
        return null;
      }

      const padX = Math.max(8, Math.round(detectedWidth * 0.06));
      const padY = Math.max(8, Math.round(detectedHeight * 0.06));
      const scaledLeft = Math.max(0, best.minX - padX);
      const scaledTop = Math.max(0, best.minY - padY);
      const scaledRight = Math.min(width - 1, best.maxX + padX);
      const scaledBottom = Math.min(height - 1, best.maxY + padY);
      const scaleX = sourceWidth / width;
      const scaleY = sourceHeight / height;
      const left = Math.floor(scaledLeft * scaleX);
      const top = Math.floor(scaledTop * scaleY);
      const right = Math.ceil((scaledRight + 1) * scaleX);
      const bottom = Math.ceil((scaledBottom + 1) * scaleY);
      const cropWidth = Math.min(sourceWidth - left, right - left);
      const cropHeight = Math.min(sourceHeight - top, bottom - top);

      if (
        cropWidth < sourceWidth * 0.18 ||
        cropHeight < sourceHeight * 0.18 ||
        cropWidth <= 0 ||
        cropHeight <= 0
      ) {
        return null;
      }

      return { left, top, width: cropWidth, height: cropHeight };
    } catch {
      return null;
    }
  }

  async compressForPdf(buffer: Buffer, width: number, quality: number) {
    return sharp(buffer, { failOn: 'none' })
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
}
