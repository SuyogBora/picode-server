# Build Stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies for build
RUN npm ci

# Copy tsconfig and all source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

# Set Node environment to production
ENV NODE_ENV=production

# Install production dependencies for native modules if needed
RUN apk add --no-cache tzdata

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

# Copy module-alias configuration for @ imports to work correctly
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Create app directories
RUN mkdir -p logs

# Create a non-root user to run the application
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodeuser && \
    chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose the port your app runs on
EXPOSE 8000

# Set up module aliases and run the app
CMD ["node", "-r", "module-alias/register", "dist/server.js"]