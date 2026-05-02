import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FileStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decodePossiblyMojibakeFileName } from './file-name.util';

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'Договор',
  act: 'Акт',
  appendix: 'Приложение',
  decision: 'Решение',
  ruling: 'Определение',
  invoice: 'Счёт',
  power_of_attorney: 'Доверенность',
  protocol: 'Протокол',
  notice: 'Уведомление',
  certificate: 'Справка',
  statement: 'Заявление',
  other: 'Документ',
};

@Injectable()
export class NamingService {
  constructor(private readonly prisma: PrismaService) {}

  async applySmartNamesForUser(userId: string, jobId: string) {
    const job = await this.getJob(jobId);

    if (job.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому заданию');
    }

    await this.applySmartNames(jobId);

    return this.serializeJob(await this.getJob(jobId));
  }

  async applySmartNames(jobId: string) {
    const job = await this.getJob(jobId);
    const groups = new Map<number, typeof job.files>();

    for (const file of job.files) {
      if (file.status !== FileStatus.COMPLETED) {
        continue;
      }

      const key = file.groupIndex ?? file.orderIndex;
      groups.set(key, [...(groups.get(key) || []), file]);
    }

    const orderedGroups = Array.from(groups.entries()).sort(([left], [right]) => left - right);

    await Promise.all(
      orderedGroups.map(([, files], index) => {
        const representative = files[0];

        if (!representative) {
          return Promise.resolve();
        }

        return this.prisma.processedFile.update({
          where: { id: representative.id },
          data: { processedName: this.buildName(representative, index) },
        });
      }),
    );
  }

  private async getJob(jobId: string) {
    const job = await this.prisma.sortingJob.findUnique({
      where: { id: jobId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      throw new NotFoundException('Задание не найдено');
    }

    return job;
  }

  private buildName(
    file: {
      docType: string | null;
      docDate: string | null;
      docSummary: string | null;
    },
    index: number,
  ) {
    const number = String(index + 1).padStart(3, '0');
    const type = DOC_TYPE_LABELS[file.docType || 'other'] || DOC_TYPE_LABELS.other;
    const date = this.sanitizeSegment(file.docDate || 'БезДаты');
    const summary = this.sanitizeSegment(file.docSummary || 'Документ').slice(0, 40);

    return `${number}_${type}_${date}_${summary || 'Документ'}.pdf`;
  }

  private sanitizeSegment(value: string) {
    return value
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
      .replace(/[^\p{L}\p{N}._ -]+/gu, ' ')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .trim();
  }

  private serializeJob(job: Awaited<ReturnType<NamingService['getJob']>>) {
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
