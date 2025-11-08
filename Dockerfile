# Multi-stage Dockerfile for Steam Marketplace
# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY frontend/ .

# Build the application
RUN npm run build

# Stage 2: Build Backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Stage 3: Production Image
FROM node:18-alpine AS production

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend dependencies
COPY --from=backend-builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code (excluding dev files)
COPY --from=backend-builder --chown=nodejs:nodejs /app/app.js ./
COPY --from=backend-builder --chown=nodejs:nodejs /app/routes ./routes
COPY --from=backend-builder --chown=nodejs:nodejs /app/models ./models
COPY --from=backend-builder --chown=nodejs:nodejs /app/middleware ./middleware
COPY --from=backend-builder --chown=nodejs:nodejs /app/services ./services
COPY --from=backend-builder --chown=nodejs:nodejs /app/utils ./utils
COPY --from=backend-builder --chown=nodejs:nodejs /app/config ./config
COPY --from=backend-builder --chown=nodejs:nodejs /app/public ./public

# Copy built frontend
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./public

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Switch to non-root user
USER nodejs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "app.js"]