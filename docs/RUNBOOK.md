# Agent FamilyStage 开发与运维手册

更新时间：2026-02-12

## 1. 技术实现总览

## 1.1 核心模块

1. 鉴权：`src/app/api/auth/*`
2. Agent 池：`src/app/api/agents/*`
3. 角色绑定：`src/app/api/roles/*`
4. 对话接口：`src/app/api/chat/*`
5. 服务层：
- `src/lib/secondme.ts`
- `src/lib/prisma.ts`
- `src/lib/roleplay.ts`
- `src/lib/safety.ts`
- `src/lib/current-user.ts`

## 1.2 数据模型

文件：`prisma/schema.prisma`

1. `User`
2. `AgentProfile`
3. `RoleBinding`
4. `ChatSession`
5. `ChatMessage`

## 2. 环境变量约定

生产关键变量：

1. `SECONDME_CLIENT_ID`
2. `SECONDME_CLIENT_SECRET`
3. `SECONDME_REDIRECT_URI`
4. `SECONDME_SCOPES`
5. `SECONDME_SESSION_SECRET`
6. `SECONDME_API_BASE_URL`
7. `SECONDME_OAUTH_URL`
8. `SECONDME_TOKEN_ENDPOINT`
9. `SECONDME_CHAT_ENDPOINT`（默认 `/api/secondme/chat/stream`）
10. `DATABASE_URL`（当前为 Neon Postgres）
11. `ADMIN_USER_IDS`（可选）

## 3. 部署与发布流程

1. 本地验证：
- `npm run lint`
- `npm run build`
2. 推送主分支：
- `git push origin main`
3. 生产部署：
- `vercel deploy --prod --yes`
4. 遇到缓存导致的 Prisma 异常时，强制部署：
- `vercel deploy --prod --yes --force`

说明：

1. `package.json` 已配置 `postinstall: prisma generate`，用于避免线上使用旧 Prisma Client。

## 4. 接口开发流程约定

凡涉及 SecondMe 新接口或调整，必须先查官方文档再实现：

1. 文档站：`https://develop-docs.second.me/zh/docs`
2. 核对项：
- 端点路径
- 请求方法
- 请求参数
- 响应格式（JSON / SSE）
3. 落地后要求：
- 在本手册追加“排查记录”

## 5. 排查记录

## 5.1 2026-02-11 Chat 404

问题：

1. `SecondMe chat failed: 404`

结论：

1. 官方 chat 端点为 `POST /api/secondme/chat/stream`（SSE）。

修复：

1. `src/lib/secondme.ts` 改为 stream 端点并支持 SSE 解析。
2. 增加 `/chat` -> `/chat/stream` 兜底。

## 5.2 2026-02-12 OAuth InvalidURI

问题：

1. 登录跳转 XML 报错：`%0A are not allowed in URI`

根因：

1. 环境变量尾部换行导致 URL 参数包含 `%0D%0A`。

修复：

1. 重写 Vercel 环境变量。
2. `src/lib/secondme.ts` 对 env 值统一 `trim()`。

## 5.3 2026-02-12 oauth_failed 回跳

问题：

1. 授权回跳后 `?error=oauth_failed`

根因：

1. 回调流程对 `user/info` 依赖过强。

修复：

1. 回调增加容错：`user/info` 失败时仍可继续登录。
2. `secondmeUserId` 多级兜底。
3. 失败原因透传到 `reason` 参数。

## 5.4 2026-02-12 Digest 3721982628

问题：

1. 线上 `Application error`，Vercel 日志显示 Prisma 按 `sqlite` 校验。

根因：

1. 构建缓存命中旧 Prisma Client。

修复：

1. 新增 `postinstall: prisma generate`。
2. 强制无缓存生产部署（`--force`）。

## 6. 数据库迁移记录（SQLite -> Neon）

1. 线上临时 SQLite 导致实例切换后丢表（`main.users does not exist`）。
2. 已迁移至 Neon Postgres 持久化。
3. `prisma/schema.prisma` 改为 `postgresql`。
4. 已执行 `prisma db push` 同步结构。
5. `src/lib/prisma.ts` 对 `DATABASE_URL` 进行运行时 `trim`。

## 7. 当前线上状态

1. 主域名：`https://agent-familystage.vercel.app`
2. GitHub：`main` 已同步
3. 生产库：Neon Postgres
4. 登录授权：正常
5. 自动对话：正常

## 8. 安全操作约定

1. Neon API Key 不写入仓库、不写入公开文档正文。
2. 如发生泄露，立即在 Neon 控制台 rotate/revoke。
3. Vercel 环境变量调整后必须复测登录链路一次。
