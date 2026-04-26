"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2, Save, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setName(user?.name ?? "")
    setCompany(user?.company ?? "")
  }, [user])

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setProfileMessage("")
    setSavingProfile(true)

    try {
      const updatedUser = await api.updateProfile({
        name: name.trim(),
        company: company.trim() || undefined,
      })
      setUser(updatedUser)
      setProfileMessage("Профиль обновлён")
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось обновить профиль"))
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setPasswordMessage("")

    if (newPassword.length < 6) {
      setError("Новый пароль должен быть не короче 6 символов")
      return
    }

    setSavingPassword(true)

    try {
      await api.changePassword(oldPassword, newPassword)
      setOldPassword("")
      setNewPassword("")
      setPasswordMessage("Пароль изменён")
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Не удалось изменить пароль"))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">Аккаунт</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Профиль
        </h1>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <form
          onSubmit={handleProfileSubmit}
          className="rounded-lg border border-border bg-card/70 p-5"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Данные профиля</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">ФИО</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Компания</Label>
              <Input
                id="company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="ООО Компания"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" className="gap-2" disabled={savingProfile}>
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить
            </Button>
            {profileMessage && (
              <span className="text-sm text-primary">{profileMessage}</span>
            )}
          </div>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="rounded-lg border border-border bg-card/70 p-5"
        >
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Пароль</h2>
            <p className="text-sm text-muted-foreground">
              Обновите пароль для входа в аккаунт.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Текущий пароль</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="submit"
              className="gap-2"
              disabled={savingPassword || !oldPassword || !newPassword}
            >
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Изменить пароль
            </Button>
            {passwordMessage && (
              <span className="text-sm text-primary">{passwordMessage}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
