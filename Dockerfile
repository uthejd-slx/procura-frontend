FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app

RUN npm run build -- --configuration production

FROM nginx:1.27-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/entrypoint.sh /entrypoint.sh
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
