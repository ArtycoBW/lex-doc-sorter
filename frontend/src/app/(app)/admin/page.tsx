"use client"

import type { CSSProperties, Dispatch, SetStateAction } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  Ban,
  BarChart3,
  CheckCircle2,
  Coins,
  Download,
  FileCheck2,
  Loader2,
  MessageSquareWarning,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { api, type AdminOverview, type FeedbackStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

type AdminUser = Awaited<ReturnType<typeof api.getAdminUsers>>[number]
type AdminFeedback = Awaited<ReturnType<typeof api.getAdminFeedback>>
type AdminFeedbackItem = AdminFeedback["items"][number]
type AdminTab = "analytics" | "users" | "feedback"

const roleLabels: Record<AdminUser["role"], string> = {
  DEMO: "Демо",
  PRO: "Pro",
  ADMIN: "Администратор",
}

const statusLabels: Record<string, string> = {
  PENDING: "Ожидает",
  UPLOADING: "Загрузка",
  PROCESSING: "Обработка",
  COMPLETED: "Готово",
  FAILED: "Ошибка",
}

const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  NEW: "Новая",
  REVIEWED: "В работе",
  RESOLVED: "Закрыта",
}

const feedbackCategoryLabels = {
  BUG: "Ошибка",
  IDEA: "Идея",
  OTHER: "Другое",
} as const

const statusTone: Record<string, string> = {
  PENDING: "border-slate-400/25 bg-slate-500/10 text-slate-500 dark:text-slate-300",
  UPLOADING: "border-blue-400/25 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  PROCESSING: "border-amber-400/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  COMPLETED: "border-emerald-400/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  FAILED: "border-rose-400/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  NEW: "border-blue-400/25 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  REVIEWED: "border-amber-400/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  RESOLVED: "border-emerald-400/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
}

const tabs: Array<{ id: AdminTab; label: string; icon: typeof BarChart3 }> = [
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "users", label: "Пользователи", icon: Users },
  { id: "feedback", label: "Обратная связь", icon: MessageSquareWarning },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value)
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${formatNumber(Math.round(value / 1024))} КБ`
  }

  if (value < 1024 * 1024 * 1024) {
    return `${formatNumber(Number((value / 1024 / 1024).toFixed(1)))} МБ`
  }

  return `${formatNumber(Number((value / 1024 / 1024 / 1024).toFixed(2)))} ГБ`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function getInitials(item: AdminUser) {
  const source = item.name || item.email
  return source
    .split(/[ .@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function downloadText(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function toCsv(rows: Array<Record<string, string | number | null>>) {
  const headers = Object.keys(rows[0] || {})
  const escape = (value: string | number | null) => {
    const text = String(value ?? "")
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }

  return [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(";")),
  ].join("\n")
}

export default function AdminPage() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>("analytics")
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null)
  const [search, setSearch] = useState("")
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus | "ALL">("ALL")
  const [tokenDrafts, setTokenDrafts] = useState<Record<string, string>>({})
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const loadAdminData = useCallback(async () => {
    if (user?.role !== "ADMIN") return

    setLoading(true)
    setError("")

    try {
      const [overviewResult, usersResult, feedbackResult] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(search),
        api.getAdminFeedback({
          search,
          status: feedbackStatus,
          pageSize: 30,
        }),
      ])

      setOverview(overviewResult)
      setUsers(usersResult)
      setFeedback(feedbackResult)
      setFeedbackNotes(
        Object.fromEntries(
          feedbackResult.items.map((item) => [item.id, item.adminNote || ""]),
        ),
      )
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось загрузить админские данные"))
    } finally {
      setLoading(false)
    }
  }, [feedbackStatus, search, user?.role])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const metrics = useMemo(() => {
    if (!overview) return []

    return [
      {
        label: "Пользователи",
        value: overview.totals.users,
        note: `${formatNumber(overview.totals.verifiedUsers)} подтверждено`,
        icon: Users,
      },
      {
        label: "Задания",
        value: overview.totals.jobs,
        note: `${formatNumber(overview.totals.files)} файлов`,
        icon: FileCheck2,
      },
      {
        label: "Токены",
        value: overview.totals.tokenBalance,
        note: "Баланс пользователей",
        icon: Coins,
      },
      {
        label: "Обращения",
        value: overview.totals.feedback,
        note: `${formatNumber(overview.totals.openFeedback)} открыто`,
        icon: MessageSquareWarning,
      },
    ]
  }, [overview])

  const analyticsNarrative = useMemo(() => {
    if (!overview) return ""

    const completed = overview.jobStatuses.COMPLETED || 0
    const processing = overview.jobStatuses.PROCESSING || 0
    const failed = overview.jobStatuses.FAILED || 0
    const completionRate = overview.totals.jobs
      ? Math.round((completed / overview.totals.jobs) * 100)
      : 0

    return [
      `Сервис обработал ${formatNumber(overview.totals.completedFiles)} файлов из ${formatNumber(overview.totals.files)} загруженных.`,
      `Доля завершённых заданий сейчас ${completionRate}%. В обработке ${formatNumber(processing)}, с ошибкой ${formatNumber(failed)}.`,
      `В системе ${formatNumber(overview.totals.users)} пользователей, из них ${formatNumber(overview.totals.proUsers + overview.totals.adminUsers)} имеют расширенный доступ.`,
      `Открытых обращений: ${formatNumber(overview.totals.openFeedback)}. Это основной операционный сигнал для админа на этапе пилота.`,
    ].join(" ")
  }, [overview])

  const updateRole = async (target: AdminUser, role: AdminUser["role"]) => {
    if (target.role === role || target.id === user?.id) return

    setSavingId(target.id)
    setError("")

    try {
      const updated = await api.updateAdminUserRole(target.id, role)
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setOverview(await api.getAdminOverview())
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось изменить роль"))
    } finally {
      setSavingId(null)
    }
  }

  const addTokens = async (target: AdminUser) => {
    const amount = Number(tokenDrafts[target.id])
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Введите корректное количество токенов")
      return
    }

    setSavingId(target.id)
    setError("")

    try {
      const updated = await api.addAdminUserTokens(target.id, amount)
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setTokenDrafts((current) => ({ ...current, [target.id]: "" }))
      setOverview(await api.getAdminOverview())
      if (target.id === user?.id) {
        await refreshUser()
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось начислить токены"))
    } finally {
      setSavingId(null)
    }
  }

  const toggleBan = async (target: AdminUser) => {
    setSavingId(target.id)
    setError("")

    try {
      const updated = target.isBanned
        ? await api.unbanAdminUser(target.id)
        : await api.banAdminUser(target.id)
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setOverview(await api.getAdminOverview())
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось обновить доступ"))
    } finally {
      setSavingId(null)
    }
  }

  const updateFeedback = async (item: AdminFeedbackItem, status: FeedbackStatus) => {
    setSavingId(item.id)
    setError("")

    try {
      const updated = await api.updateAdminFeedback(item.id, {
        status,
        adminNote: feedbackNotes[item.id] || undefined,
      })
      setFeedback((current) =>
        current
          ? {
              ...current,
              items: current.items.map((entry) => (entry.id === updated.id ? updated : entry)),
            }
          : current,
      )
      setOverview(await api.getAdminOverview())
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось обновить обращение"))
    } finally {
      setSavingId(null)
    }
  }

  const exportAnalytics = (format: "json" | "csv") => {
    if (!overview) return

    if (format === "json") {
      downloadText(
        `lex-doc-admin-${Date.now()}.json`,
        JSON.stringify({ overview, users, feedback }, null, 2),
        "application/json;charset=utf-8",
      )
      return
    }

    downloadText(
      `lex-doc-users-${Date.now()}.csv`,
      toCsv(
        users.map((item) => ({
          email: item.email,
          name: item.name,
          role: item.role,
          verified: item.isVerified ? "yes" : "no",
          banned: item.isBanned ? "yes" : "no",
          tokenBalance: item.tokenBalance,
          createdAt: item.createdAt,
        })),
      ),
      "text/csv;charset=utf-8",
    )
  }

  if (user?.role !== "ADMIN") {
    return (
      <Card className="border-border/70 bg-card/70">
        <CardContent className="px-5 py-10 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Нет доступа</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Раздел доступен только администраторам Lex-Doc Sorter.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Администрирование
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Панель управления Lex-Doc
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Операционная аналитика, управление пользователями и обратная связь по продукту.
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
            placeholder="Поиск по пользователям и обращениям"
            className="h-11 rounded-xl border border-border/70 bg-card/70 pl-9"
          />
        </form>
      </section>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/55 p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id

          return (
            <Button
              key={tab.id}
              type="button"
              variant={active ? "default" : "ghost"}
              className={cn(
                "h-10 gap-2 rounded-xl px-3",
                !active && "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          )
        })}
      </div>

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
              className="h-28 animate-pulse rounded-2xl border border-border/70 bg-muted/35"
            />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "analytics" && overview && (
            <div className="space-y-4">
              <section className="grid gap-3 md:grid-cols-4">
                {metrics.map((metric, index) => {
                  const Icon = metric.icon

                  return (
                    <Card
                      key={metric.label}
                      style={{ "--index": index } as CSSProperties}
                      className="stagger-reveal overflow-hidden border-border/70 bg-card/72"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-muted-foreground">{metric.label}</p>
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
                          {formatNumber(metric.value)}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </section>

              <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <Card className="border-border/70 bg-card/72">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
                    <CardTitle className="text-base">Текстовый вывод</CardTitle>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => exportAnalytics("json")}>
                        <Download className="h-4 w-4" />
                        JSON
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => exportAnalytics("csv")}>
                        <Download className="h-4 w-4" />
                        CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <p className="text-sm leading-6 text-muted-foreground">{analyticsNarrative}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-background/55 p-4">
                        <div className="text-xs text-muted-foreground">Хранилище</div>
                        <div className="mt-2 text-xl font-semibold">{formatBytes(overview.totals.storageBytes)}</div>
                      </div>
                      <div className="rounded-xl border border-border/70 bg-background/55 p-4">
                        <div className="text-xs text-muted-foreground">Готовность файлов</div>
                        <div className="mt-2 text-xl font-semibold">
                          {overview.totals.files
                            ? Math.round((overview.totals.completedFiles / overview.totals.files) * 100)
                            : 0}
                          %
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/72">
                  <CardHeader className="border-b border-border/70 px-5 py-4">
                    <CardTitle className="text-base">Статусы заданий</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5">
                    {Object.entries(overview.jobStatuses).map(([status, count]) => {
                      const max = Math.max(...Object.values(overview.jobStatuses), 1)
                      const width = Math.max(7, Math.round((count / max) * 100))

                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span>{statusLabels[status] || status}</span>
                            <Badge variant="outline" className={cn("rounded-full", statusTone[status])}>
                              {formatNumber(count)}
                            </Badge>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </section>
            </div>
          )}

          {activeTab === "users" && (
            <UsersPanel
              users={users}
              currentUserId={user.id}
              savingId={savingId}
              tokenDrafts={tokenDrafts}
              setTokenDrafts={setTokenDrafts}
              onRoleChange={updateRole}
              onTokenAdd={addTokens}
              onBanToggle={toggleBan}
            />
          )}

          {activeTab === "feedback" && (
            <FeedbackPanel
              feedback={feedback}
              feedbackStatus={feedbackStatus}
              setFeedbackStatus={setFeedbackStatus}
              feedbackNotes={feedbackNotes}
              setFeedbackNotes={setFeedbackNotes}
              savingId={savingId}
              onUpdate={updateFeedback}
            />
          )}
        </>
      )}
    </div>
  )
}

function UsersPanel({
  users,
  currentUserId,
  savingId,
  tokenDrafts,
  setTokenDrafts,
  onRoleChange,
  onTokenAdd,
  onBanToggle,
}: {
  users: AdminUser[]
  currentUserId: string
  savingId: string | null
  tokenDrafts: Record<string, string>
  setTokenDrafts: Dispatch<SetStateAction<Record<string, string>>>
  onRoleChange: (target: AdminUser, role: AdminUser["role"]) => void
  onTokenAdd: (target: AdminUser) => void
  onBanToggle: (target: AdminUser) => void
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/72">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
        <CardTitle className="text-base">Пользователи и доступ</CardTitle>
        <Badge variant="outline" className="rounded-full border-border/70">
          {formatNumber(users.length)}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/70">
          {users.map((item) => {
            const isSaving = savingId === item.id
            const isCurrentUser = item.id === currentUserId

            return (
              <div key={item.id} className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/25 xl:grid-cols-[1.15fr_0.6fr_0.75fr_0.85fr_auto] xl:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background text-xs font-semibold text-muted-foreground">
                      {getInitials(item)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold">{item.name || item.email}</p>
                        {item.isVerified && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.email}</p>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">{item.company || "Компания не указана"}</div>

                <Select
                  value={item.role}
                  disabled={isSaving || isCurrentUser}
                  onValueChange={(value) => onRoleChange(item, value as AdminUser["role"])}
                >
                  <SelectTrigger className="h-10 rounded-xl border-border/70 bg-background/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([role, label]) => (
                      <SelectItem key={role} value={role}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    value={tokenDrafts[item.id] || ""}
                    onChange={(event) =>
                      setTokenDrafts((current) => ({
                        ...current,
                        [item.id]: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                    placeholder="Токены"
                    className="h-10 rounded-xl border border-border/70 bg-background/70"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    disabled={isSaving || !tokenDrafts[item.id]}
                    onClick={() => onTokenAdd(item)}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 rounded-xl border-border/70",
                    item.isBanned
                      ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                      : "border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400",
                  )}
                  disabled={isSaving || isCurrentUser}
                  onClick={() => onBanToggle(item)}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  {item.isBanned ? "Разблокировать" : "Заблокировать"}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function FeedbackPanel({
  feedback,
  feedbackStatus,
  setFeedbackStatus,
  feedbackNotes,
  setFeedbackNotes,
  savingId,
  onUpdate,
}: {
  feedback: AdminFeedback | null
  feedbackStatus: FeedbackStatus | "ALL"
  setFeedbackStatus: (status: FeedbackStatus | "ALL") => void
  feedbackNotes: Record<string, string>
  setFeedbackNotes: Dispatch<SetStateAction<Record<string, string>>>
  savingId: string | null
  onUpdate: (item: AdminFeedbackItem, status: FeedbackStatus) => void
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/72">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-base">Обратная связь</CardTitle>
        <Select value={feedbackStatus} onValueChange={(value) => setFeedbackStatus(value as FeedbackStatus | "ALL")}>
          <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background/70 md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все статусы</SelectItem>
            <SelectItem value="NEW">Новые</SelectItem>
            <SelectItem value="REVIEWED">В работе</SelectItem>
            <SelectItem value="RESOLVED">Закрытые</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/70">
          {(feedback?.items || []).map((item) => (
            <div key={item.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_0.8fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("rounded-full", statusTone[item.status])}>
                    {feedbackStatusLabels[item.status]}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-border/70">
                    {feedbackCategoryLabels[item.category]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                </div>
                <div className="mt-2 text-sm font-medium">{item.conversationTitle}</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.user.name || item.user.email} · {item.sectionSlug}
                </p>
              </div>

              <Textarea
                value={feedbackNotes[item.id] || ""}
                onChange={(event) =>
                  setFeedbackNotes((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                placeholder="Комментарий администратора"
                className="min-h-24 rounded-xl border-border/70 bg-background/70"
              />

              <div className="flex flex-col gap-2">
                <Select
                  value={item.status}
                  disabled={savingId === item.id}
                  onValueChange={(value) => onUpdate(item, value as FeedbackStatus)}
                >
                  <SelectTrigger className="h-10 rounded-xl border-border/70 bg-background/70 xl:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Новая</SelectItem>
                    <SelectItem value="REVIEWED">В работе</SelectItem>
                    <SelectItem value="RESOLVED">Закрыта</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={savingId === item.id}
                  onClick={() => onUpdate(item, item.status)}
                >
                  {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
                </Button>
              </div>
            </div>
          ))}

          {!feedback?.items.length && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Обращений по текущим фильтрам нет.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
