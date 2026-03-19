FROM node:22-bookworm-slim AS base

# Install system dependencies: pandoc + typst
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    curl \
    ca-certificates \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Install typst (latest binary)
RUN curl -fsSL https://github.com/typst/typst/releases/latest/download/typst-x86_64-unknown-linux-musl.tar.xz \
    | tar xJ --strip-components=1 -C /usr/local/bin/

WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/cli/package.json packages/cli/
COPY packages/web/package.json packages/web/
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY . .

# Build core first, then web
RUN npm run build --workspace=packages/core
RUN npm run build --workspace=packages/web

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

# Copy core package (templates + fonts needed at runtime)
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/templates ./packages/core/templates
COPY --from=builder /app/packages/core/fonts ./packages/core/fonts
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json

USER nextjs
EXPOSE 3000
CMD ["node", "packages/web/server.js"]
