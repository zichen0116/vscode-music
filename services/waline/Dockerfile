FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && npm ci --omit=dev \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY index.cjs validation.cjs server.cjs ./

RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 8360
CMD ["node", "server.cjs"]
