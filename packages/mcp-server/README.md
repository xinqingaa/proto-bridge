# @proto-bridge/mcp-server

ProtoBridge MCP 是 Coding Agent 读取持久 Evidence 的正式边界。它只接受逻辑 Workspace/Object ID，不暴露或猜测 Store 布局。

## 启动

```bash
proto-bridge-mcp \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

也可使用 `PB_STORE_ROOT` 与 `PB_WORKSPACE_ID`。

## Evidence Tools

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

## Target Tools

- `read_target_conventions`
- `find_target_examples`
- `validate_target_changes`

Target Tools 只读目标仓库，不读取或写入 Evidence。

## Resources 与 Prompt

- `proto-bridge://guides/handoff-consumer`
- `proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}`
- `proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}/screenshots/{blobId}`
- Prompt：`consume_evidence_handoff`

Consumer 先确认 Workspace 并读取 Handoff，随后只读取 Handoff 固定的 Snapshot/revision。详细顺序见 [Agent 消费指南](../../docs/guides/agent-consumption.md)。

## 开发

```bash
pnpm --filter @proto-bridge/mcp-server build
pnpm test:e2e:mcp
pnpm test:e2e:consumer
```
