"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { FolderOpen, Loader2, Trash2, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api, type SortingJob } from "@/lib/api"

const statusLabels: Record<SortingJob["status"], string> = {
  PENDING: "Ожидает",
  UPLOADING: "Загрузка",
  PROCESSING: "Обработка",
  COMPLETED: "Готово",
  FAILED: "Ошибка",
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<SortingJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadJobs = async () => {
    setLoading(true)
    setError("")

    try {
      const result = await api.getJobs({ page: 1, limit: 10 })
      setJobs(result.items)
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось загрузить задания"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadJobs()
  }, [])

  const handleDelete = async (jobId: string) => {
    setError("")

    try {
      await api.deleteJob(jobId)
      setJobs((current) => current.filter((job) => job.id !== jobId))
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось удалить задание"))
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">История</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Мои задания
          </h1>
        </div>
        <Button asChild className="gap-2">
          <Link href="/jobs/new">
            Новое задание
            <Upload className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-border bg-card/70">
        {loading ? (
          <div className="flex min-h-[22rem] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загрузка
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex min-h-[22rem] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">
              Нет заданий. Создайте первое!
            </h2>
            <Button asChild className="mt-5 gap-2">
              <Link href="/jobs/new">
                Перейти к созданию
                <Upload className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <Link href={`/jobs/${job.id}`} className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">
                      Задание {job.id.slice(0, 8)}
                    </h2>
                    <Badge variant="outline">{statusLabels[job.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(job.createdAt)} · файлов: {job.totalFiles}
                  </p>
                </Link>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/jobs/${job.id}`}>Открыть</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Удалить задание"
                    onClick={() => void handleDelete(job.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
