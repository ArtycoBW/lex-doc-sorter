import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  FileArchive,
  FileSearch,
  FileStack,
  FolderKanban,
  Scale,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const steps = [
  {
    icon: Upload,
    title: "Загрузите файлы",
    text: "Фото, сканы и PDF из судебного дела собираются в одно задание.",
  },
  {
    icon: FileSearch,
    title: "Проверьте порядок",
    text: "Сервис помогает разложить документы, переименовать их и подготовить к выдаче.",
  },
  {
    icon: FileArchive,
    title: "Скачайте пакет",
    text: "На выходе будут PDF, реестр и ZIP для дальнейшей подачи.",
  },
]

const benefits = [
  "Единое место для судебных документов",
  "Авторизация и личный кабинет",
  "Готовность к OCR, AI-сортировке и S3-хранилищу",
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="h-5 w-5" />
            </span>
            Lex-Doc Sorter
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Войти</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/register">Начать</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
            <FileStack className="h-4 w-4 text-primary" />
            Документооборот для судебных материалов
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Наведите порядок в фото, сканах и PDF перед подачей
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Lex-Doc Sorter помогает юристам быстро собрать рабочий пакет
            документов: загрузить материалы, проверить структуру, переименовать
            файлы и подготовить выгрузку.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/auth/register">
                Попробовать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/auth/login">У меня есть аккаунт</Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            {benefits.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="text-sm font-medium">Задание #001</p>
              <p className="text-xs text-muted-foreground">Подготовка пакета</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              72%
            </span>
          </div>

          <div className="space-y-3">
            {[
              ["001_Договор_Аренда.pdf", "Готово"],
              ["002_Акт_Приема.pdf", "Проверка"],
              ["003_Реестр_Документов.xlsx", "Ожидает"],
            ].map(([name, status]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{name}</span>
                </div>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                  {status}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[72%] rounded-full bg-primary" />
          </div>
        </div>
      </section>

      <section className="border-t border-border/70 bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-12 sm:px-8 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-lg border border-border bg-card p-5">
              <step.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
