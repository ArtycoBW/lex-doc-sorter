"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Archive,
  Ban,
  CheckCircle2,
  FileDown,
  FileText,
  Loader2,
  PencilLine,
  Play,
  Save,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type FileStatus, type JobStatus, type ProcessedFile, type SortingJob } from "@/lib/api"
import { cn } from "@/lib/utils"

const statusLabels: Record<JobStatus, string> = {
  PENDING: "Файлы загружены",
  UPLOADING: "Загрузка",
  PROCESSING: "Обработка",
  COMPLETED: "Готово",
  FAILED: "Остановлено",
}

const fileStatusLabels: Record<FileStatus, string> = {
  PENDING: "Загружен",
  PROCESSING: "В работе",
  COMPLETED: "PDF готов",
  FAILED: "Ошибка",
  SKIPPED: "Отменён",
}

const docTypeLabels: Record<string, string> = {
  contract: "Договор",
  act: "Акт",
  appendix: "Приложение",
  decision: "Решение",
  ruling: "Определение",
  invoice: "Счёт",
  power_of_attorney: "Доверенность",
  protocol: "Протокол",
  notice: "Уведомление",
  certificate: "Справка",
  statement: "Заявление",
  other: "Документ",
}

const activeStatuses = new Set<JobStatus>(["UPLOADING", "PROCESSING"])

type DocumentGroup = {
  id: string
  index: number
  files: ProcessedFile[]
  representative: ProcessedFile
  pageCount: number
  sizeBytes: number
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} МБ`
  }

  return `${Math.max(1, Math.round(size / 1024))} КБ`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function getJobBadgeClass(status: JobStatus) {
  return cn(
    "rounded-full px-3 py-1",
    status === "COMPLETED" && "border-emerald-500/35 text-emerald-600 dark:text-emerald-400",
    status === "FAILED" && "border-amber-500/35 text-amber-600 dark:text-amber-400",
    status === "PROCESSING" && "border-primary/35 text-primary",
    status === "UPLOADING" && "border-primary/35 text-primary",
  )
}

function getFileBadgeClass(status: FileStatus) {
  return cn(
    "rounded-full px-3 py-1",
    status === "COMPLETED" && "border-emerald-500/35 text-emerald-600 dark:text-emerald-400",
    status === "FAILED" && "border-destructive/35 text-destructive",
    status === "PROCESSING" && "border-primary/35 text-primary",
    status === "SKIPPED" && "border-amber-500/35 text-amber-600 dark:text-amber-400",
  )
}

function getDocumentGroups(files: ProcessedFile[]): DocumentGroup[] {
  const groups = new Map<number, ProcessedFile[]>()

  for (const file of files) {
    const key = file.groupIndex ?? file.orderIndex
    groups.set(key, [...(groups.get(key) || []), file])
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([index, groupFiles]) => ({
      id: String(index),
      index,
      files: groupFiles,
      representative: groupFiles[0],
      pageCount: groupFiles.reduce((sum, file) => sum + Math.max(1, file.pageCount || 1), 0),
      sizeBytes: groupFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
    }))
    .filter((group): group is DocumentGroup => Boolean(group.representative))
}

export default function JobDetailsPage() {
  const params = useParams<{ id: string }>()
  const jobId = params.id
  const [job, setJob] = useState<SortingJob | null>(null)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [registryDownloading, setRegistryDownloading] = useState<"xlsx" | "docx" | null>(null)
  const [applyingNames, setApplyingNames] = useState(false)
  const [error, setError] = useState("")

  const loadJob = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true)
      }

      if (!options?.silent) {
        setError("")
      }

      try {
        setJob(await api.getJob(jobId))
      } catch (error: unknown) {
        setError(getErrorMessage(error, "Не удалось загрузить задание"))
      } finally {
        if (!options?.silent) {
          setLoading(false)
        }
      }
    },
    [jobId],
  )

  useEffect(() => {
    void loadJob()
  }, [loadJob])

  useEffect(() => {
    if (!job || !activeStatuses.has(job.status)) {
      return
    }

    const timer = window.setInterval(() => {
      void loadJob({ silent: true })
    }, 1500)

    return () => window.clearInterval(timer)
  }, [job, loadJob])

  const progress = useMemo(() => {
    if (!job?.totalFiles) {
      return 0
    }

    return Math.round((job.processedFiles / job.totalFiles) * 100)
  }, [job?.processedFiles, job?.totalFiles])

  const canProcess =
    Boolean(job?.files.length) &&
    job?.status !== "PROCESSING" &&
    job?.status !== "UPLOADING"
  const canCancel =
    Boolean(job?.files.length) &&
    (job?.status === "PROCESSING" ||
      job?.status === "UPLOADING" ||
      job?.status === "PENDING")
  const canDownload = job?.status === "COMPLETED" && job.processedFiles > 0
  const documentGroups = useMemo(
    () => getDocumentGroups(job?.files || []),
    [job?.files],
  )

  const startEdit = (file: ProcessedFile) => {
    setEditingFileId(file.id)
    setEditingName(file.processedName || file.originalName)
  }

  const saveName = async () => {
    if (!job || !editingFileId || !editingName.trim()) {
      return
    }

    setSaving(true)
    setError("")

    try {
      const updatedFile = await api.updateJobFileName(
        job.id,
        editingFileId,
        editingName.trim(),
      )

      setJob({
        ...job,
        files: job.files.map((file) =>
          file.id === updatedFile.id ? updatedFile : file,
        ),
      })
      setEditingFileId(null)
      setEditingName("")
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось сохранить название файла"))
    } finally {
      setSaving(false)
    }
  }

  const startProcessing = async () => {
    if (!job) {
      return
    }

    setProcessing(true)
    setError("")

    try {
      setJob(await api.startJobProcessing(job.id))
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось обработать файлы"))
      await loadJob({ silent: true })
    } finally {
      setProcessing(false)
    }
  }

  const cancelProcessing = async () => {
    if (!job) {
      return
    }

    setCanceling(true)
    setError("")

    try {
      setJob(await api.cancelJobProcessing(job.id))
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось отменить обработку"))
      await loadJob({ silent: true })
    } finally {
      setCanceling(false)
    }
  }

  const downloadArchive = async () => {
    if (!job) {
      return
    }

    setDownloading(true)
    setError("")

    try {
      const archive = await api.downloadJobArchive(job.id)
      downloadBlob(archive.blob, archive.fileName)
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось скачать архив"))
    } finally {
      setDownloading(false)
    }
  }

  const applySmartNames = async () => {
    if (!job) {
      return
    }

    setApplyingNames(true)
    setError("")

    try {
      setJob(await api.applyJobSmartNames(job.id))
      setEditingFileId(null)
      setEditingName("")
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось применить имена"))
    } finally {
      setApplyingNames(false)
    }
  }

  const downloadRegistry = async (format: "xlsx" | "docx") => {
    if (!job) {
      return
    }

    setRegistryDownloading(format)
    setError("")

    try {
      const registry = await api.downloadJobRegistry(job.id, format)
      downloadBlob(registry.blob, registry.fileName)
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось скачать реестр"))
    } finally {
      setRegistryDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[22rem] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Загрузка
      </div>
    )
  }

  if (!job) {
    return (
      <div className="rounded-xl border border-border bg-card/70 px-5 py-10 text-center">
        {error || "Задание не найдено"}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Задание</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Пакет {job.id.slice(0, 8)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Создано {formatDate(job.createdAt)}
          </p>
        </div>
        <Badge variant="outline" className={getJobBadgeClass(job.status)}>
          {activeStatuses.has(job.status) && (
            <span className="mr-1.5 inline-flex h-2 w-2 rounded-full bg-primary" />
          )}
          {statusLabels[job.status]}
        </Badge>
      </section>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card/72">
        <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
          <div className="p-5">
            <div className="inline-flex rounded-xl border border-border bg-background/58 p-1">
              <button
                type="button"
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-card px-4 text-sm font-medium"
              >
                <Play className="h-4 w-4" />
                Быстрый режим
              </button>
              <button
                type="button"
                disabled
                className="flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-muted-foreground opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                Умный режим
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border p-5 sm:flex-row lg:border-l lg:border-t-0">
            <Button
              type="button"
              className="gap-2"
              disabled={!canProcess || processing}
              onClick={() => void startProcessing()}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Обработать
            </Button>
            {canCancel && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={canceling}
                onClick={() => void cancelProcessing()}
              >
                {canceling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Отменить
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!canDownload || applyingNames}
              onClick={() => void applySmartNames()}
            >
              {applyingNames ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Применить имена
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!canDownload || registryDownloading !== null}
              onClick={() => void downloadRegistry("xlsx")}
            >
              {registryDownloading === "xlsx" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Реестр XLSX
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!canDownload || registryDownloading !== null}
              onClick={() => void downloadRegistry("docx")}
            >
              {registryDownloading === "docx" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Реестр DOCX
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!canDownload || downloading}
              onClick={() => void downloadArchive()}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              Скачать всё
            </Button>
          </div>
        </div>

        <div className="grid border-t border-border sm:grid-cols-3">
          {[
            ["Файлов", job.totalFiles],
            ["PDF готово", job.processedFiles],
            ["Прогресс", `${progress}%`],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-border p-5 sm:border-b-0 sm:border-r last:border-r-0">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="p-5">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Обработано {job.processedFiles} из {job.totalFiles}
            </span>
            <span>{statusLabels[job.status]}</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card/72">
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Документы задания</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {documentGroups.length} PDF из {job.files.length} загруженных файлов
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            Умная маска имён
          </Badge>
        </div>
        <div className="divide-y divide-border">
          {documentGroups.map((group) => {
            const file = group.representative
            const docType = file.docType ? docTypeLabels[file.docType] || "Документ" : "Документ"
            const meta = [
              docType,
              file.docDate,
              file.docNumber,
              group.pageCount > 1 ? `${group.pageCount} стр.` : "1 стр.",
              formatSize(group.sizeBytes),
            ].filter(Boolean)

            return (
            <div key={group.id} className="px-5 py-4 transition-colors hover:bg-muted/28">
              <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  {editingFileId === file.id ? (
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void saveName()
                        }
                      }}
                    />
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          aria-label="Переименовать файл"
                          title="Переименовать"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => startEdit(file)}
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <p className="truncate text-sm font-medium">
                          {file.processedName || file.originalName}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {meta.join(" · ")}
                      </p>
                      {file.docParties.length > 0 && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {file.docParties.join(" · ")}
                        </p>
                      )}
                      {group.files.length > 1 && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Собрано из файлов: {group.files.map((item) => item.originalName).join(", ")}
                        </p>
                      )}
                      {file.docSummary && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {file.docSummary}
                        </p>
                      )}
                      {file.errorMessage && (
                        <p className="mt-1 text-xs text-destructive">
                          {file.errorMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={getFileBadgeClass(file.status)}>
                    {file.status === "PROCESSING" && (
                      <span className="mr-1.5 inline-flex h-2 w-2 rounded-full bg-primary" />
                    )}
                    {fileStatusLabels[file.status]}
                  </Badge>
                  {editingFileId === file.id ? (
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      disabled={saving}
                      onClick={() => void saveName()}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Сохранить
                    </Button>
                  ) : null}
                  {file.outputPdfPath && editingFileId !== file.id && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Готово
                    </span>
                  )}
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
