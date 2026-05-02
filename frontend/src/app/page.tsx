"use client"

import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileArchive,
  FileSearch,
  FileStack,
  FolderKanban,
  Lock,
  Scale,
  Shield,
  Upload,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { FallingPattern } from "@/components/ui/falling-pattern"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/context/auth-context"

const stats = [
  { value: "PDF", label: "Единый формат вывода", icon: FileStack },
  { value: "OCR", label: "Готовность к распознаванию", icon: FileSearch },
  { value: "S3", label: "Облачное хранилище", icon: Shield },
  { value: "ZIP", label: "Архив для подачи", icon: FileArchive },
]

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Загрузите файлы",
    text: "Фото, сканы и PDF собираются в одно задание. Drag and drop или выбор папки, как вам удобнее.",
  },
  {
    number: "02",
    icon: FileSearch,
    title: "Проверьте структуру",
    text: "Сервис переименует файлы, расставит порядок и подготовит пакет документов к выгрузке.",
  },
  {
    number: "03",
    icon: FileArchive,
    title: "Скачайте пакет",
    text: "На выходе PDF, реестр документов и ZIP-архив, готовый к подаче в суд или архивированию.",
  },
]

const features = [
  {
    icon: FileStack,
    title: "Пакетная загрузка",
    text: "Загружайте сотни документов одновременно с поддержкой drag and drop и множества форматов.",
  },
  {
    icon: Shield,
    title: "Безопасное хранение",
    text: "Документы хранятся в защищённом хранилище. Доступ есть только у владельца аккаунта.",
  },
  {
    icon: Zap,
    title: "Быстрая обработка",
    text: "Автоматическая нумерация, переименование и конвертация файлов без ручной рутины.",
  },
  {
    icon: Lock,
    title: "Личный кабинет",
    text: "Вход по email, история заданий и управление пакетами документов в одном месте.",
  },
  {
    icon: BarChart3,
    title: "Статистика дел",
    text: "Следите за прогрессом подготовки каждого пакета документов в реальном времени.",
  },
  {
    icon: FolderKanban,
    title: "Реестр документов",
    text: "Автоматическое формирование описи и структурирование по правилам судебного документооборота.",
  },
]

export default function HomePage() {
  const { user, loading } = useAuth()
  const isAuthorized = Boolean(user)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 z-50 w-full border-b border-border/30 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all duration-300">
              <Scale className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Lex-Doc Sorter</span>
          </Link>
          <nav className="flex items-center gap-1">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            {isAuthorized ? (
              <Button asChild size="sm" className="ml-1 gap-1.5">
                <Link href="/dashboard">
                  Дашборд
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Link href="/auth/login">Войти</Link>
                </Button>
                <Button asChild size="sm" className="ml-1 gap-1.5">
                  <Link href="/auth/register">
                    {loading ? "Проверяем" : "Начать"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <FallingPattern
            className="h-full w-full [mask-image:radial-gradient(ellipse_80%_80%_at_50%_40%,transparent_20%,black_65%)]"
            blurIntensity="2px"
            duration={160}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/95" />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 50% 30%, hsl(var(--primary) / 0.15), transparent 70%)",
          }}
        />

        <div className="relative z-10 px-5 text-center sm:px-8">
          <div className="fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <FileStack className="h-3.5 w-3.5" />
            Документооборот для юристов
          </div>

          <h1 className="fade-in-up mx-auto max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Наведите порядок <br className="hidden sm:block" />
            в документах <span className="text-gradient">перед подачей</span>
          </h1>

          <p className="fade-in-up-delay-1 mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Загружайте фото, сканы и PDF. Сервис поможет переименовать,
            упорядочить и подготовить документы к выгрузке в суд.
          </p>

          <div className="fade-in-up-delay-2 mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="gradient" size="lg" className="gap-2 px-7">
              <Link href={isAuthorized ? "/dashboard" : "/auth/register"}>
                {isAuthorized ? "Открыть дашборд" : "Попробовать бесплатно"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border/60 bg-card/30 backdrop-blur-sm hover:bg-card/60"
            >
              <Link href={isAuthorized ? "/jobs/new" : "/auth/login"}>
                {isAuthorized ? "Создать задание" : "У меня есть аккаунт"}
              </Link>
            </Button>
          </div>

          <div className="fade-in-up-delay-3 mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon

              return (
                <div key={stat.value} className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 backdrop-blur-sm">
                  <Icon className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-2 text-sm font-semibold">{stat.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative border-y border-border/50 bg-card/30 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium text-primary">Как работает сервис</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              От хаоса в папке к готовому пакету
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon

              return (
                <div key={step.number} className="rounded-2xl border border-border/70 bg-background/50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">{step.number}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="text-sm font-medium text-primary">Возможности</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Всё, что нужно для первого рабочего контура
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <div key={feature.title} className="group rounded-2xl border border-border/70 bg-card/60 p-5 transition-colors hover:bg-muted/35">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 px-5 py-16 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Готово к пилотному использованию
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Начните с тестового пакета документов
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Загрузите реальные фото или PDF и проверьте сценарий подготовки пакета к подаче.
            </p>
          </div>
          <Button asChild size="lg" className="gap-2">
            <Link href={isAuthorized ? "/jobs/new" : "/auth/register"}>
              Перейти к загрузке
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
