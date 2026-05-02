import { Injectable, Logger } from '@nestjs/common';
import { FileStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decodePossiblyMojibakeFileName } from './file-name.util';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const OCR_TEXT_LIMIT = 500;
const DOC_TYPES = new Set([
  'contract',
  'act',
  'appendix',
  'decision',
  'ruling',
  'invoice',
  'power_of_attorney',
  'protocol',
  'notice',
  'certificate',
  'statement',
  'other',
]);

type DetectionResult = {
  isNewDocument: boolean;
  docType: string;
  docDate: string | null;
  docNumber: string | null;
  docSummary: string | null;
  docParties: string[];
};

@Injectable()
export class DocumentDetectionService {
  private readonly logger = new Logger(DocumentDetectionService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || '';
  private readonly model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  private readonly enabled = process.env.DOCUMENT_DETECTION_ENABLED !== 'false';

  constructor(private readonly prisma: PrismaService) {}

  async detectJobGroups(jobId: string) {
    const job = await this.prisma.sortingJob.findUnique({
      where: { id: jobId },
      include: { files: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!job) {
      return;
    }

    let groupIndex = -1;

    for (const file of job.files) {
      if (file.status !== FileStatus.COMPLETED) {
        await this.prisma.processedFile.update({
          where: { id: file.id },
          data: { groupIndex: null },
        });
        continue;
      }

      const detection = await this.detectFile(file.ocrText, file.originalName);
      const startsNewGroup = groupIndex < 0 || file.orderIndex === 0 || detection.isNewDocument;

      if (startsNewGroup) {
        groupIndex += 1;
      }

      await this.prisma.processedFile.update({
        where: { id: file.id },
        data: {
          groupIndex,
          docType: detection.docType,
          docDate: detection.docDate,
          docNumber: detection.docNumber,
          docParties: detection.docParties,
          docSummary: detection.docSummary,
        },
      });
    }
  }

  private async detectFile(ocrText: string | null, originalName: string) {
    const text = this.prepareText(ocrText);

    if (!text) {
      return this.detectWithHeuristics('', originalName);
    }

    if (!this.enabled || !this.apiKey) {
      return this.detectWithHeuristics(text, originalName);
    }

    try {
      return this.normalizeResult(await this.detectWithGemini(text));
    } catch (error) {
      this.logger.warn(
        `Gemini document detection failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.detectWithHeuristics(text, originalName);
    }
  }

  private async detectWithGemini(text: string) {
    const response = await fetch(
      `${GEMINI_ENDPOINT}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: this.buildPrompt(text) }],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API ${response.status}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!rawText) {
      throw new Error('Gemini returned empty response');
    }

    return JSON.parse(this.unwrapJson(rawText)) as DetectionResult;
  }

  private detectWithHeuristics(text: string, originalName: string): DetectionResult {
    const normalized = text.toLowerCase();
    const docType = this.inferDocType(normalized);
    const docDate = this.findDate(text);
    const docNumber = this.findNumber(text);
    const summary = this.buildFallbackSummary(text, originalName);

    return {
      isNewDocument: this.hasDocumentStart(normalized, docType),
      docType,
      docDate,
      docNumber,
      docSummary: summary,
      docParties: this.findParties(text),
    };
  }

  private buildPrompt(text: string) {
    return `Ты — ассистент для анализа юридических документов.

Проанализируй текст ниже и определи:
1. Является ли это НАЧАЛОМ нового самостоятельного документа?
   Признаки начала: заголовок ("Договор", "Акт", "Приложение №", "Решение", "Определение",
   "Постановление", "Счёт", "Накладная", "Доверенность", "Протокол", "Уведомление",
   "Справка", "Выписка", "Заявление" и т.д.)
2. Тип: contract / act / appendix / decision / ruling / invoice / power_of_attorney /
   protocol / notice / certificate / statement / other
3. Дата (формат DD.MM.YYYY, или null)
4. Номер документа (строка, или null)
5. Краткая суть в 3-5 словах (на русском)
6. Стороны документа (массив строк, или [])

Текст: """${text}"""

Ответь СТРОГО в JSON без пояснений:
{"isNewDocument":true,"docType":"contract","docDate":"15.03.2024","docNumber":"№123","docSummary":"Аренда офиса ООО Ромашка","docParties":["ООО Ромашка","ИП Иванов"]}`;
  }

  private normalizeResult(result: DetectionResult): DetectionResult {
    const docType = DOC_TYPES.has(result.docType) ? result.docType : 'other';

    return {
      isNewDocument: Boolean(result.isNewDocument),
      docType,
      docDate: this.normalizeNullableString(result.docDate),
      docNumber: this.normalizeNullableString(result.docNumber),
      docSummary: this.normalizeNullableString(result.docSummary),
      docParties: Array.isArray(result.docParties)
        ? result.docParties
            .map((party) => this.normalizeNullableString(party))
            .filter((party): party is string => Boolean(party))
            .slice(0, 8)
        : [],
    };
  }

  private inferDocType(text: string) {
    if (/\bдоговор\b/.test(text)) return 'contract';
    if (/\bакт\b/.test(text)) return 'act';
    if (/\bприложени[ея]\b/.test(text)) return 'appendix';
    if (/\bрешени[ея]\b/.test(text)) return 'decision';
    if (/\bопределени[ея]\b/.test(text)) return 'ruling';
    if (/\bсч[её]т\b|\bсчет\b|\bнакладн|\bчек\b|\bкассов/.test(text)) return 'invoice';
    if (/\bдоверенность\b/.test(text)) return 'power_of_attorney';
    if (/\bпротокол\b/.test(text)) return 'protocol';
    if (/\bуведомлени[ея]\b/.test(text)) return 'notice';
    if (/\bсправк[аи]\b|\bвыписк[аи]\b/.test(text)) return 'certificate';
    if (/\bзаявлени[ея]\b/.test(text)) return 'statement';
    return 'other';
  }

  private hasDocumentStart(text: string, docType: string) {
    if (docType === 'other') {
      return /^(арбитражный суд|в\s+суд|иск|ходатайство|жалоба)\b/i.test(text);
    }

    return true;
  }

  private findDate(text: string) {
    const match = text.match(/\b(\d{2}[./-]\d{2}[./-]\d{4})\b/);
    return match ? match[1].replace(/[/-]/g, '.') : null;
  }

  private findNumber(text: string) {
    const match = text.match(/(?:№|N|номер)\s*([A-Za-zА-Яа-я0-9/-]{2,})/i);
    return match ? `№${match[1]}` : null;
  }

  private findParties(text: string) {
    const parties = text.match(
      /\b(?:ООО|АО|ПАО|ИП|ЗАО|НКО)\s+["«]?[A-Za-zА-Яа-я0-9 ._-]{2,40}["»]?/g,
    );

    return Array.from(new Set(parties || [])).slice(0, 8);
  }

  private buildFallbackSummary(text: string, originalName: string) {
    const firstLine = text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length >= 6);

    const source = firstLine || decodePossiblyMojibakeFileName(originalName);

    return source
      .replace(/\.[^.]+$/, '')
      .replace(/[^\p{L}\p{N}\s._-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 5)
      .join(' ') || 'Документ';
  }

  private prepareText(text: string | null) {
    return (text || '').replace(/\s+/g, ' ').trim().slice(0, OCR_TEXT_LIMIT);
  }

  private unwrapJson(text: string) {
    return text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private normalizeNullableString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized.slice(0, 180) : null;
  }
}
