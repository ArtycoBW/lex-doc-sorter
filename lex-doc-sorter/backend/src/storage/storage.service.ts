import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl as createS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import * as path from 'path';

type StorageType = 'local' | 's3';

type StorageArea = 'originals' | 'output';

type KeyParts = {
  area: StorageArea;
  userId: string;
  jobId: string;
  rest: string[];
};

const ALLOWED_AREAS = new Set<StorageArea>(['originals', 'output']);

@Injectable()
export class StorageService {
  private readonly storageType: StorageType;
  private readonly localRoot: string;
  private readonly s3Client?: S3Client;
  private readonly s3Bucket?: string;

  constructor(private readonly config: ConfigService) {
    const type = this.config.get<string>('STORAGE_TYPE') || 'local';
    this.storageType = type === 's3' ? 's3' : 'local';
    this.localRoot = path.resolve(
      process.cwd(),
      this.config.get<string>('STORAGE_PATH') || './uploads',
    );

    if (this.storageType === 's3') {
      const endpoint = this.config.get<string>('S3_ENDPOINT');
      const region = this.config.get<string>('S3_REGION') || 'ru-1';
      const bucket = this.config.get<string>('S3_BUCKET');
      const accessKeyId = this.config.get<string>('S3_ACCESS_KEY');
      const secretAccessKey = this.config.get<string>('S3_SECRET_KEY');

      if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
        throw new InternalServerErrorException(
          'S3 storage is enabled, but S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY or S3_SECRET_KEY is missing',
        );
      }

      this.s3Bucket = bucket;
      this.s3Client = new S3Client({
        endpoint,
        region,
        forcePathStyle: true,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  isLocal() {
    return this.storageType === 'local';
  }

  async upload(key: string, buffer: Buffer, mimetype: string) {
    const normalizedKey = this.normalizeKey(key);

    if (this.isLocal()) {
      const filePath = this.keyToLocalPath(normalizedKey);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, buffer);
      return normalizedKey;
    }

    await new Upload({
      client: this.getS3Client(),
      params: {
        Bucket: this.getS3Bucket(),
        Key: normalizedKey,
        Body: buffer,
        ContentType: mimetype,
      },
    }).done();

    return normalizedKey;
  }

  async download(key: string) {
    const normalizedKey = this.normalizeKey(key);

    if (this.isLocal()) {
      try {
        return await readFile(this.keyToLocalPath(normalizedKey));
      } catch {
        throw new NotFoundException('Файл не найден');
      }
    }

    const response = await this.getS3Client().send(
      new GetObjectCommand({
        Bucket: this.getS3Bucket(),
        Key: normalizedKey,
      }),
    );

    const body = response.Body as
      | { transformToByteArray?: () => Promise<Uint8Array> }
      | undefined;

    if (!body?.transformToByteArray) {
      throw new NotFoundException('Файл не найден');
    }

    return Buffer.from(await body.transformToByteArray());
  }

  async delete(key: string) {
    const normalizedKey = this.normalizeKey(key);

    if (this.isLocal()) {
      await rm(this.keyToLocalPath(normalizedKey), { force: true });
      return;
    }

    await this.getS3Client().send(
      new DeleteObjectCommand({
        Bucket: this.getS3Bucket(),
        Key: normalizedKey,
      }),
    );
  }

  async deleteJobFiles(userId: string, jobId: string) {
    if (this.isLocal()) {
      await rm(path.join(this.localRoot, userId, jobId), {
        recursive: true,
        force: true,
      });
      return;
    }

    await Promise.all([
      this.deletePrefix(`originals/${userId}/${jobId}/`),
      this.deletePrefix(`output/${userId}/${jobId}/`),
    ]);
  }

  async deletePrefix(prefix: string) {
    const normalizedPrefix = this.normalizeKey(prefix);

    if (this.isLocal()) {
      await rm(this.prefixToLocalPath(normalizedPrefix), {
        recursive: true,
        force: true,
      });
      return;
    }

    let continuationToken: string | undefined;

    do {
      const listResponse = await this.getS3Client().send(
        new ListObjectsV2Command({
          Bucket: this.getS3Bucket(),
          Prefix: normalizedPrefix,
          ContinuationToken: continuationToken,
        }),
      );

      const objects =
        listResponse.Contents?.map((object) => object.Key)
          .filter((key): key is string => Boolean(key)) ?? [];

      if (objects.length > 0) {
        await this.getS3Client().send(
          new DeleteObjectsCommand({
            Bucket: this.getS3Bucket(),
            Delete: {
              Objects: objects.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    const normalizedKey = this.normalizeKey(key);

    if (this.isLocal()) {
      return `/api/files?key=${encodeURIComponent(normalizedKey)}`;
    }

    return createS3SignedUrl(
      this.getS3Client(),
      new GetObjectCommand({
        Bucket: this.getS3Bucket(),
        Key: normalizedKey,
      }),
      { expiresIn },
    );
  }

  assertUserCanAccessKey(userId: string, key: string) {
    const parsed = this.parseKey(key);

    if (parsed.userId !== userId) {
      throw new NotFoundException('Файл не найден');
    }
  }

  getContentType(key: string) {
    const extension = path.extname(key).toLowerCase();

    if (extension === '.pdf') return 'application/pdf';
    if (extension === '.png') return 'image/png';
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';

    return 'application/octet-stream';
  }

  getFileName(key: string) {
    return path.basename(this.normalizeKey(key));
  }

  private normalizeKey(key: string) {
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '').trim();

    if (
      !normalized ||
      normalized.includes('..') ||
      normalized.includes('//') ||
      path.isAbsolute(normalized)
    ) {
      throw new BadRequestException('Некорректный ключ файла');
    }

    return normalized;
  }

  private parseKey(key: string): KeyParts {
    const normalized = this.normalizeKey(key);
    const [area, userId, jobId, ...rest] = normalized.split('/');

    if (
      !ALLOWED_AREAS.has(area as StorageArea) ||
      !userId ||
      !jobId ||
      rest.length === 0
    ) {
      throw new BadRequestException('Некорректный ключ файла');
    }

    return {
      area: area as StorageArea,
      userId,
      jobId,
      rest,
    };
  }

  private keyToLocalPath(key: string) {
    const { area, userId, jobId, rest } = this.parseKey(key);
    return path.join(this.localRoot, userId, jobId, area, ...rest);
  }

  private prefixToLocalPath(prefix: string) {
    const normalized = this.normalizeKey(prefix);
    const [area, userId, jobId, ...rest] = normalized.split('/');

    if (!ALLOWED_AREAS.has(area as StorageArea) || !userId || !jobId) {
      throw new BadRequestException('Некорректный префикс файлов');
    }

    return path.join(
      this.localRoot,
      userId,
      jobId,
      area as StorageArea,
      ...rest,
    );
  }

  private getS3Client() {
    if (!this.s3Client) {
      throw new InternalServerErrorException('S3 client is not configured');
    }

    return this.s3Client;
  }

  private getS3Bucket() {
    if (!this.s3Bucket) {
      throw new InternalServerErrorException('S3 bucket is not configured');
    }

    return this.s3Bucket;
  }
}
