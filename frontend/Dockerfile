FROM node:20-alpine

WORKDIR /app

# Accept build arguments
ARG NEXT_PUBLIC_BACKEND_API_URL
ARG NEXT_PUBLIC_API_PREFIX
ARG NEXT_PUBLIC_DOMAIN_URL

# Set environment variables for build
ENV NEXT_PUBLIC_BACKEND_API_URL=$NEXT_PUBLIC_BACKEND_API_URL
ENV NEXT_PUBLIC_API_PREFIX=$NEXT_PUBLIC_API_PREFIX
ENV NEXT_PUBLIC_DOMAIN_URL=$NEXT_PUBLIC_DOMAIN_URL

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
RUN pnpm install

# Copy source code
COPY . .

# Build the application
# RUN pnpm run build

# Expose port
EXPOSE 3001

# Copy and make startup script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Use the startup script
CMD ["/bin/sh", "/app/start.sh"]
