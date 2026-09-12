# syntax=docker/dockerfile:1
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@epl/shipment-svc...
RUN pnpm --filter=@epl/shipment-svc deploy --prod /out

FROM base AS runtime
WORKDIR /app
COPY --from=build /out .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/main.js"]
