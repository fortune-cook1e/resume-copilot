# Resume Copilot

基于 pnpm workspaces 的重构工程。当前阶段仅完成工程初始化，尚未迁移新版业务。

- [产品定义（中文）](docs/product.md)
- [Product definition (English)](docs/product.en.md)

## 目录

```text
eslint.config.mjs            # 根目录共享 ESLint 基础配置
tsconfig.json                # 根目录共享 TypeScript 基础配置
apps/
  web/                       # 整体迁入的旧 Next.js 全栈应用
    eslint.config.mjs        # 导入根配置，追加 Next.js 规则
    tsconfig.json            # extends 根配置，追加 Next.js 编译选项
  api/                       # 新 NestJS 基础应用
    eslint.config.mjs        # 导入并扩展根配置
    tsconfig.json            # extends 根配置，追加 NestJS 编译选项
packages/
  contracts/                 # 前后端共享的 Zod schema 与推导类型（当前仅骨架）
```

不再使用独立的 ESLint／TypeScript 配置 package。各应用的 ESLint flat config 导入 `../../eslint.config.mjs`，TypeScript 通过 `"extends": "../../tsconfig.json"` 继承基础配置；框架专属选项、路径别名、源码范围和输出目录留在应用内定义。

共享的 ESLint、TypeScript 工具依赖由根目录管理，`eslint-config-next` 等框架专属依赖归对应应用。统一使用根目录的 `pnpm lint` 检查根配置并分别执行各应用的 lint，确保应用专属规则也被使用。

`.gitignore` 中的 `**/.next/` 忽略所有层级的 Next.js 产物。TypeScript 配置中仍包含 `.next/types` 等生成类型路径以支持路由类型检查，这不代表把它们加入 Git。

`packages/contracts`（包名 `@resume-copilot/contracts`）已初始化 Zod 依赖、构建与导出入口，同样继承根 ESLint／TypeScript 配置。它只负责跨应用契约，不依赖 Next.js、NestJS、数据库实体或前端组件。

目前 `src/index.ts` 刻意保留空导出：尚未确定或迁移业务 schema，也未给应用添加未使用的契约包依赖。后续由具体契约驱动 schema 与 `z.infer` 类型定义，再让应用通过 `workspace:*` 引用公共入口，不导入包内源码路径。

包使用 TypeScript 输出 CommonJS JavaScript 和 `.d.ts` 到 `dist`，兼容当前 NestJS 的 CommonJS 运行方式，也可由 Next.js 打包器导入；构建产物不进入 Git。根目录 `pnpm dev` 会启动此包的编译监听；`pnpm build`、`pnpm typecheck` 和 `pnpm lint` 也会自动包含此包。

尚未提前安装 Agent、向量检索或新版鉴权依赖。后续根据具体需求引入。

## Web data-fetching foundation

- `@tanstack/react-query` is initialized through `QueryProvider` in the root layout. The layout remains a Server Component, and each mounted provider owns a stable QueryClient rather than sharing a server-side singleton.
- Existing Axios requests, React Hook Form usage, and Zustand stores are unchanged. No business query migration, SSR prefetch/hydration, Devtools, or persisted cache is included.
- Define cache invalidation and identity-change cleanup when introducing authenticated queries; provider setup alone does not implement that lifecycle.

## 环境与安装

使用 Node.js 22（至少 22.12）及 `packageManager` 固定的 pnpm 9.15.9：

```bash
nvm use                       # 如使用 nvm
corepack enable
pnpm install --frozen-lockfile
```

所有依赖从仓库根目录安装，维护一个 `pnpm-lock.yaml`。

- Web 的本地环境变量放在 `apps/web/.env`。本次迁移已将原有本地 env 文件一并移入，不纳入 Git。
- 新检出的仓库需要自行配置 `DATABASE_URL`、`BETTER_AUTH_SECRET`、`NEXT_PUBLIC_APP_URL` 和 `BETTER_AUTH_URL`；不要使用生产凭证做测试。
- `docker compose up -d postgres` 可启动原有本地 PostgreSQL；本次未启动容器、执行迁移或启用 pgvector。
- 需要使用旧数据库功能时，确认连接目标后再运行 `pnpm --filter @resume-copilot/web exec drizzle-kit migrate`。不要把这条命令用于尚未确认的数据库。

## 开发命令

```bash
pnpm dev                      # 同时启动 Web（3000）、API（3001）及共享包编译监听
pnpm dev:web                  # 仅启动旧 Web
pnpm dev:api                  # 仅启动 NestJS
pnpm --filter @resume-copilot/contracts dev  # 仅启动契约包编译监听
```

根 `dev` 并行运行 `apps/*` 和 `packages/*` 中已有的 `dev` 脚本；没有 `dev` 脚本的 workspace 会跳过，且不会递归执行根脚本本身。

API 当前只提供 `GET http://localhost:3001/api/health`，返回 `{"status":"ok"}`。

**过渡期边界：**旧 Next.js API、Better Auth、数据库代码和 Drizzle 迁移仍在 `apps/web`。不要立即将全部 `/api/*` 转发到 NestJS：它尚未实现这些业务。此前确定的同域访问是目标部署方式，本轮没有实现反向代理或移动业务接口。

Python AI 服务已经移除，旧 Web 的岗位分析与 PDF 解析接口仍引用该服务，因此这部分功能暂不可用。旧 Web 依赖中的 Ollama 等也只是保留的旧实现，不代表新版技术选择。

## 验证命令

```bash
pnpm typecheck                # 各应用与共享包的源码类型检查
pnpm build                    # Web、API 与共享包构建
pnpm lint                     # 根配置、各应用与共享包的 ESLint
pnpm test                     # API bootstrap and Web query-provider tests
pnpm --filter @resume-copilot/web exec playwright install chromium
pnpm test:e2e                 # 启动独立的 3100 端口，验证旧首页
```

- API 测试先由 TypeScript 编译，再通过 Vitest 测试真实编译产物，保留 NestJS 所需的 decorator metadata，同时检查测试文件类型。
- Web Vitest excludes Playwright and Next.js artifacts. Its provider tests cover cache stability across rerenders and isolation between provider instances, not the full editor workflow.
- Playwright 首页检查不依赖真实用户、数据库数据或模型调用，使用测试专用环境变量。
- 依赖安装仍会提示旧 Web 的 Tiptap v2/v3 peer dependency 不匹配；本轮保留原业务依赖，后续重构编辑器时处理。
- 旧 Web 当前仍有 ESLint 错误，`pnpm lint` 会如实失败；没有关闭规则或忽略业务目录来隐藏问题。新 API 和根配置可分别检查：

```bash
pnpm --filter @resume-copilot/api lint
pnpm --filter @resume-copilot/contracts lint
pnpm lint:root
```

## 部署说明

根目录 `Dockerfile` 已按 workspace 路径适配，但仍只构建和运行**旧 Web**。原有生产 compose 和部署 workflow 暂时保留，它们不是新版前后端部署方案。

生产 compose 使用部署机器上的根目录 `.env`，与本地 Web 的 `apps/web/.env` 分开管理。不要把真实环境文件放进镜像或 Git。

本轮不部署、不变更数据库结构、不迁移用户数据。后续先沉淀专项技术方案，再按可验证的小步骤重构业务。
