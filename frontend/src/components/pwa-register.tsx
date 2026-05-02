"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return
    }

    let cancelled = false

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })

        await registration.update().catch(() => undefined)

        if (!cancelled) {
          window.dispatchEvent(
            new CustomEvent("lex-doc-pwa-registered", {
              detail: {
                controlled: Boolean(navigator.serviceWorker.controller),
                scope: registration.scope,
              },
            }),
          )
        }
      } catch {
        if (!cancelled) {
          window.dispatchEvent(new CustomEvent("lex-doc-pwa-register-failed"))
        }
      }
    }

    void registerServiceWorker()

    const handleControllerChange = () => {
      window.dispatchEvent(new CustomEvent("lex-doc-pwa-controlled"))
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    )

    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      )
    }
  }, [])

  return null
}
