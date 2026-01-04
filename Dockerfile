FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app

ARG API_BASE_URL
RUN if [ -n "$API_BASE_URL" ]; then \
  sed -i "s|__API_BASE_URL__|$API_BASE_URL|g" src/app/core/api-base-url.ts; \
fi

RUN npm run build -- --configuration production

FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend /usr/share/nginx/html

EXPOSE 80
