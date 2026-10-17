# 配置与安全边界

## Workspace 配置

默认配置文件为 `proto-bridge.json`，由 `pnpm pb:init` 或 CLI `workspace init` 创建。主要字段：

| 字段 | 含义 |
| --- | --- |
| `schemaVersion` | Workspace 配置 Schema major |
| `workspaceId` | Store 的逻辑 Workspace |
| `runtime.baseUrl` | instrumented Runtime 基础 URL |
| `runtime.allowedOrigins` | Runtime 允许来源；`service.allowedOrigins` 为空时也作为 Workbench origin 的回退 |
| `store.root` | 相对配置文件的 Store root |
| `store.maxBytes` | 可选容量上限 |
| `store.retainArchivedSnapshots` | Store clean 为每个已归档 Bundle 保留的最新 Snapshot 数，整数且 ≥ 1，默认 1；`0` 被 Schema 拒绝 |
| `capture.maxCases` | Preflight Case 数量上限，默认 200 |
| `service.host/port` | Local Service loopback 地址 |
| `service.allowedOrigins` | 可调用 Service 的 Workbench origins；为空时回退到 `runtime.allowedOrigins`，再为空则取 `runtime.baseUrl` 的 origin |
| `delivery.targetRoot` | 本 Workspace 默认的 Agent 目标工程。相对 `proto-bridge.json` 所在目录解析为绝对路径；CLI `deliver`、PBWork 定稿提示词和 MCP Target 工具省略 `targetRoot` 时都使用它 |

具体 Schema 由 `V2WorkspaceConfig` 定义。配置值不用于补录原型事实或目标工程架构。不要把 `delivery.targetRoot` 写入 Evidence 或 Handoff；扫描结果仍不进入 Capture（见 [ADR 0004](../decisions/0004-producer-consumer-target-boundaries.md)）。

`delivery.targetRoot` 不是已废弃的 V1 键 `target`。V1 的 `source` / `target` / `output` 会被 `.strict()` 拒绝，不要复活这些键名。缺 `delivery.targetRoot` 时 Schema 失败，不会回落到 cwd 或硬编码路径。

`workspace init` 可用 `--target` 写入该字段；省略时模板默认 `apps/flutter_pb_app`，该字面量只出现在 init，不作为 deliver / MCP / PBWork 运行时默认。Target 工程可以在仓库外，只要路径存在且像 Flutter 工程（`pubspec.yaml` + `lib/`）。

`workspace init` 默认把 `runtime.baseUrl` 的 origin 写入
`service.allowedOrigins`，因为 PBWork 浏览器是 Local Service 的调用方。
配置完成后可用 `pnpm pb:doctor` 检查 origin、Store Workspace、交付目标、浏览器和本地端口。更改 `delivery.targetRoot` 后必须重启 `pnpm pb:up` 和 MCP。

## Local Service 启动参数

Local Service 入口只接受 `packages/local-service/src/index.ts --config <proto-bridge.json>`，不再读取任何 Service 环境变量。`pnpm pb:up`、CLI `service start` 和 `pnpm pb:doctor` 通过 Core `resolveLocalServiceLaunchConfig` 从同一份 Workspace 配置解析同一组值：

| 参数 | 配置来源 |
| --- | --- |
| host / port | `service.host`、`service.port` |
| allowedOrigins | `service.allowedOrigins`；为空时 `runtime.allowedOrigins`；仍为空时 `runtime.baseUrl` 的 origin |
| Store root | `store.root`（相对配置文件） |
| 交付目标 | `delivery.targetRoot`（相对配置文件，解析为绝对路径） |
| Case 上限 | `capture.maxCases` |
| 容量上限 | `store.maxBytes` |

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `PB_STORE_ROOT` | MCP 的 Store root |
| `PB_WORKSPACE_ID` | MCP 的 Workspace ID |
| `PB_DELIVERY_TARGET_ROOT` | MCP 绑定的绝对交付目标。`pnpm pb:mcp` 从 `delivery.targetRoot` 解析后传入 |
| `PB_SERVICE_HOST` / `PB_SERVICE_PORT` | 仅供 PBWork Vite dev server 的 `/__pb_v2` 代理使用，由 `pnpm pb:up` 从 `service.host/port` 传入；Local Service 本身不读取 |
| `PB_SKIP_BROWSER_INSTALL` | 设为 `1` 时跳过 `pnpm pb:install` 的 Playwright Chromium 自动安装，适用于离线或由环境管理浏览器的 CI |

`PB_SERVICE_PORT`、`PBWORK_ORIGIN`、`PBWORK_RUNTIME_ORIGIN`、`PB_MAX_CASES` 以及 Service 侧的 `PB_STORE_ROOT`、`PB_WORKSPACE_ID`、`PB_DELIVERY_TARGET_ROOT` 不再影响 Local Service。

CLI 配置文件和显式参数的优先级以对应入口实现为准。MCP 支持 `PB_STORE_ROOT`、`PB_WORKSPACE_ID` 与 `PB_DELIVERY_TARGET_ROOT`；`--target-root` 覆盖环境变量。

## Local Service

- 监听 host 必须是 `127.0.0.1` 或 `::1`。
- 请求的 Host hostname 必须是 `127.0.0.1`、`localhost` 或 `::1`（不限端口，因为 PBWork Vite 代理会转发浏览器的 Host），否则返回 400 `unsafe-input`；该 DNS-rebinding 防御先于 Origin 检查。
- Runtime 必须解析到本地 HTTP(S) 地址。
- Workbench Origin 必须在解析后的 allowedOrigins 中。
- Session token 只通过 `Authorization` header 传递，不能进入 URL、日志或持久对象。
- Session 有有效期，Service 重启后旧 session 失效。
- Session 加法字段 `deliveryTargetRoot` 是已解析的绝对路径；不 bump protocol version。
- `POST /deliveries` 使用绑定路径写收据。请求体若带 `targetRoot`，realpath 必须与绑定路径一致。
- `GET /api/v2/deliveries/:id` 只接受安全 Delivery ID：匹配 `^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$` 且解析后是 deliveries 根目录的直接子目录；否则返回 400 `invalid-schema`。生命周期迁移校验和 `writeDeliveryReceipt` 覆盖 ID 使用同一个 Core 校验器（`isSafeDeliveryId` / `resolveDeliveryDir`）。
- 请求体有容量限制。
- Preflight 有有效期，过期后必须重新检查。

## Store

- Store root 应位于明确 Workspace 目录，不能指向仓库根或用户主目录。
- Store 只允许单 writer。
- `pnpm pb:reset` 必须经过 Core generation-bound reset 安全检查，不能手工递归删除 Store 内容。
- Reset 预览与结果单独计入 Store root 下 `pbwork/<workspaceId>/lifecycle-v1.json`；确认 reset 后清除此 sidecar。它只供 Local Service/PBWork lifecycle 恢复，不是 MCP Consumer 文件入口。
- `pnpm pb:clean` 是本地安装销毁命令，只允许删除仓库默认 `proto-bridge.json` 和 `.proto-bridge`，并必须先停止受管 PB 进程。
- `.proto-bridge/store` 不提交 Git。
- Consumer 不读取 Store 文件布局。

## MCP

- 启动时必须固定 Workspace。
- Tools 只接受逻辑对象 ID。
- Debug/Trace Blob 需要显式 `allowDebug`。
- Snapshot/revision/Blob 的可达性必须校验。
- Target 工具省略 `targetRoot` 时使用进程绑定的 `delivery.targetRoot`；显式传入的 `targetRoot` 仍有效。禁止回落到 `process.cwd()`。
- `inspect_evidence_workspace` 返回 `deliveryTargetRoot`，供 Agent 与提示词对齐。

## Runtime

- Workbench Bridge 校验 origin、source window、runtimeId、requestId 和 payload。
- Capture Protocol 只暴露浏览器安全 Contract。
- URL 只包含可复现的 Runtime 维度；token、Store path 和本地工作台偏好不得进入 URL。

## 原型制作命令

`pnpm pb:new-prototype <id>` 生成原型目录、继承基础包的主题模板、draft 设计文档、外壳、示例 Screen 和测试，并生成 default 边界；已有目录拒绝覆盖。`pnpm ds:keys:generate` 与 `pnpm pb:screens:generate` 的产物都应纳入版本管理。完整说明见[制作工具](../pbwork/prototypes/authoring-tools.md)。
