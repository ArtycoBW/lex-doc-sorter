"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Upload,
  User,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs/new", label: "Новое задание", icon: Upload },
  { href: "/jobs", label: "Мои задания", icon: FolderOpen },
  { href: "/profile", label: "Профиль", icon: User },
]

function LexDocLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-9 w-9 shrink-0"
      viewBox="0 0 40 40"
      role="img"
    >
      <rect width="40" height="40" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M11 10h10.5c4.2 0 7.5 3.3 7.5 7.5S25.7 25 21.5 25H17v5h-6V10Zm6 5v5h4.2c1.4 0 2.5-1.1 2.5-2.5S22.6 15 21.2 15H17Z"
        fill="hsl(var(--primary-foreground))"
      />
    </svg>
  )
}

function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const displayName = user?.name?.trim() || user?.email || "Lex-Doc"

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex min-h-16 items-center gap-3 px-5"
      >
        <LexDocLogo />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            Lex-Doc Sorter
          </div>
          <div className="truncate text-xs text-muted-foreground">
            Документы для суда
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-primary/12 text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-3 rounded-md bg-muted/45 px-3 py-2">
          <div className="truncate text-sm font-medium text-foreground">
            {displayName}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {user?.email}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login")
    }
  }, [loading, router, user])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Загрузка
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-card/70 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3">
          <LexDocLogo />
          <span className="text-sm font-semibold">Lex-Doc Sorter</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Открыть меню"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(20rem,calc(100vw-2rem))] border-r border-border bg-card shadow-2xl">
            <div className="absolute right-3 top-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Закрыть меню"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="lg:pl-72">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
