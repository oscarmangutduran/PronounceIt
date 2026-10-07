# ==========================================
# PronounceIt Backend Dockerfile (Node.js + TypeScript)
# ==========================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json tsconfig.json ./

# Install dependencies (including devDependencies needed for tsc)
RUN npm install

# Copy source code
COPY src ./src

# Compile TypeScript to dist/
RUN npm run build

# ==========================================
# Stage 2: Production runtime stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/data

# Expose API port
EXPOSE 5000

# Health check to ensure service readiness
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "dist/index.js"]
