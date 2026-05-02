export const PROCESSING_TOKEN_COST = {
  QUICK: 1_500,
  SMART: 6_000,
} as const;

export const DEMO_DAILY_TOKEN_LIMIT = 50_000;

export const TARIFF_PLANS = [
  {
    id: 'starter',
    code: 'starter',
    name: 'Старт',
    description: 'Пилотный доступ для разовых подборок и проверки качества обработки.',
    price: 990,
    currency: 'RUB',
    durationDays: 30,
    dailyTokenLimit: DEMO_DAILY_TOKEN_LIMIT,
    sectionScope: 'ALL' as const,
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'pro-monthly',
    code: 'pro_monthly',
    name: 'Профессиональный',
    description: 'Регулярная подготовка судебных пакетов, OCR, реестры и большие загрузки.',
    price: 4_900,
    currency: 'RUB',
    durationDays: 30,
    dailyTokenLimit: 1_500_000,
    sectionScope: 'ALL' as const,
    isActive: true,
    sortOrder: 20,
  },
  {
    id: 'team-monthly',
    code: 'team_monthly',
    name: 'Команда',
    description: 'Расширенный лимит для юридического отдела и нескольких сотрудников.',
    price: 14_900,
    currency: 'RUB',
    durationDays: 30,
    dailyTokenLimit: null,
    sectionScope: 'ALL' as const,
    isActive: true,
    sortOrder: 30,
  },
];

export const TOKEN_PACKAGES = [
  {
    id: 'tokens-100k',
    code: 'tokens_100k',
    name: '100 тысяч токенов',
    description: 'Резерв для небольших разовых обработок сверх дневного лимита.',
    tokenAmount: 100_000,
    price: 490,
    currency: 'RUB',
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'tokens-500k',
    code: 'tokens_500k',
    name: '500 тысяч токенов',
    description: 'Пакет для больших загрузок с OCR и умной сборкой документов.',
    tokenAmount: 500_000,
    price: 1_990,
    currency: 'RUB',
    isActive: true,
    sortOrder: 20,
  },
  {
    id: 'tokens-2m',
    code: 'tokens_2m',
    name: '2 миллиона токенов',
    description: 'Рабочий резерв для массовой подготовки материалов дела.',
    tokenAmount: 2_000_000,
    price: 6_900,
    currency: 'RUB',
    isActive: true,
    sortOrder: 30,
  },
];
