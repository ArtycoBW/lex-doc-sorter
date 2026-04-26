"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AUTH_NOTICE_STORAGE_KEY, api, type AuthNotice, type CurrentUser } from "@/lib/api"

interface AuthContextType {
  user: CurrentUser | null
  loading: boolean
  login: (accessToken: string, refreshToken: string, user: CurrentUser) => void
  logout: () => void
  refreshUser: () => Promise<void>
  setUser: (user: CurrentUser | null) => void
  authNotice: AuthNotice | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null)
  const router = useRouter()

  const syncStoredUser = useCallback((nextUser: CurrentUser | null) => {
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser))
    } else {
      localStorage.removeItem("user")
    }
    setUserState(nextUser)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await api.getCurrentUser()
      syncStoredUser(currentUser)
    } catch {
      localStorage.removeItem("accessToken")
      localStorage.removeItem("refreshToken")
      syncStoredUser(null)
    }
  }, [syncStoredUser])

  const clearAuthNotice = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY)
    }
    setAuthNotice(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    const saved = localStorage.getItem("user")
    const savedNotice = sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY)

    if (token && saved) {
      try {
        setUserState(JSON.parse(saved))
        void refreshUser()
      } catch {
        localStorage.clear()
      }
    }

    if (savedNotice) {
      try {
        setAuthNotice(JSON.parse(savedNotice) as AuthNotice)
      } catch {
        sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY)
      }
    }

    setLoading(false)
  }, [refreshUser])

  useEffect(() => {
    const handleAuthNotice = (event: Event) => {
      const detail = (event as CustomEvent<AuthNotice>).detail
      if (detail) {
        setAuthNotice(detail)
      }
    }

    window.addEventListener("lex-doc-auth-notice", handleAuthNotice)

    return () => {
      window.removeEventListener("lex-doc-auth-notice", handleAuthNotice)
    }
  }, [])

  const login = useCallback((accessToken: string, refreshToken: string, user: CurrentUser) => {
    localStorage.setItem("accessToken", accessToken)
    localStorage.setItem("refreshToken", refreshToken)
    clearAuthNotice()
    syncStoredUser(user)
  }, [clearAuthNotice, syncStoredUser])

  const setUser = useCallback((nextUser: CurrentUser | null) => {
    syncStoredUser(nextUser)
  }, [syncStoredUser])

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    clearAuthNotice()
    setUserState(null)
    router.push("/auth/login")
  }, [clearAuthNotice, router])

  const handleResumeLogin = useCallback(() => {
    clearAuthNotice()
    router.push("/auth/login")
  }, [clearAuthNotice, router])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setUser, authNotice }}>
      {children}
      <Dialog open={Boolean(authNotice)} onOpenChange={(open) => { if (!open) clearAuthNotice() }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-hidden overflow-y-auto rounded-3xl border border-border/60 bg-card/95 p-0 text-card-foreground backdrop-blur-xl sm:w-full sm:max-w-md sm:rounded-2xl">
          <div className="p-5 sm:p-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-semibold leading-tight sm:text-xl">
                {authNotice?.title ?? "Сессия завершена"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {authNotice?.description ?? "Текущая сессия была завершена. Войдите снова, чтобы продолжить работу."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 rounded-2xl border border-border/60 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
              Если вы открыли аккаунт на другом компьютере или устройстве, текущая сессия на этом устройстве завершается автоматически.
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="w-full gap-2" onClick={handleResumeLogin}>
                <LogIn className="h-4 w-4" />
                {authNotice?.actionLabel ?? "Войти снова"}
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={clearAuthNotice}>
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
