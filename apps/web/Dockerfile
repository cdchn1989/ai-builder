# Contexto de build: raíz del monorepo (ver docker-compose.yml)
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY packages/shared packages/shared
COPY apps/web apps/web
WORKDIR /app/apps/web
EXPOSE 5173
CMD ["npm", "run", "dev"]
