# Agent FamilyStage Design System v0.3

更新时间：2026-02-12  
适用范围：`Login/Home/Config/Conversation` 四页 MVP  
关联文档：`docs/PRDv0.3.md`、`docs/UI_PAGE_DESIGN_v0.3.md`

---

## 1. 设计原则

1. 清晰优先：春节主题可感知，但信息层次必须清楚。
2. 反馈即时：异步操作必须有可见反馈（加载、进度、失败恢复）。
3. 一致性：同类组件样式、行为、文案统一。
4. 可扩展：后续可支持深色模式和多主题换肤。

---

## 2. Design Tokens

## 2.1 颜色（Color Tokens）

- `--color-bg`: `#FFF9F2`（主背景，暖色）
- `--color-surface`: `#FFFFFF`（卡片背景）
- `--color-primary`: `#E53935`（主按钮/主强调）
- `--color-primary-hover`: `#D32F2F`
- `--color-secondary`: `#FFB300`（次强调）
- `--color-text-primary`: `#1F2937`
- `--color-text-secondary`: `#6B7280`
- `--color-success`: `#16A34A`
- `--color-warning`: `#F59E0B`
- `--color-error`: `#DC2626`
- `--color-border`: `#E5E7EB`

## 2.2 字体（Typography Tokens）

- `--font-family-base`: `Inter, PingFang SC, Microsoft YaHei, sans-serif`
- `--font-size-h1`: `32px`
- `--font-size-h2`: `24px`
- `--font-size-h3`: `20px`
- `--font-size-body`: `14px`
- `--font-size-caption`: `12px`
- `--line-height-base`: `1.6`

## 2.3 间距（Spacing Tokens）

- `--space-1`: `4px`
- `--space-2`: `8px`
- `--space-3`: `12px`
- `--space-4`: `16px`
- `--space-5`: `24px`
- `--space-6`: `32px`
- `--space-7`: `40px`

## 2.4 圆角与阴影

- `--radius-sm`: `8px`
- `--radius-md`: `12px`
- `--radius-lg`: `16px`
- `--shadow-sm`: `0 1px 3px rgba(0,0,0,0.08)`
- `--shadow-md`: `0 8px 24px rgba(0,0,0,0.12)`

---

## 3. 栅格与布局

1. 内容区最大宽度：`1200px`，居中布局。
2. 主容器左右内边距：桌面端 `24px`，移动端 `16px`。
3. 断点：
   - `sm`: `<768px`
   - `md`: `768px~1199px`
   - `lg`: `>=1200px`
4. 卡片间距：`16px`（md/lg），`12px`（sm）。

---

## 4. 组件规范

## 4.1 Button

### Variants
- `Primary`: 主行动（红底白字）
- `Secondary`: 次行动（浅底深字）
- `Danger`: 危险操作（停止会话）
- `Ghost`: 文字弱操作

### Sizes
- `sm`: 32px 高
- `md`: 40px 高（默认）
- `lg`: 48px 高

### States
- `default / hover / active / disabled / loading`

## 4.2 Input / Select / Textarea

1. 高度 `40px`（textarea 自适应）。
2. focus 态边框使用 `--color-primary`。
3. error 态显示错误文案（红色 + 图标）。

## 4.3 Card

1. 统一白底、圆角、轻阴影。
2. 卡片标题与内容层级固定。
3. Agent 卡片需包含状态标签（`ACTIVE/INACTIVE/REVOKED`）。

## 4.4 Tag / StatusBadge

- `Success`：可用
- `Warning`：处理中/重连中
- `Error`：不可用/失败
- `Neutral`：默认信息

## 4.5 MessageBubble（对话气泡）

1. 按发言角色区分颜色但保持可读性。
2. 流式中状态显示“光标闪烁/typing”。
3. 系统降级消息使用提示样式（非角色气泡）。

## 4.6 Toast / Alert

1. Toast：轻量即时反馈（保存成功、已重连）。
2. Alert：阻断类问题（配置缺失、会话失败）。

---

## 5. 交互模式规范

1. 关键异步按钮点击后即进入 loading，防止重复提交。
2. 表单校验失败优先定位第一个错误字段。
3. SSE 中断默认 1 次自动重连，失败后提供手动重连按钮。
4. Stop 会话属于危险操作，必须二次确认。

---

## 6. 可访问性（A11y）

1. 文本对比度满足 WCAG AA（普通文本 >= 4.5:1）。
2. 所有交互控件支持键盘访问（Tab / Enter / Esc）。
3. 图标按钮必须有 `aria-label`。
4. 错误提示需可被读屏识别（`aria-live="polite"`）。

---

## 7. 页面级组件清单

## 7.1 Login Page

- LogoHeader
- LoginButton
- ErrorBanner
- FooterLinks

## 7.2 Home Page

- TopNav
- UserProfileCard
- AgentGrid
- AgentCard
- PrimaryActionBar

## 7.3 Config Page

- StepSection
- SceneSelector
- TopicSelector
- RoleAgentMapper
- ValidationSummary
- SubmitActionBar

## 7.4 Conversation Page

- SessionHeader
- StreamStatusBar
- MessageList
- MessageBubble
- ConversationActions

---

## 8. 前端实现建议（与系统对齐）

1. 组件分层：`base`（Button/Input）→ `module`（AgentCard）→ `page`。
2. 统一 token 来源：CSS Variables 或 Tailwind Theme，不允许页面内硬编码颜色。
3. 状态管理：会话流式状态单独 store，避免页面重复订阅导致抖动。
4. 设计变更流程：先更新本 Design System，再更新页面设计与开发清单。

