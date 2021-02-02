# First step: build the assets
FROM node:lts-alpine AS builder

WORKDIR /app
ADD package.json yarn.lock ./
ADD ./apis/core/package.json ./apis/core/
ADD ./apis/managed-dimensions/package.json ./apis/managed-dimensions/
ADD ./packages/core/package.json ./packages/core/
ADD ./packages/model/package.json ./packages/model/
ADD ./packages/testing/package.json ./packages/testing/

# for every new package foo add:
# ADD ./packages/foo/package.json ./packages/foo/

# install and build backend
RUN yarn install --frozen-lockfile

COPY . .
RUN rm -rf ./ui
RUN rm -rf ./cli

RUN yarn tsc --outDir dist --module CommonJS

FROM node:14-alpine

WORKDIR /app

ADD package.json yarn.lock ./
ADD ./apis/core/package.json ./apis/core/
ADD ./apis/managed-dimensions/package.json ./apis/managed-dimensions/
ADD ./packages/core/package.json ./packages/core/
ADD ./packages/model/package.json ./packages/model/
ADD ./packages/testing/package.json ./packages/testing/

# for every new package foo add
#ADD ./packages/foo/package.json ./packages/foo/

RUN yarn install --production --frozen-lockfile
COPY --from=builder /app/dist/apis ./apis/
COPY --from=builder /app/dist/packages/ ./packages/
ADD apis/core/hydra/*.ttl ./apis/core/hydra/

RUN apk add --no-cache tini
ENTRYPOINT ["tini", "--", "node"]

# build with `docker build --build-arg COMMIT=$(git rev-parse HEAD)`
ARG COMMIT
ENV SENTRY_RELEASE=cube-creator-api@$COMMIT

# Have some logs by default
# This should be kept in sync with .lando.yml
ENV DEBUG creator*,hydra*,hydra-box*,labyrinth*

EXPOSE 45670
# USER nobody. Needs to be a numeric UID, else the "runAsNonRoot" security
# directive in Kubernetes does not work.
USER 65534

WORKDIR /app/apis
CMD ["core"]
