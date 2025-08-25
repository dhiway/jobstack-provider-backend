# ------------------------------
# Stage 1: Builder
# ------------------------------
FROM node:alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy source code (including docs)
COPY . .

# Build TypeScript into dist/
RUN pnpm run build


# ------------------------------
# Stage 2: Production Runner
# ------------------------------
FROM node:alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install pnpm and production deps only
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Copy built app and documentation from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs

# Expose your API port
EXPOSE 3001

# Start the app
CMD ["node", "dist/server.js"]
