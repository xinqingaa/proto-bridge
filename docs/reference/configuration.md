# 配置与安全边界

## Workspace 配置

默认配置文件为 `proto-bridge.json`，由 CLI `workspace init` 创建。主要字段：

| 字段 | 含义 |
| --- | --- |
| `schemaVersion` | Workspace 配置 Schema major |
| `workspaceId` | Store 的逻辑 Workspace |
| `runtime.baseUrl` | instrumented Runtime 基础 URL |
| `runtime.allowedOrigins` | Runtime 允许来源 |
| `store.root` | 相对配置文件的 Store root |
| `store.maxBytes` | 可选容量上限 |
| `capture.maxCases` | Preflight Case 数量上限，默认 200 |
| `service.host/port` | Local Service loopback 地址 |
| `service.allowedOrigins` | 可调用 Service 的 Workbench origins |

具体 Schema 由 `V2WorkspaceConfig` 定义。配置值不用于补录原型事实或目标工程架构。

`workspace init` 默认把 `runtime.baseUrl` 的 origin 写入
`service.allowedOrigins`，因为 PBWork 浏览器是 Local Service 的调用方。
配置完成后可用 `pnpm pb:doctor` 检查 origin、Store Workspace、浏览器和本地端口。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `PB_SERVICE_PORT` | PBWork Local Service 端口 |
| `PB_STORE_ROOT` | Store root |
| `PB_WORKSPACE_ID` | Workspace ID |
| `PB_MAX_CASES` | Preflight Case 上限 |
| `PBWORK_ORIGIN` | Workbench origin |
| `PBWORK_RUNTIME_ORIGIN` | Runtime origin |

CLI 配置文件和显式参数的优先级以对应入口实现为准。MCP 支持 `PB_STORE_ROOT` 与 `PB_WORKSPACE_ID`。

## Local Service

- Host 必须是 `127.0.0.1` 或 `::1`。
- Runtime 必须解析到本地 HTTP(S) 地址。
- Workbench Origin 必须在 allowlist。
- Session token 只通过 `Authorization` header 传递，不能进入 URL、日志或持久对象。
- Session 有有效期，Service 重启后旧 session 失效。
- 请求体有容量限制。
- Preflight 有有效期，过期后必须重新检查。

## Store

- Store root 应位于明确 Workspace 目录，不能指向仓库根或用户主目录。
- Store 只允许单 writer。
- clean 必须经过 Core 安全检查，不能手工递归删除不明确路径。
- `.proto-bridge/store` 不提交 Git。
- Consumer 不读取 Store 文件布局。

## MCP

- 启动时必须固定 Workspace。
- Tools 只接受逻辑对象 ID。
- Debug/Trace Blob 需要显式 `allowDebug`。
- Snapshot/revision/Blob 的可达性必须校验。
- Target root 独立传入，不从 Evidence Store 推断。

## Runtime

- Workbench Bridge 校验 origin、source window、runtimeId、requestId 和 payload。
- Capture Protocol 只暴露浏览器安全 Contract。
- URL 只包含可复现的 Runtime 维度；token、Store path 和本地工作台偏好不得进入 URL。
