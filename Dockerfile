# ---- Builder stage: install deps, build the Next.js app ----
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time by
# Next.js, so they must be available before `next build` runs - setting
# them only as a runtime env var (the way a normal server app would) ships
# a bundle with these values baked in as undefined.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage: only what's needed to run `next start` ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# ECS sets PORT via environment; `next start` already reads it and
# defaults to 3000 when unset, matching the EXPOSE below.
EXPOSE 3000

CMD ["npm", "start"]
