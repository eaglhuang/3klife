FROM node:20-bookworm-slim AS deps

WORKDIR /app/server

COPY server/package.json ./package.json

RUN npm install

FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY shared ./shared

WORKDIR /app/server

RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/dist ./server/dist

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD node -e "const http=require('http');const port=process.env.PORT||3000;const req=http.get('http://127.0.0.1:'+port+'/healthz',(res)=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));"

WORKDIR /app/server

CMD ["node", "dist/server/src/index.js"]
