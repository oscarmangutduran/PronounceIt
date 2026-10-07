# ==========================================
# PronounceIt Frontend Dockerfile (Vite + React + Nginx)
# ==========================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configuration
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and assets
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

# Build optimized production bundle
RUN npm run build

# ==========================================
# Stage 2: Nginx Web Server stage
# ==========================================
FROM nginx:alpine AS runner

# Remove default nginx webpage
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
