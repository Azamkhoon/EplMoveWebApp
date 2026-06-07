# syntax=docker/dockerfile:1
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @epl/tenant-svc build

FROM base AS runtime
WORKDIR /app
COPY --from=build /repo/services/tenant-svc/dist ./dist
COPY --from=build /repo/services/tenant-svc/package.json ./
COPY --from=build /repo/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/main.js"]
