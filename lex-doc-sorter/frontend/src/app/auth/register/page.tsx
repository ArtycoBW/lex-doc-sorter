"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { FallingPattern } from "@/components/ui/falling-pattern"
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
import { cn } from "@/lib/utils"

const TEXT = {
  steps: [{ label: "Email" }, { label: "Код" }, { label: "Профиль" }],
  enterEmail: "Введите email",
  enterValidEmail: "Введите корректный email",
  enterCode: "Введите 6-значный код",
  alreadyRegistered:
    "Пользователь уже зарегистрирован. Войдите в аккаунт.",
  enterName: "Введите ФИО",
  invalidPassword: "Пароль не соответствует требованиям",
  registration: "Регистрация",
  registrationHint: "Введите email для получения кода",
  confirmTitle: "Подтверждение",
  codeSentTo: "Код отправлен на",
  profile: "Профиль",
  profileHint: "Заполните данные для завершения регистрации",
  email: "Email",
  sendCode: "Получить код",
  sending: "Отправка...",
  checking: "Проверка...",
  confirm: "Подтвердить",
  changeEmail: "Изменить email",
  fullName: "ФИО",
  fullNamePlaceholder: "Иванов Иван Иванович",
  company: "Компания",
  companyPlaceholder: 'ООО "Компания"',
  companyOptional: "Компания (необязательно)",
  password: "Пароль",
  passwordPlaceholder: "Придумайте пароль",
  passwordRule: "Минимум 6 символов",
  registering: "Регистрация...",
  register: "Зарегистрироваться",
  forgotPassword: "Забыли пароль?",
  alreadyHaveAccount: "Уже есть аккаунт?",
  signIn: "Войти",
  showPassword: "Показать пароль",
  hidePassword: "Скрыть пароль",
  sendCodeFallback:
    "Не удалось отправить код. Попробуйте ещё раз.",
  verifyCodeFallback:
    "Не удалось подтвердить код. Попробуйте ещё раз.",
  registerFallback:
    "Не удалось завершить регистрацию. Попробуйте ещё раз.",
} as const

type Step = "email" | "code" | "profile"

const stepIndex: Record<Step, number> = {
  email: 0,
  code: 1,
  profile: 2,
}

const passwordRules = [
  {
    label: TEXT.passwordRule,
    test: (password: string) => password.length >= 6,
  },
]

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const passwordValid = useMemo(
    () => passwordRules.every((rule) => rule.test(password)),
    [password],
  )

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError(TEXT.enterEmail)
      return
    }

    if (!isValidEmail(email)) {
      setError(TEXT.enterValidEmail)
      return
    }

    setError("")
    setLoading(true)

    try {
      const result = await api.sendRegistrationCode(email)

      if (result.devCode) {
        setCode(result.devCode)
      }

      setStep("code")
    } catch (error: unknown) {
      setError(getErrorMessage(error, TEXT.sendCodeFallback))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError(TEXT.enterCode)
      return
    }

    setError("")
    setLoading(true)

    try {
      const result = await api.verifyCode(email, code)

      if (!result.isNewUser) {
        setError(TEXT.alreadyRegistered)
        return
      }

      setStep("profile")
    } catch (error: unknown) {
      setError(getErrorMessage(error, TEXT.verifyCodeFallback))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!name.trim()) {
      setError(TEXT.enterName)
      return
    }

    if (!passwordValid) {
      setError(TEXT.invalidPassword)
      return
    }

    setError("")
    setLoading(true)

    try {
      const result = await api.register({
        email,
        password,
        name: name.trim(),
        company: company.trim() || undefined,
      })

      login(result.accessToken, result.refreshToken, result.user)
      router.push("/dashboard")
    } catch (error: unknown) {
      setError(getErrorMessage(error, TEXT.registerFallback))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-[max(1rem,env(safe-area-inset-left))] py-6 pr-[max(1rem,env(safe-area-inset-right))] sm:p-4">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,transparent_15%,black_70%)]">
          <FallingPattern
            className="h-full w-full"
            color="hsl(217,91%,60%)"
            backgroundColor="hsl(222,47%,6%)"
            blurIntensity="3px"
            duration={200}
          />
        </div>
      </div>

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
          currentStep={stepIndex[step]}
        />

        <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-2xl backdrop-blur-xl fade-in-up sm:p-8">
          <div className="mb-6 text-center">
            {step === "email" && (
              <div className="fade-in">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                  <Mail className="h-6 w-6 text-blue-400" />
                </div>
                <h1 className="text-xl font-bold text-foreground">
                  {TEXT.registration}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {TEXT.registrationHint}
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

            {step === "profile" && (
              <div className="fade-in">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                  <UserPlus className="h-6 w-6 text-blue-400" />
                </div>
                <h1 className="text-xl font-bold text-foreground">
                  {TEXT.profile}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {TEXT.profileHint}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 fade-in">
              {error}
            </div>
          )}

          {step === "email" && (
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
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSendCode()
                    }
                  }}
                  className="bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                />
              </div>

              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={handleSendCode}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? TEXT.sending : TEXT.sendCode}
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
                onClick={handleVerifyCode}
                disabled={code.length !== 6 || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? TEXT.checking : TEXT.confirm}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => {
                  setStep("email")
                  setCode("")
                  setError("")
                }}
              >
                {TEXT.changeEmail}
              </Button>
            </div>
          )}

          {step === "profile" && (
            <div className="space-y-4 fade-in-up">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-muted-foreground"
                >
                  {TEXT.fullName}
                </Label>
                <Input
                  id="name"
                  placeholder={TEXT.fullNamePlaceholder}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="company"
                  className="text-muted-foreground"
                >
                  {TEXT.companyOptional}
                </Label>
                <Input
                  id="company"
                  placeholder={TEXT.companyPlaceholder}
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
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

                {password.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {passwordRules.map((rule) => {
                      const passed = rule.test(password)

                      return (
                        <div
                          key={rule.label}
                          className="flex items-center gap-2 text-sm"
                        >
                          {passed ? (
                            <Check className="h-4 w-4 text-blue-400" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/40" />
                          )}
                          <span
                            className={cn(
                              passed
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {rule.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-500"
                onClick={handleRegister}
                disabled={!name.trim() || !passwordValid || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? TEXT.registering : TEXT.register}
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
            {TEXT.alreadyHaveAccount}{" "}
            <Link
              href="/auth/login"
              className="text-blue-400 transition-colors hover:text-blue-300"
            >
              {TEXT.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
