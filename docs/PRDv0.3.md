# Agent FamilyStage PRD v0.3

更新时间：2026-02-12  
文档状态：MVP 范围冻结（可开发、可测试）  
作者：产品/研发协作稿（Codex 落盘）  
关联文档：`docs/PRDv0.2.md`、`docs/PRDv0.1.md`、`docs/RUNBOOK.md`

---

## 1. 背景与问题定义

当前项目已具备基础 OAuth、Agent 池、角色绑定、多 Agent 对话能力，但产品链路仍存在问题：

1. 缺少独立登录页，用户进入路径不清晰。
2. 主页信息组织不足，无法一眼完成“看人 + 看我 + 去配置”。
3. 新年场景配置能力不完整，无法标准化“场景 + 主题 + 角色映射”。
4. 对话体验需强调“流式进展感”，避免长时间无反馈。

本版本聚焦“春节家庭剧场”最小可用闭环，确保用户可从登录到配置到群聊一次完成。

---

## 2. 产品目标与非目标

### 2.1 MVP 目标

1. 提供独立登录页并打通登录后跳转主页链路。
2. 主页可展示可选 SecondMe Agent 列表与当前登录用户信息。
3. 提供新年家庭剧场配置页，支持场景、主题、角色-Agent 映射。
4. 进入对话后支持多角色流式发言，出现上游异常时可降级可恢复。

### 2.2 非目标（本期不做）

1. 不新增独立运营后台页面。
2. 不引入语音/多模态输入输出。
3. 不改造当前 OAuth 技术路线与核心数据库实体命名。
4. 不做复杂推荐算法（仅规则与手动映射）。

---

## 3. 用户与角色

### 3.1 目标用户

1. 登录用户：发起新年家庭剧场、配置参与角色、观看/参与对话。
2. Agent 提供者（已授权 SecondMe 用户）：其 Agent 可被系统用于扮演角色。

### 3.2 系统角色

1. 亲戚角色实例（如：大伯、二姨、表哥等），由业务配置映射到 Agent。
2. 会话中的“我”（登录用户）作为固定参与者之一。

---

## 4. 信息架构与页面清单（4 页面）

### 4.1 页面列表

1. `Login Page`：登录入口与失败恢复提示。
2. `Home Page`：Agent 列表 + 当前用户卡片 + 进入配置页。
3. `New Year Stage Config Page`：场景/主题/角色映射配置。
4. `Conversation Page`：流式群聊展示、会话控制。

### 4.2 页面职责与跳转矩阵

| From | To | 触发条件 |
|---|---|---|
| Login Page | Home Page | OAuth 成功回调 |
| Login Page | Login Page | OAuth 失败/取消，显示可恢复提示 |
| Home Page | Config Page | 点击“新年场景配置” |
| Config Page | Conversation Page | 配置校验通过并创建会话成功 |
| Config Page | Config Page | 校验失败，定位错误字段 |
| Conversation Page | Home Page | 会话结束后主动返回 |

---

## 5. 端到端用户旅程（Happy Path）

1. 用户进入 `Login Page`，点击登录。
2. OAuth 授权成功，系统建立会话并跳转 `Home Page`。
3. 用户浏览可用 Agent 列表，确认当前登录身份。
4. 用户进入 `Config Page`，选择场景、主题、角色与 Agent 映射。
5. 提交配置，系统创建 `StageSession` 并启动对话。
6. 跳转 `Conversation Page`，用户看到多角色流式发言。
7. 对话结束后可返回主页发起新会话。

---

## 6. 失败路径与恢复策略

1. 登录失败：展示失败原因（如授权取消/网络问题）+ 重试按钮 + 回首页入口。
2. 配置不完整：阻止创建会话，前端高亮缺失项并给可执行修复提示。
3. 上游调用失败：对单轮发言降级为系统兜底文案，不中断整场会话。
4. 流式中断：前端提示“连接中断，可重连”，支持继续拉流或结束会话。

---

## 7. 功能需求（MVP 冻结）

### F-01 登录与会话建立（P0）

1. 独立登录页承载 OAuth 登录入口。
2. 登录成功后建立本地会话并跳转主页。
3. 登录失败提供可恢复提示与重试操作。

### F-02 主页聚合展示（P0）

1. 展示已注册 SecondMe Agent 列表（头像、昵称、可用状态）。
2. 展示当前登录用户信息（头像、昵称、账号标识）。
3. 提供“进入新年场景配置”按钮。

### F-03 新年家庭剧场配置（P0）

1. 场景类型：默认提供 `年夜饭`、`串门`、`拜年电话`、`家庭群聊`。
2. 主题配置：支持默认主题选择与自定义主题输入。
3. 角色参与：选择参与角色并为每个角色映射一个 Agent。
4. 配置校验通过后方可创建会话。

### F-04 多 Agent 流式对话（P0）

1. 会话开始后用户与多角色 Agent 同场发言。
2. 服务端以流式事件返回增量内容，前端实时渲染。
3. 单 Agent 调用失败时提供降级文案并继续其他角色流程。

### F-05 基础运营约束（P1）

1. 被撤销/不可用 Agent 不可进入新会话。
2. 历史会话保留脱敏消息，满足追踪与审计最小要求。

---

## 8. 非功能需求

### 8.1 性能

1. 首屏可交互（TTI）目标：P95 ≤ 3s（家庭网络场景）。
2. 流式首 token 可见时间目标：P95 ≤ 2.5s。

### 8.2 可用性

1. 对话链路异常时必须可恢复（重试/重连/降级）。
2. 关键页面均提供空态、加载态、失败态。

### 8.3 安全与隐私

1. 敏感词拦截：用户输入与系统提示词执行规则过滤。
2. 消息脱敏存储：手机号/邮箱/证件号等模式脱敏。
3. 鉴权校验：所有会话相关接口需验证用户身份与会话归属。

### 8.4 可观测性

1. 关键 API 日志必须包含 `requestId`、`sessionId`、`userId`。
2. 流式事件异常需记录错误码与阶段（创建/启动/拉流）。
3. 失败率、超时率、降级率纳入监控指标。

---

## 9. 数据模型与字段定义

> 说明：沿用既有模型命名；`StageSession` 为产品语义，可映射到 `ChatSession` 扩展实现。

### 9.1 User

- `id` (PK)
- `secondmeUserId` (unique)
- `nickname`
- `avatarUrl`
- `createdAt` / `updatedAt`

### 9.2 AgentProfile

- `id` (PK)
- `userId` (FK -> User.id)
- `secondmeAgentId`
- `displayName`
- `avatarUrl`
- `status` (`ACTIVE` / `INACTIVE` / `REVOKED`)
- `visibility` (`PUBLIC` / `PRIVATE`)

### 9.3 RoleBinding

- `id` (PK)
- `roleName`（亲戚角色名）
- `agentProfileId` (FK -> AgentProfile.id)
- `priority`
- `status` (`ACTIVE` / `INACTIVE`)

### 9.4 StageSession / ChatSession

- `id` (PK)
- `creatorUserId` (FK -> User.id)
- `sceneType`
- `topicType`（默认主题标识）
- `topicCustom`（自定义主题内容）
- `participants`（角色与 Agent 映射快照）
- `status` (`CREATED` / `RUNNING` / `COMPLETED` / `FAILED` / `STOPPED`)
- `createdAt` / `endedAt`

### 9.5 ChatMessage

- `id` (PK)
- `sessionId` (FK -> StageSession.id)
- `speakerRole`
- `agentProfileId` (nullable)
- `seq`（流式分片序号）
- `delta`（增量片段）
- `contentFinal`（聚合后文本）
- `isFallback`
- `isMasked`
- `createdAt`

### 9.6 关键约束与索引建议

1. 会话创建时 `participants` 不能为空。
2. 同一会话内每个角色仅允许一个激活 Agent。
3. `ChatMessage(sessionId, seq)` 唯一，保证分片序稳定。
4. 建议索引：`AgentProfile(status, visibility)`、`ChatMessage(sessionId, createdAt)`。

---

## 10. API / 服务接口契约

## 10.1 通用约定

- 鉴权：登录态 Session/Cookie。
- 响应基础结构：
  - 成功：`{ success: true, data, requestId }`
  - 失败：`{ success: false, error: { code, message, retryable }, requestId }`

### 10.2 接口列表

#### 1) `POST /api/auth/login`

- 用途：触发 OAuth 登录流程（或返回跳转地址）。
- 幂等：可重复调用，无副作用累积。

#### 2) `GET /api/me`

- 用途：获取当前登录用户信息。
- 失败码：`UNAUTHORIZED`（未登录）。

#### 3) `GET /api/agents?status=active`

- 用途：获取可参与配置的 Agent 列表。
- 过滤：`status=active` 默认仅返回可用 Agent。

#### 4) `POST /api/stage/session`

- 用途：创建新年剧场会话。
- 请求体：
  - `sceneType`
  - `topicType`
  - `topicCustom?`
  - `participants`（`[{ roleName, agentProfileId }]`）
- 校验：
  - `participants` 非空
  - `roleName` 不重复
  - `agentProfileId` 必须可用

#### 5) `POST /api/stage/session/{id}/start`

- 用途：启动多 Agent 对话编排。
- 幂等：已启动会话再次调用返回当前状态。

#### 6) `GET /api/stage/session/{id}/stream`

- 用途：SSE 拉取流式事件。
- 事件模型：
  - `eventType`：`MESSAGE_DELTA` | `TURN_END` | `SESSION_END` | `ERROR`
  - `speakerRole`
  - `agentId`
  - `delta`
  - `seq`
  - `done`

#### 7) `POST /api/stage/session/{id}/stop`

- 用途：主动结束会话。
- 幂等：重复停止返回成功。

### 10.3 错误码建议

- `UNAUTHORIZED`
- `INVALID_PARAMS`
- `AGENT_UNAVAILABLE`
- `SESSION_NOT_FOUND`
- `SESSION_STATE_INVALID`
- `UPSTREAM_TIMEOUT`
- `STREAM_BROKEN`
- `INTERNAL_ERROR`

---

## 11. 验收标准（功能 AC + E2E）

## 11.1 功能 AC

### F-01 登录与会话建立

- `AC-F01-01 [功能测试]`  
  前置：用户未登录。  
  步骤：访问登录页并点击登录。  
  预期：跳转 OAuth 并在成功后进入主页。

- `AC-F01-02 [功能测试]`  
  前置：用户取消授权。  
  步骤：返回登录页。  
  预期：展示失败原因与“重新登录”按钮。

- `AC-F01-03 [数据验证]`  
  前置：首次登录成功。  
  步骤：请求 `GET /api/me`。  
  预期：返回用户信息与有效登录态。

### F-02 主页聚合展示

- `AC-F02-01 [功能测试]`  
  前置：已登录。  
  步骤：打开主页。  
  预期：展示 Agent 列表（头像、昵称）。

- `AC-F02-02 [功能测试]`  
  前置：已登录。  
  步骤：查看“我的信息”模块。  
  预期：显示当前用户昵称与头像。

- `AC-F02-03 [UI验证]`  
  前置：Agent 列表为空。  
  步骤：进入主页。  
  预期：展示空态文案和下一步引导。

### F-03 新年家庭剧场配置

- `AC-F03-01 [功能测试]`  
  前置：已登录并进入配置页。  
  步骤：选择场景、主题和角色映射后提交。  
  预期：创建会话成功并跳转对话页。

- `AC-F03-02 [功能测试]`  
  前置：配置缺少角色映射。  
  步骤：提交配置。  
  预期：阻止提交并提示缺失项。

- `AC-F03-03 [数据验证]`  
  前置：提交了自定义主题。  
  步骤：查询会话记录。  
  预期：`topicCustom` 与提交值一致保存。

### F-04 多 Agent 流式对话

- `AC-F04-01 [功能测试]`  
  前置：会话已启动。  
  步骤：观察对话页。  
  预期：消息以流式增量持续渲染，而非一次性输出。

- `AC-F04-02 [功能测试]`  
  前置：模拟单 Agent 上游超时。  
  步骤：继续运行会话。  
  预期：出现降级文案，其它角色仍可继续发言。

- `AC-F04-03 [性能测试]`  
  前置：常规网络。  
  步骤：启动会话并记录首 token 时间。  
  预期：P95 ≤ 2.5s。

### F-05 基础运营约束

- `AC-F05-01 [功能测试]`  
  前置：某 Agent 状态为 `REVOKED`。  
  步骤：尝试在配置页绑定该 Agent。  
  预期：前后端均拒绝并提示不可用。

- `AC-F05-02 [数据验证]`  
  前置：会话已结束。  
  步骤：检查消息存储。  
  预期：敏感字段脱敏，`isMasked=true` 可追踪。

- `AC-F05-03 [功能测试]`  
  前置：存在历史会话。  
  步骤：查询历史消息。  
  预期：可读取脱敏内容，不泄露原始敏感值。

## 11.2 E2E 场景

- `S-01` 首次登录 → 配置完成 → 流式对话成功结束。
- `S-02` 自定义主题 + 多角色映射成功并进入对话。
- `S-03` 上游超时触发降级文案，页面持续可用。
- `S-04` Agent 被下线后无法进入新会话。

---

## 12. 指标、发布与回滚

### 12.1 KPI

1. `KPI-01` 登录成功率 ≥ 98%（日维度）。
2. `KPI-02` 配置成功创建会话率 ≥ 95%。
3. `KPI-03` 对话首 token P95 ≤ 2.5s。
4. `KPI-04` 会话中断率 ≤ 3%。

### 12.2 发布策略

1. 先灰度给内部账号/白名单用户。
2. 观察 24h 关键指标后全量。
3. 对话接口与流式链路可通过开关回退旧路径。

### 12.3 回滚策略

1. 登录链路异常：回滚到旧登录入口。
2. 配置页异常：临时关闭新入口并提示维护中。
3. 流式异常：切换为非流式兜底输出（仅应急）。

---

## 13. 风险与待定项

### 13.1 主要风险

1. 上游模型稳定性波动影响流式体验。
2. 角色映射质量不足导致“人设错位”。
3. 高峰期并发会话可能引发首 token 延迟抖动。

### 13.2 待定项（不阻塞 MVP）

1. 是否引入“用户手动同意加入公开池”（后续版本）。
2. 是否新增角色冲突规则与开场模板引擎。
3. 是否建设运营看板（会话量、成功率、拦截率、留存）。

---

## 14. 实施一致性检查清单（供研发联调）

1. 功能点 `F-01~F-05` 是否均有对应接口与数据落点。
2. 每个功能点是否至少对应 3 条 AC。
3. E2E `S-01~S-04` 是否可在测试环境完整复现。
4. 错误模型与流式事件模型是否前后端一致。
5. 非功能指标是否具备采集口径与观测看板。

