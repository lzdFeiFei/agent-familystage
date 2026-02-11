# Agent FamilyStage

一个基于 SecondMe OAuth 的春节角色扮演网站：  
朋友登录后会加入公开 Agent 池，运营者将 Agent 绑定到七大姑八大姨角色，登录用户即可发起春节模拟对话。

## 核心页面

- `/` 首页（登录、资料展示）
- `/agents` 公开 Agent 池
- `/roles` 角色绑定管理
- `/chat` 春节对话页

## 本地运行

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

浏览器访问 `http://localhost:3000`。

## 必要环境变量

`.env.local` 至少包含：

```env
# OAuth
SECONDME_CLIENT_ID=
SECONDME_CLIENT_SECRET=
SECONDME_REDIRECT_URI=http://localhost:3000/api/auth/callback
SECONDME_SCOPES=user.info,user.info.shades,user.info.softmemory,chat,note.add,voice
SECONDME_SESSION_SECRET=

# API
SECONDME_API_BASE_URL=https://app.mindos.com/gate/lab
SECONDME_OAUTH_URL=https://go.second.me/oauth/
SECONDME_TOKEN_ENDPOINT=https://app.mindos.com/gate/lab/api/oauth/token/code
SECONDME_CHAT_ENDPOINT=/api/secondme/chat/stream

# DB
DATABASE_URL=file:./dev.db

# 可选：管理员用户（逗号分隔）。为空时默认所有登录用户可管理绑定。
ADMIN_USER_IDS=
```

## 说明

- 生产环境建议使用 PostgreSQL/MySQL，不建议继续使用 SQLite。
- 撤销 Agent 后会立即下线角色绑定，历史对话仅保留脱敏内容。
