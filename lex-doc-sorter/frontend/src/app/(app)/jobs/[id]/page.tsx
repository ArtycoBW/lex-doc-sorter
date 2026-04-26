"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Check, FileText, Loader2, Pencil, Save } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type ProcessedFile, type SortingJob } from "@/lib/api"

const statusLabels: Record<SortingJob["status"], string> = {
  PENDING: "Ожидает",
  UPLOADING: "Загрузка",
  PROCESSING: "Обработка",
  COMPLETED: "Готово",
  FAILED: "Ошибка",
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} МБ`
  }

  return `${Math.max(1, Math.round(size / 1024))} КБ`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function JobDetailsPage() {
  const params = useParams<{ id: string }>()
  const jobId = params.id
  const [job, setJob] = useState<SortingJob | null>(null)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const loadJob = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      setJob(await api.getJob(jobId))
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось загрузить задание"))
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void loadJob()
  }, [loadJob])

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
        </div>
        <Badge variant="outline">{statusLabels[job.status]}</Badge>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card/70 p-5">
          <p className="text-sm text-muted-foreground">Файлов</p>
          <p className="mt-2 text-3xl font-semibold">{job.totalFiles}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/70 p-5">
          <p className="text-sm text-muted-foreground">Обработано</p>
          <p className="mt-2 text-3xl font-semibold">{job.processedFiles}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/70 p-5">
          <p className="text-sm text-muted-foreground">Статус</p>
          <p className="mt-3 text-base font-semibold">
            {statusLabels[job.status]}
          </p>
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
                    </>
                  )}
                </div>
                <div className="flex gap-2">
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
                      Переименовать
                    </Button>
                  )}
                  {file.processedName && editingFileId !== file.id && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Check className="h-3.5 w-3.5" />
                      Имя сохранено
                    </div>
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
