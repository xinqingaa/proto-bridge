# @proto-bridge/cli

CLI 是 ProtoBridge Evidence Producer 和 Workspace/Bundle 生命周期入口，与 PBWork 共用 Core Selection、Preflight、Case Matrix、Capture 和 Store。

## Workspace

```bash
proto-bridge workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

proto-bridge workspace doctor
```

默认配置文件为 `proto-bridge.json`，默认 Store 为 `.proto-bridge/store`。

## 主要命令

```text
proto-bridge preflight --selection <file> [--manifest <file>]
proto-bridge capture run --selection <file> [--bundle <id>]
proto-bridge job status|cancel|retry --job <id>
proto-bridge bundle list|inspect|fork|archive|clean
proto-bridge snapshot|run|case inspect
proto-bridge stale check --bundle <id> --snapshot <id>
proto-bridge handoff create|show|export
proto-bridge service start
```

规则：

- warning 使用可重复的 `--accept-warning <id>` 逐项确认；
- Handoff risk 使用可重复的 `--ack-risk <kind>` 逐项确认；
- 不提供 `--force`；
- `--json` 输出稳定 JSON，并使用不同退出码区分 blocked、partial、cancelled 和 interrupted。

```bash
pnpm --filter @proto-bridge/cli build
pnpm --filter @proto-bridge/cli test
```
