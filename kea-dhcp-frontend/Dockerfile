FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Force production mode for API URLs
ENV NODE_ENV=production

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx config that properly maps all endpoints with CORS support
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Handle React Router \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Map /api/health to backend /health \
    location = /api/health { \
        proxy_pass http://backend:3001/health; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_connect_timeout 5s; \
        proxy_send_timeout 10s; \
        add_header "Access-Control-Allow-Origin" "*" always; \
        add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS, PUT, DELETE" always; \
        add_header "Access-Control-Allow-Headers" "Origin, Content-Type, Accept, Authorization" always; \
        if ($request_method = OPTIONS) { \
            add_header "Access-Control-Max-Age" 1728000; \
            add_header "Content-Type" "text/plain; charset=UTF-8"; \
            add_header "Content-Length" 0; \
            return 204; \
        } \
    } \
    \
    # Map /api/test to backend /test \
    location = /api/test { \
        proxy_pass http://backend:3001/test; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_connect_timeout 5s; \
        proxy_send_timeout 10s; \
        add_header "Access-Control-Allow-Origin" "*" always; \
        add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS, PUT, DELETE" always; \
        add_header "Access-Control-Allow-Headers" "Origin, Content-Type, Accept, Authorization" always; \
        if ($request_method = OPTIONS) { \
            add_header "Access-Control-Max-Age" 1728000; \
            add_header "Content-Type" "text/plain; charset=UTF-8"; \
            add_header "Content-Length" 0; \
            return 204; \
        } \
    } \
    \
    # Proxy all /api/* (except health and test) to backend /api/* \
    location /api/ { \
        proxy_pass http://backend:3001/api/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_connect_timeout 5s; \
        proxy_send_timeout 30s; \
        proxy_read_timeout 30s; \
        add_header "Access-Control-Allow-Origin" "*" always; \
        add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS, PUT, DELETE" always; \
        add_header "Access-Control-Allow-Headers" "Origin, Content-Type, Accept, Authorization" always; \
        if ($request_method = OPTIONS) { \
            add_header "Access-Control-Max-Age" 1728000; \
            add_header "Content-Type" "text/plain; charset=UTF-8"; \
            add_header "Content-Length" 0; \
            return 204; \
        } \
    } \
    \
    # Map /config to backend /config \
    location /config/ { \
        proxy_pass http://backend:3001/config/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_connect_timeout 5s; \
        proxy_send_timeout 10s; \
        add_header "Access-Control-Allow-Origin" "*" always; \
        add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS, PUT, DELETE" always; \
        add_header "Access-Control-Allow-Headers" "Origin, Content-Type, Accept, Authorization" always; \
        if ($request_method = OPTIONS) { \
            add_header "Access-Control-Max-Age" 1728000; \
            add_header "Content-Type" "text/plain; charset=UTF-8"; \
            add_header "Content-Length" 0; \
            return 204; \
        } \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

