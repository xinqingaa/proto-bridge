# @proto-bridge/mcp-server

ProtoBridge MCP 是 Coding Agent 读取持久 Evidence 的正式边界。它只接受逻辑 Workspace/Object ID，不暴露或猜测 Store 布局。

## 启动

```bash
proto-bridge-mcp \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

也可使用 `PB_STORE_ROOT` 与 `PB_WORKSPACE_ID`。

在本仓库中可以让 wrapper 从 `proto-bridge.json` 自动解析两者：

```bash
pnpm pb:mcp
pnpm pb:mcp -- --print-config
```

第二个命令只打印 Cursor/Codex 可使用的 stdio 配置材料，不启动 server。

成功的 `tools/call` 对声明了 `outputSchema` 的工具会同时返回：

- `content`：JSON 文本（兼容只读 `content` 的客户端）；
- `structuredContent`：同一对象（Cursor 等严格客户端要求）。

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
- `read_evidence_screenshot`（视觉消费必须使用；返回 MCP ImageContent，不返回 base64 文本）
- `read_acceptance_contract`（非评分的五维实施与复查指引）
- `summarize_reconstruction_review`（汇总 Case/Screenshot/Scenario 覆盖和披露项，不计算分数）

## Target Tools

- `read_target_conventions`
- `find_target_examples`
- `validate_target_changes`

这些工具通过 Target adapter 访问目标工程；当前内置 Flutter adapter，其他目标会返回 unsupported/unresolved。主 Evidence 消费链路不要求 Flutter；Target Tools 只读目标仓库，不读取或写入 Evidence。

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
