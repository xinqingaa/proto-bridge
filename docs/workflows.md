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
| Source + URL + target | source、runtime、target、merge、plan、review | 同时利用 source intent 和 runtime facts，推荐用于完整重建。 |
| Screenshot/OCR + target | `screenshot.attach`、`target.inspect`、`page.merge`、`ui.plan`、`ui.review` | 补充视觉和文字证据，不具备 DOM 级 runtime evidence。 |
| 已实现 target diff | `ui.validate` | 检查 changed files、placeholder、hard-coded style risks、expected files、architecture contract violations 和 plan hints。 |

不要为了运行 ProtoBridge 强行要求用户同时提供 source 和 URL。二者是可组合证据源，不是共同必填项。

## 证据如何进入契约

`ui-build-plan.json` 是实现蓝图。它不是简单把 DOM section 翻译成 Flutter 文件，而是把证据按职责拆开：

| 证据 | 落点 | 说明 |
| --- | --- | --- |
| Source semantics | `implementationContract.sourceSemantics` | 业务区块、状态意图、Widget contract、交互/生命周期意图、禁止直译项。 |
| Target conventions | `targetConventions.architectureProfile` | state、routing、i18n、theme、components、file organization 的目标工程证据。 |
| Runtime/screenshot facts | `visualPlan` | viewport、section、bbox、layout evidence、screenshot refs、nodeAudits、dynamicTextHints。 |
| Restoration profile | `restorationProfile`、`themeMappings`、`componentMappings`、source semantics 增强 | 项目增强候选、模块别名、业务词表和 token 映射；不替代 target 扫描证据。 |
| Token/component evidence | `themeMappings`、`componentMappings` | 主题 token、字体锁定、组件复用候选。 |
| Validation expectations | `implementationContract.fileTree`、`validationHints` | 预期文件、架构规则和实现后校验提示。 |

冲突时遵循：source semantics 负责逻辑架构，target conventions 负责工程表达，runtime/screenshot 负责视觉事实。restoration profile 只提供增强候选，target architecture profile unknown 时保留抽象建议并输出 warnings/manual questions，不猜测具体框架。

重复 UI 单元和动态值是实现偏差高发区。planner 会把 canonical 中的节点级视觉事实提升到 `visualPlan.nodeAudits`，把列表数量、金额、百分比、日期、数量标签等提升到 `visualPlan.dynamicTextHints` 并同步到 `i18nPlan.texts[*].dynamic`。实现阶段应直接消费这些 plan 字段；只有需要追溯 provenance、解决冲突或补查未提升字段时，才回到 `page-canonical.json` 和 `page-debug-index.json`。

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

预期产物包含 `screenshots/full-page.png`。如果没有 source facts，`implementationContract` 会使用视觉证据 fallback，并在 warnings/manual questions 中标出语义不足。

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

Hybrid 输出会在 `page-canonical.json` 中记录 field priority、provenance 和 mismatches。它通常是实现前最完整的输入组合。

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
- 基于 `targetConventions` 和 `implementationContract` 的架构契约偏离，例如引入未被 target architecture profile 证明的新 state/routing/i18n/theme 模式、缺失预期文件，或生成 runtime DOM section 风格文件。
- 子 Widget 是否违反 `widgetContracts`，例如不该读取整页状态却直接依赖 controller/cubit/provider。

如果 target architecture profile 是 `unknown`，validation 应输出 warnings/manual questions，不应把未知模式当成硬错误。

## Agent 实现流程

1. 调用 `reconstruct_page_context`。
2. 阅读 `ui-build-plan.json`，获取实现蓝图，重点看 `targetConventions`、`implementationContract`、`sourceSemantics`、`visualPlan.nodeAudits`、`visualPlan.dynamicTextHints`、mappings、risks 和 validation hints。
3. 阅读 `ui-build-review.md`，用中文审查视图快速核对 contract、视觉计划、字体锁定和风险。
4. target pattern 不明确时调用 `read_target_conventions` 或 `find_target_examples`。
5. 在 target Flutter repository 中实现。
6. 运行目标应用的 format、static analysis 和 tests。
7. 调用 `validate_ui_build`。
8. 汇报 changed files、validation status、warnings 和 manual confirmations。

实现时优先遵守 `ui-build-plan.json` 的结构化约束。`implementationContract.fileTree/widgetTree/widgetContracts` 决定工程拆分，`visualPlan` 和 mappings 决定可见布局与样式证据。Typography mapping 如果带 `lockToken=true`，说明 source token 和 target text style token 已 exact 对齐，不要再手动覆盖字号、行高、字重或字体族。

不要只看 `visualPlan.sections` 就实现重复卡片或列表项。`sections` 用于页面区域定位，`nodeAudits` 才是重复项、控件和关键行结构的还原契约。`dynamicTextHints` 和 `i18nPlan.texts[*].dynamic` 用于区分稳定翻译文案和模型派生值，避免把数量、价格、日期、百分比等写死到翻译 key 或 mock 文案中。

不要引入 `targetConventions` 没有证据支持的新 state、routing、i18n 或 theme 框架。GetX、flutter_bloc、Riverpod、Provider、Navigator、go_router、context.t、AppLocalizations、themeService、context.pbColors、CommonAppBar 等可以由 restoration profile 纳入候选，但仍只能作为 target 扫描结果影响高置信实现；扫不到时保留抽象建议并记录待确认问题。

## 排查视觉问题

按下面链路定位 mismatch 进入 pipeline 的位置：

```text
screenshot region or text anchor
  -> page-debug-index section
  -> page-canonical node ids and style facts
  -> ui-build-plan visualPlan/theme/component/widget mappings
  -> implementationContract widget tree
  -> target Flutter implementation
  -> validation result
```

常见原因：

- capture 或 evidence 没有观察到对应状态。
- plan 对 evidence 压缩或 mapping 过粗。
- target component defaults 改变了视觉结果。
- implementation 没有按 evidence 或 plan 落地。
