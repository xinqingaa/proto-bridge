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
```

默认配置是 `./proto-bridge.json`，默认 Store 是相对配置文件的 `.proto-bridge/store`。

## 命令

```text
proto-bridge workspace init [--config <file>]
proto-bridge workspace doctor [--json]
proto-bridge preflight --selection <file> [--manifest <file>]
proto-bridge capture run --selection <file> [--bundle <id>]
proto-bridge deliver (--selection <file> | --prototype <id> [--screen <id|slug>]) [--target <dir>]
proto-bridge deliver --bundle <id> --snapshot <id> [--ack-risk <kind>] [--target <dir>]
proto-bridge job status|cancel|retry --job <id>
proto-bridge bundle list|inspect|fork|archive|clean
proto-bridge snapshot|run|case inspect
proto-bridge stale check --bundle <id> --snapshot <id>
proto-bridge handoff create|show|export
proto-bridge service start
```

以 `proto-bridge --help` 和命令实现为精确参数权威。

## 确认与输出

- warning 使用可重复的 `--accept-warning <warningId>` 逐项确认；
- Handoff risk 使用可重复的 `--ack-risk <riskKind>` 逐项确认；
- 不提供 `--force`；
- `deliver` 一次完成采集、Handoff 与 `.proto-bridge/deliveries/*/agent-prompt.md`（收据只是 Store 索引；MCP 仍按 Handoff/Snapshot 读 Store）；
- `deliver` 默认选择指定范围内全部 authored Screens、Variants 和 Scenarios；使用 `--only-variant` / `--only-scenario`（需配合 `--screen`）缩小范围；
- `workspace doctor` 与 inspect/list/show 以只读方式打开 Store，可与 `pnpm pb:up` 并存；
- `capture run`、`handoff create`、`job cancel`、`deliver` 等写命令在 Local Service 可达时自动经 HTTP 写入（与 GUI 共用同一 writer）；不可达时回退到本地写锁；
- 可用 `--via-service` 强制走 Service，或 `--local-store` 强制本地写（需停掉占用 Store 的 Service）；
- `--json` 输出稳定 JSON；
- blocked、partial、cancelled、interrupted、failed 和 stale 使用不同退出码；
- 确认只允许流程继续，不修改 warning、risk 或 Evidence。

## Selection

`--selection` 接受 Core `SelectionDraft` JSON。可以用 `--manifest` 提供离线 Runtime manifest，否则 Preflight 从配置的 instrumented Runtime 读取 manifest。

PBWork 与 CLI 对同一规范化 Draft 必须生成相同 Case identity 和 Matrix。

仓库提供可直接执行的
`examples/selections/ledger-planet-task-list.json`。推荐日常用：

```bash
# 整个原型：全部页面、状态和场景
pnpm pb -- deliver \
  --prototype ledger-planet \
  --target apps/flutter_pb_app

# 单页：默认包含该页全部状态和场景
pnpm pb -- deliver \
  --prototype ledger-planet \
  --screen task-list \
  --target apps/flutter_pb_app
```

PBWork「交付到 Agent」与 CLI `deliver` 写入同一套 `.proto-bridge/deliveries/` 产物。

## 开发

```bash
pnpm --filter @proto-bridge/cli build
pnpm --filter @proto-bridge/cli test
```

完整使用路径见 [快速上手](../../docs/guides/getting-started.md)。
