# Imagem do projeto conceitual AMS (site + RH de demonstração). Sem banco nem disco persistente.
FROM node:24-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

COPY . .

# PREVIEW_MODE=1 bloqueia indexação (projeto conceitual com dados fictícios)
ARG PREVIEW_MODE=1
ARG SITE_URL=https://ams-componentes.onrender.com
ENV PREVIEW_MODE=$PREVIEW_MODE SITE_URL=$SITE_URL
RUN npx next build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
