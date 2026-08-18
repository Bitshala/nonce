# Build context is the REPO ROOT, not this directory, because the backend now
# depends on the @nonce/shared workspace:
#
#   docker build -f apps/backend/Dockerfile .
#
# Stage 1: build @nonce/shared, then the NestJS application
FROM node:22-alpine AS builder

WORKDIR /app

# Native build deps for packages that compile on install
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    build-base

# Manifests first, so the dependency layer caches independently of source.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/

# Plain `npm ci` also installs the frontend's dependencies, which this image
# doesn't need. `npm ci -w @nonce/backend --include-workspace-root` prunes that
# but is inconsistent across npm versions; revisit only if build time hurts.
RUN npm ci

COPY packages/shared packages/shared
COPY apps/backend apps/backend

# Shared must be built first: the backend resolves it through node_modules to
# its dist/, so compiling the backend against unbuilt shared fails.
RUN npm run build -w @nonce/shared && npm run build -w @nonce/backend

# Stage 2: production image
FROM node:22-alpine AS production

WORKDIR /app

# @nonce/shared is required at runtime and neither nest nor tsc bundles
# dependencies, so its dist and manifest both have to be present for npm to link
# the workspace.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/shared/dist packages/shared/dist

RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    build-base && \
    npm ci --omit=dev && \
    apk del python3 py3-setuptools make g++ build-base

COPY --from=builder /app/apps/backend/dist apps/backend/dist
COPY apps/backend/migrations apps/backend/migrations

ENV DB_NAME="bitshala"
ENV APP_PORT="80"

VOLUME /app/data

EXPOSE $APP_PORT

# The compiled entrypoint is dist/src/main.js, not dist/main.js: the backend
# tsconfig sets outDir without rootDir, so TypeScript infers the common root of
# its program (src/ plus migrations/) and nests the output one level deeper.
# The previous Dockerfile said `node dist/main.js`, which disagreed with
# `start:prod` ("node dist/src/main") — start:prod was the correct one.
ENTRYPOINT ["sh", "-c", "npm run migration:run -w @nonce/backend && node apps/backend/dist/src/main.js"]
