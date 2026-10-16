FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate
COPY . .
RUN mkdir -p /data && chown -R node:node /data /app
USER node
EXPOSE 5000
# wget stays: while Coolify's UI healthcheck is on it ignores this HEALTHCHECK and runs `curl || wget || exit 1`.
# This node check is the fallback when the UI healthcheck is off. /health returns 503 when the DB is down.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=2 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "src/index.js"]
