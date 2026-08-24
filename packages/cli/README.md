# @proto-bridge/cli

ProtoBridge CLI 是自动化 Evidence Producer 和 Workspace/Bundle 生命周期入口。它与 PBWork 共用 Core Selection、Preflight、Case Matrix、Capture、Store 和 Handoff。

## Workspace

安装包后使用 `proto-bridge`；在本仓库根目录使用等价包装
`pnpm pb -- <args>`：

```bash
pnpm pb -- workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

pnpm pb -- workspace doctor

# 先预览；再把输出的 planId 与 generation 原样带回 apply
pnpm pb -- workspace reset --json
pnpm pb -- workspace reset --apply --plan-id <id> --generation <id>
```

仓库根目录提供六个日常入口：`pnpm pb:install`、`pnpm pb:init`、`pnpm pb:doctor`、`pnpm pb:up`、`pnpm pb:reset` 和 `pnpm pb:clean`。其中 `pb:reset` 自动完成 preview、交互确认和 apply；非交互环境使用 `pnpm pb:reset -- --yes`。彻底删除本地配置和 `.proto-bridge` 属于根脚本 `pnpm pb:clean`，不属于 CLI Store reset。

默认配置是 `./proto-bridge.json`，默认 Store 是相对配置文件的 `.proto-bridge/store`。

## 命令

```text
proto-bridge workspace init [--config <file>] [--target <dir>]
proto-bridge workspace doctor [--json]
proto-bridge workspace doctor repair [--json]
proto-bridge workspace reset [--apply --plan-id <id> --generation <id>] [--json]
proto-bridge workspace reinitialize --confirm-destroyed <workspaceId> [--json]
proto-bridge preflight --selection <file> [--manifest <file>]
proto-bridge capture run --selection <file> [--bundle <id>] [--acknowledge-unofficial-capture]
proto-bridge deliver --prototype <id> [--target <dir>] [--acknowledge-unofficial-capture]
proto-bridge deliver --bundle <id> --snapshot <id> [--ack-risk <kind>] [--target <dir>] [--acknowledge-unofficial-capture]
proto-bridge job status|cancel|retry --job <id>
proto-bridge bundle list|inspect|fork|archive|clean
proto-bridge snapshot|run|case inspect
proto-bridge stale check --bundle <id> --snapshot <id>
proto-bridge handoff create|show|export
proto-bridge review show --review <id>
proto-bridge review approve-tranche --review <id> --screen <id> --tranche <n> --approval-ref <ref>
proto-bridge review approve-finalize --review <id> --confirmation-ref <ref>
proto-bridge service start
```

以 `proto-bridge --help` 和命令实现为精确参数权威。

## 确认与输出

- warning 使用可重复的 `--accept-warning <warningId>` 逐项确认；
- Handoff risk 使用可重复的 `--ack-risk <riskKind>` 逐项确认；
- 不提供 `--force`；
- `deliver` 一次完成采集、Handoff 与 `.proto-bridge/deliveries/*/agent-prompt.md`（收据只是 Store 索引；MCP 仍按 Handoff/Snapshot 读 Store）；
- 官方定稿在 PBWork：待确定 → 定稿并自动采集。CLI `capture run` / `deliver` 是非正式诊断，不改变生命周期；非 TTY 或 `--json` 必须 `--acknowledge-unofficial-capture`。该旗标不能替代 `--accept-warning` / `--ack-risk`；
- 省略 `--target` 时使用 `proto-bridge.json` 的 `delivery.targetRoot`；`--target` 只覆盖这一次命令；
- `deliver` 默认采集整个 Prototype；`--screen` / `--fragment` / `--selection` / `--only-variant` / `--only-scenario` 是窄范围诊断，需要第二层确认；
- `workspace doctor` 与 inspect/list/show 以只读方式打开 Store，可与 `pnpm pb:up` 并存；
- `workspace reset` 默认只预览 Evidence、Delivery、未导出 Review 和运行任务范围，并把 plan 写入 Store 外的 `reset-plans`；apply 必须带回同一 `planId + generation`，任何范围漂移都会拒绝。成功后保留配置/plan audit 并创建新 generation；Service 存活时自动经 Service drain。PBWork 下次 connect 时按新 generation 清空本地生命周期缓存，不提供 Workbench 清空按钮；
- root/lock 被外部删除或替换时不会自动建目录。先停 Service；`workspace doctor repair` 只处理不改变 Evidence 身份的状态，root 整体丢失必须使用 `workspace reinitialize --confirm-destroyed <workspaceId>`，旧 Evidence 不可恢复；
- `capture run`、`handoff create`、`job cancel`、`deliver` 等写命令在 Local Service 可达时自动经 HTTP 写入（与 GUI 共用同一 writer）；不可达时回退到本地写锁；
- 可用 `--via-service` 强制走 Service，或 `--local-store` 强制本地写（需停掉占用 Store 的 Service）；
- `--json` 输出稳定 JSON；
- blocked、partial、cancelled、interrupted、failed 和 stale 使用不同退出码；
- 确认只允许流程继续，不修改 warning、risk 或 Evidence。

## Selection

`--selection` 接受 Core `SelectionDraft` JSON。可以用 `--manifest` 提供离线 Runtime manifest，否则 Preflight 从配置的 instrumented Runtime 读取 manifest。

PBWork 与 CLI 对同一规范化 Draft 必须生成相同 Case identity 和 Matrix。

推荐日常用：

```bash
# 非正式整原型诊断；目标路径来自 delivery.targetRoot
pnpm pb -- deliver \
  --prototype cold-chain-ops \
  --acknowledge-unofficial-capture

# 单页诊断：默认包含该页全部状态和场景，需要第二层确认
pnpm pb -- deliver \
  --prototype cold-chain-ops \
  --screen exception-queue \
  --acknowledge-unofficial-capture
```

PBWork 定稿与 CLI `deliver` 写入同一套 `.proto-bridge/deliveries/` 产物。CLI 结果不会出现在「定稿采集」页。

## 开发

```bash
pnpm --filter @proto-bridge/cli build
pnpm --filter @proto-bridge/cli test
```

完整使用路径见 [快速上手](../../docs/guides/getting-started.md)。
