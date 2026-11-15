# Contexto de build: raíz del monorepo (ver docker-compose.yml)
FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["npm", "start"]
