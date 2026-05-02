import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FileStatus } from '@prisma/client';
import {
  AlignmentType,
  Document,
  Footer,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import ExcelJS = require('exceljs');
import { PrismaService } from '../prisma/prisma.service';

type RegistryFormat = 'xlsx' | 'docx';

type RegistryRow = {
  index: number;
  name: string;
  date: string;
  number: string;
  parties: string;
  pages: number;
  sizeMb: string;
};

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async buildRegistry(userId: string, jobId: string, format: string) {
    const normalizedFormat = this.normalizeFormat(format);
    const job = await this.prisma.sortingJob.findUnique({
      where: { id: jobId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      throw new NotFoundException('Задание не найдено');
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому заданию');
    }

    const completedFiles = job.files.filter((file) => file.status === FileStatus.COMPLETED);
    const hasSmartMarkup = completedFiles.some(
      (file) => file.groupIndex !== null || file.docType || file.docSummary,
    );

    if (completedFiles.length > 1 && !hasSmartMarkup) {
      throw new BadRequestException(
        'Для описи запустите обработку задания: система определит документы, даты и названия.',
      );
    }

    const rows = this.buildRows(job.files);

    if (rows.length === 0) {
      throw new BadRequestException('Сначала обработайте документы');
    }

    if (normalizedFormat === 'xlsx') {
      return {
        buffer: await this.buildXlsx(rows),
        fileName: `registry_${job.id.slice(0, 8)}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    return {
      buffer: await this.buildDocx(rows),
      fileName: `registry_${job.id.slice(0, 8)}.docx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  private buildRows(files: Array<{
    status: FileStatus;
    groupIndex: number | null;
    orderIndex: number;
    processedName: string | null;
    originalName: string;
    docDate: string | null;
    docNumber: string | null;
    docParties: string[];
    pageCount: number;
    sizeBytes: number;
  }>) {
    const groups = new Map<number, typeof files>();

    for (const file of files) {
      if (file.status !== FileStatus.COMPLETED) {
        continue;
      }

      const key = file.groupIndex ?? file.orderIndex;
      groups.set(key, [...(groups.get(key) || []), file]);
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left - right)
      .map(([, groupFiles], index) => {
        const representative = groupFiles[0];
        const pages = groupFiles.reduce((sum, file) => sum + Math.max(1, file.pageCount || 1), 0);
        const sizeBytes = groupFiles.reduce((sum, file) => sum + file.sizeBytes, 0);

        return {
          index: index + 1,
          name: representative.processedName || representative.originalName,
          date: representative.docDate || '',
          number: representative.docNumber || '',
          parties: representative.docParties.join(', '),
          pages,
          sizeMb: (sizeBytes / 1024 / 1024).toFixed(2),
        };
      });
  }

  private async buildXlsx(rows: RegistryRow[]) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Реестр документов');
    sheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    };
    sheet.views = [{ state: 'frozen', ySplit: 4 }];

    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = 'Реестр документов к заявлению';
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = `Дата формирования: ${new Intl.DateTimeFormat('ru-RU').format(new Date())}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);
    sheet.addRow(['№ п/п', 'Наименование', 'Дата', 'Номер', 'Стороны', 'Страниц', 'Размер (МБ)']);

    for (const row of rows) {
      sheet.addRow([
        row.index,
        row.name,
        row.date,
        row.number,
        row.parties,
        row.pages,
        Number(row.sizeMb),
      ]);
    }

    sheet.columns = [
      { width: 8 },
      { width: 48 },
      { width: 14 },
      { width: 18 },
      { width: 42 },
      { width: 12 },
      { width: 14 },
    ];

    const headerRow = sheet.getRow(4);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

    sheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'middle', wrapText: true };
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
      });

      if (rowNumber > 4 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      }
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async buildDocx(rows: RegistryRow[]) {
    const columnWidths = [700, 5200, 1300, 1500, 4200, 900, 1100];
    const tableRows = [
      new TableRow({
        tableHeader: true,
        children: ['№', 'Наименование', 'Дата', 'Номер', 'Стороны', 'Стр.', 'Размер, МБ'].map((value, index) =>
          this.tableCell(value, true, columnWidths[index]),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              this.tableCell(String(row.index), false, columnWidths[0]),
              this.tableCell(row.name, false, columnWidths[1]),
              this.tableCell(row.date, false, columnWidths[2]),
              this.tableCell(row.number, false, columnWidths[3]),
              this.tableCell(row.parties, false, columnWidths[4]),
              this.tableCell(String(row.pages), false, columnWidths[5]),
              this.tableCell(row.sizeMb, false, columnWidths[6]),
            ],
          }),
      ),
    ];
    const totalPages = rows.reduce((sum, row) => sum + row.pages, 0);
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { orientation: PageOrientation.LANDSCAPE },
              margin: {
                top: 720,
                right: 540,
                bottom: 720,
                left: 540,
                header: 360,
                footer: 360,
              },
            },
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun(`Всего документов: ${rows.length}, страниц: ${totalPages}`),
                  ],
                }),
              ],
            }),
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 280 },
              children: [
                new TextRun({
                  text: 'ПРИЛОЖЕНИЕ — РЕЕСТР ДОКУМЕНТОВ',
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 360 },
              children: [
                new TextRun(`Дата формирования: ${new Intl.DateTimeFormat('ru-RU').format(new Date())}`),
              ],
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }

  private tableCell(value: string, bold = false, width?: number) {
    return new TableCell({
      width: width ? { size: width, type: WidthType.DXA } : undefined,
      margins: {
        top: 80,
        bottom: 80,
        left: 90,
        right: 90,
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: value || ' ', bold, size: bold ? 18 : 16 })],
        }),
      ],
    });
  }

  private normalizeFormat(format: string): RegistryFormat {
    if (format === 'xlsx' || format === 'docx') {
      return format;
    }

    throw new BadRequestException('Поддерживаются форматы xlsx и docx');
  }
}
