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

const stats = [
  { value: "PDF", label: "Единый формат вывода" },
  { value: "OCR", label: "Готовность к распознаванию" },
  { value: "S3", label: "Облачное хранилище" },
  { value: "ZIP", label: "Архив для подачи" },
]

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Загрузите файлы",
    text: "Фото, сканы и PDF собираются в одно задание. Drag & drop или выбор папки — как вам удобно.",
  },
  {
    number: "02",
    icon: FileSearch,
    title: "Проверьте структуру",
    text: "Переименуйте файлы, расставьте порядковые номера, проверьте состав пакета документов.",
  },
  {
    number: "03",
    icon: FileArchive,
    title: "Скачайте пакет",
    text: "На выходе — PDF, реестр документов и ZIP-архив, готовый к подаче в суд или архивированию.",
  },
]

const features = [
  {
    icon: FileStack,
    title: "Пакетная загрузка",
    text: "Загружайте сотни документов одновременно с поддержкой drag & drop и множества форматов.",
  },
  {
    icon: Shield,
    title: "Безопасное хранение",
    text: "Документы хранятся зашифрованными в облаке. Доступ только у владельца аккаунта.",
  },
  {
    icon: Zap,
    title: "Быстрая обработка",
    text: "Автоматическая нумерация, переименование и конвертация файлов — за несколько секунд.",
  },
  {
    icon: Lock,
    title: "Личный кабинет",
    text: "Вход по email и коду, история заданий и управление всеми делами в одном месте.",
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
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Lex-Doc Sorter</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/auth/login">Войти</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/auth/register">
                Начать
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <FallingPattern
            className="h-full w-full [mask-image:radial-gradient(ellipse_80%_80%_at_50%_40%,transparent_20%,black_65%)]"
            color="hsl(217,91%,60%)"
            backgroundColor="hsl(222,47%,6%)"
            blurIntensity="2px"
            duration={160}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/95" />

        <div className="relative z-10 px-5 text-center sm:px-8">
          <div className="fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-sm text-primary">
            <FileStack className="h-3.5 w-3.5" />
            Документооборот для юристов
          </div>

          <h1 className="fade-in-up mx-auto max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Наведите порядок{" "}
            <br className="hidden sm:block" />
            в документах{" "}
            <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              перед подачей
            </span>
          </h1>

          <p className="fade-in-up-delay-1 mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Загрузите фото, сканы и PDF — сервис поможет переименовать, упорядочить
            и подготовить документы к выгрузке в суд.
          </p>

          <div className="fade-in-up-delay-2 mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="gap-2 px-7">
              <Link href="/auth/register">
                Попробовать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border/60 bg-card/40 backdrop-blur-sm"
            >
              <Link href="/auth/login">У меня есть аккаунт</Link>
            </Button>
          </div>

          <div className="fade-in-up-delay-3 mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Бесплатный старт", "Без установки", "Безопасно"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 bg-card/20">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-y divide-border/40 px-0 md:grid-cols-4 md:divide-y-0">
          {stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center justify-center p-7 text-center">
              <span className="font-mono text-2xl font-bold text-primary sm:text-3xl">{value}</span>
              <span className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
        <div className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Как это работает</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Три шага до готового пакета
          </h2>
        </div>

        <div className="relative grid gap-10 md:grid-cols-3">
          <div className="absolute left-[16.67%] right-[16.67%] top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

          {steps.map((step) => (
            <article key={step.title} className="relative flex flex-col items-center text-center">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
                <step.icon className="h-7 w-7 text-primary" />
                <span className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.number.slice(-1)}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2.5 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/40 bg-muted/10">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Возможности</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Всё для подготовки документов
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center sm:p-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at top left, hsl(217 91% 60% / 0.12), transparent 60%)",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Готовы начать?</h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Зарегистрируйтесь бесплатно и начните упорядочивать документы прямо сейчас.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/auth/register">
                  Создать аккаунт
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/login">Войти в систему</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scale className="h-4 w-4" />
            Lex-Doc Sorter
          </Link>
          <p className="text-xs text-muted-foreground">© 2025 Lex-Doc Sorter</p>
        </div>
      </footer>
    </main>
  )
}
