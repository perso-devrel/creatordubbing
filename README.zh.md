# CreatorDub

[🇰🇷 한국어](./README.md) | [🇺🇸 English](./README.en.md) | [🇯🇵 日本語](./README.ja.md) | [🇨🇳 中文](./README.zh.md)

> **面向 YouTube 创作者的 AI 多语言配音与上传自动化平台。**
> 上传一段视频，CreatorDub 会将其配音为多种语言，连同字幕一起自动发布到 YouTube，并在同一面板中呈现观看数据分析。

基于 [Perso.ai](https://developers.perso.ai) API 构建。

## 核心功能

- **AI 多语言配音** — 通过 5 步向导上传视频，在保留原始说话人音色的前提下自动配音为多种语言。
- **口型同步** — 可选启用，使嘴型与翻译后的音频匹配。
- **脚本编辑** — 按句修改译文并重新生成语音。
- **YouTube 自动上传** — 服务器侧将配音后的视频上传到 YouTube Data API v3，并附带 SRT 字幕发布。
- **多音轨助手** — 在 YouTube 不支持多音轨 API 的情况下，按语言分别管理视频。
- **积分系统** — 按视频分钟数预先校验积分，完成时扣减。
- **数据面板与分析** — 按语言查看播放量 / 点赞，月度积分消耗，集成 YouTube Analytics。

## 技术栈

| 领域 | 技术 |
| ---- | ---- |
| 框架 | Next.js 16.2.3 (App Router) |
| 运行时 | React 19、TypeScript 5 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand 5 |
| 数据获取 | TanStack React Query v5 |
| 校验 | Zod v4 |
| 数据库 | Turso (libSQL) / `@libsql/client` |
| 配音引擎 | Perso.ai API |
| 上传 / 统计 | YouTube Data API v3 + Analytics API v2 |
| 认证 | Google OAuth 2.0 + 签名会话 Cookie |
| 测试 | Vitest、Playwright、Lighthouse |

> **注意：** 本项目基于 Next.js 16 的破坏性变更。修改代码前请务必阅读 `node_modules/next/dist/docs/` 中的相关指南。

## 快速开始

### 前置条件

- Node.js 20+
- [Perso.ai](https://developers.perso.ai) API 密钥
- Turso 数据库
- 已启用 OAuth 与 YouTube Data API 的 Google Cloud 项目

### 安装

```bash
git clone https://github.com/perso-devrel/creatordubbing.git
cd creatordubbing
npm install
```

### 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

```env
# Perso.ai
PERSO_API_KEY=
PERSO_API_BASE_URL=https://api.perso.ai
NEXT_PUBLIC_PERSO_FILE_BASE_URL=https://perso.ai

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 会话 Cookie 签名密钥
SESSION_SECRET=

# Turso DB
TURSO_URL=
TURSO_AUTH_TOKEN=
```

### 开发服务器

```bash
npm run dev         # http://localhost:3000
```

### 测试与验证

```bash
npx tsc --noEmit              # 类型检查
npm run lint                  # ESLint
npm run test                  # Vitest（单元）
npm run build                 # 生产构建
npm run test:e2e              # Playwright E2E
npm run test:lighthouse:gate  # Lighthouse 性能门禁
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # 需认证路由 (dashboard, dubbing, batch, billing, youtube, uploads, settings)
│   ├── (marketing)/        # 公开页面（落地页等）
│   ├── api/                # Route Handlers
│   │   ├── auth/           # 登录、会话、令牌同步
│   │   ├── dashboard/      # mutations（单一端点）、jobs、summary、credit-usage、language-performance
│   │   ├── perso/          # Perso.ai 代理 (spaces、upload、project、queue、progress、download …)
│   │   └── youtube/        # upload、caption、stats、analytics、videos
│   └── layout.tsx
├── features/               # 按领域组织的功能模块
│   ├── dubbing/            # 5 步向导、Zustand store、类型定义
│   ├── dashboard/          # 图表、表格、概览卡片
│   ├── landing/            # 落地页区块
│   ├── auth/               # OAuth UI
│   └── billing/            # 积分与套餐
├── lib/
│   ├── db/                 # libSQL 客户端 + queries/{users,jobs,youtube,dashboard}
│   ├── perso/              # persoFetch 封装、错误映射、路由辅助
│   ├── youtube/            # 上传、字幕、统计、分析
│   ├── validators/         # Zod schema（discriminated-union mutation）
│   ├── auth/               # 会话校验
│   └── env.ts              # 环境变量解析
├── stores/                 # Zustand (auth、notification、theme)
├── hooks/                  # React Query hooks
├── components/             # 公共 UI、布局、Providers
└── services/               # 外部 API 服务层
```

## 配音流程

```
视频输入 → 语言选择 → 脚本编辑 → 处理 → 上传
```

1. **视频输入** — 粘贴 YouTube 链接或上传本地文件。元数据注册到 Perso space。
2. **语言选择** — 选择源语言（自动检测）与多个目标语言，切换口型同步开关。
3. **脚本编辑** — 按句修改译文，或排除指定片段。
4. **处理** — 调用 Perso API 创建作业并实时轮询进度。
5. **上传** — 通过可编辑标题 / 描述 / 标签 / 公开状态的模态框自动上传到 YouTube。

## 已知限制

- YouTube 多音轨 API 不可用 — 通过按语言分别上传视频来规避。
- Perso 的 `progressReason` 同时存在 UPPERCASE 与 PascalCase 两种写法，需同时处理。

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/awesome`)
3. 提交 (`git commit -m 'feat: add awesome'`)
4. Push 并发起 Pull Request

Git 流程：`main ← develop ← issue 分支`，squash 合并。`main` 与 `develop` 为长期分支，禁止删除。

## 安全

**请勿在公开 Issue 中报告漏洞。** 请使用 GitHub Private Vulnerability Reporting。详见 [.github/SECURITY.md](./.github/SECURITY.md)。

## 许可证

本仓库为 **专有 (Proprietary)** 项目，保留一切权利。未经书面授权，禁止再分发或再利用。

## 致谢

- [Perso.ai](https://perso.ai) — AI 配音引擎
- [Turso](https://turso.tech) — 数据库
- [Vercel](https://vercel.com) — 部署平台
- 姊妹项目 [AniVoice](https://github.com/perso-devrel/anivoice) — 同样基于 Perso 的配音平台
