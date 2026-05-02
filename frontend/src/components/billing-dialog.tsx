"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Coins,
  CreditCard,
  Loader2,
  ReceiptText,
  ShieldCheck,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  api,
  type BillingSummary,
  type BillingTransaction,
  type PaymentDetails,
  type TariffPlan,
  type TokenPackage,
} from "@/lib/api"
import { cn } from "@/lib/utils"

function formatNumber(value: number | null | undefined) {
  if (value == null) return "без ограничений"
  return new Intl.NumberFormat("ru-RU").format(value)
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function transactionLabel(item: BillingTransaction) {
  switch (item.type) {
    case "TRIAL_USAGE":
      return "Дневной лимит"
    case "ALLOWANCE_USAGE":
      return "Лимит тарифа"
    case "PACKAGE_USAGE":
      return "Пакет токенов"
    case "PAYMENT_TOPUP":
      return "Пополнение"
    case "MANUAL_ADJUSTMENT":
      return "Начисление"
    case "REFUND":
      return "Возврат"
    case "SUBSCRIPTION_ACTIVATION":
      return "Тариф"
    default:
      return item.type
  }
}

export function BillingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [tariffs, setTariffs] = useState<TariffPlan[]>([])
  const [packages, setPackages] = useState<TokenPackage[]>([])
  const [history, setHistory] = useState<BillingTransaction[]>([])
  const [payment, setPayment] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [payingCode, setPayingCode] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return

    let alive = true

    async function load() {
      setLoading(true)
      setError("")

      try {
        const summaryResult = await api.getBillingSummary()
        const [tariffsResult, packagesResult, historyResult] = await Promise.all([
          api.getTariffs(summaryResult.tariffCode),
          api.getTokenPackages(),
          api.getBillingHistory(12),
        ])

        if (!alive) return
        setSummary(summaryResult)
        setTariffs(tariffsResult)
        setPackages(packagesResult)
        setHistory(historyResult)
      } catch (error) {
        if (!alive) return
        setError(error instanceof Error ? error.message : "Не удалось загрузить тарифы")
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [open])

  const usagePercent = useMemo(() => {
    if (!summary?.dailyLimit) return 0
    return Math.min(100, Math.round((summary.tokensUsedToday / summary.dailyLimit) * 100))
  }, [summary])

  const createPayment = async (
    targetType: "TARIFF_PLAN" | "TOKEN_PACKAGE",
    targetCode: string,
  ) => {
    setPayingCode(targetCode)
    setPayment(null)
    setError("")

    try {
      const nextPayment = await api.createPayment({ targetType, targetCode })
      setPayment(nextPayment)
      if (nextPayment.paymentUrl) {
        window.location.href = nextPayment.paymentUrl
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось создать оплату")
    } finally {
      setPayingCode(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-border bg-card p-0 sm:max-w-4xl">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Тариф и токены</DialogTitle>
                <DialogDescription>
                  Баланс для обработки файлов, OCR, умного именования и реестров.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[min(78dvh,760px)]">
          <div className="space-y-5 p-5 sm:p-6">
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl border border-border bg-muted/35"
                  />
                ))}
              </div>
            ) : (
              <>
                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {payment && !payment.paymentUrl && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                    Заявка создана. До подключения платёжного шлюза доступ и токены
                    подтверждаются администратором после оплаты.
                  </div>
                )}

                <section className="grid gap-3 lg:grid-cols-[1fr_0.85fr]">
                  <div className="rounded-2xl border border-border bg-background/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {summary?.tariffName || "Пилотный доступ"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Суточный лимит обновляется каждый день.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full border-border">
                        Активен
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card/70 px-3 py-3">
                        <div className="text-xs text-muted-foreground">Лимит</div>
                        <div className="mt-1 text-lg font-semibold">
                          {formatNumber(summary?.dailyLimit)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-card/70 px-3 py-3">
                        <div className="text-xs text-muted-foreground">Сегодня</div>
                        <div className="mt-1 text-lg font-semibold">
                          {formatNumber(summary?.tokensUsedToday ?? 0)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-card/70 px-3 py-3">
                        <div className="text-xs text-muted-foreground">Пакеты</div>
                        <div className="mt-1 text-lg font-semibold">
                          {formatNumber(summary?.tokenPackageBalance ?? 0)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/45 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Coins className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Стоимость обработки</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Расчёт идёт за каждый файл.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2 text-sm">
                        <span>Быстрый режим</span>
                        <span className="text-muted-foreground">1 500</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2 text-sm">
                        <span>Умный режим</span>
                        <span className="text-muted-foreground">6 000</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Тарифы</h3>
                    <span className="text-xs text-muted-foreground">Для регулярной работы</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {tariffs.map((tariff) => (
                      <div
                        key={tariff.id}
                        className={cn(
                          "rounded-2xl border bg-background/45 p-4",
                          tariff.isCurrent ? "border-primary/45" : "border-border",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{tariff.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {tariff.description}
                            </p>
                          </div>
                          {tariff.isCurrent && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </div>
                        <div className="mt-4 text-xl font-semibold">
                          {formatMoney(tariff.price, tariff.currency)}
                        </div>
                        <Button
                          type="button"
                          variant={tariff.isCurrent ? "outline" : "default"}
                          className="mt-4 w-full rounded-xl"
                          disabled={tariff.isCurrent || payingCode === tariff.code}
                          onClick={() => void createPayment("TARIFF_PLAN", tariff.code)}
                        >
                          {payingCode === tariff.code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : tariff.isCurrent ? (
                            "Текущий"
                          ) : (
                            "Выбрать"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Пакеты токенов</h3>
                    <span className="text-xs text-muted-foreground">Сверх дневного лимита</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {packages.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-border bg-background/45 p-4">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatNumber(item.tokens)} токенов
                        </p>
                        <div className="mt-4 text-xl font-semibold">
                          {formatMoney(item.price, item.currency)}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 w-full rounded-xl"
                          disabled={payingCode === item.code}
                          onClick={() => void createPayment("TOKEN_PACKAGE", item.code)}
                        >
                          {payingCode === item.code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Пополнить"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-border bg-background/45">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <ReceiptText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Последние операции</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {history.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        История пока пустая.
                      </div>
                    ) : (
                      history.map((item) => (
                        <div
                          key={item.id}
                          className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {transactionLabel(item)}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {item.description || "Операция"} · {formatDate(item.createdAt)}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground sm:text-right">
                            <div>{item.tokens ? `${formatNumber(item.tokens)} токенов` : "без списания"}</div>
                            <div>Баланс: {formatNumber(item.balanceAfter)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
