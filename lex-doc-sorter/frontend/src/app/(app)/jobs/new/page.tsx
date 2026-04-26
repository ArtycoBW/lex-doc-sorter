import { Upload } from "lucide-react"

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-primary">Создание пакета</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Новое задание
        </h1>
      </section>

      <section className="flex min-h-[24rem] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/55 px-5 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-primary/12 text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">
          Загрузка файлов появится в подэтапе 1.5
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Сейчас готова рабочая оболочка приложения. Следующим шагом подключим
          создание задания и drag & drop загрузку.
        </p>
      </section>
    </div>
  )
}
