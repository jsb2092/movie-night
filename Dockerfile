# Build stage for client
FROM node:20-alpine AS client-builder
ARG COMMIT_SHA=dev
ENV COMMIT_SHA=$COMMIT_SHA
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build stage for server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install build tools for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy server package files and install production dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy built files
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ../client/dist

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

EXPOSE 3001

CMD ["node", "dist/index.js"]
