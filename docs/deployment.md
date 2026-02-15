# Resume Copilot - Aliyun Deployment Guide

## 📋 Environment Variables

### Required Variables

| Variable             | Description         | Example                      | How to Generate           |
| -------------------- | ------------------- | ---------------------------- | ------------------------- |
| `DB_PASSWORD`        | PostgreSQL password | `MySecureP@ssw0rd!`          | Random secure string      |
| `BETTER_AUTH_SECRET` | Auth secret key     | `abc123...`                  | `openssl rand -base64 32` |
| `BETTER_AUTH_URL`    | Production domain   | `https://resume.example.com` | Your domain               |

### GitHub Secrets

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：

| Secret Name                | Description          | Example                                            |
| -------------------------- | -------------------- | -------------------------------------------------- |
| `ALIYUN_REGISTRY`          | 阿里云镜像仓库地址   | `registry.cn-hangzhou.aliyuncs.com/your-namespace` |
| `ALIYUN_REGISTRY_USERNAME` | 阿里云镜像仓库用户名 | `your-aliyun-username`                             |
| `ALIYUN_REGISTRY_PASSWORD` | 阿里云镜像仓库密码   | `your-aliyun-password`                             |
| `ALIYUN_HOST`              | 阿里云服务器 IP      | `47.123.456.789`                                   |
| `ALIYUN_SSH_USER`          | SSH 登录用户         | `root` 或 `ubuntu`                                 |
| `ALIYUN_SSH_KEY`           | SSH 私钥（推荐）     | 整个私钥内容，见下方生成方法                       |
| `ALIYUN_SSH_PASSWORD`      | SSH 密码（备选）     | 服务器登录密码，私钥优先                           |
| `ALIYUN_SSH_PORT`          | SSH 端口（可选）     | `22`                                               |

## 🚀 Deployment Steps

### 1. 准备阿里云服务器

```bash
# 连接到服务器
ssh root@your-server-ip

# 安装 Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

### 2. 创建项目目录

```bash
# 创建目录
mkdir -p /opt/resume-copilot
cd /opt/resume-copilot

# 下载必要文件
curl -O https://raw.githubusercontent.com/your-username/resume-copilot/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/your-username/resume-copilot/main/.env.production.example

# 重命名并编辑环境变量
mv .env.production.example .env
vim .env  # 填入真实的环境变量
```

### 3. 配置 Nginx Proxy Manager

在 Nginx Proxy Manager 中配置反向代理：

- **Domain Names:** `resume.example.com`
- **Scheme:** `http`
- **Forward Hostname / IP:** `your-server-ip` 或容器名
- **Forward Port:** `3000`
- **Block Common Exploits:** ✅
- **Websockets Support:** ✅
- **SSL:** 使用 Let's Encrypt 自动申请证书

### 4. 配置 GitHub Actions

#### 方式 ：SSH 密码认证

**优点**：配置简单，不需要生成密钥  
**缺点**：安全性较低，建议仅在测试环境使用

**GitHub Secrets 配置：**

- `ALIYUN_SSH_PASSWORD`: 设置为服务器 root 用户的密码
- 不需要设置 `ALIYUN_SSH_KEY`

**注意**：如果同时设置了 `ALIYUN_SSH_KEY` 和 `ALIYUN_SSH_PASSWORD`，会优先使用私钥认证。

#### 添加 GitHub Secrets

1. 进入 GitHub 仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加上述所有 secrets

### 5. 首次部署

```bash
# 在服务器上手动拉取镜像并启动
cd /opt/resume-copilot

# 登录阿里云镜像仓库
docker login registry.cn-hangzhou.aliyuncs.com/your-namespace

# 拉取镜像（首次需要手动，后续 GitHub Actions 自动）
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/resume-copilot:latest

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f app
```

### 6. 运行数据库迁移

#### 自动迁移（推荐）

GitHub Actions 会在每次部署时自动运行数据库迁移：

1. 拉取最新镜像
2. 停止应用容器（数据库保持运行）
3. **自动运行 `drizzle-kit push`**
4. 启动新版本容器

无需手动操作！查看 GitHub Actions 日志可以看到迁移输出。

#### 手动迁移（仅在需要时）

```bash
# 方法 1: 通过 docker compose 运行迁移
cd /opt/resume-copilot
docker compose -f docker-compose.prod.yml run --rm app sh -c "npx drizzle-kit push"

# 方法 2: 进入运行中的容器
docker exec -it resume-copilot-app sh
npx drizzle-kit push

# 方法 3: 使用 drizzle studio 查看数据库
docker exec -it resume-copilot-app npx drizzle-kit studio --port 4983
# 然后访问 http://your-server-ip:4983
```

#### 迁移验证

```bash
# 查看数据库表
docker exec -it resume-copilot-db-prod psql -U resume -d resume_copilot -c "\dt"

# 应该看到：
# - user
# - session
# - account
# - verification
```

### 7. 验证部署

```bash
# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 测试应用
curl http://localhost:3000/api/health

# 通过 Nginx Proxy Manager 访问
curl https://your-domain.com
```

## 🔄 后续更新流程

每次推送代码到 `main` 分支，GitHub Actions 会自动：

1. ✅ 构建 Docker 镜像
2. ✅ 推送到阿里云镜像仓库
3. ✅ SSH 到服务器
4. ✅ 拉取最新镜像
5. ✅ 停止旧应用容器
6. ✅ **运行数据库迁移** (自动检测 schema 变化)
7. ✅ 启动新容器
8. ✅ 清理旧镜像

**手动触发部署：**

GitHub 仓库 → Actions → Deploy to Aliyun → Run workflow

**部署时间：** 通常 2-5 分钟（包括构建、推送、部署）

## 📊 监控和日志

### 查看日志

```bash
# 应用日志
docker-compose -f docker-compose.prod.yml logs -f app

# 数据库日志
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 查看资源使用

```bash
# 容器资源
docker stats

# 磁盘空间
df -h

# 清理旧镜像
docker image prune -af
```

## 🔧 常见问题

### 1. PDF 导出失败

```bash
# 检查 Chromium 是否正常
docker exec -it resume-copilot-app sh
chromium-browser --version

# 查看日志
docker-compose -f docker-compose.prod.yml logs app | grep "PDF"
```

### 2. 数据库连接失败

```bash
# 检查数据库是否启动
docker-compose -f docker-compose.prod.yml ps postgres

# 手动连接测试
docker exec -it resume-copilot-db-prod psql -U resume -d resume_copilot
```

### 3. 应用无法访问

```bash
# 检查 app 容器是否运行
docker-compose -f docker-compose.prod.yml ps app

# 检查网络
docker network inspect resume-copilot-network

# 检查 Nginx Proxy Manager 配置
# 确保反向代理指向正确的 IP:3000
```

## 🛡️ 安全建议

1. **防火墙设置：**

```bash
# 只开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 3000/tcp  # Application (for Nginx Proxy Manager)
ufw enable
```

**注意：** 如果使用 Nginx Proxy Manager，它会处理 80/443 端口。

2. **定期更新：**

```bash
# 更新系统
apt update && apt upgrade -y

# 更新 Docker 镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

3. **备份数据库：**

```bash
# 创建备份脚本
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR
docker exec resume-copilot-db-prod pg_dump -U resume resume_copilot | gzip > $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz
# 保留最近 30 天的备份
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /opt/backup-db.sh

# 添加到 crontab（每天凌晨 2 点备份）
crontab -e
# 添加：0 2 * * * /opt/backup-db.sh
```

## 📝 环境变量清单

### 服务器环境变量（.env 文件）

```bash
# 必填
DB_PASSWORD=xxx
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=https://your-domain.com

# 可选（有默认值）
DB_USER=resume
DB_NAME=resume_copilot
NODE_ENV=production
PORT=3000
```

### GitHub Secrets（必填）

**容器镜像仓库认证：**

- `ALIYUN_REGISTRY`
- `ALIYUN_REGISTRY_USERNAME`
- `ALIYUN_REGISTRY_PASSWORD`

**服务器连接：**

- `ALIYUN_HOST`
- `ALIYUN_SSH_USER`

**SSH 认证（二选一）：**

- `ALIYUN_SSH_KEY`（推荐 ✅）- 更安全
- `ALIYUN_SSH_PASSWORD`（备选）- 配置简单

> 💡 如果同时设置了私钥和密码，会优先使用私钥认证。

---

**完成以上步骤后，你的应用就成功部署到阿里云了！** 🎉
