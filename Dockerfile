# Learn European Portuguese - Production Docker Image
# This Dockerfile creates an optimized production build of the application
#
# MULTI-STAGE BUILD EXPLANATION:
# 1. 'deps' stage: Installs ALL dependencies (including devDependencies like TypeScript)
# 2. 'production-deps' stage: Installs ONLY production dependencies for runtime
# 3. 'builder' stage: Uses 'deps' to build the app (needs TypeScript, ESLint, etc.)
# 4. 'runner' stage: Uses 'production-deps' for final image (smaller, more secure)
#
# CRITICAL: Never install only production deps in the builder stage!
# Next.js requires devDependencies like TypeScript during the build process.

# Build arguments for metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Use the official Node.js 18 Alpine image for smaller size
FROM node:18-alpine AS base

# Install ALL dependencies (including devDependencies) for building
# NOTE: We need devDependencies like TypeScript, ESLint, etc. for the build process
# Even though they won't be needed at runtime, Next.js requires them during build
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install ALL dependencies (dev + production) - needed for building the application
# TypeScript, ESLint, and other build tools are in devDependencies but required for npm run build
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci --ignore-scripts && npm cache clean --force; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Cache cleanup for smaller image
RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm

# Install ONLY production dependencies for the final runtime image
# This keeps the final image smaller by excluding build tools like TypeScript, ESLint, etc.
# that are not needed when running the application
FROM base AS production-deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install only production dependencies - these are the runtime dependencies
# Build dependencies like TypeScript are NOT included here since they're not needed at runtime
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile --production; \
  elif [ -f package-lock.json ]; then npm ci --only=production --ignore-scripts && npm cache clean --force; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile --prod; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Cache cleanup
RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm


# Build the application using ALL dependencies (including devDependencies)
# This stage needs TypeScript, ESLint, and other build tools from devDependencies
FROM base AS builder
WORKDIR /app
# Copy ALL dependencies from the 'deps' stage (not 'production-deps')
# This includes devDependencies like TypeScript which are required for building
COPY --from=deps /app/node_modules ./node_modules
# Copy package files first for better caching
COPY package*.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./
COPY components.json ./

# Copy source files
COPY src/ ./src/
COPY public/ ./public/

# Add build arguments as environment variables
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION
ENV BUILD_DATE=${BUILD_DATE}
ENV VCS_REF=${VCS_REF}
ENV VERSION=${VERSION}

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# If using npm comment out above and use below instead
# RUN npm run build

# Runtime image - copy only what's needed to run the application
# Uses production-deps (no devDependencies) to keep the image small and secure
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user to run the application
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install curl for health checks
RUN apk add --no-cache curl

# Copy ONLY production dependencies (no TypeScript, ESLint, etc.)
# This keeps the final image smaller and more secure by excluding build tools
COPY --from=production-deps /app/node_modules ./node_modules

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/sqlite3 ./node_modules/sqlite3

# Add metadata labels
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION
LABEL org.opencontainers.image.created=${BUILD_DATE}
LABEL org.opencontainers.image.source="https://github.com/mtib/pt"
LABEL org.opencontainers.image.version=${VERSION}
LABEL org.opencontainers.image.revision=${VCS_REF}
LABEL org.opencontainers.image.title="Portuguese Learning App"
LABEL org.opencontainers.image.description="Interactive Portuguese vocabulary learning application with AI-powered explanations"
LABEL org.opencontainers.image.authors="mtib"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.documentation="https://github.com/mtib/pt/blob/main/README.md"

USER nextjs

# Expose the port the app runs on
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
