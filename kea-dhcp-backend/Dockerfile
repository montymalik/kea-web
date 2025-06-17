# Use Debian-based Node.js for better Prisma compatibility
FROM node:18-slim

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs nodeuser
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start command
CMD ["npm", "start"]
