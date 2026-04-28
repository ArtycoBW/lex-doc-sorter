# Docker build notes

Если сборка долго висит на `RUN npm install` или `RUN npm ci`, почти всегда контейнер Docker не может достучаться до npm registry.

Что изменено:

- Перед установкой зависимостей выполняется короткий `npm ping`.
- Если registry недоступен, сборка падает примерно за 15 секунд с понятным сообщением.
- Таймауты npm уменьшены с 10 минут до 30 секунд.
- В Docker используется `npm ci`, чтобы ставить зависимости строго по lock-файлам.

Как проверить доступ из Docker:

```bash
docker run --rm node:20-bookworm-slim npm ping --registry=https://registry.npmjs.org/ --fetch-retries=0 --fetch-timeout=15000
```

Если команда падает, настройте интернет или proxy в Docker Desktop. Для proxy можно заполнить в `.env`:

```env
HTTP_PROXY=http://user:password@host:port
HTTPS_PROXY=http://user:password@host:port
NO_PROXY=localhost,127.0.0.1,postgres,redis,backend
NPM_REGISTRY=https://registry.npmjs.org/
```

После этого запускайте:

```bash
docker compose up --build
```
