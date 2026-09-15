FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ARG NEXT_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_SSO_URL
ARG NEXT_PUBLIC_HUB_URL
ENV NEXT_PUBLIC_DOMAIN=$NEXT_PUBLIC_DOMAIN
ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_HUB_URL=$NEXT_PUBLIC_HUB_URL

RUN npm run build

FROM node:22-alpine AS runner

# Carimbo de versão: é o que /api/version devolve e o painel admin usa
# para dizer qual commit roda onde. Vem do CI via --build-arg.
ARG GIT_SHA=dev
ARG BUILT_AT
ENV GIT_SHA=$GIT_SHA
ENV BUILT_AT=$BUILT_AT
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3008
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3008
CMD ["node", "server.js"]
