# 产物说明

ProtoBridge 默认输出：

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
    └── full-page.png
```

阅读顺序：

1. `ui-build-plan.json` — 实现蓝图（agent / validator 默认主文档）  
2. `ui-build-review.md` — 中文审查视图  
3. `page-debug-index.json` — 视觉排查索引  
4. `page-canonical.json` — 完整证据与 provenance  
5. `screenshots/` — 视觉对照  

## 权威关系

| 产物 | 读者 | 权威范围 |
| --- | --- | --- |
| `page-canonical.json` | 调试者、工具 | 证据原档：source / runtime / screenshot / target facts、provenance、mismatches、trace |
| `page-debug-index.json` | 调试者、agent | 调试索引：section、node、style、mapping、risk pointers |
| `ui-build-plan.json` | agent、validator、开发者 | 实现蓝图：工程表达、实现契约、视觉事实与映射 |
| `ui-build-review.md` | 人类 reviewer | 从 plan 渲染的审查视图；无独立裁判权 |
| `screenshots/` | 人类、视觉排查 | runtime capture 对照 |

Source-aware 语义写入 `ui-build-plan.json#/implementationContract/sourceSemantics`，并由 review 展示。

---

## page-canonical.json

完整页面上下文：证据从哪来、如何合并、哪里冲突。

常用字段：

- `sourceFacts` — source adapter：页面身份、语义结构、状态、交互、style intent  
- `runtimeFacts` — 浏览器：可见 DOM、bbox、computed style、assets、interactions  
- `screenshotFacts` — 外部截图或 OCR  
- `targetFacts` — target 扫描：modules、routes、theme、components、assets、examples  
- `fieldPriority` — 字段级证据优先规则  
- `mismatches` / `manualConfirmations` — 冲突与人工确认  
- `orchestrationTrace` — capability selected / skipped / completed  
- `sections` / `nodes` / `assets` / `interactions` / `provenance` — 合并后的页面级事实  

plan 或 review 看起来不对时，回到 canonical 查原始证据。

---

## page-debug-index.json

Canonical 的压缩索引，适合从截图区域或文案锚点快速定位。

通常包含 section index、critical nodes、token / mapping 摘要、risk pointers。

典型链路：

```text
screenshot region / text anchor
  -> page-debug-index section
  -> page-canonical node / style facts
  -> ui-build-plan visualPlan / themeMappings / componentMappings
  -> target implementation
```

---

## ui-build-plan.json

实现蓝图。按职责分区，并把实现阶段高风险细节从 canonical 提升为结构化字段。

顶层字段（与 `UiBuildPlan` 对齐）：

| 字段 | 作用 |
| --- | --- |
| `routeMapping` / `routeIntentMappings` | source route 与 target route 的映射线索 |
| `target` | 目标根、模块、routes / translations / assets、可复用组件、相似示例 |
| `page` | 标题、route、摘要、viewport |
| `targetConventions` | 目标工程扫描结果（含 architectureProfile） |
| `implementationContract` | 文件 / Widget / 状态 / 契约主区 |
| `visualPlan` | 视觉事实与节点级还原契约 |
| `fileTree` / `widgetTree` | 镜像 `implementationContract` 对应字段，供既有消费者读取 |
| `componentMappings` / `themeMappings` / `themeMappingGroups` | 组件与主题映射 |
| `i18nPlan` / `assetPlan` / `interactionPlan` | 文案、资源、交互 |
| `businessQuestions` / `risks` / `validationHints` | 风险与实现后校验提示 |

### targetConventions

`architectureProfile` 描述扫描到的工程表达；扫不到则为 `unknown` 或空集合。

| 字段 | 说明 |
| --- | --- |
| `state` | 页面 / 全局状态模式 |
| `routing` | 路由注册与跳转 |
| `i18n` | 文案与翻译调用 |
| `theme` | 颜色、字体、spacing 等 token 模式 |
| `components` | 可复用符号与证据 |
| `fileOrganization` | 模块与页面文件组织 |
| `documentation` | README、AGENT、CLAUDE、Cursor rules、`docs/**/*.md` 等补充；不覆盖代码扫描 |

`targetConventions.documentation` 记录读到的文档、架构 hints、文档与代码冲突及读取警告。证据优先级：业务代码扫描 > target 文档 > ProtoBridge 保守推断。

### implementationContract

| 字段 | 说明 |
| --- | --- |
| `logicalPlanSource` | source-aware plan 或 visual fallback |
| `sourceSemantics` | 业务区块、状态 / 路由 / 生命周期 / 交互意图、资源、禁止直译项 |
| `fileTree` | 预期文件与职责 |
| `widgetTree` | Widget 拆分与父子关系 |
| `stateStrategy` | 状态关注点与 owner 建议 |
| `controllerBoundaries` | 页面级状态 / 控制边界（名称抽象，工程表达由 targetConventions 决定） |
| `widgetContracts` | 子 Widget 输入、回调、状态访问约束 |
| `implementationIndex` | 主屏 / 重复组 / overlay / 高风险优先与阶段提示 |
| `overlayPlan` | sheet / modal / popup 等 overlay 计划 |
| `conflicts` | 布局或实现冲突 |
| `targetBindings` | 抽象角色到 architecture profile 的证据引用 |
| `rules` | 实现规则 |
| `contractWarnings` / `manualQuestions` | 未确认或冲突点 |

顶层 `fileTree` / `widgetTree` 镜像本区对应字段；它们不由 runtime section tree 生成。

`sourceSemantics` 常见子字段：`summary`、`businessSections`、`stateIntent`、`routeIntent`、`lifecycleIntent`、`interactionIntent`、`layoutIntent`、`styleIntent`、`assetIntent`、`doNotTranslate`。

### visualPlan

只负责视觉事实，不决定文件拆分或状态架构。

| 字段 | 说明 |
| --- | --- |
| `viewport` | capture viewport |
| `sections` | 观察到的 section、bbox、node ids、build hints |
| `nodeAudits` | 高风险节点还原契约：重复卡片、列表项、按钮、chip、tab、appbar / bottom action；含行结构、文本/icon 顺序、控件尺寸、assetRefs、absence hints |
| `nodeAuditSummary` | 生成数量与 review 折叠的 wrapper / 重复 / 从属节点及原因；不影响 plan 保真 |
| `dynamicTextHints` | 列表数量、金额、百分比、日期、数量等动态文案线索 |
| `layoutEvidence` / `layoutConflicts` | 布局证据与冲突 |
| `screenshotRefs` | 截图引用 |

实现重复 UI 单元时优先读 `nodeAudits`。代表节点没有的展示字段不要自行补充，除非 `sourceSemantics` 或用户明确要求。`rows` 是局部顺序契约，`controls` 是控件尺寸契约，`absenceHints` / `implementationSummary.doNotInvent` 是负向契约。`nodeAudits` 不推荐 target asset，只保留 source 节点上的 `assetRefs` 与视觉证据。

保真原则：额外重复项可留在 plan 且 `displayInReview=false`；噪音节点记在 `nodeAuditSummary.suppressed`。完整原始证据仍在 canonical。

`dynamicTextHints` 同步影响 `i18nPlan.texts[*].dynamic` / `dynamicKind`。动态值应从 UI model / formatter 派生，不写固定 translation key。

### mappings 与附属计划

- `themeMappings` — 颜色、字体、spacing、radius、border、shadow 与 token candidates；`lockToken=true` 时不得覆盖 `fontSize` / `fontWeight` / `height` / `fontFamily`，除非 plan 给出覆盖证据  
- `themeMappingGroups` — `resolved` / `candidates` / `familyOnly` 分组视图  
- `componentMappings` — target 组件复用候选  
- `i18nPlan` — 文案与 translation-key 建议  
- `assetPlan` — 资源计划  
- `interactionPlan` — tap、tab、input、navigation、modal 与确认需求  
- `routeMapping` / `routeIntentMappings` — 路由映射  
- `businessQuestions` / `risks` / `validationHints` — 风险与校验  

---

## ui-build-review.md

从 `ui-build-plan.json` 渲染，可折叠重复节点与重复动态值；折叠原因与完整证据仍在 plan。

常见组织：

1. 契约权威与冲突规则  
2. 来源语义  
3. 目标工程扫描结果  
4. 实现契约：文件、Widget、状态与边界  
5. 视觉计划：sections、nodeAudits、动态文案、组件 / 字体 / 主题映射  
6. 文案与交互  
7. 风险、人工确认、校验提示  

人类可先看 review；agent 与 validator 以 plan 为准。

---

## Validation result

`validate_ui_build`（capability `ui.validate`）读取 target diff 与 `ui-build-plan.json`，输出结构化结果。

检查范围包括：

- changed files、allowed paths、outside allowed paths  
- `implementationContract.fileTree` 预期文件是否缺失  
- 是否引入 architecture profile 无证据支持的新 state / routing / i18n / theme 模式  
- 是否偏离已识别主模式  
- 是否生成 runtime DOM section 风格文件导致 architecture drift  
- 子 Widget 是否违反 `widgetContracts`  
- placeholder、TODO、硬编码颜色 / 字号、local shadow、network image、导航风险标记  

扫描出的 architecture profile 为 `unknown` 时输出 warnings / manual questions，不把未知模式当成硬错误。Validation 是 review 辅助，不等于视觉或业务完全正确。
