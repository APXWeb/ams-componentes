# Imagem de produção do ecossistema AMS (site + RH).
# Precisa de um volume persistente montado em /data (banco SQLite e arquivos privados).
FROM node:24-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# dependências (better-sqlite3 usa binário pré-compilado para linux/glibc)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

COPY . .

# PREVIEW_MODE=1 bloqueia indexação (proposta com dados fictícios). Para o site oficial, construir com 0.
ARG PREVIEW_MODE=1
ARG SITE_URL=https://amscomponentes.com.br
ENV PREVIEW_MODE=$PREVIEW_MODE SITE_URL=$SITE_URL

# o build pré-renderiza páginas que leem o banco: usa um banco temporário só com o schema
RUN DATABASE_PATH=/tmp/build.db STORAGE_PATH=/tmp/build-storage npx tsx scripts/db-setup.ts --empty \
 && DATABASE_PATH=/tmp/build.db STORAGE_PATH=/tmp/build-storage npx next build \
 && rm -rf /tmp/build.db* /tmp/build-storage

ENV NODE_ENV=production DATABASE_PATH=/data/ams.db STORAGE_PATH=/data/storage PORT=3000
EXPOSE 3000
RUN chmod +x scripts/start.sh
CMD ["sh", "scripts/start.sh"]
