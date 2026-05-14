# 产物说明

ProtoBridge 写出页面级 artifact set。不同文件面向不同读者：机器、agent、人类和调试流程。

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
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

UI build plan 是机器可读 target implementation guidance。

重要部分：

- `target`：推断 module、target files、routes、translations、assets、warnings。
- `fileTree`：预期目标文件和职责。
- `widgetTree`：建议 Widget 拆分。
- `componentMappings`：target component 复用候选和 confidence。
- `themeMappings`：color、typography、spacing、radius、border、shadow 和 token candidates。
- `i18nPlan`：文案抽取和 translation-key 建议。
- `assetPlan`：asset evidence 和 target 建议。
- `interactionPlan`：tap、tab、input、navigation、modal 和 confirmation needs。
- `businessQuestions`：证据无法证明的业务问题。
- `risks`：实现风险。
- `validationHints`：实现后验证提示。

适合场景：

- AI agent 实现。
- 检查精确 target file expectations。
- 生成或 review widget tree。
- 验证 implementation 是否遵循 plan。

## ui-build-review.md

Review 文档是主要人类可读交接材料。

它会总结：

- capability context。
- field priority 和 manual confirmations。
- 有 source 时的 source-aware implementation guidance。
- page metadata。
- migration/implementation conclusion。
- target files 和 widgets。
- state、lifecycle、interactions、route、layout、theme、i18n、assets、reusable components。
- business questions、risks、evidence sources 和 validation hints。

人类或 coding agent 开始实现时，优先读这个文件。

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

## 可选 migration-spec.md

`migration-spec.md` 只会在传入 `--source-brief` 或 `sourceBrief=true` 时输出。

它可作为 source-heavy migration 的额外实现质量参考。主交接文档仍然是 `ui-build-review.md`。
