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

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { api, type SortingJob } from "@/lib/api"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export default function DashboardPage() {
  const { user } = useAuth()
  const name = user?.name?.trim() || "пользователь"
  const [jobs, setJobs] = useState<SortingJob[]>([])
  const [totalJobs, setTotalJobs] = useState(0)

  useEffect(() => {
    let mounted = true

    api.getJobs({ page: 1, limit: 5 })
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
      { label: "Всего заданий", value: String(totalJobs), icon: FolderOpen },
      {
        label: "Обработано файлов",
        value: String(processedFiles),
        icon: CheckCircle2,
      },
      { label: "Создано PDF", value: String(outputPdfs), icon: FileStack },
    ]
  }, [jobs, totalJobs])

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Рабочая область</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Добро пожаловать, {name}
          </h1>
        </div>
        <Button asChild className="gap-2 sm:w-auto">
          <Link href="/jobs/new">
            Новое задание
            <Upload className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.label} className="border-border/80 bg-card/70">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <Link
          href="/jobs/new"
          className="group flex min-h-72 flex-col justify-between rounded-lg border border-border bg-card/75 p-6 transition-colors hover:border-primary/60 hover:bg-card"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Upload className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Новое задание
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Создайте пакет документов и загрузите файлы для дальнейшей
              обработки.
            </p>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm font-medium text-primary">
            Перейти к загрузке
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <section className="rounded-lg border border-border bg-card/70">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FolderOpen className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium">
                Нет заданий. Создайте первое!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        Задание {job.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(job.createdAt)} · файлов: {job.totalFiles}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
