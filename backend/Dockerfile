FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (no lock file needed)
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create uploads, books, and AI data directories
RUN mkdir -p uploads && chmod 777 uploads && \
    mkdir -p books && chmod 777 books && \
    mkdir -p data/text_cache && chmod -R 777 data

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
