# Lex-Doc Sorter

Monorepo для сервиса подготовки и сортировки юридических документов.

## Стек

- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma
- Docker: frontend, backend, postgres, redis

## Локальный запуск без Docker

1. Скопируйте env-файлы:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

2. Поднимите PostgreSQL и примените Prisma-схему:

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

3. В отдельном терминале запустите frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend будет доступен на `http://localhost:3000`, backend и Swagger на `http://localhost:3001/api`.

## Локальный запуск через Docker

```bash
cp .env.example .env
docker compose up --build
```

После старта:

- Frontend: `http://localhost:3000`
- Backend Swagger: `http://localhost:3001/api`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
