"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, MonitorDown, Smartphone, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const DISMISS_KEY = "lex-doc-pwa-install-dismissed"

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  )
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function canShowInstallSurface() {
  return (
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  )
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isStandalone() ||
      !canShowInstallSurface() ||
      localStorage.getItem(DISMISS_KEY) === "true"
    ) {
      return
    }

    setIsIos(isIosDevice())

    const showTimer = window.setTimeout(() => {
      setVisible(true)
    }, 1200)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.clearTimeout(showTimer)
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      )
    }
  }, [])

  const copy = useMemo(() => {
    if (manualMode && isIos) {
      return {
        icon: Smartphone,
        title: "Добавьте на экран Домой",
        text: "В Safari нажмите кнопку «Поделиться», затем «На экран Домой». Если пункт не виден в Brave на iPhone, откройте сайт в Safari.",
        action: "Понятно",
      }
    }

    if (manualMode) {
      return {
        icon: MonitorDown,
        title: "Установка в браузере",
        text: "В Chrome, Edge или Brave нажмите значок установки в адресной строке либо пункт «Установить приложение» в меню браузера.",
        action: "Понятно",
      }
    }

    return {
      icon: Download,
      title: "Установить Lex-Doc",
      text: "Откроется как отдельное приложение, быстрее запускается и остаётся под рукой при загрузке документов.",
      action: deferredPrompt ? "Установить" : "Как установить",
    }
  }, [deferredPrompt, isIos, manualMode])

  if (!visible) {
    return null
  }

  const Icon = copy.icon

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true")
    setVisible(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setManualMode(true)
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === "accepted") {
      dismiss()
      return
    }

    setDeferredPrompt(null)
    setManualMode(true)
  }

  return (
    <div className="install-prompt-reveal fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md sm:left-auto sm:right-5">
      <div className="rounded-lg border border-border/70 bg-card/95 p-3 shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.62)] backdrop-blur-xl">
        <div className="grid grid-cols-[auto_1fr_auto] gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {copy.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.text}
            </p>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className={cn(
            "mt-3 flex gap-2",
            manualMode ? "justify-end" : "justify-between",
          )}
        >
          {!manualMode && (
            <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
              Позже
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="gap-2"
            onClick={manualMode ? dismiss : handleInstall}
          >
            {!manualMode && <Download className="h-4 w-4" />}
            {copy.action}
          </Button>
        </div>
      </div>
    </div>
  )
}
