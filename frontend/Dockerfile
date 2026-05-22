# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# (Optional) We will map a custom nginx.conf in docker-compose for React Router
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Serve Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# --- ADD THIS LINE TO OVERRIDE THE DEFAULT NGINX CONFIG ---
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]