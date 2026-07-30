# ProtoBridge 使用指南

## 安装与构建

```bash
pnpm install
pnpm build
```

## 启动 PBWork

```bash
pnpm pbwork
```

Local Service 默认只监听 loopback。可使用：

- `PB_SERVICE_PORT`
- `PB_STORE_ROOT`
- `PB_WORKSPACE_ID`
- `PB_MAX_CASES`
- `PBWORK_ORIGIN`
- `PBWORK_RUNTIME_ORIGIN`

session token 只经 `Authorization` header 传递。

## CLI

```bash
proto-bridge workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

proto-bridge workspace doctor
proto-bridge preflight --selection selection.json
proto-bridge capture run --selection selection.json
proto-bridge bundle list
```

配置文件为 `proto-bridge.json`。Selection、warning/risk 确认和命令完整列表见 [CLI README](../packages/cli/README.md)。

## MCP

```bash
proto-bridge-mcp \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

标准消费顺序：

1. `inspect_evidence_workspace`
2. `read_agent_handoff`
3. 原样报告全部 `mandatoryRiskReport`
4. 读取固定 Snapshot、Staleness Report 和具体 revision/Fragment
5. 读取目标仓库并实现
6. `validate_target_changes`

不得把 Handoff 固定引用替换为 active/latest。详见 [Consumer 指南](agent-handoff-consumer.md)。

## 验证

```bash
pnpm verify
```

可单独运行：

```bash
pnpm test
pnpm test:e2e:runtime
pnpm test:e2e:mcp
pnpm test:e2e:consumer
pnpm test:e2e:evidence-slice
```
