# ============================================================
# Stage 1: Build Frontend
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend source
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Production Backend + Compiled Frontend
# ============================================================
FROM node:22-alpine

WORKDIR /app

# Copy backend package files and install deps
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy backend source
COPY src/ ./src/

# Copy compiled frontend from stage 1 into public/
COPY --from=frontend-builder /frontend/dist ./public/

# Expose port (Railway sets PORT env var)
EXPOSE ${PORT:-3001}

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/api/health || exit 1

# Start the server
CMD ["node", "src/server.js"]
