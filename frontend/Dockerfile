# Build stage
FROM node:18-alpine AS build

WORKDIR /app

ARG REACT_APP_API_URL=/api
ARG REACT_APP_WEBSITE_NAME="Elimu Hub Tanzania"
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WEBSITE_NAME=$REACT_APP_WEBSITE_NAME
ENV CI=false
ENV SKIP_PREFLIGHT_CHECK=true

COPY package*.json ./

# Step 1: install everything
RUN npm install --legacy-peer-deps

# Step 2: force ajv@8 into node_modules so webpack 5 inside react-scripts finds it
RUN npm install --legacy-peer-deps --no-save ajv@8.11.0 ajv-keywords@5.1.0

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
