# Image de production du frontend Next.js (build "standalone").
# Multi-stage : deps -> build -> runner (image finale minimale).

# ---- Dépendances ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (et non npm ci) : le lock contient des deps natives optionnelles
# spécifiques à la plateforme (lightningcss/Tailwind v4) absentes pour linux-musl.
RUN npm install --no-audit --no-fund

# ---- Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* est figé AU BUILD. Vide par défaut => le front appelle /api en
# same-origin (via le reverse proxy Caddy). Surchargé par le build arg si besoin.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sortie standalone : server.js + node_modules minimal, + assets statiques + public.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
