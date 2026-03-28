# Resume Copilot 项目导览

## 项目概述

Resume Copilot 是一个基于 Next.js 的智能简历平台，支持在线写简历、优化简历内容，并结合职位描述进行匹配分析。

核心能力：

- 简历编辑与管理（前端交互 + 服务端 API）
- 用户认证与会话管理（Better Auth）
- AI 辅助能力（Python FastAPI 服务，负责解析/抽取/匹配）
- 导出与管理简历数据

## 技术栈（核心）

- Web 全栈框架: Next.js 16 + React 19 + TypeScript
- 数据库: PostgreSQL 16（Docker 本地运行）
- ORM: Drizzle ORM + drizzle-kit
- 鉴权: better-auth
- UI: Tailwind CSS 4 + Radix UI
- 状态管理: Zustand
- AI 服务: Python FastAPI（uv 管理环境）+ NLP/Embedding 相关库
- 包管理: pnpm（Node）+ uv（Python）

## 关键目录

- `app/`: Next.js App Router 页面、布局与 API 路由
- `components/`: 业务组件与基础 UI 组件
- `db/`: 数据库连接与表结构定义（Drizzle）
- `services/`: Next.js 到 AI 服务的调用封装
- `lib/`: 通用能力（鉴权客户端/服务端、请求封装、工具函数）
- `types/`: 业务类型定义（auth/resume 等）
- `ai/`: Python AI 服务（解析、技能抽取、匹配、评分）
- `docs/infra/`: 基础设施与工程化文档
- `drizzle/`: SQL 迁移文件与元信息

## 开发命令

### 本地启动

```bash
# 1) 安装依赖
pnpm install

# 2) 启动数据库
docker compose up -d

# 3) 执行迁移
npx drizzle-kit migrate

# 4) 启动前端/后端（Next.js）
pnpm dev
```

### AI 服务（单独终端）

```bash
cd ai
uv sync
uv run uvicorn server:app --reload --port 8000
```

### 常用工程命令

```bash
pnpm lint
pnpm build
pnpm start

npx drizzle-kit generate
npx drizzle-kit migrate
npx drizzle-kit studio
```

## 详细文档索引

建议阅读顺序：先看命令，再看鉴权，再看部署。

- 开发命令与数据库操作: `docs/infra/commands.md`
- 鉴权流程详解（Better Auth + 表结构）: `docs/infra/auth-flow.md`
- CI/CD 与生产部署: `docs/infra/cicd.md`
- AI 子服务说明: `ai/README.md`

## 快速导航

- 本地开发主入口: 根目录 `README.md`
- 项目结构与模块分布: 英文版 `docs/project-guide.md`
- 中文导览文档: `docs/zh-cn/project-guide.md`
- 鉴权细节与数据模型: `docs/infra/auth-flow.md`
