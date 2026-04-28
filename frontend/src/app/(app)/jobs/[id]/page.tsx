"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Archive,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Play,
  Save,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type ProcessedFile, type SortingJob } from "@/lib/api"
import { cn } from "@/lib/utils"

const statusLabels: Record<SortingJob["status"], string> = {
  PENDING: "Ожидает",
  UPLOADING: "Загрузка",
  PROCESSING: "Обработка",
  COMPLETED: "Готово",
  FAILED: "Ошибка",
}

const fileStatusLabels: Record<ProcessedFile["status"], string> = {
  PENDING: "Ожидает",
  PROCESSING: "Обработка",
  COMPLETED: "PDF готов",
  FAILED: "Ошибка",
  SKIPPED: "Пропущен",
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

export default function JobDetailsPage() {
  const params = useParams<{ id: string }>()
  const jobId = params.id
  const [job, setJob] = useState<SortingJob | null>(null)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState("")

  const loadJob = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true)
      }

      setError("")

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
    if (job?.status !== "PROCESSING" && job?.status !== "UPLOADING") {
      return
    }

    const timer = window.setInterval(() => {
      void loadJob({ silent: true })
    }, 2000)

    return () => window.clearInterval(timer)
  }, [job?.status, loadJob])

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
  const canDownload = job?.status === "COMPLETED" && job.processedFiles > 0

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
      setError(getErrorMessage(error, "Не удалось сохранить имя файла"))
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
      <div className="rounded-lg border border-border bg-card/70 px-5 py-10 text-center">
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
            {job.id.slice(0, 8)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Создано {formatDate(job.createdAt)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            job.status === "COMPLETED" && "border-emerald-500/40 text-emerald-500",
            job.status === "FAILED" && "border-destructive/40 text-destructive",
            job.status === "PROCESSING" && "border-primary/40 text-primary",
          )}
        >
          {statusLabels[job.status]}
        </Badge>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-border bg-card/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full rounded-md border border-border bg-muted/40 p-1 sm:w-auto">
            <button
              type="button"
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-sm bg-background px-4 text-sm font-medium shadow-sm sm:flex-none"
            >
              <Play className="h-4 w-4" />
              Быстрый режим
            </button>
            <button
              type="button"
              disabled
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium text-muted-foreground opacity-60 sm:flex-none"
            >
              <Sparkles className="h-4 w-4" />
              Умный режим
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
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

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">Файлов</p>
            <p className="mt-2 text-2xl font-semibold">{job.totalFiles}</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">PDF готово</p>
            <p className="mt-2 text-2xl font-semibold">{job.processedFiles}</p>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">Прогресс</p>
            <p className="mt-2 text-2xl font-semibold">{progress}%</p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card/70">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Файлы задания</h2>
        </div>
        <div className="divide-y divide-border">
          {job.files.map((file) => (
            <div key={file.id} className="px-5 py-4">
              <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
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
                      <p className="truncate text-sm font-medium">
                        {file.processedName || file.originalName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {file.originalName} · {formatSize(file.sizeBytes)}
                      </p>
                      {file.errorMessage && (
                        <p className="mt-1 text-xs text-destructive">
                          {file.errorMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      file.status === "COMPLETED" &&
                        "border-emerald-500/40 text-emerald-500",
                      file.status === "FAILED" &&
                        "border-destructive/40 text-destructive",
                    )}
                  >
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
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => startEdit(file)}
                    >
                      <Pencil className="h-4 w-4" />
                      Имя
                    </Button>
                  )}
                  {file.outputPdfPath && editingFileId !== file.id && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Готово
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
