# @proto-bridge/mcp-server

MCP 是 Coding Agent 读取持久 Evidence 的正式边界。它只接受逻辑 Workspace/Object ID，不暴露或猜测 Store 目录。

```bash
proto-bridge-mcp \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

也可使用 `PB_STORE_ROOT` 与 `PB_WORKSPACE_ID`。

Evidence tools：

- `inspect_evidence_workspace`
- `list_evidence_bundles`
- `list_evidence_history`
- `read_evidence_snapshot`
- `read_evidence_case`
- `read_evidence_run`
- `read_evidence_revision`
- `read_evidence_fragment`
- `read_evidence_catalog`
- `read_evidence_issue`
- `read_evidence_staleness`
- `read_agent_handoff`
- `read_evidence_blob`

Target tools：

- `read_target_conventions`
- `find_target_examples`
- `validate_target_changes`

Target 工具只读目标仓库，不读取或写入 Evidence。Consumer 应先读取 `proto-bridge://guides/handoff-consumer`，并始终使用 Handoff 固定的 Snapshot/revision。

```bash
pnpm --filter @proto-bridge/mcp-server build
pnpm test:e2e:mcp
pnpm test:e2e:consumer
```
