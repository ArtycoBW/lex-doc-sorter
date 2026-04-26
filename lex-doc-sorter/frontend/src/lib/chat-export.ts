"use client"

type ExportMessagePayload = {
  appName: string
  conversationTitle: string
  sectionName: string
  documentName?: string
  createdAt: string
  content: string
}

type DocxDescriptor =
  | { type: "empty" }
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "text"; parts: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatExportDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function stripMarkdownMarkers(value: string) {
  return value
    .replace(/^#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
}

function splitBoldParts(value: string) {
  return value.split(/(\*\*.*?\*\*)/g).filter(Boolean)
}

function isTableRow(line: string): boolean {
  const t = line.trim()
  return t.startsWith("|") && t.endsWith("|") && t.length > 1
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim())
}

function parseTableRow(line: string): string[] {
  const content = line.trim().slice(1, -1)
  const cells: string[] = []
  let current = ""
  let inCode = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]
    const next = content[i + 1]

    if (char === "`") {
      inCode = !inCode
      current += char
      continue
    }

    if (char === "\\" && next === "|") {
      current += "|"
      i += 1
      continue
    }

    if (char === "|" && !inCode) {
      cells.push(current)
      current = ""
      continue
    }

    current += char
  }

  cells.push(current)
  return cells.map((cell) => stripMarkdownMarkers(cell.trim()))
}

function normalizeRow(row: string[], colCount: number): string[] {
  if (row.length >= colCount) return row.slice(0, colCount)
  return [...row, ...Array(colCount - row.length).fill("")]
}

function safeCell(text: string): string {
  return text.trim() || " "
}

function normalizeTableCellText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim()
}

const PDF_SOFT_BREAK = "\u200b"
const PDF_PAGE_MARGINS = [42, 46, 42, 42] as const
const PDF_CONTENT_WIDTH = 595.28 - PDF_PAGE_MARGINS[0] - PDF_PAGE_MARGINS[2]

function softenPdfToken(token: string): string {
  if (!token.trim() || token.length < 12) {
    return token
  }

  const withSeparatorBreaks = token.replace(/([/\\._\-,:;()[\]{}])/g, `$1${PDF_SOFT_BREAK}`)
  if (withSeparatorBreaks.includes(PDF_SOFT_BREAK)) {
    return withSeparatorBreaks
  }

  if (token.length < 24) {
    return token
  }

  return token.replace(/(.{18})/g, `$1${PDF_SOFT_BREAK}`)
}

function buildPdfCellText(text: string) {
  const normalized = safeCell(normalizeTableCellText(text))
  const prepared = normalized
    .split("\n")
    .map((line) => line.split(/(\s+)/).map(softenPdfToken).join(""))
    .join("\n")

  return {
    text: prepared,
    wordBreak: /\S{24,}/.test(normalized) ? ("break-all" as const) : undefined,
  }
}

function isImageLine(line: string): boolean {
  return /!\[.*?]\(.*?\)/.test(line.trim())
}

function splitWideTable(
  headers: string[],
  rows: string[][],
  maxDataCols: number
): Array<{ headers: string[]; rows: string[][] }> {
  if (headers.length === 0) return []
  const normalRows = rows.map((r) => normalizeRow(r, headers.length))

  if (headers.length <= maxDataCols + 1) {
    return [{ headers, rows: normalRows }]
  }

  const chunks: Array<{ headers: string[]; rows: string[][] }> = []
  for (let i = 1; i < headers.length; i += maxDataCols) {
    const indices = Array.from(
      { length: Math.min(maxDataCols, headers.length - i) },
      (_, j) => i + j
    )
    chunks.push({
      headers: [headers[0], ...indices.map((c) => headers[c])],
      rows: normalRows.map((row) => [row[0], ...indices.map((c) => row[c] ?? "")]),
    })
  }
  return chunks
}

const MAX_DATA_COLS_DOCX = 3
const MAX_DATA_COLS_PDF = 2

function pdfColWidths(colCount: number): Array<string | number> {
  const labelWidth =
    colCount <= 2
      ? Math.round(PDF_CONTENT_WIDTH * 0.38)
      : Math.round(PDF_CONTENT_WIDTH * 0.27)
  if (colCount <= 1) return ["*"]
  return [labelWidth, ...Array(colCount - 1).fill("*")]
}

const DOCX_PAGE_WIDTH = 8640

function docxColWidths(colCount: number): number[] {
  if (colCount <= 1) return [DOCX_PAGE_WIDTH]
  if (colCount === 2) {
    const label = Math.round(DOCX_PAGE_WIDTH * 0.38)
    return [label, DOCX_PAGE_WIDTH - label]
  }
  const label = Math.round(DOCX_PAGE_WIDTH * 0.32)
  const dataWidth = Math.floor((DOCX_PAGE_WIDTH - label) / (colCount - 1))
  return [label, ...Array(colCount - 1).fill(dataWidth)]
}

function buildDocxParagraphDescriptors(content: string): DocxDescriptor[] {
  const lines = content.split(/\r?\n/)
  const result: DocxDescriptor[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (isTableRow(line) && !isSeparatorRow(line)) {
      const tableLines: string[] = [line]
      i++
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i])
        i++
      }
      const [headerLine, , ...dataLines] = tableLines
      const headers = parseTableRow(headerLine)
      const rows = dataLines
        .filter((l) => !isSeparatorRow(l) && isTableRow(l))
        .map(parseTableRow)
      if (headers.length > 0 && rows.length > 0) {
        for (const chunk of splitWideTable(headers, rows, MAX_DATA_COLS_DOCX)) {
          result.push({ type: "table", headers: chunk.headers, rows: chunk.rows })
        }
      }
      continue
    }

    if (!trimmed || isImageLine(line)) {
      result.push({ type: "empty" })
    } else if (trimmed.startsWith("### ")) {
      result.push({ type: "h3", text: stripMarkdownMarkers(trimmed) })
    } else if (trimmed.startsWith("## ")) {
      result.push({ type: "h2", text: stripMarkdownMarkers(trimmed) })
    } else if (trimmed.startsWith("# ")) {
      result.push({ type: "h1", text: stripMarkdownMarkers(trimmed) })
    } else {
      result.push({ type: "text", parts: splitBoldParts(trimmed) })
    }

    i++
  }

  return result
}

function buildPdfContent(content: string): unknown[] {
  const lines = content.split(/\r?\n/)
  const result: unknown[] = []
  let i = 0

  const tableLayout = {
    hLineWidth: (lineIndex: number, node: any) => {
      if (lineIndex === 0 || lineIndex === node.table.body.length) {
        return 0
      }
      return lineIndex === node.table.headerRows ? 2 : 1
    },
    vLineWidth: () => 0,
    hLineColor: (lineIndex: number) => (lineIndex === 1 ? "#0f172a" : "#cbd5e1"),
    paddingLeft: (colIndex: number) => (colIndex === 0 ? 0 : 6),
    paddingRight: (colIndex: number, node: any) =>
      colIndex === node.table.widths.length - 1 ? 0 : 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (isTableRow(line) && !isSeparatorRow(line)) {
      const tableLines: string[] = [line]
      i++
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i])
        i++
      }
      const [headerLine, , ...dataLines] = tableLines
      const headers = parseTableRow(headerLine)
      const rows = dataLines
        .filter((l) => !isSeparatorRow(l) && isTableRow(l))
        .map(parseTableRow)

      if (headers.length > 0 && rows.length > 0) {
        const chunks = splitWideTable(headers, rows, MAX_DATA_COLS_PDF)
        chunks.forEach((chunk, chunkIndex) => {
          const colCount = chunk.headers.length
          const widths = pdfColWidths(colCount)

          if (chunkIndex > 0) {
            result.push({
              text: `Продолжение таблицы (${chunkIndex + 1} / ${chunks.length})`,
              fontSize: 8,
              color: "#64748b",
              italics: true,
              margin: [0, 8, 0, 2],
            })
          }

          const headerRow = chunk.headers.map((h) => ({
            ...buildPdfCellText(h),
            bold: true,
            fontSize: 9.5,
            fillColor: "#f1f5f9",
            color: "#0f172a",
            lineHeight: 1.15,
            noWrap: false,
            preserveLeadingSpaces: true,
          }))
          const dataRows = chunk.rows.map((row) =>
            normalizeRow(row, colCount).map((cell) => ({
              ...buildPdfCellText(cell),
              fontSize: 9.5,
              color: "#142033",
              lineHeight: 1.2,
              noWrap: false,
              preserveLeadingSpaces: true,
            }))
          )

          result.push({
            table: {
              headerRows: 1,
              keepWithHeaderRows: 1,
              widths,
              body: [headerRow, ...dataRows],
            },
            layout: tableLayout,
            margin: [0, 4, 0, 12],
          })
        })
      }
      continue
    }

    if (!trimmed || isImageLine(line)) {
      result.push({ text: "", margin: [0, 0, 0, 8] })
    } else if (trimmed.startsWith("### ")) {
      result.push({
        text: stripMarkdownMarkers(trimmed),
        fontSize: 13,
        bold: true,
        color: "#0f172a",
        margin: [0, 12, 0, 6],
      })
    } else if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      result.push({
        text: stripMarkdownMarkers(trimmed),
        fontSize: 15,
        bold: true,
        color: "#0f172a",
        margin: [0, 14, 0, 8],
      })
    } else {
      result.push({
        text: splitBoldParts(trimmed).map((part) => {
          const isBold = part.startsWith("**") && part.endsWith("**")
          return { text: isBold ? part.slice(2, -2) : part, bold: isBold }
        }),
        fontSize: 11,
        lineHeight: 1.35,
        color: "#142033",
        margin: [0, 0, 0, 6],
      })
    }

    i++
  }

  return result
}

function buildBaseFileName(payload: ExportMessagePayload) {
  const title = sanitizeFileName(payload.conversationTitle || "ai_answer")
  const date = new Date(payload.createdAt).toISOString().slice(0, 10)
  return `${title}_${date}`
}

export async function exportMessageToDocx(payload: ExportMessagePayload) {
  const docx = await import("docx")
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    ShadingType,
  } = docx

  const bodyChildren = buildDocxParagraphDescriptors(payload.content).flatMap((item) => {
    switch (item.type) {
      case "empty":
        return [new Paragraph({ spacing: { after: 160 } })]
      case "h3":
        return [new Paragraph({ text: item.text, heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 100 } })]
      case "h2":
        return [new Paragraph({ text: item.text, heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 } })]
      case "h1":
        return [new Paragraph({ text: item.text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 140 } })]
      case "text":
        return [
          new Paragraph({
            children: item.parts.map((part) => {
              const isBold = part.startsWith("**") && part.endsWith("**")
              return new TextRun({ text: isBold ? part.slice(2, -2) : part, bold: isBold, size: 24, color: "142033" })
            }),
            spacing: { after: 120 },
          }),
        ]
      case "table": {
        const colCount = item.headers.length
        const colWidths = docxColWidths(colCount)

        const makeCell = (text: string, isHeader: boolean, colIndex: number) =>
          new TableCell({
            width: { size: colWidths[colIndex] ?? colWidths[colWidths.length - 1], type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: safeCell(text),
                    bold: isHeader,
                    size: 20,
                    color: "142033",
                  }),
                ],
                spacing: { before: 60, after: 60 },
              }),
            ],
            shading: isHeader ? { type: ShadingType.SOLID, color: "F1F5F9" } : undefined,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
          })

        const headerRow = new TableRow({
          children: item.headers.map((h, ci) => makeCell(h, true, ci)),
          tableHeader: true,
        })
        const dataRows = item.rows.map(
          (row) =>
            new TableRow({
              children: normalizeRow(row, colCount).map((cell, ci) => makeCell(cell, false, ci)),
            })
        )

        return [
          new Table({
            width: { size: DOCX_PAGE_WIDTH, type: WidthType.DXA },
            rows: [headerRow, ...dataRows],
          }),
          new Paragraph({ spacing: { after: 160 } }),
        ]
      }
    }
  })

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: payload.appName,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            text: payload.conversationTitle,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Раздел: ", bold: true }), new TextRun(payload.sectionName)],
            spacing: { after: 80 },
          }),
          ...(payload.documentName
            ? [
                new Paragraph({
                  children: [new TextRun({ text: "Документ: ", bold: true }), new TextRun(payload.documentName)],
                  spacing: { after: 80 },
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({ text: "Дата ответа: ", bold: true }),
              new TextRun(formatExportDate(payload.createdAt)),
            ],
            spacing: { after: 220 },
            border: { bottom: { color: "B8C4D9", style: BorderStyle.SINGLE, size: 1 } },
          }),
          ...bodyChildren,
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, `${buildBaseFileName(payload)}.docx`)
}

export async function exportMessageToPdf(payload: ExportMessagePayload) {
  const pdfMakeModule = await import("pdfmake/build/pdfmake")
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts")

  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
  const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule

  if (typeof pdfMake.addVirtualFileSystem === "function") {
    pdfMake.addVirtualFileSystem(pdfFonts)
  } else if (!pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs ?? pdfFonts
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: PDF_PAGE_MARGINS,
    content: [
      {
        text: payload.appName,
        alignment: "center",
        fontSize: 18,
        bold: true,
        color: "#1d4ed8",
        margin: [0, 0, 0, 12],
      },
      {
        text: payload.conversationTitle,
        fontSize: 20,
        bold: true,
        color: "#0f172a",
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: [{ text: "Раздел: ", bold: true }, { text: payload.sectionName }],
                fontSize: 10,
                color: "#475569",
                margin: [0, 0, 0, 4],
              },
              ...(payload.documentName
                ? [
                    {
                      text: [{ text: "Документ: ", bold: true }, { text: payload.documentName }],
                      fontSize: 10,
                      color: "#475569",
                    },
                  ]
                : []),
            ],
          },
          {
            width: "auto",
            text: formatExportDate(payload.createdAt),
            fontSize: 10,
            color: "#64748b",
            alignment: "right",
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: PDF_CONTENT_WIDTH, y2: 0, lineWidth: 1, lineColor: "#d7e0ee" }],
        margin: [0, 0, 0, 18],
      },
      ...buildPdfContent(payload.content),
    ],
    defaultStyle: { font: "Roboto" },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: payload.appName, color: "#64748b", fontSize: 9, margin: [PDF_PAGE_MARGINS[0], 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", color: "#64748b", fontSize: 9, margin: [0, 0, PDF_PAGE_MARGINS[2], 0] },
      ],
    }),
  }

  pdfMake.createPdf(docDefinition).download(`${buildBaseFileName(payload)}.pdf`)
}
