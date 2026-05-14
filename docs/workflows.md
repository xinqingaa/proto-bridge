# 工作流

ProtoBridge 根据输入选择 capabilities。`source` 和 `URL` 都不是绝对必填：有源码就分析源码，有 URL 就采集运行态，两者都有就合并；只有截图/OCR 时也可以作为补证输入。通常会提供 target repository，因为 planning、组件复用、theme/i18n/assets 和 validation 都需要目标工程规范。

```text
input
  -> source.analyze / runtime.capture / screenshot.attach / target.inspect
  -> page.merge
  -> ui.plan
  -> ui.review
  -> implementation
  -> ui.validate
```

## 输入选择

| 可用输入 | 调用能力 | 输出特点 |
| --- | --- | --- |
| Source + target | `source.analyze`、`target.inspect`、`page.merge`、`ui.plan`、`ui.review` | 语义和实现规划较强，没有截图证据。 |
| URL + target | `runtime.capture`、`target.inspect`、`page.merge`、`ui.plan`、`ui.review` | 当前视觉和运行时证据较强，source intent 较少。 |
| Source + URL + target | source、runtime、target、merge、plan、review | 同时利用 source intent 和 runtime facts。 |
| Screenshot/OCR + target | `screenshot.attach`、`target.inspect`、`page.merge`、`ui.plan`、`ui.review` | 补充视觉和文字证据，不具备 DOM 级 runtime evidence。 |
| 已实现 target diff | `ui.validate` | 检查 changed files、placeholder、hard-coded style risks、expected files 和 plan hints。 |

## 如何选择工作流

```text
有 source.root + route/vue?
  -> 可以跑 source-only

有 url?
  -> 可以跑 runtime-only

source 和 url 都有?
  -> 跑 hybrid，优先用于完整 UI 重建

只有 screenshot/OCR?
  -> 跑 screenshot/OCR 补证，适合辅助 review

已经实现 target 代码?
  -> 跑 validation
```

不要为了运行 ProtoBridge 强行要求用户同时提供 source 和 URL。二者是可组合证据源，不是共同必填项。

## Source-only 工作流

适合有 prototype source，且希望获取结构、状态、交互、i18n、assets 和 style intent，而不打开浏览器的场景。

需要：

- `source.root`
- `target.root`
- `route` 或 `vue`

不需要：

- `url`
- runtime dev server

CLI：

```bash
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
```

MCP arguments：

```json
{
  "route": "/prototype/asset/pnl-analysis"
}
```

显式传路径：

```json
{
  "sourceRoot": "/Users/name/work/TradeAppPrd",
  "route": "/prototype/asset/pnl-analysis",
  "targetRoot": "/Users/name/work/youfi"
}
```

预期产物：

```text
page-canonical.json
page-debug-index.json
ui-build-plan.json
ui-build-review.md
```

## Runtime-only 工作流

适合有运行中的 prototype URL，需要当前可见 DOM、computed style、bbox、assets、interactions 和 screenshots 的场景。

需要：

- `target.root`
- `url`

不需要：

- `source.root`
- `route`

CLI：

```bash
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

MCP arguments：

```json
{
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true
}
```

预期产物包含 `screenshots/full-page.png`。

## Hybrid 工作流

适合 source 和 runtime 都可用的场景。Source 提供结构和意图，runtime 提供当前真实渲染状态。

需要：

- `source.root`
- `target.root`
- `route` 或 `vue`
- `url`
- 可访问的 runtime dev server

CLI：

```bash
npx @proto-bridge/cli generate \
  --route /prototype/asset/pnl-analysis \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

MCP arguments：

```json
{
  "sourceRoot": "/Users/name/work/TradeAppPrd",
  "route": "/prototype/asset/pnl-analysis",
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "targetRoot": "/Users/name/work/youfi",
  "capture": true
}
```

Hybrid 输出会在 `page-canonical.json` 中记录 field priority、provenance 和 mismatches。

## Screenshot / OCR 工作流

适合没有运行中 URL，但有外部视觉证据；或 DOM 证据之外还需要 OCR 文字补证的场景。

MCP arguments：

```json
{
  "screenshotPath": "/Users/name/Desktop/page.png",
  "ocrText": ["Account Detail", "P/L Analysis", "+$12,240.52"],
  "targetRoot": "/Users/name/work/youfi"
}
```

Screenshot/OCR evidence 是补充证据。它能增强视觉 review 和文字 fallback，但不会变成完整 DOM 或 source model。

## Validation 工作流

Validation 用于实现后检查 target changes。

MCP arguments：

```json
{
  "pageId": "page-pnl-analysis-20260514T05343",
  "targetRoot": "/Users/name/work/youfi"
}
```

显式传 allowed paths：

```json
{
  "targetRoot": "/Users/name/work/youfi",
  "allowedPaths": [
    "lib/app/modules/asset",
    "lib/app/routes"
  ]
}
```

Validation 会报告：

- 来自 git diff、staged changes 和 untracked files 的 changed files。
- 是否存在 outside allowed paths 的文件。
- plan 预期但缺失的 files。
- changed Dart files 中的 placeholder text、TODO markers、hard-coded colors、hard-coded font sizes、local shadows、network images 和 navigation risk markers。
- 传入 `pageId` 时来自 `ui-build-plan.json` 的 validation hints。

## Agent 实现流程

1. 调用 `reconstruct_page_context`。
2. 阅读 `ui-build-review.md`，获取人类可读实现交接。
3. 阅读 `ui-build-plan.json`，获取 file tree、widget tree、mappings、assets、i18n、interactions、risks 和 validation hints。
4. target pattern 不明确时调用 `read_target_conventions` 或 `find_target_examples`。
5. 在 target Flutter repository 中实现。
6. 运行目标应用的 format、static analysis 和 tests。
7. 调用 `validate_ui_build`。
8. 汇报 changed files、validation status、warnings 和 manual confirmations。

## 排查视觉问题

按下面链路定位 mismatch 进入 pipeline 的位置：

```text
screenshot region or text anchor
  -> page-debug-index section
  -> page-canonical node ids and style facts
  -> ui-build-plan theme/component/widget mappings
  -> target Flutter implementation
  -> validation result
```

常见原因：

- capture 或 evidence 没有观察到对应状态。
- plan 对 evidence 压缩或 mapping 过粗。
- target component defaults 改变了视觉结果。
- implementation 没有按 evidence 或 plan 落地。
