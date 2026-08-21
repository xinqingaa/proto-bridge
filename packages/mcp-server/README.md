# @proto-bridge/mcp-server

ProtoBridge MCP 是 Coding Agent 读取持久 Evidence 的正式边界。它只接受逻辑 Workspace/Object ID，不暴露或猜测 Store 布局。

## 启动

```bash
proto-bridge-mcp \
  --store-root .proto-bridge/store \
  --workspace pbwork-local \
  --target-root /absolute/path/to/flutter_app
```

也可使用 `PB_STORE_ROOT`、`PB_WORKSPACE_ID` 与 `PB_DELIVERY_TARGET_ROOT`。本仓库 wrapper 从 `proto-bridge.json` 解析 Store、Workspace 和 `delivery.targetRoot`：

```bash
pnpm pb:mcp
pnpm pb:mcp -- --print-config
```

第二个命令只打印 Cursor/Codex 可使用的 stdio 配置材料，不启动 server。成功的 `tools/call` 对声明了 `outputSchema` 的工具同时返回 JSON 文本 `content` 与等价的 `structuredContent`。

## Evidence Tools

默认消费路径：

- `inspect_evidence_workspace`
- `read_handoff_index`
- `read_screen_packet`
- `read_evidence_screenshot`
- `read_case_delta`
- `read_evidence_detail`
- `read_reconstruction_obligations`
- `summarize_reconstruction_review`

诊断工具 `read_implementation_plan` / `read_implementation_tranche` 不属于默认实施路径，不得按 tranche 顺序编码。

`read_screen_packet` 返回 baseline Structure、`canonicalBrief` 与按 `regionId`/`caseId` 聚合的 inventory。`read_case_delta` 返回紧凑语义 patch；完整 provenance 必须定向读取。`read_reconstruction_obligations` 按 Screen/维度分页，用于实施后五维复查。`summarize_reconstruction_review` 只形成 consumer-reported summary，不冒充独立 Runtime 或视觉验收。

普通 JSON 响应没有按字节截断规则；detail/obligation continuation 绑定固定 Snapshot 和规范化查询。整包 Snapshot、Case、revision、Catalog 和 Acceptance Contract 等旧入口不在 MCP 表面。

## Target Tools

- `read_target_conventions`
- `resolve_target_components`
- `resolve_target_tokens`
- `inspect_target_readiness`
- `find_target_examples`
- `validate_target_changes`

`inspect_evidence_workspace` 返回绑定的 `deliveryTargetRoot`。Target 工具的 `targetRoot` 可省略，省略时使用该绑定路径；显式传入仍覆盖。禁止回落到 `process.cwd()`。缺绑定且工具未传路径时，错误会提示使用 `pnpm pb:mcp` 或 `--target-root`。

这些工具通过公共 Target 门面只读访问目标工程；当前内置实现为 Flutter adapter。真实目标文档与公开代码优先，可选机器 Contract 不能覆盖政策；显式 mapping 通过当前代码验证才返回 `resolved`，启发式结果最多为 `candidate`。

`inspect_target_readiness` 汇总 resolver coverage、machine authority 和 blockers。缺少 Structure/State/Interaction machine authority 表示对应维度需要结合固定 Evidence、目标代码和实际测试判断，不要求向目标工程加入 Runtime Harness。`validate_target_changes` 复核变更路径、预期文件和实际采用的 resolved mapping。Target 结果不写入 Evidence。

## 保留的实验实现

仓库保留 L1/L2/L3 Review、claim verifier、Flutter MCP render/replay/compare 和 Review event log 实现，但默认 registry 不注册这些 Tools，默认 capability 也不声明 `target-review-authoritative`。它们不属于当前 Agent 消费 Contract。

保留代码、已知协议问题、实验测试和重新启用条件见 [Flutter MCP Roadmap](../../docs/roadmap/flutter-mcp-target-review.md)。不得通过猜测工具名或直接调用 Local Service 内部 endpoint 绕过默认 MCP 表面。

## Resources 与 Prompt

- `proto-bridge://guides/handoff-consumer`
- `proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}/screenshots/{blobId}`
- Prompt：`consume_evidence_handoff`

省略 `targetRoot` 时 Prompt 填入 MCP 绑定的 `delivery.targetRoot`。

默认顺序是 `inspect → handoff index → Screen packet → Screenshot → readiness/resolver → 按需 Case delta/detail → 实施计划确认 → 实施 → 目标验证 → 五维 obligations/summary`。协作关系与完成判据见 [Agent 消费指南](../../docs/guides/agent-consumption.md)。

## 开发

```bash
pnpm --filter @proto-bridge/mcp-server build
pnpm test:e2e:mcp
pnpm test:e2e:consumer
```
