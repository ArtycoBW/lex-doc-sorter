"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { RotateCcw, X } from "lucide-react"

import { Button } from "@/components/ui/button"

const DRAFT_DB_NAME = "lex-doc-upload-drafts"
const DRAFT_STORE_NAME = "drafts"
const ACTIVE_DRAFT_ID = "active-job-upload"

function openDraftDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(DRAFT_STORE_NAME, { keyPath: "id" })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function hasActiveDraft() {
  if (typeof indexedDB === "undefined") {
    return false
  }

  const db = await openDraftDb()

  return new Promise<boolean>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readonly")
    const request = transaction.objectStore(DRAFT_STORE_NAME).get(ACTIVE_DRAFT_ID)

    request.onsuccess = () => {
      const draft = request.result as { files?: File[] } | undefined
      resolve(Boolean(draft?.files?.length))
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

export function UploadResumeBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let mounted = true

    if (pathname === "/jobs/new") {
      setVisible(false)
      return
    }

    hasActiveDraft()
      .then((hasDraft) => {
        if (mounted) {
          setVisible(hasDraft)
        }
      })
      .catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [pathname])

  if (!visible) {
    return null
  }

  return (
    <div className="install-prompt-reveal fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md sm:left-auto sm:right-5">
      <div className="rounded-xl border border-border bg-card/95 p-3 backdrop-blur-xl">
        <div className="grid grid-cols-[auto_1fr_auto] gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-primary">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              Загрузка не завершена
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Черновик файлов сохранён в браузере. Можно продолжить отправку на сервер.
            </p>
          </div>
          <button
            type="button"
            aria-label="Скрыть"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setVisible(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <Button asChild size="sm" className="gap-2">
            <Link href="/jobs/new">
              <RotateCcw className="h-4 w-4" />
              Продолжить
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
