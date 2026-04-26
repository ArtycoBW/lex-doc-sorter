"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ArrowRight, FileStack } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const name = user?.name?.trim() || "пользователь"

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login")
    }
  }, [loading, router, user])

  if (loading || !user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center">
        <div className="max-w-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-primary">
            <FileStack className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Добро пожаловать, {name}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Это стартовая рабочая область Lex-Doc Sorter. Разделы заданий,
            загрузки и обработки появятся в следующих подэтапах.
          </p>
          <div className="mt-8">
            <Button asChild className="gap-2">
              <Link href="/">
                На главную
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
