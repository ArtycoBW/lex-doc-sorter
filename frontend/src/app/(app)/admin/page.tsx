"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  Ban,
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { api, type AdminOverview } from "@/lib/api"
import { cn } from "@/lib/utils"

type AdminUser = Awaited<ReturnType<typeof api.getAdminUsers>>[number]

const roleLabels: Record<AdminUser["role"], string> = {
  DEMO: "Demo",
  PRO: "Pro",
  ADMIN: "Admin",
}

const statusLabels: Record<string, string> = {
  PENDING: "Ожидает",
  UPLOADING: "Загрузка",
  PROCESSING: "Обработка",
  COMPLETED: "Готово",
  FAILED: "Ошибка",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function AdminPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const loadAdminData = useCallback(async () => {
    if (user?.role !== "ADMIN") {
      return
    }

    setLoading(true)
    setError("")

    try {
      const [overviewResult, usersResult] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(search),
      ])

      setOverview(overviewResult)
      setUsers(usersResult)
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось загрузить админские данные"))
    } finally {
      setLoading(false)
    }
  }, [search, user?.role])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const metrics = useMemo(() => {
    if (!overview) {
      return []
    }

    return [
      {
        label: "Пользователи",
        value: overview.totals.users,
        note: `${overview.totals.verifiedUsers} подтверждено`,
        icon: Users,
      },
      {
        label: "Задания",
        value: overview.totals.jobs,
        note: "Всего пакетов",
        icon: BriefcaseBusiness,
      },
      {
        label: "Файлы",
        value: overview.totals.files,
        note: `${overview.totals.completedFiles} готово`,
        icon: FileCheck2,
      },
      {
        label: "PRO / Admin",
        value: overview.totals.proUsers + overview.totals.adminUsers,
        note: `${overview.totals.bannedUsers} заблокировано`,
        icon: ShieldCheck,
      },
    ]
  }, [overview])

  const updateRole = async (target: AdminUser, role: AdminUser["role"]) => {
    setSavingUserId(target.id)
    setError("")

    try {
      const updated = await api.updateAdminUserRole(target.id, role)
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setOverview(await api.getAdminOverview())
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось изменить роль"))
    } finally {
      setSavingUserId(null)
    }
  }

  const toggleBan = async (target: AdminUser) => {
    setSavingUserId(target.id)
    setError("")

    try {
      const updated = target.isBanned
        ? await api.unbanAdminUser(target.id)
        : await api.banAdminUser(target.id)
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setOverview(await api.getAdminOverview())
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось обновить доступ"))
    } finally {
      setSavingUserId(null)
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card/70 px-5 py-10 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Нет доступа</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Раздел доступен только администраторам Lex-Doc Sorter.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Администрирование</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Аналитика и пользователи
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Контроль активности сервиса, статусов заданий и доступа пользователей.
          </p>
        </div>

        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault()
            void loadAdminData()
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по имени, email или компании"
            className="h-11 pl-9"
          />
        </form>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/35"
            />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon

              return (
                <div
                  key={metric.label}
                  style={{ "--index": index } as CSSProperties}
                  className="stagger-reveal rounded-2xl border border-border bg-card/76 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-4 text-3xl font-semibold tracking-tight">
                    {metric.value}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                </div>
              )
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-2xl border border-border bg-card/76">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">Статусы заданий</h2>
              </div>
              <div className="divide-y divide-border">
                {Object.entries(overview?.jobStatuses || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{statusLabels[status] || status}</span>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/76">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">Последние задания</h2>
              </div>
              <div className="divide-y divide-border">
                {overview?.recentJobs.map((job) => (
                  <div key={job.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {job.user.name || job.user.email}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {job.id.slice(0, 8)} · {job.processedFiles}/{job.totalFiles} файлов · {formatDate(job.updatedAt)}
                      </div>
                    </div>
                    <Badge variant="outline" className="w-fit rounded-full">
                      {statusLabels[job.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card/76">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">Пользователи</h2>
              <Badge variant="outline" className="rounded-full">
                {users.length}
              </Badge>
            </div>

            <div className="divide-y divide-border">
              {users.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_0.7fr_0.8fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {item.name || item.email}
                      </p>
                      {item.isVerified && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.email}
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {item.company || "Компания не указана"}
                  </div>

                  <select
                    value={item.role}
                    disabled={savingUserId === item.id}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
                    onChange={(event) =>
                      void updateRole(item, event.target.value as AdminUser["role"])
                    }
                  >
                    {Object.entries(roleLabels).map(([role, label]) => (
                      <option key={role} value={role}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant={item.isBanned ? "outline" : "ghost"}
                    size="sm"
                    className={cn("gap-2", !item.isBanned && "text-muted-foreground")}
                    disabled={savingUserId === item.id || item.id === user.id}
                    onClick={() => void toggleBan(item)}
                  >
                    {savingUserId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}
                    {item.isBanned ? "Разблокировать" : "Заблокировать"}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
