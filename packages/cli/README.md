# @proto-bridge/cli

ProtoBridge CLI 是自动化 Evidence Producer 和 Workspace/Bundle 生命周期入口。它与 PBWork 共用 Core Selection、Preflight、Case Matrix、Capture、Store 和 Handoff。

## Workspace

```bash
proto-bridge workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

proto-bridge workspace doctor
```

默认配置是 `./proto-bridge.json`，默认 Store 是相对配置文件的 `.proto-bridge/store`。

## 命令

```text
proto-bridge workspace init [--config <file>]
proto-bridge workspace doctor [--json]
proto-bridge preflight --selection <file> [--manifest <file>]
proto-bridge capture run --selection <file> [--bundle <id>]
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
- `--json` 输出稳定 JSON；
- blocked、partial、cancelled、interrupted、failed 和 stale 使用不同退出码；
- 确认只允许流程继续，不修改 warning、risk 或 Evidence。

## Selection

`--selection` 接受 Core `SelectionDraft` JSON。可以用 `--manifest` 提供离线 Runtime manifest，否则 Preflight 从配置的 instrumented Runtime 读取 manifest。

PBWork 与 CLI 对同一规范化 Draft 必须生成相同 Case identity 和 Matrix。

## 开发

```bash
pnpm --filter @proto-bridge/cli build
pnpm --filter @proto-bridge/cli test
```

完整使用路径见 [快速上手](../../docs/guides/getting-started.md)。
