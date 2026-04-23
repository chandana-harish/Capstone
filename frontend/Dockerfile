# ════════════════════════════════════════════════════════════════
# Stage 1: Build (install deps + build Vite app)
# ════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files (lock file optional)
COPY package.json package-lock.json* ./

# Install dependencies (fallback if no lock file)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy rest of the code
COPY . .

# Build the Vite app
RUN npm run build


# ════════════════════════════════════════════════════════════════
# Stage 2: Production (serve with nginx)
# ════════════════════════════════════════════════════════════════
FROM nginx:1.27-alpine AS final

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Fix permissions for non-root nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]