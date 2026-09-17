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

# Servidor, estáticos e public montados numa pasta só, no mesmo passo do
# build. Em três COPY separados, cada um virava um registro próprio no cache
# do CI, e dois builds simultâneos montaram uma imagem com o servidor de um
# build e os estáticos de outro: o HTML pedia um webpack-*.js inexistente e
# o control travou no preloader.
RUN mkdir -p .next/standalone/.next/static .next/standalone/public && cp -r .next/static/. .next/standalone/.next/static/ && cp -r public/. .next/standalone/public/

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
EXPOSE 3008
CMD ["node", "server.js"]
