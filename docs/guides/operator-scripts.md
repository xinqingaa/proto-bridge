# 本地操作脚本

仓库根脚本减少本地路径、端口和固定 ID 的手工拼接，但不定义新的产品语义。Selection、warning、risk、Capture、Handoff、Deliver 和 MCP 读取仍由 CLI、Core 与 MCP 实现。

## 命令

| 命令 | 用途 | 是否写入持久状态 |
| --- | --- | --- |
| `pnpm pb:doctor` | 检查环境、配置、浏览器、构建、Store 和服务可达性 | 否 |
| `pnpm pb:up` | 按 Workspace 配置启动 PBWork 与 Local Service | Service 可以在启动恢复时终结 orphan Job |
| `pnpm pb -- <args>` | 从仓库根目录调用正式 CLI（含 `deliver`） | 由具体 CLI 命令决定 |
| `pnpm pb:mcp` | 从配置解析 Store/Workspace/`delivery.targetRoot` 并启动 stdio MCP | 否 |

`pnpm pbwork` 是 `pnpm pb:up` 的兼容别名。

## Doctor

```bash
pnpm pb:doctor
pnpm pb:doctor -- --require-running
pnpm pb:doctor -- --json
```

默认模式允许 PBWork 和 Local Service 尚未启动；`--require-running` 把服务不可达视为失败。Doctor 检查：

- Node.js 与 pnpm；
- Workspace 配置和 loopback 边界；
- `service.allowedOrigins` 是否包含 Workbench origin；
- Store 的逻辑 Workspace；
- `delivery.targetRoot` 是否存在且像 Flutter 工程（`pubspec.yaml` + `lib/`）；
- CLI/MCP 构建产物；
- Playwright Chromium；
- Runtime 与 Local Service 端口。

Doctor 不安装依赖、不启动服务、不修改配置。

## 启动 PBWork

```bash
pnpm pb:up
pnpm pb:up -- --config /absolute/path/to/proto-bridge.json
```

脚本读取配置中的 Runtime URL、Service 端口、Store、Workspace、Case 上限和 `delivery.targetRoot`，启动 PBWork 与 Local Service，等待两个端口可达后打印 Workbench URL 与绑定的目标路径。`Ctrl+C` 同时停止两个子进程。更改 `delivery.targetRoot` 后必须重启。

## 调用 CLI

```bash
pnpm pb -- workspace doctor
pnpm pb -- bundle list
pnpm pb -- deliver \
  --prototype cold-chain-ops \
  --acknowledge-unofficial-capture
```

包装脚本只缩短可执行路径；全部参数、输出和退出码仍由 `@proto-bridge/cli` 决定。构建产物缺失时会先运行根 `pnpm build`。

### 清理旧采集数据

不要手动只删除 `.proto-bridge/store`。先预览精确清理范围，再显式执行：

```bash
pnpm pb -- workspace reset
pnpm pb -- workspace reset --apply --plan-id <preview-plan-id> --generation <preview-generation>
```

preview 逐类披露 Evidence、`deliveries`、当前 Workspace 的未导出 Review、运行任务、inventory digest 和不可恢复警告，并把 plan audit 保存到 Store root 外。apply 必须带回同一 `planId + generation`；期间新增或修改任何对象都会返回 `reset-plan-drift`。成功后保留 `proto-bridge.json`/plan audit，创建不可复用的新 generation，并使旧 session/MCP task 终止。`pnpm pb:up` 存活时 CLI 自动经 Local Service drain。

若运行中的 Store root/lock 被外部删除或替换，Service 返回 `external-store-destroyed` / `writer-lock-lost`，不会自动创建目录。停止 Service 后先运行 `pnpm pb -- workspace doctor repair`；root 整体丢失时 repair 会拒绝，只能明确运行：

```bash
pnpm pb -- workspace reinitialize --confirm-destroyed <workspaceId>
```

reinitialize 创建新 generation，不能恢复旧 Handoff。固定验收 Workspace 禁止 reset/reinitialize。

## 启动 MCP

```bash
pnpm pb:mcp
pnpm pb:mcp -- --config /absolute/path/to/proto-bridge.json
```

MCP wrapper 从配置解析绝对 Store root、Workspace 和 `delivery.targetRoot`，并通过 stdio 启动正式 MCP server。stdio 的 stdout 只用于 JSON-RPC，启动信息写入 stderr。

查看 Cursor/Codex 可用的配置材料：

```bash
pnpm pb:mcp -- --print-config
```

输出只包含命令、参数、Workspace、Store 和交付目标，不启动 MCP。
Agent 客户端应使用输出中的直接 `node scripts/pb-mcp.mjs` 命令，避免包管理器的生命周期日志进入 stdio。MCP 启动不会隐式构建；构建缺失时先运行 `pnpm build`。

## Deliver（产品主路径）

产品主路径是 PBWork 待确定 → 定稿并自动采集。系统会：采集整个原型 → 创建 Handoff → 写入：

```text
.proto-bridge/deliveries/<timestamp>/
├── receipt.json
├── evidence-brief.md
├── review/
│   ├── index.md
│   └── screenshots/
│       └── *.png
└── agent-prompt.md
```

```bash
pnpm pb -- deliver \
  --prototype cold-chain-ops \
  --acknowledge-unofficial-capture
```

CLI `deliver` 是非正式诊断，不改变 PBWork 生命周期。非交互使用必须 `--acknowledge-unofficial-capture`；该旗标不能替代 `--accept-warning` / `--ack-risk`。省略 `--target` 时使用 `delivery.targetRoot`。`--screen` / `--fragment` / `--selection` 属于窄范围，需要第二层确认。

Review 按 PNG 内容去重：完全相同的 Screenshot 只写一份图片，并列出其对应的全部 Case。Agent 提示词先要求只读理解 Evidence 和目标工程、提交实现计划并等待确认；确认后才在同一任务中实施。收据只是 Store 索引；MCP 仍按 Handoff / Snapshot 从 Store 按需读取。也可用 `--bundle` + `--snapshot` 在已有 Evidence 上续跑交接，同样视为非正式。

稳定的 Agent 读取规则见 [Agent 消费指南](./agent-consumption.md)。
