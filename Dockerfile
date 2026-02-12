FROM node:alpine AS build

WORKDIR /app
COPY . .

RUN yarn install --frozen-lockfile --non-interactive --verbose && \
    yarn cache clean
RUN yarn build:only

ENTRYPOINT [ "yarn", "start" ]