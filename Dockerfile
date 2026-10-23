# Express API for Cloud Run. Build context is the repository root.
# The runtime image keeps only the esbuild bundle plus packages that cannot be bundled
# (firebase-admin, bcryptjs, resvg, Gemini SDK).

FROM node:22-bookworm-slim AS build
WORKDIR /src
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @workspace/api-server run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080
COPY artifacts/api-server/package.runtime.json package.json
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force \
  && chown -R node:node /app
COPY --from=build --chown=node:node /src/artifacts/api-server/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
