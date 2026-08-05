# Build stage
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies (prefer npm ci if package-lock exists; fallback to npm install)
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install

# Copy source and build
COPY . .
# Build and fail if dist is missing; prevents creating an image with no built assets
RUN npm run build && test -d dist

# Production stage: serve built files with nginx
FROM nginx:stable-alpine AS production

# Remove default nginx content and copy dist
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
