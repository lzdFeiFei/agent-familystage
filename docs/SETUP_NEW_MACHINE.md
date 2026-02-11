# 新电脑开发接续指南

更新时间：2026-02-12

## 1. 先说结论

新电脑上最关键的是迁移**账号权限和环境变量**，不是迁移本地缓存文件。

## 2. 不需要迁移的内容

1. `.env.production.vercel` 不需要拷贝旧电脑文件。
2. `.vercel` 不需要手动拷贝。
3. `node_modules` 不需要拷贝。
4. 本地 SQLite 文件（`dev.db`）不需要拷贝（当前生产已用 Neon Postgres）。

## 3. 需要准备的内容

## 3.1 账号与 CLI 登录

1. GitHub CLI：`gh auth login`
2. Vercel CLI：`vercel login`
3. Neon：登录控制台（或准备 Neon API Key）

## 3.2 必要环境变量

以下变量必须在新电脑本地或平台可用：

1. `SECONDME_CLIENT_ID`
2. `SECONDME_CLIENT_SECRET`
3. `SECONDME_REDIRECT_URI`
4. `SECONDME_SCOPES`
5. `SECONDME_SESSION_SECRET`
6. `SECONDME_API_BASE_URL`
7. `SECONDME_OAUTH_URL`
8. `SECONDME_TOKEN_ENDPOINT`
9. `SECONDME_CHAT_ENDPOINT`
10. `DATABASE_URL`
11. `ADMIN_USER_IDS`（可选）

## 4. 新电脑最短启动流程

```bash
git clone git@github.com:lzdFeiFei/agent-familystage.git
cd agent-familystage
npm install
npx prisma generate
npm run dev
```

本地访问：`http://localhost:3000`

## 5. 拉取 Vercel 线上变量（推荐）

在项目目录执行：

```bash
vercel login
vercel link
vercel env pull .env.production.vercel --environment=production
```

说明：

1. `.env.production.vercel` 是从 Vercel 平台拉取的本地快照。
2. 不要提交该文件到 GitHub。

## 6. 生产部署流程（新电脑）

```bash
git push origin main
vercel deploy --prod --yes
```

若遇到缓存导致 Prisma 异常（如 schema 不一致）：

```bash
vercel deploy --prod --yes --force
```

## 7. 常见问题

## 7.1 登录跳转 InvalidURI（含 `%0D%0A`）

原因：环境变量尾部换行。  
处理：检查平台变量，项目里已对关键 env 做 `trim` 兜底。

## 7.2 回调报数据库表不存在

原因：数据库没建表或连接串错误。  
处理：确认 `DATABASE_URL` 指向 Neon，执行一次 `prisma db push`。

## 8. 安全提醒

1. 不要把 Neon API Key、SecondMe Secret 提交到仓库。
2. 如果密钥泄露，立即 rotate/revoke。
