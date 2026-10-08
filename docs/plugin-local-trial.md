# Resume Copilot 插件：本机安装实验

这是一个**最小插件骨架**。用户已确认在本机 Codex 安装插件并调用 `get_connection_status`；普通 Chat 的端到端连接尚未验证，也不是可以分享给其他人直接使用的发布版本。复用现有 NestJS MCP 服务；没有新增登录、数据表、工具或 skills。

三个入口文件：

- `plugins/resume-copilot/plugin.json`：插件身份。
- `plugins/resume-copilot/mcp.json`：指向本机 `http://localhost:3000/api/mcp` 的 Streamable HTTP 连接（**仅同一台电脑**）。
- `.agents/plugins/marketplace.json`：让 ChatGPT 桌面端在此仓库的本地 marketplace 中找到插件；路径相对于仓库根目录。

本机试安装（需要你操作桌面客户端）：

1. 按 [MCP 本机诊断准备](mcp-local-trial.md)启动数据库、Web、API，均仅监听回环地址；此处**不要**先通过手填 MCP URL 添加服务。
2. 在 ChatGPT 桌面端 **Add plugin marketplace**，Source 选择**本仓库根目录的本地文件夹**。在 Plugins Directory 的 `Resume Copilot (local)` 来源中找 `resume-copilot`，点击安装。观察是否出现所声明的 MCP 连接。
3. 若客户端发起授权，尝试浏览器登录、Allow/Cancel，然后调用 `get_connection_status`。记录失败的**步骤和错误文字**，不要分享令牌、Cookie、完整授权 URL 或数据库凭据。

**待实测的边界**：OpenAI 的插件文档还描述了先在 ChatGPT developer mode 注册 MCP 应用并在插件中引用 `plugin_asdk_app...` ID 的路径；这份可移植 `mcp.json` 尚未证明桌面端会直接完成该注册。官方 [plugin OAuth 文档](https://developers.openai.com/plugins/build/auth)使用的 ChatGPT CIMD 客户端 URL（`/oauth/client.json` 或 `/oauth/{callback_id}/client.json`）也与当前 API 只允许 `/oauth/codex/...` 的本机测试规则不同。若安装后无法授权，先核对实际客户端/官方注册要求，**不要**靠放宽 OAuth 策略、编造 app ID 或跳过用户同意来使其通过。该插件不可对外发布或暴露网络服务。
