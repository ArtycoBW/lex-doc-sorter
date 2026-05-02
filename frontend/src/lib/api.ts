function getApiUrl() {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!value) {
    throw new Error('Не настроен адрес API. Проверьте NEXT_PUBLIC_API_URL.');
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

let refreshPromise: Promise<string | null> | null = null;
export const REQUEST_ABORTED_ERROR = '__REQUEST_ABORTED__';
export const AUTH_NOTICE_STORAGE_KEY = "lex-doc-auth-notice";

type AuthNoticeCode = "SESSION_REPLACED" | "SESSION_EXPIRED";

export type AuthNotice = {
  code: AuthNoticeCode;
  title: string;
  description: string;
  actionLabel: string;
  createdAt: string;
};

type SectionInputRequirement = {
  label: string;
  keywords: string[];
};

type ConversationDocument = {
  document: {
    id: string;
    originalName: string;
    status: string;
  };
};

type ConversationPreviewMessage = {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
};

type ConversationPayload = {
  id: string;
  title: string;
  documentId: string | null;
  documents?: ConversationDocument[];
  messages?: ConversationPreviewMessage[];
  createdAt: string;
  updatedAt: string;
  section: { slug: string; name: string };
};

type FeedbackCategory = 'BUG' | 'IDEA' | 'OTHER';
type FeedbackStatus = 'NEW' | 'REVIEWED' | 'RESOLVED';

type FeedbackItem = {
  id: string;
  userId: string;
  sectionSlug: string;
  conversationId: string;
  conversationTitle: string;
  messageId: string | null;
  messagePreview: string | null;
  category: FeedbackCategory;
  content: string;
  status: FeedbackStatus;
  adminNote: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

type AdminUserItem = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: 'DEMO' | 'PRO' | 'ADMIN';
  isVerified: boolean;
  isBanned: boolean;
  tokenBalance: number;
  createdAt: string;
  updatedAt: string;
  access: UserAccessSummary;
};

export type UserAccessSummary = {
  mode: 'UNLIMITED' | 'TRIAL' | 'SMART_ASSISTANT_ONLY' | 'PAID';
  trialActive: boolean;
  trialEndsAt: string | null;
  dailyLimit: number | null;
  tokensUsedToday: number;
  tokensRemainingToday: number | null;
  sectionScope: 'ALL' | 'SMART_ASSISTANT_ONLY';
  extraTokenBalance: number;
  currentTariff:
    | {
        subscriptionId: string;
        code: string;
        name: string;
        dailyTokenLimit: number | null;
        sectionScope: 'ALL' | 'SMART_ASSISTANT_ONLY';
        startsAt: string;
        endsAt: string;
      }
    | null;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: 'DEMO' | 'PRO' | 'ADMIN';
  isVerified: boolean;
  tokenBalance: number;
  createdAt: string;
  updatedAt: string;
  access: UserAccessSummary;
};

export type JobStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type FileStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type ProcessedFile = {
  id: string;
  jobId: string;
  originalName: string;
  originalPath: string;
  processedPath: string | null;
  processedName: string | null;
  ocrText: string | null;
  docType: string | null;
  docDate: string | null;
  docNumber: string | null;
  docParties: string[];
  docSummary: string | null;
  outputPdfPath: string | null;
  pageCount: number;
  sizeBytes: number;
  orderIndex: number;
  groupIndex: number | null;
  status: FileStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SortingJob = {
  id: string;
  userId: string;
  status: JobStatus;
  totalFiles: number;
  processedFiles: number;
  outputZipPath: string | null;
  registryPath: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  files: ProcessedFile[];
};

export type JobProgress = {
  jobId: string;
  status: JobStatus;
  processedFiles: number;
  totalFiles: number;
  percent: number;
};

export type JobsPageResponse = {
  items: SortingJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type BillingSummary = {
  mode: 'TRIAL' | 'FREE' | 'PAID' | 'UNLIMITED' | 'SMART_ASSISTANT_ONLY';
  tariffName: string | null;
  tariffCode: string | null;
  subscriptionEndsAt: string | null;
  dailyLimit: number | null;
  tokensUsedToday: number;
  tokensRemainingToday: number | null;
  tokenPackageBalance: number;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
};

export type TariffPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationDays: number;
  dailyLimitTokens: number | null;
  features: string[];
  isActive: boolean;
  isCurrent: boolean;
};

export type TokenPackage = {
  id: string;
  code: string;
  name: string;
  tokens: number;
  price: number;
  currency: string;
  isActive: boolean;
};

export type BillingTransactionType =
  | 'TRIAL_USAGE'
  | 'ALLOWANCE_USAGE'
  | 'PACKAGE_USAGE'
  | 'PAYMENT_TOPUP'
  | 'MANUAL_ADJUSTMENT'
  | 'REFUND'
  | 'SUBSCRIPTION_ACTIVATION';

export type BillingTransaction = {
  id: string;
  type: BillingTransactionType;
  tokens: number | null;
  amount: number | null;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
};

type RawBillingSummaryResponse = {
  userId: string;
  tokenBalance: number;
  access: UserAccessSummary;
};

type RawTariffPlanResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationDays: number;
  dailyTokenLimit: number | null;
  sectionScope: 'ALL' | 'SMART_ASSISTANT_ONLY';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type RawTokenPackageResponse = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tokenAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type RawBillingTransactionResponse = {
  id: string;
  type: BillingTransactionType;
  tokenDelta: number;
  usageTokens: number;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
  payment?: {
    amount: number;
  } | null;
};

type RawPaymentResponse = {
  id: string;
  externalOrderId: string | null;
  formUrl: string | null;
  status?: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'EXPIRED' | 'REFUNDED';
  amount?: number;
  currency?: string;
  paidAt?: string | null;
  processedAt?: string | null;
  target?: {
    type: 'TARIFF_PLAN' | 'TOKEN_PACKAGE';
    code: string;
    name: string;
    tokenAmount?: number;
  } | null;
};

type PaymentRequestPayload = {
  targetType: 'TARIFF_PLAN' | 'TOKEN_PACKAGE';
  targetCode: string;
  quantity?: number;
};

export type PaymentDetails = {
  paymentId: string;
  orderId: string;
  paymentUrl: string | null;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'EXPIRED' | 'REFUNDED';
  amount: number | null;
  currency: string | null;
  paidAt: string | null;
  processedAt: string | null;
  target:
    | {
        type: 'TARIFF_PLAN' | 'TOKEN_PACKAGE';
        code: string;
        name: string;
        tokenAmount?: number;
      }
    | null;
};

const PUBLIC_TARIFF_PLAN_CODES = new Set(['pro_monthly']);
const PUBLIC_TOKEN_PACKAGE_CODES = new Set([
  'packs_10',
  'packs_20',
  'packs_50',
  'packs_100',
]);

function normalizeTariffDisplayName(code: string, name: string) {
  if (code === 'pro_monthly') {
    return 'Безлимит';
  }

  return name;
}

function normalizeTariffDescription(code: string, description: string | null) {
  if (code === 'pro_monthly') {
    return 'Полный доступ ко всем разделам с лимитом 1 500 000 токенов в сутки.';
  }

  return description;
}

function normalizeConversation<T extends ConversationPayload>(conversation: T): T & { documents: ConversationDocument[] } {
  return {
    ...conversation,
    documents: conversation.documents ?? [],
  };
}

function formatNumberRu(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value);
}

function mapBillingSummary(raw: RawBillingSummaryResponse): BillingSummary {
  const { access } = raw;
  const trialDaysLeft = access.trialEndsAt
    ? Math.max(
        0,
        Math.ceil((new Date(access.trialEndsAt).getTime() - Date.now()) / 86400000),
      )
    : null;

  return {
    mode:
      access.mode === 'SMART_ASSISTANT_ONLY'
        ? 'FREE'
        : access.mode,
    tariffName: access.currentTariff
      ? normalizeTariffDisplayName(
          access.currentTariff.code,
          access.currentTariff.name,
        )
      : null,
    tariffCode: access.currentTariff?.code ?? null,
    subscriptionEndsAt: access.currentTariff?.endsAt ?? null,
    dailyLimit: access.dailyLimit,
    tokensUsedToday: access.tokensUsedToday,
    tokensRemainingToday: access.tokensRemainingToday,
    tokenPackageBalance: raw.tokenBalance,
    trialEndsAt: access.trialEndsAt,
    trialDaysLeft,
  };
}

function buildTariffFeatures(plan: RawTariffPlanResponse) {
  if (plan.code === 'pro_monthly') {
    return [
      'Все AI-разделы',
      '1 500 000 токенов в сутки',
      'Суточный лимит обновляется каждый день',
      'Одна активная сессия на одном ПК',
      `Доступ на ${plan.durationDays} дн.`,
    ];
  }

  const features = new Set<string>();

  features.add(
    plan.sectionScope === 'ALL'
      ? 'Полный доступ ко всем AI-разделам'
      : 'Доступ к разделу "Умный помощник"',
  );

  if (plan.description?.trim()) {
    features.add(plan.description.trim());
  }

  features.add(
    plan.dailyTokenLimit != null
      ? `${formatNumberRu(plan.dailyTokenLimit)} токенов в сутки`
      : 'Без суточного лимита',
  );

  features.add(`Доступ на ${plan.durationDays} дн.`);

  return Array.from(features);
}

function mapTariffPlan(
  raw: RawTariffPlanResponse,
  currentTariffCode?: string | null,
): TariffPlan {
  return {
    id: raw.id,
    code: raw.code,
    name: normalizeTariffDisplayName(raw.code, raw.name),
    description: normalizeTariffDescription(raw.code, raw.description),
    price: raw.price,
    currency: raw.currency,
    durationDays: raw.durationDays,
    dailyLimitTokens: raw.dailyTokenLimit,
    features: buildTariffFeatures(raw),
    isActive: raw.isActive,
    isCurrent: Boolean(currentTariffCode && raw.code === currentTariffCode),
  };
}

function mapTokenPackage(raw: RawTokenPackageResponse): TokenPackage {
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    tokens: raw.tokenAmount,
    price: raw.price,
    currency: raw.currency,
    isActive: raw.isActive,
  };
}

function filterPublicTariffs(items: RawTariffPlanResponse[]) {
  return items.filter((item) => PUBLIC_TARIFF_PLAN_CODES.has(item.code));
}

function filterPublicTokenPackages(items: RawTokenPackageResponse[]) {
  return items.filter((item) => PUBLIC_TOKEN_PACKAGE_CODES.has(item.code));
}

function mapPaymentDetails(payment: RawPaymentResponse): PaymentDetails {
  return {
    paymentId: payment.id,
    orderId: payment.externalOrderId ?? payment.id,
    paymentUrl: payment.formUrl,
    status: payment.status ?? 'PENDING',
    amount: payment.amount ?? null,
    currency: payment.currency ?? null,
    paidAt: payment.paidAt ?? null,
    processedAt: payment.processedAt ?? null,
    target: payment.target ?? null,
  };
}

function mapBillingTransaction(
  raw: RawBillingTransactionResponse,
): BillingTransaction {
  return {
    id: raw.id,
    type: raw.type,
    tokens:
      raw.tokenDelta !== 0
        ? Math.abs(raw.tokenDelta)
        : raw.usageTokens > 0
          ? raw.usageTokens
          : null,
    amount: raw.payment?.amount ?? null,
    description: raw.description,
    balanceAfter: raw.balanceAfter,
    createdAt: raw.createdAt,
  };
}

type ConversationMessagePayload = {
  conversationId: string;
  userMessage: {
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    tokensUsed: number;
    feedback: 'LIKE' | 'DISLIKE' | null;
    createdAt: string;
  };
  assistantMessage: {
    id: string;
    role: 'USER' | 'ASSISTANT' | 'SYSTEM';
    content: string;
    tokensUsed: number;
    feedback: 'LIKE' | 'DISLIKE' | null;
    createdAt: string;
  };
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
};

function getAccessToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
}

function getRefreshToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
}

function storeTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearStoredAuth() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function persistAuthNotice(notice: AuthNotice) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, JSON.stringify(notice));
  window.dispatchEvent(new CustomEvent("lex-doc-auth-notice", { detail: notice }));
}

function resolveAuthNotice(message?: unknown): AuthNotice | null {
  const value = extractErrorText(message)?.toLowerCase();

  if (!value) {
    return null;
  }

  if (
    value.includes("другом устройстве") ||
    value.includes("сессия завершена") ||
    value.includes("session terminated")
  ) {
    return {
      code: "SESSION_REPLACED",
      title: "Сессия завершена на этом устройстве",
      description:
        "Вы вошли в аккаунт на другом компьютере или устройстве. По текущим настройкам активной может быть только одна сессия.",
      actionLabel: "Войти снова",
      createdAt: new Date().toISOString(),
    };
  }

  if (
    value.includes("refresh token") ||
    value.includes("истекла") ||
    value.includes("недействительный")
  ) {
    return {
      code: "SESSION_EXPIRED",
      title: "Нужно войти снова",
      description:
        "Сессия истекла или была завершена. Повторите вход, чтобы продолжить работу.",
      actionLabel: "Перейти ко входу",
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

function extractErrorText(message: unknown): string | undefined {
  if (typeof message === 'string') {
    return message.trim();
  }

  if (message instanceof Error) {
    return message.message.trim();
  }

  if (message && typeof message === 'object') {
    const nestedMessage = (message as { message?: unknown }).message;
    if (nestedMessage !== undefined) {
      return extractErrorText(nestedMessage);
    }

    const error = (message as { error?: unknown }).error;
    if (error !== undefined) {
      return extractErrorText(error);
    }
  }

  return undefined;
}

function isPublicAuthPath(path?: string) {
  return (
    path === '/auth/send-code' ||
    path === '/auth/send-registration-code' ||
    path === '/auth/send-reset-code' ||
    path === '/auth/verify-code' ||
    path === '/auth/verify-email' ||
    path === '/auth/register' ||
    path === '/auth/login' ||
    path === '/auth/login-verify' ||
    path === '/auth/reset-password' ||
    path === '/auth/forgot-password'
  );
}

function normalizeErrorMessage(message?: unknown, status?: number, path?: string) {
  const value = extractErrorText(message);

  if (value === 'Failed to fetch') {
    return 'Не удалось соединиться с сервером. Проверьте сеть и попробуйте ещё раз.';
  }

  if (value?.includes('NEXT_PUBLIC_API_URL')) {
    return 'Не настроен адрес API. Проверьте переменные окружения фронтенда.';
  }

  if (value?.includes('непроверенный источник') || value?.includes('вне whitelist')) {
    return 'AI сослался на непроверенный источник. Попробуйте уточнить запрос или выбрать другой режим ответа.';
  }

  if (value?.includes('Gemini API')) {
    return 'Ошибка запроса к AI. Попробуйте ещё раз через несколько секунд.';
  }

  if (value?.includes('trim is not a function')) {
    return 'Сервис вернул некорректный ответ. Попробуйте ещё раз.';
  }

  if (value?.includes('quota') || value?.includes('429')) {
    return 'AI временно недоступен из-за лимита запросов. Попробуйте позже.';
  }

  if (value?.includes('503') || value?.includes('Service Unavailable')) {
    return 'Сервис временно недоступен. Попробуйте ещё раз позже.';
  }

  if (value?.startsWith('Ошибка 400') || value?.startsWith('Bad Request')) {
    return 'Не удалось обработать запрос. Проверьте введённые данные и попробуйте ещё раз.';
  }

  if (status === 400) {
    return value || 'Не удалось обработать запрос. Проверьте выбранные данные и попробуйте ещё раз.';
  }

  if (status === 401) {
    if (isPublicAuthPath(path)) {
      return value || 'Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз.';
    }

    return 'Сессия истекла. Войдите в аккаунт ещё раз.';
  }

  if (status === 403) {
    return 'У вас нет доступа к этому действию.';
  }

  if (status === 404) {
    return 'Нужные данные не найдены. Обновите страницу и попробуйте ещё раз.';
  }

  if (status === 413) {
    return 'Файл слишком большой. Уменьшите размер и попробуйте ещё раз.';
  }

  if (status && status >= 500) {
    return 'На сервере произошла ошибка. Попробуйте ещё раз чуть позже.';
  }

  if (!value) {
    return 'Не удалось выполнить действие. Попробуйте ещё раз.';
  }

  return value;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function withCacheBust(path: string) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}_=${Date.now()}`;
}

async function refreshAccessToken(reasonHint?: AuthNotice | null): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearStoredAuth();
    if (reasonHint) {
      persistAuthNotice(reasonHint);
    }
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Ошибка сервера' }));
        clearStoredAuth();
        persistAuthNotice(resolveAuthNotice(error.message) ?? reasonHint ?? {
          code: "SESSION_EXPIRED",
          title: "Нужно войти снова",
          description: "Сессия истекла. Выполните вход ещё раз.",
          actionLabel: "Перейти ко входу",
          createdAt: new Date().toISOString(),
        });
        return null;
      }

      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      storeTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function authorizedFetch(path: string, options?: RequestInit, retry = true): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options?.headers ?? {});

  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    cache: 'no-store',
    headers,
  });

  if (response.status === 401 && retry && path !== '/auth/refresh' && !isPublicAuthPath(path)) {
    const clonedResponse = response.clone();
    const error = await clonedResponse.json().catch(() => ({ message: undefined }));
    const reasonHint = resolveAuthNotice(error.message);
    const nextAccessToken = await refreshAccessToken(reasonHint);
    if (nextAccessToken) {
      const retryHeaders = new Headers(options?.headers ?? {});

      if (!retryHeaders.has('Content-Type') && !(options?.body instanceof FormData)) {
        retryHeaders.set('Content-Type', 'application/json');
      }

      retryHeaders.set('Authorization', `Bearer ${nextAccessToken}`);

      return fetch(`${getApiUrl()}${path}`, {
        ...options,
        cache: 'no-store',
        headers: retryHeaders,
      });
    }
  }

  return response;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    let res = await authorizedFetch(path, options);

    if (
      res.status === 304 &&
      (!options?.method || options.method.toUpperCase() === 'GET')
    ) {
      res = await authorizedFetch(withCacheBust(path), options);
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Ошибка сервера' }));
      throw new Error(normalizeErrorMessage(error.message, res.status, path));
    }

    return res.json();
  } catch (error: any) {
    throw new Error(error instanceof Error ? error.message : normalizeErrorMessage(error?.message, undefined, path));
  }
}

export const api = {
  sendCode: (email: string) =>
    request<{ message: string; devCode?: string }>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  sendRegistrationCode: (email: string) =>
    request<{ message: string; devCode?: string }>('/auth/send-registration-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  sendResetCode: (email: string) =>
    request<{ message: string; devCode?: string }>('/auth/send-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyCode: (email: string, code: string) =>
    request<{ verified: boolean; isNewUser: boolean }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  verifyEmail: (email: string, code: string) =>
    request<{ verified: boolean; isNewUser: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  register: (data: { email: string; password: string; name: string; company?: string }) =>
    request<{ user: CurrentUser; accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<{ message: string; requiresVerification: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  loginVerify: (email: string, code: string) =>
    request<{ user: CurrentUser; accessToken: string; refreshToken: string }>('/auth/login-verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  forgotPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  createJob: () =>
    request<SortingJob>('/jobs', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  getJobs: (params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();

    if (params?.page) {
      search.set('page', String(params.page));
    }

    if (params?.limit) {
      search.set('limit', String(params.limit));
    }

    const query = search.toString();
    return request<JobsPageResponse>(query ? `/jobs?${query}` : '/jobs');
  },

  getJob: (jobId: string) => request<SortingJob>(`/jobs/${jobId}`),

  getJobProgress: (jobId: string) =>
    request<JobProgress>(`/jobs/${jobId}/progress`),

  startJobProcessing: (jobId: string) =>
    request<SortingJob>(`/jobs/${jobId}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  downloadJobArchive: async (jobId: string) => {
    try {
      const res = await authorizedFetch(`/jobs/${jobId}/download`);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Ошибка выгрузки архива' }));
        throw new Error(normalizeErrorMessage(error.message, res.status, `/jobs/${jobId}/download`));
      }

      const contentDisposition = res.headers.get('Content-Disposition') ?? '';
      const fileName =
        contentDisposition.match(/filename="([^"]+)"/)?.[1] ??
        `lexdoc_${jobId.slice(0, 8)}.zip`;

      return {
        blob: await res.blob(),
        fileName,
      };
    } catch (error: any) {
      throw new Error(
        error instanceof Error
          ? error.message
          : normalizeErrorMessage(error?.message, undefined, `/jobs/${jobId}/download`),
      );
    }
  },

  deleteJob: (jobId: string) =>
    request<{ message: string }>(`/jobs/${jobId}`, { method: 'DELETE' }),

  updateJobFileName: (
    jobId: string,
    fileId: string,
    processedName: string,
  ) =>
    request<ProcessedFile>(`/jobs/${jobId}/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify({ processedName }),
    }),

  uploadJobFiles: (
    jobId: string,
    files: File[],
    onProgress?: (progress: number) => void,
  ) =>
    new Promise<SortingJob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      for (const file of files) {
        formData.append('files', file);
      }

      xhr.open('POST', `${getApiUrl()}/jobs/${jobId}/upload`);

      const token = getAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        const payload = xhr.responseText
          ? (() => {
              try {
                return JSON.parse(xhr.responseText);
              } catch {
                return null;
              }
            })()
          : null;

        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve(payload as SortingJob);
          return;
        }

        reject(
          new Error(
            normalizeErrorMessage(
              payload?.message,
              xhr.status,
              `/jobs/${jobId}/upload`,
            ),
          ),
        );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            normalizeErrorMessage(
              'Failed to fetch',
              undefined,
              `/jobs/${jobId}/upload`,
            ),
          ),
        );
      };

      xhr.send(formData);
    }),

  uploadDocument: async (file: File, options?: { signal?: AbortSignal }) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await authorizedFetch('/documents/upload', {
        method: 'POST',
        body: formData,
        signal: options?.signal,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Ошибка загрузки документа' }));
        throw new Error(normalizeErrorMessage(error.message, res.status, '/documents/upload'));
      }

      return res.json() as Promise<any>;
    } catch (error: any) {
      throw new Error(
        error instanceof Error ? error.message : normalizeErrorMessage(error?.message, undefined, '/documents/upload')
      );
    }
  },

  getDocuments: () => request<any[]>('/documents'),

  uploadSharedLibraryDocument: async (
    file: File,
    sectionSlugs: string[],
    options?: { signal?: AbortSignal },
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sectionSlugs', JSON.stringify(sectionSlugs));

    try {
      const res = await authorizedFetch('/admin/library/upload', {
        method: 'POST',
        body: formData,
        signal: options?.signal,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Ошибка загрузки документа библиотеки' }));
        throw new Error(normalizeErrorMessage(error.message, res.status, '/admin/library/upload'));
      }

      return res.json() as Promise<any>;
    } catch (error: any) {
      throw new Error(
        error instanceof Error
          ? error.message
          : normalizeErrorMessage(error?.message, undefined, '/admin/library/upload')
      );
    }
  },

  getSharedLibraryDocuments: (params?: {
    sectionSlug?: string
    search?: string
    status?: "ALL" | "UPLOADING" | "PROCESSING" | "READY" | "ERROR"
    page?: number
    pageSize?: number
  }) => {
    const searchParams = new URLSearchParams()

    if (params?.sectionSlug) searchParams.set("sectionSlug", params.sectionSlug)
    if (params?.search) searchParams.set("search", params.search)
    if (params?.status && params.status !== "ALL") searchParams.set("status", params.status)
    if (params?.page) searchParams.set("page", String(params.page))
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize))

    const query = searchParams.toString()
    return request<{
      items: any[]
      total: number
      page: number
      pageSize: number
      totalPages: number
      statusSummary: Record<string, number>
    }>(query ? `/admin/library?${query}` : "/admin/library")
  },

  deleteSharedLibraryDocument: (id: string) =>
    request<{ message: string }>(`/admin/library/${id}`, { method: 'DELETE' }),

  deleteAllSharedLibraryDocuments: () =>
    request<{ message: string; deleted: number }>('/admin/library', { method: 'DELETE' }),

  getAdminSections: () =>
    request<
      Array<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        systemPrompt: string;
        temperature: number;
        regulationVersion: string | null;
        regulationSource: string | null;
        isActive: boolean;
        order: number;
      }>
    >('/admin/sections'),

  updateAdminSection: (
    id: string,
    data: {
      name?: string;
      description?: string;
      systemPrompt?: string;
      temperature?: number;
      regulationVersion?: string;
      regulationSource?: string;
    },
  ) =>
    request<{ id: string; slug: string; name: string }>(`/admin/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getSections: () =>
    request<
      Array<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        regulationVersion: string | null;
        regulationSource: string | null;
        inputRequirements: SectionInputRequirement[] | null;
        order: number;
      }>
    >('/sections'),

  getSectionBySlug: (slug: string) =>
    request<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      regulationVersion: string | null;
      regulationSource: string | null;
      inputRequirements: SectionInputRequirement[] | null;
      order: number;
    }>(`/sections/${slug}`),

  createConversation: (data: {
    sectionSlug: string;
    title?: string;
    documentId?: string;
    documentIds?: string[];
  }) =>
    request<ConversationPayload>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((conversation) => normalizeConversation(conversation)),

  getConversations: (sectionSlug?: string) =>
    request<
      Array<
        ConversationPayload & {
          _count: { messages: number };
        }
      >
    >(sectionSlug ? `/conversations?sectionSlug=${encodeURIComponent(sectionSlug)}` : '/conversations').then((items) =>
      items.map((item) => normalizeConversation(item))
    ),

  getConversationMessages: (conversationId: string) =>
    request<
      Array<{
        id: string;
        role: 'USER' | 'ASSISTANT' | 'SYSTEM';
        content: string;
        tokensUsed: number;
        feedback: 'LIKE' | 'DISLIKE' | null;
        createdAt: string;
      }>
    >(`/conversations/${conversationId}/messages`),

  updateConversation: (
    conversationId: string,
    data: { title?: string; documentId?: string | null; documentIds?: string[] }
  ) =>
    request<ConversationPayload>(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then((conversation) => normalizeConversation(conversation)),

  sendConversationMessage: (conversationId: string, content: string) =>
    request<ConversationMessagePayload>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  streamConversationMessage: async (
    conversationId: string,
    content: string,
    handlers: {
      onDelta: (delta: string) => void;
    },
    options?: {
      signal?: AbortSignal;
    },
  ) => {
    try {
      const res = await authorizedFetch(`/conversations/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        signal: options?.signal,
      });

      if (!res.ok || !res.body) {
        const error = await res.json().catch(() => ({ message: 'Ошибка сервера' }));
        throw new Error(
          normalizeErrorMessage(error.message, res.status, `/conversations/${conversationId}/messages/stream`)
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let donePayload: ConversationMessagePayload | null = null;

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }

          const event = JSON.parse(trimmed) as
            | { type: 'delta'; delta: string }
            | { type: 'done'; payload: ConversationMessagePayload }
            | { type: 'error'; message: string };

          if (event.type === 'delta') {
            handlers.onDelta(event.delta);
          }

          if (event.type === 'done') {
            donePayload = event.payload;
          }

          if (event.type === 'error') {
            throw new Error(
              normalizeErrorMessage(
                event.message || 'Ошибка потокового ответа',
                undefined,
                `/conversations/${conversationId}/messages/stream`
              )
            );
          }
        }

        if (done) {
          break;
        }
      }

      if (!donePayload) {
        throw new Error('AI не вернул итоговый ответ. Попробуйте ещё раз.');
      }

      return donePayload;
    } catch (error: any) {
      if (isAbortError(error)) {
        throw new Error(REQUEST_ABORTED_ERROR);
      }

      throw new Error(
        error instanceof Error
          ? error.message
          : normalizeErrorMessage(error?.message, undefined, `/conversations/${conversationId}/messages/stream`)
      );
    }
  },

  updateMessageFeedback: (
    conversationId: string,
    messageId: string,
    feedback: 'LIKE' | 'DISLIKE' | null
  ) =>
    request<{ id: string; feedback: 'LIKE' | 'DISLIKE' | null }>(
      `/conversations/${conversationId}/messages/${messageId}/feedback`,
      {
        method: 'PATCH',
        body: JSON.stringify({ feedback }),
      }
    ),

  createFeedback: (payload: {
    conversationId?: string;
    messageId?: string;
    sectionSlug?: string;
    contextTitle?: string;
    pagePath?: string;
    category: FeedbackCategory;
    content: string;
    source?: string;
  }) =>
    request<{
      id: string;
      category: FeedbackCategory;
      status: FeedbackStatus;
      content: string;
      createdAt: string;
    }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdminFeedback: (params?: {
    search?: string;
    status?: FeedbackStatus | 'ALL';
    category?: FeedbackCategory | 'ALL';
    source?: 'ALL' | 'form' | 'message';
    page?: number;
    pageSize?: number;
  }) => {
    const search = new URLSearchParams();

    if (params?.search?.trim()) {
      search.set('search', params.search.trim());
    }

    if (params?.status && params.status !== 'ALL') {
      search.set('status', params.status);
    }

    if (params?.category && params.category !== 'ALL') {
      search.set('category', params.category);
    }

    if (params?.source && params.source !== 'ALL') {
      search.set('source', params.source);
    }

    if (params?.page) {
      search.set('page', String(params.page));
    }

    if (params?.pageSize) {
      search.set('pageSize', String(params.pageSize));
    }

    const query = search.toString();
    return request<{
      items: FeedbackItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      statusSummary: Record<string, number>;
      categorySummary: Record<string, number>;
    }>(query ? `/admin/feedback?${query}` : '/admin/feedback');
  },

  updateAdminFeedback: (
    feedbackId: string,
    payload: {
      status: FeedbackStatus;
      adminNote?: string;
    }
  ) =>
    request<FeedbackItem>(`/admin/feedback/${feedbackId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getAdminUsers: (search?: string) => {
    const query = search?.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : '';

    return request<AdminUserItem[]>(`/admin/users${query}`);
  },

  updateAdminUserRole: (userId: string, role: 'DEMO' | 'PRO' | 'ADMIN') =>
    request<AdminUserItem>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  addAdminUserTokens: (userId: string, amount: number) =>
    request<AdminUserItem>(`/admin/users/${userId}/tokens`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    }),

  banAdminUser: (userId: string) =>
    request<AdminUserItem>(`/admin/users/${userId}/ban`, { method: 'PATCH' }),

  unbanAdminUser: (userId: string) =>
    request<AdminUserItem>(`/admin/users/${userId}/unban`, { method: 'PATCH' }),

  getCurrentUser: () => request<CurrentUser>('/users/me'),

  updateProfile: (data: { name?: string; company?: string }) =>
    request<CurrentUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  clearConversationMessages: (conversationId: string) =>
    request<{ message: string }>(`/conversations/${conversationId}/messages`, {
      method: 'DELETE',
    }),

  rewindConversationToMessage: (conversationId: string, messageId: string) =>
    request<{ message: string; deleted: number }>(
      `/conversations/${conversationId}/messages/${messageId}/trail`,
      {
        method: 'DELETE',
      }
    ),

  deleteConversation: (conversationId: string) =>
    request<{ message: string }>(`/conversations/${conversationId}`, {
      method: 'DELETE',
    }),

  deleteDocument: (id: string) => request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),

  getBillingSummary: () =>
    request<RawBillingSummaryResponse>('/billing/summary').then(mapBillingSummary),
  getTariffs: (currentTariffCode?: string | null) =>
    request<RawTariffPlanResponse[]>('/billing/tariffs').then((items) =>
      filterPublicTariffs(items).map((item) => mapTariffPlan(item, currentTariffCode))
    ),
  getTokenPackages: () =>
    request<RawTokenPackageResponse[]>('/billing/token-packages').then((items) =>
      filterPublicTokenPackages(items).map(mapTokenPackage)
    ),
  getBillingHistory: (limit = 10) =>
    request<RawBillingTransactionResponse[]>(`/billing/history?limit=${limit}`).then((items) =>
      items.map(mapBillingTransaction)
    ),
  createPayment: (payload: PaymentRequestPayload) =>
    request<RawPaymentResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(mapPaymentDetails),
  getPayment: (paymentId: string) =>
    request<RawPaymentResponse>(`/payments/${paymentId}`).then(mapPaymentDetails),
  reconcilePayment: (paymentId: string) =>
    request<RawPaymentResponse>(`/payments/${paymentId}/reconcile`, {
      method: 'POST',
    }).then(mapPaymentDetails),
};
