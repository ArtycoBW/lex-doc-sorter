"use client"

export type PendingPaymentSession = {
  paymentId: string
  orderId: string
  targetType: "TARIFF_PLAN" | "TOKEN_PACKAGE"
  targetCode: string
  createdAt: string
}

export type PaymentResultSession = {
  paymentId: string | null
  orderId: string
  mode: "success" | "fail"
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "EXPIRED" | "REFUNDED"
  message: string | null
  amount: number | null
  currency: string | null
  targetType: "TARIFF_PLAN" | "TOKEN_PACKAGE" | null
  targetCode: string | null
  targetName: string | null
  createdAt: string
}

const PENDING_STORAGE_KEY = "billing-pending-payments"
export const PAYMENT_RESULT_STORAGE_KEY = "billing-payment-result"

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readSessions(): PendingPaymentSession[] {
  const parsed = readJson<unknown>(PENDING_STORAGE_KEY, [])
  return Array.isArray(parsed) ? (parsed as PendingPaymentSession[]) : []
}

function writeSessions(items: PendingPaymentSession[]) {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(items.slice(-20)))
}

export function savePendingPaymentSession(session: PendingPaymentSession) {
  const next = readSessions().filter((item) => item.paymentId !== session.paymentId && item.orderId !== session.orderId)
  next.push(session)
  writeSessions(next)
}

export function getPendingPaymentSessionByOrderId(orderId: string) {
  return readSessions().find((item) => item.orderId === orderId) ?? null
}

export function removePendingPaymentSession(orderId: string) {
  writeSessions(readSessions().filter((item) => item.orderId !== orderId))
}

export function savePaymentResultSession(session: PaymentResultSession) {
  if (typeof window === "undefined") {
    return
  }

  localStorage.setItem(PAYMENT_RESULT_STORAGE_KEY, JSON.stringify(session))
}

export function getPaymentResultSession() {
  const parsed = readJson<PaymentResultSession | null>(PAYMENT_RESULT_STORAGE_KEY, null)

  if (!parsed || typeof parsed !== "object") {
    return null
  }

  return parsed
}

export function consumePaymentResultSession(orderId?: string) {
  const current = getPaymentResultSession()

  if (!current) {
    return null
  }

  if (orderId && current.orderId !== orderId) {
    return null
  }

  clearPaymentResultSession()
  return current
}

export function clearPaymentResultSession() {
  if (typeof window === "undefined") {
    return
  }

  localStorage.removeItem(PAYMENT_RESULT_STORAGE_KEY)
}
