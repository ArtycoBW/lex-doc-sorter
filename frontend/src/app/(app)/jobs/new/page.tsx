"use client"

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Camera,
  CheckCircle2,
  Coins,
  FileText,
  FolderOpen,
  ImageIcon,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { REQUEST_ABORTED_ERROR, api, type ProcessingMode } from "@/lib/api"
import { cn } from "@/lib/utils"

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
])
const MAX_FILES = 500
const MAX_FILE_SIZE = 50 * 1024 * 1024
const DRAFT_DB_NAME = "lex-doc-upload-drafts"
const DRAFT_STORE_NAME = "drafts"
const ACTIVE_DRAFT_ID = "active-job-upload"
const PROCESSING_TOKEN_COST: Record<ProcessingMode, number> = {
  QUICK: 1_500,
  SMART: 6_000,
}

type SelectedFile = {
  id: string
  file: File
  previewUrl: string | null
}

type UploadDraft = {
  id: string
  jobId: string | null
  files: File[]
  updatedAt: string
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} МБ`
  }

  return `${Math.max(1, Math.round(size / 1024))} КБ`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value)
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function getFileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`
}

function toSelectedFile(file: File): SelectedFile {
  return {
    id: getFileId(file),
    file,
    previewUrl: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null,
  }
}

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

async function readDraft() {
  if (typeof indexedDB === "undefined") {
    return null
  }

  const db = await openDraftDb()

  return new Promise<UploadDraft | null>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readonly")
    const request = transaction.objectStore(DRAFT_STORE_NAME).get(ACTIVE_DRAFT_ID)

    request.onsuccess = () => resolve((request.result as UploadDraft) ?? null)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

async function saveDraft(files: SelectedFile[], jobId: string | null) {
  if (typeof indexedDB === "undefined") {
    return
  }

  const db = await openDraftDb()

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite")
    transaction.objectStore(DRAFT_STORE_NAME).put({
      id: ACTIVE_DRAFT_ID,
      jobId,
      files: files.map((item) => item.file),
      updatedAt: new Date().toISOString(),
    } satisfies UploadDraft)

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

  db.close()
}

async function clearDraft() {
  if (typeof indexedDB === "undefined") {
    return
  }

  const db = await openDraftDb()

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite")
    transaction.objectStore(DRAFT_STORE_NAME).delete(ACTIVE_DRAFT_ID)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })

  db.close()
}

export default function NewJobPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentJobIdRef = useRef<string | null>(null)
  const filesRef = useRef<SelectedFile[]>([])
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [selectedMode, setSelectedMode] = useState<ProcessingMode>("SMART")
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [restoredDraft, setRestoredDraft] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing">("idle")
  const [error, setError] = useState("")

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    let mounted = true

    readDraft()
      .then((draft) => {
        if (!mounted || !draft?.files.length) {
          return
        }

        const restoredFiles = draft.files.map(toSelectedFile)
        currentJobIdRef.current = draft.jobId
        filesRef.current = restoredFiles
        setFiles(restoredFiles)
        setRestoredDraft(true)
        setError("Загрузка была прервана. Можно продолжить с того же набора файлов.")
      })
      .catch(() => undefined)

    return () => {
      mounted = false
      for (const item of filesRef.current) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      }
    }
  }, [])

  const resetFiles = (nextFiles: SelectedFile[]) => {
    for (const item of filesRef.current) {
      if (item.previewUrl && !nextFiles.some((next) => next.id === item.id)) {
        URL.revokeObjectURL(item.previewUrl)
      }
    }

    filesRef.current = nextFiles
    setFiles(nextFiles)
  }

  const uploadAndProcess = async (selectedFiles = filesRef.current) => {
    if (!selectedFiles.length || uploading) {
      return
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setUploading(true)
    setRestoredDraft(false)
    setError("")
    setProgress((current) => (current > 0 ? current : 3))
    setPhase("uploading")

    try {
      let jobId = currentJobIdRef.current

      if (jobId) {
        const existingJob = await api.getJob(jobId).catch(() => null)

        if (existingJob?.files.length) {
          setPhase("processing")
          const processingJob =
            existingJob.status === "PENDING"
              ? await api.startJobProcessing(jobId, selectedMode)
              : existingJob

          await clearDraft()
          router.push(`/jobs/${processingJob.id}`)
          return
        }
      }

      if (!jobId) {
        const job = await api.createJob()
        jobId = job.id
        currentJobIdRef.current = job.id
        await saveDraft(selectedFiles, job.id)
      }

      const uploadedJob = await api.uploadJobFiles(
        jobId,
        selectedFiles.map((item) => item.file),
        setProgress,
        { signal: abortController.signal },
      )

      setPhase("processing")
      const processingJob = await api.startJobProcessing(uploadedJob.id, selectedMode)
      await clearDraft()
      router.push(`/jobs/${processingJob.id}`)
    } catch (error: unknown) {
      if (getErrorMessage(error, "") === REQUEST_ABORTED_ERROR) {
        setError("Загрузка отменена. Выберите нужные файлы заново.")
      } else {
        setError(getErrorMessage(error, "Не удалось загрузить файлы. Проверьте сеть и продолжите загрузку."))
        setRestoredDraft(true)
        await saveDraft(selectedFiles, currentJobIdRef.current).catch(() => undefined)
      }
      setUploading(false)
      setPhase("idle")
    } finally {
      abortControllerRef.current = null
    }
  }

  const addFiles = async (incomingFiles: File[]) => {
    setError("")

    if (uploading) {
      return
    }

    if (filesRef.current.length + incomingFiles.length > MAX_FILES) {
      setError(`Можно загрузить не больше ${MAX_FILES} файлов за раз`)
      return
    }

    const nextItems: SelectedFile[] = []

    for (const file of incomingFiles) {
      if (!ACCEPTED_MIME_TYPES.has(file.type)) {
        setError("Поддерживаются только JPG, PNG и PDF")
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`Файл ${file.name} больше 50 МБ`)
        continue
      }

      nextItems.push(toSelectedFile(file))
    }

    if (!nextItems.length) {
      return
    }

    const nextFiles = [...filesRef.current, ...nextItems]
    resetFiles(nextFiles)
    await saveDraft(nextFiles, currentJobIdRef.current).catch(() => undefined)
    void uploadAndProcess(nextFiles)
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void addFiles(Array.from(event.target.files ?? []))
    event.target.value = ""
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    void addFiles(Array.from(event.dataTransfer.files))
  }

  const removeFile = async (fileId: string) => {
    const nextFiles = filesRef.current.filter((item) => item.id !== fileId)
    resetFiles(nextFiles)

    if (nextFiles.length) {
      await saveDraft(nextFiles, currentJobIdRef.current).catch(() => undefined)
    } else {
      await clearDraft().catch(() => undefined)
      currentJobIdRef.current = null
      setRestoredDraft(false)
    }
  }

  const cancelUpload = async () => {
    abortControllerRef.current?.abort()
    const jobId = currentJobIdRef.current
    currentJobIdRef.current = null
    setProgress(0)
    setPhase("idle")
    setUploading(false)
    setRestoredDraft(false)
    resetFiles([])
    await clearDraft().catch(() => undefined)

    if (jobId) {
      await api.deleteJob(jobId).catch(() => undefined)
    }
  }

  const phaseLabel =
    phase === "processing"
      ? "Запускаем обработку"
      : uploading
        ? "Загружаем файлы"
        : restoredDraft
          ? "Можно продолжить"
          : "Готово к загрузке"

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Создание пакета</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Новое задание
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Добавьте сканы, фото или PDF. Загрузка начнётся автоматически, а после неё задача сразу уйдёт в обработку.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {restoredDraft && (
            <Button
              type="button"
              className="gap-2"
              disabled={!files.length || uploading}
              onClick={() => void uploadAndProcess()}
            >
              <RotateCcw className="h-4 w-4" />
              Продолжить загрузку
            </Button>
          )}
          {uploading && (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void cancelUpload()}
            >
              <X className="h-4 w-4" />
              Отменить
            </Button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-border bg-card/80 px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {[
          {
            value: "QUICK" as ProcessingMode,
            title: "Быстрый режим",
            description: "Каждый файл станет отдельным сжатым PDF без AI-разметки.",
            icon: Play,
          },
          {
            value: "SMART" as ProcessingMode,
            title: "Умный режим",
            description: "OCR, авторазделение документов, названия по маске и реестр.",
            icon: Sparkles,
          },
        ].map((mode) => {
          const active = selectedMode === mode.value
          const Icon = mode.icon
          const estimatedTokens = files.length * PROCESSING_TOKEN_COST[mode.value]

          return (
            <button
              key={mode.value}
              type="button"
              disabled={uploading}
              className={cn(
                "rounded-2xl border p-4 text-left transition-colors",
                active
                  ? "border-primary/55 bg-primary/10"
                  : "border-border bg-card/70 hover:border-primary/35 hover:bg-muted/35",
                uploading && "cursor-default opacity-75",
              )}
              onClick={() => setSelectedMode(mode.value)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {mode.title}
                </span>
                <span className="flex items-center gap-1 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground">
                  <Coins className="h-3.5 w-3.5" />
                  {formatNumber(estimatedTokens)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode.description}</p>
            </button>
          )
        })}
      </section>

      <section
        className={cn(
          "relative overflow-hidden rounded-xl border border-dashed border-border bg-card/70 p-4 transition-colors sm:p-6",
          dragActive && "border-primary/50 bg-primary/5",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          multiple
          className="sr-only"
          onChange={handleInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleInputChange}
        />

        <div className="grid min-h-72 gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-background text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h2 className="mt-5 max-w-xl text-2xl font-semibold tracking-tight">
              Перетащите документы сюда или выберите файлы
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              JPG, PNG и PDF до 50 МБ. В одном задании можно собрать до 500 файлов. После выбора ничего дополнительно нажимать не нужно.
            </p>
            <div className="mt-6 grid w-full max-w-sm gap-2 sm:grid-cols-2">
              <Button
                type="button"
                className="gap-2 sm:hidden"
                disabled={uploading}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Снять фото
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                <FolderOpen className="h-4 w-4" />
                Выбрать файлы
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/58 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Статус пакета</p>
                <p className="mt-1 text-sm text-muted-foreground">{phaseLabel}</p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {files.length} файлов
              </Badge>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{uploading ? "Передача на сервер" : "Ожидание файлов"}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-card/80 p-3 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                При сбое сети черновик останется в браузере, чтобы продолжить загрузку при следующем входе.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/70">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Файлы</h2>
            <p className="text-sm text-muted-foreground">
              Выбрано файлов: {files.length}
            </p>
          </div>
          {uploading && (
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-primary">
              {phaseLabel}
            </Badge>
          )}
        </div>

        {files.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Файлы ещё не выбраны.
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((item, index) => (
              <div
                key={item.id}
                className="group flex min-w-0 gap-3 rounded-lg border border-border bg-background/45 p-3 transition-colors hover:bg-background/70"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : item.file.type === "application/pdf" ? (
                    <FileText className="h-6 w-6" />
                  ) : (
                    <ImageIcon className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {String(index + 1).padStart(3, "0")} · {item.file.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatSize(item.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                      disabled={uploading}
                      aria-label="Удалить файл"
                      onClick={() => void removeFile(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {uploading ? "Загружается" : "Готов к загрузке"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
