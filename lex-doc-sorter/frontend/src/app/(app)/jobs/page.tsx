import Link from "next/link"
import { FolderOpen, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function JobsPage() {
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

      <section className="flex min-h-[22rem] flex-col items-center justify-center rounded-lg border border-border bg-card/70 px-5 py-10 text-center">
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
      </section>
    </div>
  )
}
