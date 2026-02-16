FROM node:22-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
COPY scripts ./scripts
COPY patches ./patches
RUN yarn install --frozen-lockfile --non-interactive

COPY . .

RUN yarn build:only

FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package.json yarn.lock ./
COPY scripts ./scripts
COPY patches ./patches

RUN yarn install --frozen-lockfile --non-interactive --production && \
    yarn cache clean

COPY --from=build /app/dist ./dist
COPY --from=build /app/built ./built
COPY --from=build /app/public ./public

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 && \
    chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 8080

ENTRYPOINT [ "yarn", "start" ]