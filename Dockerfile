# ビルドステージ
FROM node:18-alpine AS builder

WORKDIR /app

# 依存関係のインストール
COPY package.json package-lock.json* ./
RUN npm ci

# ソースコードのコピー
COPY . .

# Next.js アプリケーションのビルド
RUN npm run build

# 実行ステージ
FROM node:18-alpine AS runner

WORKDIR /app

# 環境変数の設定
ENV NODE_ENV=production

# 必要なファイルのコピー
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# アプリケーションの実行
EXPOSE 3000
CMD ["npm", "start"]