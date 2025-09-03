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
EXPOSE 8000

# Start the application
CMD ["pnpm", "start"]
