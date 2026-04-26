FROM node:20-bookworm-slim

WORKDIR /app

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG NPM_REGISTRY=https://registry.npmjs.org/

ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY}

COPY package.json package-lock.json* .npmrc ./
RUN npm ping --registry="${NPM_CONFIG_REGISTRY}" --fetch-retries=0 --fetch-timeout=15000 \
    || (echo "Cannot reach npm registry from Docker build. Check Docker Desktop internet/proxy settings or set HTTP_PROXY/HTTPS_PROXY/NPM_REGISTRY in .env." >&2; exit 1)
RUN npm ci --no-audit --no-fund && test -x ./node_modules/.bin/prisma

COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

COPY . .
RUN npm run build

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "./node_modules/.bin/prisma db push && node dist/main"]
