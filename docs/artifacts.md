# 产物说明

ProtoBridge 的产物围绕一个目标组织：让实现前的证据、实现中的架构决策和实现后的验证都指向同一份契约。

默认输出：

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
    └── full-page.png
```

Source-aware 语义统一写入 `ui-build-plan.json#/implementationContract/sourceSemantics`，并由 `ui-build-review.md` 展示。

## 权威关系

| 产物 | 读者 | 权威范围 |
| --- | --- | --- |
| `page-canonical.json` | 调试者、工具 | 完整事实池：source/runtime/screenshot/target facts、provenance、mismatches、trace。 |
| `page-debug-index.json` | 调试者、agent | 紧凑索引：section、node、style、mapping 和 risk pointers。 |
| `ui-build-plan.json` | agent、validator、开发者 | 唯一机器契约：工程表达、实现契约和视觉事实。 |
| `ui-build-review.md` | 人类 reviewer、开发者 | 从 plan 渲染的中文审查视图。 |
| `screenshots/` | 人类、视觉排查 | runtime capture 的视觉对照。 |

## page-canonical.json

Canonical artifact 是完整页面上下文。它回答“证据从哪里来、如何合并、哪里冲突”。

常用字段：

- `sourceFacts`：source adapter 提取的页面身份、语义结构、状态、交互、style intent。
- `runtimeFacts`：浏览器采集到的可见 DOM、bbox、computed style、assets 和 interactions。
- `screenshotFacts`：外部截图或 OCR 补证。
- `targetFacts`：target repo 扫描出的 modules、routes、theme、components、assets 和 examples。
- `fieldPriority`：不同字段采用哪类证据优先。
- `mismatches` / `manualConfirmations`：冲突和人工确认项。
- `orchestrationTrace`：capability selected/skipped/completed trace。

当 plan 或 review 看起来不合理时，回到 canonical 查原始证据和 provenance。

## page-debug-index.json

Debug index 是 canonical 的压缩索引，适合快速定位视觉问题。

它通常包含：

- section index：bbox、role、title、node ids、text anchors。
- critical nodes：文本、bbox、关键 style、assets、section membership。
- token 和 mapping summaries。
- risk pointers：指向 canonical nodes、sections、mappings 或 tokens。

典型排查链路：

```text
screenshot region / text anchor
  -> page-debug-index section
  -> page-canonical node/style facts
  -> ui-build-plan visualPlan/themeMappings/componentMappings
  -> target implementation
```

## ui-build-plan.json

`ui-build-plan.json` 是唯一机器契约。它把三类证据放在不同区域，避免职责重叠。

### targetConventions

`targetConventions.architectureProfile` 描述当前 target repo 扫描到的工程表达。

| 字段 | 说明 |
| --- | --- |
| `state` | 页面级或全局状态模式，例如扫描证据证明的 GetX、Bloc/Cubit 等；扫不到就是 `unknown`。 |
| `routing` | 路由注册和跳转模式。 |
| `i18n` | 文案和翻译调用模式。 |
| `theme` | 主题、颜色、字体、spacing token 模式。 |
| `components` | 可复用组件符号和证据。 |
| `fileOrganization` | 模块目录、页面文件、widgets、bindings/controllers 等组织方式。 |
| `documentation` | README、AGENT、CLAUDE、Cursor rules 和 `docs/**/*.md` 等 target 文档补充证据。它只补充理解，不覆盖代码扫描结果。 |

GetX、flutter_bloc、Riverpod、Provider、Navigator、go_router、context.t、AppLocalizations、themeService、context.pbColors、CommonAppBar 等都不是默认值。它们只能在 target 扫描到证据时出现。

`targetConventions.documentation` 会记录读取到的文档文件、架构 hints、文档与代码扫描冲突，以及文件过大或读取失败等警告。证据优先级为：真实业务代码扫描高于 target 文档，target 文档高于 ProtoBridge 的保守默认推断。

### implementationContract

`implementationContract` 是实现层主契约。

| 字段 | 说明 |
| --- | --- |
| `logicalPlanSource` | 说明逻辑计划来自 source-aware plan 还是 visual fallback。 |
| `sourceSemantics` | 业务区块、状态意图、路由/生命周期/交互意图、资源和禁止直译项。 |
| `fileTree` | 预期文件和职责。 |
| `widgetTree` | Widget 拆分和父子关系。 |
| `stateStrategy` | 状态关注点、owner 和建议。 |
| `controllerBoundaries` | 页面级状态/控制边界。名称保持抽象，具体工程表达由 targetConventions 决定。 |
| `widgetContracts` | 子 Widget 输入、回调和状态访问约束。 |
| `targetBindings` | 抽象角色到 target profile 的证据引用。 |
| `rules` | 实现规则。 |
| `contractWarnings` / `manualQuestions` | 未确认或冲突点。 |

顶层 `fileTree` / `widgetTree` 会镜像 `implementationContract.fileTree/widgetTree`，用于兼容旧消费者；它们不再由 runtime section tree 生成。

### visualPlan

`visualPlan` 只负责视觉事实。

| 字段 | 说明 |
| --- | --- |
| `viewport` | capture viewport。 |
| `sections` | runtime/screenshot 观察到的 section、bbox、node ids 和 build hints。 |
| `nodeAudits` | 代表性高风险节点的还原证据，例如重复卡片、列表项、按钮、chip、tab、appbar action 和 bottom action。它记录容器样式、按 y 分组的行结构、文本/icon 顺序、控件 padding/radius/height、assetRefs 和 absence hints。 |
| `nodeAuditSummary` | 节点审查的摘要信息，包括生成数量和 review 中折叠的 wrapper/重复/从属节点及原因。它只影响人类审查视图，不表示 plan 丢弃了原始证据。 |
| `dynamicTextHints` | 从视觉节点识别出的动态文案线索，例如列表数量、金额、百分比、日期和数量标签，提示实现者从 UI model 派生这些值。 |
| `layoutEvidence` | 布局证据摘要。 |
| `screenshotRefs` | 截图引用。 |

实现时用它还原可见布局和样式，不用它决定文件拆分或状态架构。

实现重复 UI 单元时，应优先读取 `visualPlan.nodeAudits`。如果代表性节点中没有某个展示字段，不应自行补充，除非 `sourceSemantics` 或用户确认明确要求。`nodeAudits` 不负责推荐目标 asset；它只保留 source 节点上的 `assetRefs` 和视觉证据。

`nodeAudits` 的压缩原则是保真优先：代表性重复项会保留行结构、控件尺寸和 absence hints；额外重复卡片/列表项也可以保留在 plan 中但设置 `displayInReview=false`；大 wrapper、list 容器、已被父卡片覆盖的按钮等噪音节点只在 `nodeAuditSummary.suppressed` 标明折叠原因。完整原始证据仍在 `page-canonical.json`，plan 中的 section evidence 和 audit summary 不能作为删除视觉事实的理由。

`dynamicTextHints` 会同步影响 `i18nPlan.texts[*].dynamic/dynamicKind`。被标为 dynamic 的文本不应生成固定 translation key；实现时应把标签文案和数值拆开，数值来自 controller/model/repository，并使用 target 工程已有 formatter。

### mappings 和 plans

- `themeMappings`：颜色、字体、spacing、radius、border、shadow 和 token candidates。
- `componentMappings`：target component 复用候选。
- `i18nPlan`：文案抽取和 translation-key 建议。
- `interactionPlan`：tap、tab、input、navigation、modal 和 confirmation needs。
- `businessQuestions` / `risks` / `validationHints`：实现风险和验证依据。

Typography mapping 如果带 `lockToken=true`，实现必须直接使用扫描或映射得到的 target text style token，不得额外覆盖 `fontSize`、`fontWeight`、`height` 或 `fontFamily`，除非 plan 明确给出来源覆盖证据。

## ui-build-review.md

`ui-build-review.md` 是从 `ui-build-plan.json` 渲染的人类可读 brief，不拥有独立裁判权。

它按 review 视角组织：

1. 契约权威和冲突规则。
2. 来源语义：业务区块、状态意图、路由/生命周期/交互意图。
3. 目标工程扫描结果。
4. 实现契约：文件、Widget 与契约、状态与边界。
5. 视觉计划：section evidence、节点级还原证据、动态文案提示、组件映射、字体锁定、主题映射。review 会折叠重复 wrapper 和重复动态值，但折叠原因与完整证据仍保留在 plan。
6. 文案与交互。
7. 风险、人工确认和校验提示。

人类可以先看 review 建立整体理解；agent 和 validator 必须以 plan 为准。

## validation result

`validate_ui_build` 读取 target diff 和 `ui-build-plan.json`，输出结构化验证结果。

它会检查：

- changed files、allowed paths 和 outside allowed paths。
- `implementationContract.fileTree` 预期文件是否缺失。
- 是否引入 target profile 没有证据支持的新 state/routing/i18n/theme 模式。
- 是否偏离高置信度识别出的主模式。
- 是否生成 runtime DOM section 风格文件导致 architecture drift。
- 子 Widget 是否违反 `widgetContracts`。
- placeholder、TODO、hard-coded colors/font sizes、local shadows、network images 和 navigation risks。

如果 target profile unknown，validation 应输出 warnings/manual questions，不应把未知模式当成硬错误。
