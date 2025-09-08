FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
RUN pnpm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Copy and make startup script executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Use the startup script
CMD ["/bin/sh", "/app/start.sh"]
