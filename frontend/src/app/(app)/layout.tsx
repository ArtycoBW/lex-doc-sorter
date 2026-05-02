"use client"

import type { CSSProperties, ElementType, ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
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
import { UploadResumeBanner } from "@/components/upload-resume-banner"
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary shadow-[inset_0_1px_0_hsl(var(--primary)/0.15)]">
      {getInitials(name)}
    </div>
  )
}

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: ElementType
  active: boolean
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
        active
          ? "border-border/80 bg-background text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]"
          : "border-transparent bg-transparent text-muted-foreground group-hover:border-border/70 group-hover:bg-background/65 group-hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </span>
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
          className="absolute right-0 top-[65px] hidden h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-border/80 bg-card/95 text-muted-foreground shadow-[0_16px_40px_-24px_hsl(var(--foreground)/0.8)] backdrop-blur-xl transition-all duration-200 hover:border-primary/40 hover:bg-background hover:text-foreground lg:flex"
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      <div className={cn("px-3 pb-3 pt-4", collapsed && "px-2")}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            "group flex min-h-14 items-center rounded-lg border border-border/60 bg-background/50 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] transition-colors hover:border-border hover:bg-background/70",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
          )}
          title="Lex-Doc Sorter"
        >
          <LexDocLogo compact={collapsed} />
          {!collapsed && (
            <div className="sidebar-label-reveal min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-foreground">
                Lex-Doc Sorter
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <CircleDot className="h-3 w-3 text-primary" />
                Документы для суда
              </div>
            </div>
          )}
        </Link>
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto pb-4 pt-1",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {!collapsed && (
          <div className="sidebar-label-reveal px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Работа
          </div>
        )}
        <div className="space-y-1">
        {navigation.map((item, index) => {
          const active = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              style={{ "--index": index } as CSSProperties}
              className={cn(
                "stagger-reveal group relative flex min-h-12 items-center rounded-lg border text-sm font-medium transition-all duration-200 active:translate-y-px",
                collapsed ? "justify-center px-0" : "gap-2.5 px-2",
                active
                  ? "border-border/70 bg-background/76 text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]"
                  : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/50 hover:text-foreground",
              )}
            >
              <NavIcon icon={item.icon} active={active} />
              {!collapsed && (
                <span className="truncate tracking-[-0.01em]">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
        </div>
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
            <div className="sidebar-label-reveal flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]">
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
              className="h-9 w-full justify-start gap-2.5 rounded-lg text-sm text-muted-foreground hover:bg-background/60 hover:text-foreground"
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
      <UploadResumeBanner />
    </div>
  )
}
