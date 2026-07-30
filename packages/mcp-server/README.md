# @proto-bridge/mcp-server

ProtoBridge MCP server 为 AI coding agent 暴露页面重建、target inspect、example search 和 validation tools。

## V2 Store-backed Evidence Reader

V2 MCP 连接一个明确 Workspace Store，只接受逻辑 ID：

```bash
node packages/mcp-server/dist/index.js \
  --store-root /path/to/.proto-bridge/v2-store \
  --workspace pbwork-local
```

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

Snapshot、revision、Staleness Report 和 Handoff 读取均固定引用；缺失或
Workspace 不匹配时结构化失败，不回退 active/latest。Debug/Trace Blob
还要求显式 `allowDebug=true`。

V2 Target tools 与 Evidence 独立：

- `read_target_conventions`
- `find_target_examples`
- `validate_target_changes`

Consumer 应先读取 resource
`proto-bridge://guides/v2-handoff-consumer`，或使用 prompt
`consume_evidence_handoff`。目标仓库不需要 ProtoBridge 配置。

`sourceRoot` 和 `url` 不是共同必填项：有源码可传 `sourceRoot + route/vuePath`，有 URL 可直接 runtime capture，两者都有时会合并为 hybrid evidence。生成面向客户端的 plan 时通常需要 `targetRoot` 或 config 中的 `target.root`。

## 启动

发布包：

```bash
npx -y @proto-bridge/mcp-server
```

显式指定 config：

```bash
npx -y @proto-bridge/mcp-server --config /path/to/proto-bridge.config.json
```

本地构建：

```bash
node /path/to/proto-bridge/packages/mcp-server/dist/index.js \
  --config /path/to/proto-bridge.config.json
```

## Codex

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

显式指定 config：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = [
  "-y",
  "@proto-bridge/mcp-server",
  "--config",
  "/path/to/proto-bridge.config.json"
]
```

## Config

```json
{
  "schemaVersion": 1,
  "source": {
    "adapter": "vue3-prototype",
    "root": "/path/to/vue3-prototype"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/flutter-project"
  },
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

Tool arguments 会覆盖 config values。

配置文件只放稳定环境信息。每次通过 tool arguments 传 URL；配置了 `source.root` 时会从 URL 推导 route 并自动补 source semantics，配置了 `target.root` 时会生成 plan/review。

项目架构无需写进 config。Core 从 source / target 扫描项目事实，扫描不到时保持 `unknown`。

## Tools

- 上述 V2 Store-backed Evidence 与 Target tools；
- `reconstruct_page_context`：根据 source、URL、screenshot/OCR 和 target 输入生成页面上下文和实现产物。
- `read_target_conventions`：读取目标 Flutter modules、routes、themes、assets、components 和 conventions。
- `find_target_examples`：搜索相似目标文件和代码片段。
- `validate_ui_build`：通过共享 `ui.validate` capability 验证目标变更。

`reconstruct_page_context`、`validate_ui_build` 和 page resources 是阶段七
前保留的 V1 页面工作流，不是 V2 Evidence producer。

## Tool 调用示例

Source-only：

```json
{
  "name": "reconstruct_page_context",
  "arguments": {
    "sourceRoot": "/path/to/vue3-prototype",
    "route": "/prototype/asset/pnl-analysis",
    "targetRoot": "/path/to/flutter-project"
  }
}
```

Runtime-only：

```json
{
  "name": "reconstruct_page_context",
  "arguments": {
    "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
    "targetRoot": "/path/to/flutter-project",
    "capture": true
  }
}
```

## Agent 提示词示例

```text
请使用 ProtoBridge 的 reconstruct_page_context 处理这个页面，先阅读 ui-build-plan.json 的 targetConventions、implementationContract 和 visualPlan，再用 ui-build-review.md 做中文核对。实现时不要引入 targetConventions 没有证据支持的新 state/routing/i18n/theme 框架。完成后调用 validate_ui_build：
http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1
```

## 输出

```text
<output.root>/<page>-<timestamp>/
├── page-canonical.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
```

`ui-build-plan.json` 是唯一机器契约并包含 `canonicalReadPolicy`。实现 agent 必读 plan；`canonicalReadPolicy.required=true` 时还必须按 refs 读取 Canonical。`ui-build-review.md` 是从 plan 渲染的人类可读 brief。

完整用法见仓库根目录 `docs/usage.md`；产物字段见 `docs/artifacts.md`。
