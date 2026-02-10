# Better Auth 鉴权流程详解

## 1. 数据库设计（4 张表）

### 1.1 `user` 表 - 用户基础信息

```typescript
id; // 用户唯一标识
name; // 用户姓名
email; // 邮箱（唯一索引）
emailVerified; // 邮箱是否验证
createdAt; // 创建时间
updatedAt; // 更新时间
```

**作用：** 存储用户核心身份信息，所有认证方式最终都关联到这张表。

**为什么这么设计：**

- `emailVerified` 支持邮箱验证流程（注册后发送验证链接）
- `id` 是所有其他表的外键，实现用户数据的统一管理

---

### 1.2 `session` 表 - 会话管理

```typescript
id; // 会话 ID
token; // 会话 token（唯一索引，存在 cookie 中）
expiresAt; // 过期时间
userId; // 关联的用户 ID（外键）
ipAddress; // 登录 IP（安全审计）
userAgent; // 浏览器信息（安全审计）
createdAt; // 创建时间
updatedAt; // 更新时间
```

**作用：** 管理用户登录会话，支持多设备同时登录。

**为什么这么设计：**

- **一对多关系：** 一个用户可以有多个活跃 session（手机、电脑、平板等）
- **token 唯一索引：** 快速查询会话，验证用户身份
- **expiresAt：** 支持会话过期自动失效（7 天后过期）
- **ipAddress + userAgent：**
  - 安全审计：检测异常登录
  - 可实现"显示所有登录设备"功能
  - 支持"强制登出其他设备"

**工作流程：**

1. 用户登录成功 → 创建 session 记录
2. 生成 `token` 写入 cookie: `better-auth.session_token`
3. 每次请求 → middleware 检查 cookie 中的 token → 查询 session 表 → 验证是否过期
4. 登出 → 删除 session 记录 + 清除 cookie

---

### 1.3 `account` 表 - 认证方式关联

```typescript
id; // 账户记录 ID
userId; // 关联的用户 ID（外键）
providerId; // 认证提供商（如 "email", "google", "github"）
accountId; // 在该提供商下的唯一标识
password; // 密码哈希（仅 email 登录使用）
accessToken; // OAuth access token（仅第三方登录）
refreshToken; // OAuth refresh token
idToken; // OAuth ID token
accessTokenExpiresAt; // Access token 过期时间
refreshTokenExpiresAt; // Refresh token 过期时间
scope; // OAuth 授权范围
createdAt; // 创建时间
updatedAt; // 更新时间
```

**作用：** 支持多种登录方式，一个用户可以绑定多个认证提供商。

**为什么这么设计：**

- **解耦用户和认证方式：** 同一个用户可以用邮箱+密码登录，也可以用 Google 登录
- **providerId + accountId：** 唯一标识某个认证方式下的账户
  - 例如：`{ providerId: "email", accountId: "user@example.com", password: "hashed..." }`
  - 例如：`{ providerId: "google", accountId: "google-user-id-123", accessToken: "..." }`
- **支持账号合并：** 如果用户先用邮箱注册，后来用 Google 登录同一邮箱，可以关联到同一个 `user`

**本项目当前使用：**

- 只启用了 `emailAndPassword` 认证
- 每个用户有一条 `account` 记录：`providerId = "credential"`（better-auth 的邮箱密码提供商）
- `password` 字段存储 bcrypt 哈希后的密码

---

### 1.4 `verification` 表 - 验证码 / 验证令牌

```typescript
id; // 验证记录 ID
identifier; // 标识符（如邮箱、手机号）
value; // 验证值（如验证码、令牌）
expiresAt; // 过期时间
createdAt; // 创建时间
updatedAt; // 更新时间
```

**作用：** 存储临时验证信息，支持邮箱验证、密码重置、2FA 等场景。

**为什么这么设计：**

- **通用性：** 不同验证场景共用一张表
  - 邮箱验证：`identifier = email`, `value = verification_token`
  - 密码重置：`identifier = email`, `value = reset_token`
  - 2FA：`identifier = user_id`, `value = totp_code`
- **expiresAt：** 验证码/令牌有时效性（通常 15 分钟或 1 小时）
- **用后即删：** 验证成功后删除记录，防止重复使用

**本项目当前使用：**

- 如果启用邮箱验证功能，注册时生成验证令牌存入此表
- 目前 `emailAndPassword.enabled: true` 但未配置 SMTP，所以注册时 `emailVerified` 直接为 `true`

---

## 2. 为什么有 `auth.ts` 和 `auth-client.ts`？

### 架构原因：Next.js 的 **Server/Client 分离**

| 文件                 | 运行环境        | 职责                            |
| -------------------- | --------------- | ------------------------------- |
| `lib/auth.ts`        | **Server Only** | 服务端鉴权逻辑 + 数据库操作     |
| `lib/auth-client.ts` | **Client Only** | 浏览器端 API 调用 + React Hooks |

---

### 2.1 `auth.ts` - 服务端配置

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 7, ... },
});
```

**作用：**

1. **初始化 Better Auth 服务端实例**
2. **配置数据库适配器**（Drizzle + PostgreSQL）
3. **定义认证策略**（邮箱密码、会话策略）
4. **提供 API 处理器**（在 `app/api/auth/[...all]/route.ts` 中使用）

**为什么不能在浏览器用：**

- 包含数据库连接（`db` 实例）
- 包含密码哈希、token 签名等敏感操作
- 如果暴露到浏览器会有严重安全风险

**在哪使用：**

- `app/api/auth/[...all]/route.ts` → 处理所有 `/api/auth/*` 请求
- Server Components / Server Actions（如需验证用户身份）

---

### 2.2 `auth-client.ts` - 浏览器端 SDK

```typescript
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
```

**作用：**

1. **封装 HTTP 请求**，调用 `/api/auth/*` 接口
2. **提供 React Hooks**（如 `useSession`）
3. **自动管理 Cookie**（发送请求时携带 session token）

**为什么要单独一个文件：**

- **不能直接访问数据库**（浏览器没有数据库连接）
- **只能通过 HTTP 请求与服务端通信**
- **提供开箱即用的 React 集成**

**工作原理：**

```typescript
// 登录时
await signIn.email({ email, password });
// ↓ 实际发送
// POST /api/auth/sign-in/email
// Body: { email, password }
// ↓ 服务端处理（auth.ts）
// 1. 验证密码
// 2. 创建 session
// 3. Set-Cookie: better-auth.session_token=xxx
// ↓ 浏览器收到响应
// 自动保存 cookie，后续请求自动携带
```

---

## 3. 完整鉴权流程

### 3.1 注册流程

```
用户填写表单（register/page.tsx）
  ↓
调用 signUp.email({ name, email, password })  [auth-client.ts]
  ↓
POST /api/auth/sign-up/email  [自动路由到 auth.ts]
  ↓
服务端处理：
  1. 检查邮箱是否已存在（查 user 表）
  2. 哈希密码（bcrypt）
  3. 插入 user 表
  4. 插入 account 表（providerId="credential", password=hashed）
  5. 创建 session 记录
  6. 生成 session token
  7. 设置 Cookie: better-auth.session_token=xxx
  ↓
浏览器自动保存 cookie
  ↓
跳转到 /resume（已登录状态）
```

### 3.2 登录流程

```
用户填写表单（login/page.tsx）
  ↓
调用 signIn.email({ email, password })  [auth-client.ts]
  ↓
POST /api/auth/sign-in/email
  ↓
服务端处理：
  1. 查询 account 表（providerId="credential", accountId=email）
  2. 验证密码（bcrypt.compare）
  3. 创建新 session
  4. 设置 Cookie
  ↓
跳转到 /resume
```

### 3.3 鉴权流程（每次请求）

```
用户访问受保护页面（如 /resume）
  ↓
middleware.ts 拦截请求
  ↓
检查 cookie: better-auth.session_token
  ↓
如果没有 → 重定向到 /login
  ↓
如果存在 → 放行（服务端后续可查 session 表验证）
  ↓
页面中使用 useSession() 获取用户信息
  ↓
GET /api/auth/get-session  [自动携带 cookie]
  ↓
服务端：
  1. 从 cookie 读取 token
  2. 查询 session 表
  3. 检查是否过期
  4. 返回 user 信息
  ↓
页面渲染用户数据
```

### 3.4 登出流程

```
用户点击登出按钮
  ↓
调用 signOut()  [auth-client.ts]
  ↓
POST /api/auth/sign-out
  ↓
服务端：
  1. 删除 session 记录
  2. 清除 Cookie
  ↓
跳转到 /login
```

---

## 4. 安全机制

| 机制              | 实现方式                               |
| ----------------- | -------------------------------------- |
| **密码加密**      | bcrypt 哈希（不可逆）                  |
| **Session Token** | 随机生成，存 cookie + 数据库           |
| **CSRF 防护**     | Better Auth 内置（检查 Origin header） |
| **XSS 防护**      | Cookie 设置 `HttpOnly`（JS 无法读取）  |
| **Session 过期**  | 7 天后自动失效                         |
| **多设备登录**    | 每台设备一个独立 session               |
| **登录审计**      | 记录 IP + User-Agent                   |

---

## 5. 总结

### 为什么是 4 张表？

- **user：** 用户身份中心
- **session：** 支持多设备登录 + 会话管理
- **account：** 解耦认证方式，支持多种登录（邮箱、Google、GitHub 等）
- **verification：** 支持邮箱验证、密码重置等临时验证场景

### 为什么分 `auth.ts` 和 `auth-client.ts`？

- **Next.js 强制分离 Server/Client 代码**
- `auth.ts` 有数据库权限，只能在服务端用
- `auth-client.ts` 封装 HTTP 请求，只能在浏览器用
- 这种设计保证了**安全性**（数据库凭证不会泄露到浏览器）
