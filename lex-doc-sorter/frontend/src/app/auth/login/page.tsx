"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react"

import { AnimatedBackground } from "@/components/ui/animated-background"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { StepIndicator } from "@/components/ui/step-indicator"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"

const TEXT = {
  steps: [{ label: "Пароль" }, { label: "Код" }],
  enterEmail: "Введите email",
  enterValidEmail: "Введите корректный email",
  enterPassword: "Введите пароль",
  enterCode: "Введите 6-значный код",
  title: "Вход в Lex-Doc Sorter",
  subtitle: "Войдите в личный кабинет",
  confirmTitle: "Подтверждение",
  codeSentTo: "Код отправлен на",
  email: "Email",
  password: "Пароль",
  passwordPlaceholder: "Введите пароль",
  checking: "Проверка...",
  continue: "Продолжить",
  signingIn: "Вход...",
  signIn: "Войти",
  back: "Назад",
  forgotPassword: "Забыли пароль?",
  noAccount: "Нет аккаунта?",
  register: "Зарегистрироваться",
  showPassword: "Показать пароль",
  hidePassword: "Скрыть пароль",
  loginFallback:
    "Не удалось выполнить вход. Попробуйте ещё раз.",
  verifyFallback:
    "Не удалось подтвердить вход. Попробуйте ещё раз.",
} as const

type Step = "credentials" | "code"

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [step, setStep] = useState<Step>("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim()) {
      setError(TEXT.enterEmail)
      return
    }

    if (!isValidEmail(email)) {
      setError(TEXT.enterValidEmail)
      return
    }

    if (!password) {
      setError(TEXT.enterPassword)
      return
    }

    setError("")
    setLoading(true)

    try {
      await api.login(email, password)
      setStep("code")
    } catch (error: unknown) {
      setError(getErrorMessage(error, TEXT.loginFallback))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyLogin = async () => {
    if (code.length !== 6) {
      setError(TEXT.enterCode)
      return
    }

    setError("")
    setLoading(true)

    try {
      const result = await api.loginVerify(email, code)
      login(result.accessToken, result.refreshToken, result.user)
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(getErrorMessage(error, TEXT.verifyFallback))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-[max(1rem,env(safe-area-inset-left))] py-6 pr-[max(1rem,env(safe-area-inset-right))] sm:p-4">
      <AnimatedBackground />

      <div className="w-full max-w-md space-y-6 sm:space-y-8">
        <div className="text-center fade-in">
          <Link
            href="/"
            className="inline-block text-2xl font-bold text-foreground"
          >
            Lex-Doc Sorter
          </Link>
        </div>

        <StepIndicator
          steps={[...TEXT.steps]}
          currentStep={step === "credentials" ? 0 : 1}
        />

        <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur-xl fade-in-up sm:p-8">
          <div className="mb-6 text-center">
            {step === "credentials" && (
              <div className="fade-in">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                  <KeyRound className="h-6 w-6 text-blue-400" />
                </div>
                <h1 className="text-xl font-bold text-foreground">
                  {TEXT.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {TEXT.subtitle}
                </p>
              </div>
            )}

            {step === "code" && (
              <div className="fade-in">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20">
                  <ShieldCheck className="h-6 w-6 text-indigo-400" />
                </div>
                <h1 className="text-xl font-bold text-foreground">
                  {TEXT.confirmTitle}
                </h1>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {TEXT.codeSentTo} {email}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 fade-in">
              {error}
            </div>
          )}

          {step === "credentials" && (
            <div className="space-y-4 fade-in-up">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-muted-foreground"
                >
                  {TEXT.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-muted-foreground"
                >
                  {TEXT.password}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={TEXT.passwordPlaceholder}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleLogin()
                      }
                    }}
                    className="bg-muted pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      showPassword
                        ? TEXT.hidePassword
                        : TEXT.showPassword
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? TEXT.checking : TEXT.continue}
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-4 fade-in-up">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  containerClassName="w-full justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={handleVerifyLogin}
                disabled={code.length !== 6 || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? TEXT.signingIn : TEXT.signIn}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  setStep("credentials")
                  setCode("")
                  setError("")
                }}
              >
                {TEXT.back}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 text-center text-sm text-muted-foreground fade-in-up-delay-2">
          <p>
            <Link
              href="/auth/forgot-password"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {TEXT.forgotPassword}
            </Link>
          </p>
          <p>
            {TEXT.noAccount}{" "}
            <Link
              href="/auth/register"
              className="text-blue-400 transition-colors hover:text-blue-300"
            >
              {TEXT.register}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
