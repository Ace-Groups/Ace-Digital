FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY lib ./lib
COPY artifacts/realtime-server ./artifacts/realtime-server
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/realtime-server run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/artifacts/realtime-server/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
