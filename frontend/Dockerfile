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
RUN npm ci --no-audit --no-fund

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

RUN test -f .next/standalone/server.js \
    || (echo "Next standalone server was not generated. Check next.config.js output: 'standalone'." >&2; exit 1)

RUN mkdir -p .next/standalone/.next \
    && cp -R .next/static .next/standalone/.next/static \
    && if [ -d public ]; then cp -R public .next/standalone/public; fi

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app/.next/standalone

CMD ["node", "server.js"]
