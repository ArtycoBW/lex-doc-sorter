"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Upload,
  User,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

const SIDEBAR_STORAGE_KEY = "lex-doc-sidebar-collapsed"

const navigation = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/jobs/new", label: "Новое задание", icon: Upload },
  { href: "/jobs", label: "Мои задания", icon: FolderOpen },
  { href: "/profile", label: "Профиль", icon: User },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href
  }

  if (href === "/jobs") {
    return pathname === "/jobs" || /^\/jobs\/(?!new(?:\/|$))/.test(pathname)
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return displayName.slice(0, 2).toUpperCase()
}

function LexDocLogo({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", compact ? "h-10 w-10" : "h-9 w-9")}
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

function UserAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-[0_12px_28px_-18px_hsl(var(--primary)/0.9)]">
      {getInitials(name)}
    </div>
  )
}

function Sidebar({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const displayName = user?.name?.trim() || user?.email || "Lex-Doc"

  return (
    <div className="relative flex h-full flex-col">
      {onToggleCollapse && (
        <button
          type="button"
          aria-label={collapsed ? "Развернуть сайдбар" : "Свернуть сайдбар"}
          title={collapsed ? "Развернуть" : "Свернуть"}
          className="absolute right-0 top-20 hidden h-9 w-9 translate-x-1/2 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground shadow-[0_14px_38px_-22px_hsl(var(--foreground)/0.7)] transition-all duration-200 hover:border-primary/45 hover:bg-primary hover:text-primary-foreground lg:flex"
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}

      <Link
        href="/dashboard"
        onClick={onNavigate}
        className={cn(
          "flex min-h-16 items-center gap-3 transition-opacity hover:opacity-85",
          collapsed ? "justify-center px-0" : "px-5",
        )}
        title="Lex-Doc Sorter"
      >
        <LexDocLogo compact={collapsed} />
        {!collapsed && (
          <div className="sidebar-label-reveal min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              Lex-Doc Sorter
            </div>
            <div className="truncate text-xs text-muted-foreground">
              Документы для суда
            </div>
          </div>
        )}
      </Link>

      <nav className={cn("flex-1 space-y-1 py-4", collapsed ? "px-2" : "px-3")}>
        {navigation.map((item, index) => {
          const Icon = item.icon
          const active = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              style={{ "--index": index } as CSSProperties}
              className={cn(
                "stagger-reveal group relative flex h-11 items-center rounded-md text-sm font-medium transition-all duration-200 active:translate-y-px",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_16px_34px_-24px_hsl(var(--primary)/0.95)]"
                  : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5",
                  active && "text-primary-foreground",
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div
        className={cn(
          "space-y-1 border-t border-border/60 p-3",
          collapsed && "flex flex-col items-center",
        )}
      >
        {collapsed ? (
          <>
            <div title={displayName}>
              <UserAvatar name={displayName} />
            </div>
            <ThemeToggle className="h-9 w-9 text-muted-foreground hover:text-foreground" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Выйти"
              title="Выйти"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="sidebar-label-reveal flex items-center gap-3 rounded-lg bg-muted/55 px-3 py-2.5">
              <UserAvatar name={displayName} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </div>
              </div>
              <ThemeToggle className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    setSidebarCollapsed(stored === "true")
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login")
    }
  }, [loading, router, user])

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="fade-in-up flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-sm text-muted-foreground">Загрузка</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_8%,hsl(var(--primary)/0.10),transparent_28%),linear-gradient(135deg,hsl(var(--muted)/0.38),transparent_36%)]" />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border/70 bg-card/86 shadow-[18px_0_40px_-34px_hsl(var(--foreground)/0.45)] backdrop-blur-xl transition-[width] duration-300 ease-out lg:block",
          sidebarCollapsed ? "w-20" : "w-72",
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      <header className="page-reveal sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3">
          <LexDocLogo />
          <span className="text-sm font-semibold">Lex-Doc Sorter</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Открыть меню"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="slide-in-right absolute inset-y-0 left-0 w-[min(20rem,calc(100vw-2rem))] border-r border-border/60 bg-card shadow-2xl">
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

      <main
        className={cn(
          "relative transition-[padding] duration-300 ease-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-72",
        )}
      >
        <div
          key={pathname}
          className="page-reveal mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </div>
      </main>
    </div>
  )
}
