# @proto-bridge/mcp-server

ProtoBridge MCP server 为 AI coding agent 暴露页面重建、target inspect、example search 和 validation tools。

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
  "source": {
    "adapter": "vue3-prototype",
    "root": "/path/to/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/youfi"
  },
  "outputRoot": "./output",
  "capture": false
}
```

Tool arguments 会覆盖 config values。

Runtime-only 场景可以只在 config 中提供 `target.root`，tool 调用时传 `url` 和 `capture=true`。

## Tools

- `reconstruct_page_context`：根据 source、URL、screenshot/OCR 和 target 输入生成页面上下文和实现产物。
- `read_target_conventions`：读取目标 Flutter modules、routes、themes、assets、components 和 conventions。
- `find_target_examples`：搜索相似目标文件和代码片段。
- `validate_ui_build`：通过共享 `ui.validate` capability 验证目标变更。

## Tool 调用示例

Source-only：

```json
{
  "name": "reconstruct_page_context",
  "arguments": {
    "sourceRoot": "/path/to/TradeAppPrd",
    "route": "/prototype/asset/pnl-analysis",
    "targetRoot": "/path/to/youfi"
  }
}
```

Runtime-only：

```json
{
  "name": "reconstruct_page_context",
  "arguments": {
    "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
    "targetRoot": "/path/to/youfi",
    "capture": true
  }
}
```

## Agent 提示词示例

```text
请使用 ProtoBridge 的 reconstruct_page_context 处理这个页面，阅读 ui-build-review.md 和 ui-build-plan.json，在目标 Flutter 应用中实现 UI，然后调用 validate_ui_build：
http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1
```

## 输出

```text
<outputRoot>/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
```
