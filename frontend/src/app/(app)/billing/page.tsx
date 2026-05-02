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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  api,
  type BillingSummary,
  type BillingTransaction,
  type PaymentDetails,
  type TariffPlan,
  type TokenPackage,
} from "@/lib/api"

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

export default function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [tariffs, setTariffs] = useState<TariffPlan[]>([])
  const [packages, setPackages] = useState<TokenPackage[]>([])
  const [history, setHistory] = useState<BillingTransaction[]>([])
  const [payment, setPayment] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [payingCode, setPayingCode] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setError("")

      try {
        const summaryResult = await api.getBillingSummary()
        const [tariffsResult, packagesResult, historyResult] = await Promise.all([
          api.getTariffs(summaryResult.tariffCode),
          api.getTokenPackages(),
          api.getBillingHistory(20),
        ])

        if (!alive) return
        setSummary(summaryResult)
        setTariffs(tariffsResult)
        setPackages(packagesResult)
        setHistory(historyResult)
      } catch (error) {
        if (!alive) return
        setError(error instanceof Error ? error.message : "Не удалось загрузить биллинг")
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [])

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

  if (loading) {
    return (
      <div className="flex min-h-[22rem] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Загрузка
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Доступ</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Тариф и токены
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Токены списываются при запуске обработки: быстрый режим дешевле, умный
            использует OCR, AI-разметку, названия и реестры.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
          {summary?.tariffName || "Пилотный доступ"}
        </Badge>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {payment && !payment.paymentUrl && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Заявка на оплату создана. Подключение платёжного шлюза выполняется отдельно,
          поэтому начисление сейчас делает администратор после подтверждения оплаты.
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[22px] border border-border bg-card/72 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Суточный лимит</h2>
              <p className="text-sm text-muted-foreground">
                Обновляется каждый день и расходуется перед пакетными токенами.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/45 p-4">
              <p className="text-sm text-muted-foreground">Лимит</p>
              <p className="mt-2 text-2xl font-semibold">{formatNumber(summary?.dailyLimit)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/45 p-4">
              <p className="text-sm text-muted-foreground">Использовано</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(summary?.tokensUsedToday ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/45 p-4">
              <p className="text-sm text-muted-foreground">Пакетные токены</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(summary?.tokenPackageBalance ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>

        <div className="rounded-[22px] border border-border bg-card/72 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Стоимость режимов</h2>
              <p className="text-sm text-muted-foreground">Расчёт идёт за каждый файл в задании.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background/45 px-4 py-3">
              <span className="text-sm font-medium">Быстрый режим</span>
              <span className="text-sm text-muted-foreground">1 500 токенов / файл</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-background/45 px-4 py-3">
              <span className="text-sm font-medium">Умный режим</span>
              <span className="text-sm text-muted-foreground">6 000 токенов / файл</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {tariffs.map((tariff) => (
          <div key={tariff.id} className="rounded-[22px] border border-border bg-card/72 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{tariff.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{tariff.description}</p>
              </div>
              {tariff.isCurrent && (
                <Badge variant="outline" className="rounded-full">
                  Активен
                </Badge>
              )}
            </div>
            <div className="mt-5 text-2xl font-semibold">
              {formatMoney(tariff.price, tariff.currency)}
            </div>
            <div className="mt-4 space-y-2">
              {tariff.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {feature}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant={tariff.isCurrent ? "outline" : "default"}
              className="mt-5 w-full gap-2"
              disabled={tariff.isCurrent || payingCode === tariff.code}
              onClick={() => void createPayment("TARIFF_PLAN", tariff.code)}
            >
              {payingCode === tariff.code ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {tariff.isCurrent ? "Текущий тариф" : "Выбрать тариф"}
            </Button>
          </div>
        ))}
      </section>

      <section className="rounded-[22px] border border-border bg-card/72 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Пакеты токенов</h2>
            <p className="text-sm text-muted-foreground">
              Используются, когда дневной лимит закончился или пакет документов больше лимита.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {packages.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-background/45 p-4">
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(item.price, item.currency)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatNumber(item.tokens)} токенов</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full gap-2"
                disabled={payingCode === item.code}
                onClick={() => void createPayment("TOKEN_PACKAGE", item.code)}
              >
                {payingCode === item.code ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Пополнить
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-border bg-card/72">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">История списаний</h2>
        </div>
        <div className="divide-y divide-border">
          {history.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">История пока пустая</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-medium">{transactionLabel(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description || "Операция"} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground md:text-right">
                  <div>{item.tokens ? `${formatNumber(item.tokens)} токенов` : "без списания"}</div>
                  <div>Баланс: {formatNumber(item.balanceAfter)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
