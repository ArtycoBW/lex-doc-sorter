"use client"

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
])
const MAX_FILES = 500
const MAX_FILE_SIZE = 50 * 1024 * 1024

type SelectedFile = {
  id: string
  file: File
  previewUrl: string | null
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} МБ`
  }

  return `${Math.max(1, Math.round(size / 1024))} КБ`
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function NewJobPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const filesRef = useRef<SelectedFile[]>([])
  const [files, setFiles] = useState<SelectedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    return () => {
      for (const item of filesRef.current) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      }
    }
  }, [])

  const addFiles = (incomingFiles: File[]) => {
    setError("")

    if (files.length + incomingFiles.length > MAX_FILES) {
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

      nextItems.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
      })
    }

    if (nextItems.length) {
      setFiles((current) => [...current, ...nextItems])
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []))
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
    addFiles(Array.from(event.dataTransfer.files))
  }

  const removeFile = (fileId: string) => {
    setFiles((current) => {
      const removed = current.find((item) => item.id === fileId)
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return current.filter((item) => item.id !== fileId)
    })
  }

  const handleStartUpload = async () => {
    if (!files.length) {
      setError("Добавьте хотя бы один файл")
      return
    }

    setUploading(true)
    setError("")
    setProgress(4)

    try {
      const job = await api.createJob()
      const uploadedJob = await api.uploadJobFiles(
        job.id,
        files.map((item) => item.file),
        setProgress,
      )
      router.push(`/jobs/${uploadedJob.id}`)
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось загрузить файлы"))
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Создание пакета</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Новое задание
          </h1>
        </div>
        <Button
          type="button"
          className="gap-2"
          disabled={!files.length || uploading}
          onClick={handleStartUpload}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          Начать обработку
        </Button>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <section
        className={cn(
          "relative overflow-hidden rounded-lg border border-dashed border-border bg-card/55 p-6 transition-colors",
          dragActive && "border-primary bg-primary/8",
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

        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary/12 text-primary">
            <UploadCloud className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-semibold">
            Перетащите фото или PDF сюда
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            JPG, PNG и PDF до 50 МБ. В одном задании можно собрать до 500
            файлов.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            Выбрать файлы
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card/70">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Файлы</h2>
            <p className="text-sm text-muted-foreground">
              Выбрано файлов: {files.length}
            </p>
          </div>
          {uploading && (
            <div className="w-full sm:w-64">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Загрузка</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
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
                className="group flex min-w-0 gap-3 rounded-md border border-border bg-background/45 p-3"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
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
                      onClick={() => removeFile(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Готов к загрузке
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
