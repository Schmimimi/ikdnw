FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install
COPY . .
RUN ./node_modules/.bin/vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
