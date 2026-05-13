# MCP UI Reconstruction Workflow

MCP 当前只暴露 capability-first 主工具 `reconstruct_page_context`。旧的 URL-first 分步工具已从公开 tools 中移除。

## 1. 主流程

```text
reconstruct_page_context
  -> source.analyze        # 有 sourceRoot/route/vuePath 时
  -> runtime.capture       # 有 url 且 capture=true 时
  -> screenshot.attach     # 有 screenshotPath/ocrText/ocrBoxes 时
  -> target.inspect
  -> page.merge
  -> ui.plan
  -> ui.review
```

输出：

```text
page-canonical.json
page-debug-index.json
ui-build-plan.json
ui-build-review.md
screenshots/full-page.png
```

## 2. MCP Tool 输入

最小 URL-only：

```json
{
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true
}
```

有源码：

```json
{
  "sourceRoot": "/path/to/TradeAppPrd",
  "route": "/prototype/asset/pnl-analysis"
}
```

Hybrid：

```json
{
  "sourceRoot": "/path/to/TradeAppPrd",
  "route": "/prototype/asset/pnl-analysis",
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true
}
```

如果 `proto-bridge.config.json` 已提供 `source.root`、`target.root`、`outputRoot`，tool 调用可只传页面身份和本次覆盖项。

## 3. Resources

MCP 产物可通过 resources 读取：

- `proto-bridge://artifacts/latest`
- `proto-bridge://pages/{pageId}/page-canonical`
- `proto-bridge://pages/{pageId}/page-debug-index`
- `proto-bridge://pages/{pageId}/screenshot/{name}`
- `proto-bridge://pages/{pageId}/ui-build-plan`
- `proto-bridge://pages/{pageId}/ui-build-review`

## 4. Debug Chain

视觉问题按固定链路排查：

```text
screenshot region
  -> section
  -> node ids
  -> node style facts
  -> theme/component mappings
  -> widget tree
  -> target implementation
```

归因标签：

- A. capture/evidence 缺失
- B. plan 压缩或映射歧义
- C. target component 默认样式带偏
- D. Flutter 实现问题

## 5. Agent 流程

1. 调用 `reconstruct_page_context`。
2. 读取 `ui-build-review.md` 和 `ui-build-plan.json`。
3. 必要时调用 `read_target_conventions` / `find_target_examples`。
4. 修改目标 Flutter 代码。
5. 运行 format/analyze/test。
6. 调用 `validate_ui_build`。

## 6. Removed Tools

旧 URL-first 分步工具不再公开。对应能力统一通过 `reconstruct_page_context` 的输入和 core capabilities 完成。
