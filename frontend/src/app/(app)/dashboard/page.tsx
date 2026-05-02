"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  FileStack,
  FolderOpen,
  Upload,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { api, type SortingJob } from "@/lib/api"
import { cn } from "@/lib/utils"

const statusLabels: Record<SortingJob["status"], string> = {
  PENDING: "Файлы загружены",
  UPLOADING: "Загрузка",
  PROCESSING: "Обработка",
  COMPLETED: "Готово",
  FAILED: "Остановлено",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getStatusClass(status: SortingJob["status"]) {
  return cn(
    "rounded-full px-2.5 py-0.5 text-[11px]",
    status === "COMPLETED" && "border-emerald-500/35 text-emerald-600 dark:text-emerald-400",
    status === "PROCESSING" && "border-primary/35 text-primary",
    status === "UPLOADING" && "border-primary/35 text-primary",
    status === "FAILED" && "border-amber-500/35 text-amber-600 dark:text-amber-400",
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const name = user?.name?.trim() || "пользователь"
  const [jobs, setJobs] = useState<SortingJob[]>([])
  const [totalJobs, setTotalJobs] = useState(0)

  useEffect(() => {
    let mounted = true

    api
      .getJobs({ page: 1, limit: 5 })
      .then((result) => {
        if (!mounted) return
        setJobs(result.items)
        setTotalJobs(result.total)
      })
      .catch(() => {
        if (!mounted) return
        setJobs([])
        setTotalJobs(0)
      })

    return () => {
      mounted = false
    }
  }, [])

  const stats = useMemo(() => {
    const processedFiles = jobs.reduce(
      (sum, job) => sum + job.processedFiles,
      0,
    )
    const outputPdfs = jobs.reduce(
      (sum, job) => sum + job.files.filter((file) => file.outputPdfPath).length,
      0,
    )

    return [
      { label: "Заданий", value: String(totalJobs), icon: FolderOpen },
      { label: "Файлов обработано", value: String(processedFiles), icon: CheckCircle2 },
      { label: "PDF создано", value: String(outputPdfs), icon: FileStack },
    ]
  }, [jobs, totalJobs])

  return (
    <div className="space-y-7">
      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-border bg-card/72 p-6">
          <p className="text-sm font-medium text-primary">Рабочая область</p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Добро пожаловать, {name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Собирайте судебные материалы в один пакет: загрузка стартует автоматически, а готовые PDF появятся в задании без ручного обновления.
              </p>
            </div>
            <Button asChild className="gap-2 lg:shrink-0">
              <Link href="/jobs/new">
                Новое задание
                <Upload className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/72 p-5">
          <p className="text-sm font-medium">Сводка</p>
          <div className="mt-4 space-y-4">
            {stats.map((item) => {
              const Icon = item.icon

              return (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xl font-semibold tabular-nums">
                    {item.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <Link
          href="/jobs/new"
          className="group flex min-h-72 flex-col justify-between rounded-2xl border border-border bg-card/72 p-6 transition-colors hover:bg-card"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Создать пакет документов
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Перетащите фото, сканы или PDF. Если интернет прервётся, сервис предложит продолжить загрузку.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm font-medium text-primary">
            Перейти к загрузке
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border bg-card/72">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">Последние задания</h2>
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/jobs">
                Все
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {jobs.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FolderOpen className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium">
                Заданий пока нет. Начните с первого пакета.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-muted/28"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        Пакет {job.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(job.createdAt)} · файлов: {job.totalFiles}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className={getStatusClass(job.status)}>
                        {statusLabels[job.status]}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}
