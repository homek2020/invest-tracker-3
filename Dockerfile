# Multi-stage build to bundle the backend API and the compiled frontend
FROM node:20-bookworm AS builder
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json backend/
RUN cd backend && npm ci

# Install frontend dependencies
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci

# Copy sources
COPY backend backend
COPY frontend frontend

# Build frontend and backend
RUN cd frontend && npm run build
RUN cd backend && npm run build

# Copy compiled frontend into the backend build output for static serving
RUN mkdir -p backend/dist/public && cp -r frontend/dist/* backend/dist/public/

# Production image
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies for the backend
COPY backend/package*.json backend/
RUN cd backend && npm ci --omit=dev

# Bring over the compiled backend (including static assets)
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 8080
CMD ["node", "dist/server.js"]
