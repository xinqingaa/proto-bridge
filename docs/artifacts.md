# 产物说明

ProtoBridge 写出页面级 artifact set。不同文件面向不同读者：机器、agent、人类和调试流程。

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
├── migration-spec.md
└── screenshots/
    └── full-page.png
```

## page-canonical.json

Canonical artifact 是完整页面上下文。需要查看 provenance、merge decisions、trace、warnings 或原始 facts 时，应读这个文件。

重要字段：

- `schemaVersion`：canonical schema version。
- `pageId`：用于 resources 和 validation 的稳定页面 ID。
- `page`：标准化页面身份和 viewport。
- `sourceFacts`：有 source input 时的 source analysis facts。
- `runtimeFacts`：runtime capture 产生的 rendered page evidence。
- `screenshotFacts`：附加 screenshot/OCR evidence。
- `targetFacts`：target repository conventions。
- `fieldPriority`：说明不同字段类型优先采用哪类证据。
- `merge`：merge strategy、selected capabilities 和 trace reference。
- `mismatches`：source/runtime/screenshot/target conflicts。
- `manualConfirmations`：需要人工确认的问题。
- `nodes`：标准化 visual/runtime nodes。
- `sections`：用于 planning 和 debug lookup 的视觉区块。
- `screenshots`：截图引用。
- `artifacts`：相关 projection artifacts 引用。
- `orchestrationTrace`：capability selected/skipped/completed trace。

适合场景：

- 生成的 plan 看起来不对。
- source 和 runtime 不一致。
- agent 需要用精确证据支撑实现判断。
- 视觉 mismatch 需要追到具体 node、section 或 style。

## page-debug-index.json

Debug index 是紧凑查找文件，避免人或 agent 为了常见视觉问题通读大型 canonical JSON。

可能包含：

- section index：bbox、role、title、key nodes、text anchors。
- critical nodes：text、bbox、关键 style、assets、interactions、section membership。
- token 和 mapping summaries。
- background、tab states、component background risks、color tracing、scroll coverage 和 compression diagnostics。
- risk pointers：指向 canonical nodes、sections、mappings 或 tokens。

适合场景：

- 已有 screenshot region 或 text anchor，需要找到相关 evidence。
- 需要判断 mismatch 来自 capture、planning、target component defaults 还是 implementation。
- 需要从视觉问题跳到 `page-canonical.json` 或 `ui-build-plan.json`。

## ui-build-plan.json

UI build plan 是唯一机器契约。它不把 runtime section 当作架构来源，而是把三类职责分开：

| 区域 | 职责 |
| --- | --- |
| `targetConventions` | 当前 target repo 扫描出的工程表达，包括 state、routing、i18n、theme、components 和 file organization。字段形状固定，字段值必须来自证据；扫不到就保持 `unknown` 或空集合。 |
| `implementationContract` | 实现契约。承接 source-aware 的业务区块、状态意图、Widget contract 和禁止直译建议，再按 target conventions 归一。 |
| `visualPlan` | runtime/screenshot 视觉事实，包括 viewport、section 顺序、bbox、layout evidence 和 screenshot references。它用于视觉还原，不反向决定文件拆分或状态架构。 |

常用字段：

- `implementationContract.fileTree`：预期目标文件和职责。
- `implementationContract.widgetTree`：建议 Widget 拆分。
- `implementationContract.sourceSemantics`：source semantics，包括业务区块、状态意图、路由/生命周期/交互意图和禁止直译项。
- `implementationContract.stateStrategy`、`controllerBoundaries`、`widgetContracts`：状态、边界和子 Widget 合约。
- `implementationContract.targetBindings`：抽象角色绑定到 target profile 的证据引用。
- `implementationContract.contractWarnings`：target conventions 不明确或 source/target 冲突时的警告。
- top-level `fileTree` / `widgetTree`：兼容旧消费者，镜像 `implementationContract.fileTree/widgetTree`。
- `componentMappings`：target component 复用候选和 confidence。
- `themeMappings`：color、typography、spacing、radius、border、shadow 和 token candidates。
  Typography exact mapping 可能包含 `sourceSelector`、`sourceMixin`、`lockToken` 和 `doNotOverride`。当 `lockToken=true` 时，生成 Flutter 必须直接使用扫描或映射得到的 target text style token，不得额外覆盖 `fontSize`、`height`、`fontWeight` 或 `fontFamily`，除非 plan 明确列出来源 CSS 覆盖证据。
- `i18nPlan`：文案抽取和 translation-key 建议。
- `assetPlan`：asset evidence 和 target 建议。
- `interactionPlan`：tap、tab、input、navigation、modal 和 confirmation needs。
- `businessQuestions`：证据无法证明的业务问题。
- `risks`：实现风险。
- `validationHints`：实现后验证提示。

`targetConventions` 不是默认偏好表。GetX、flutter_bloc、Riverpod、Provider、Navigator、go_router、context.t、AppLocalizations、themeService、context.pbColors、CommonAppBar 等只能作为 target 扫描证据出现。没有证据时，contract 应保留抽象建议并输出 warnings/manual questions。

适合场景：

- AI agent 实现。
- 检查精确 target file expectations。
- 生成或 review widget tree。
- 验证 implementation 是否遵循 plan。

## ui-build-review.md

Review 文档是从 `ui-build-plan.json` 渲染的人类可读 brief，不拼接 `migration-spec.md` 或 sourceReview，也不拥有独立裁判权。

它会总结：

- 契约权威和冲突解决规则。
- target architecture profile 的简明结果。
- implementation contract：文件、Widget 与契约、业务区块、状态意图、路由/生命周期/交互意图。
- visual plan：section evidence、theme/component mappings、截图引用。
- i18n、interactions、manual questions、risks 和 validation hints。
- 锁定的 theme token 约束，例如 typography mixin 到 target text style token 的 exact mapping。

人类 review 时适合先看这个文件；coding agent 实现时仍以 `ui-build-plan.json` 为机器契约。

## screenshots/

Runtime capture 运行时会产生 screenshots。默认视觉证据是 `full-page.png`。

Screenshots 适合：

- visual review。
- OCR fallback。
- expected 和 actual UI 对比。
- 视觉 mismatch investigation 的锚点。

Screenshots 不替代 source 或 runtime facts。它们是视觉证据，不是 DOM 或业务逻辑模型。

## validation result 验证结果

Validation result 由 `validate_ui_build` 或直接调用 `ui.validate` capability 返回。

它会报告：

- `targetRoot`
- `changedFiles`
- `allowedPaths`
- `outsideAllowedPaths`
- `fileIssues`
- `expectedFiles`
- `missingExpectedFiles`
- `validationHints`
- `status`
- `capability`
- `warnings`

Validation 能发现常见实现风险，但不能覆盖所有视觉或业务错误。即使 validation 结果干净，仍应结合人工或 agent review 处理 unresolved confirmations。

Validation 的架构检查基于 `ui-build-plan.json` 动态执行，不硬编码禁用某个状态或路由框架。它会检查是否引入 target profile 没有证据支持的新 state/routing/i18n/theme 模式、是否偏离高置信度识别出的主模式、是否缺失 contract 预期文件，以及是否生成 runtime DOM section 风格文件导致 architecture drift。target profile unknown 时应输出 warnings 或 manual questions，而不是硬错误。

## migration-spec.md

`migration-spec.md` 在同时具备 source 和 target facts 时默认输出。传入 `sourceBrief=false` 可关闭。

它是兼容/过渡产物，不再是最终机器契约，也不和 `ui-build-review.md` 共同拼成“大合订本”。真正有价值的 source semantics 已进入 `implementationContract.sourceSemantics`，并由 `ui-build-review.md` 展示。若 `migration-spec.md` 与 `ui-build-plan.json` 冲突，以 `targetConventions` 和 `implementationContract` 为准。
