# 产物说明

ProtoBridge 默认输出：

```text
output/<page>-<timestamp>/
├── ui-build-review.md
├── ui-build-plan.json
├── page-canonical.json
└── screenshots/
    └── full-page.png
```

推荐阅读顺序：

1. `ui-build-review.md` — 人类审查和实现交接
2. `screenshots/` — 视觉对照
3. `ui-build-plan.json` — Agent 必读的精确实现契约
4. `page-canonical.json` — 按 `ui-build-plan.json#/canonicalReadPolicy` 判断；存在未遍历隐藏状态、证据冲突或人工确认时必读

## 权威关系

| 产物 | 作用 |
| --- | --- |
| `ui-build-review.md` | 用自然语言解释页面、B 接入建议、风险和人工修订；人工修订区优先于自动接入建议 |
| `ui-build-plan.json` | 页面还原与实现的机器契约 |
| `page-canonical.json` | source/runtime/screenshot/target 原始证据、provenance、mismatches 和 trace |
| `screenshots/` | runtime 视觉对照 |

页面身份、source semantics、runtime、视觉和样式事实是 authoritative。模块、路由、目标组件和主题表达是 advisory；证据不足时必须保持 candidate 或 unresolved。

## ui-build-plan.json

Plan 使用紧凑 JSON 写出。它面向机器读取，人类不需要逐行阅读。

顶层结构：

```text
ui-build-plan
├── schemaVersion / id / pageId
├── canonicalReadPolicy
├── artifactAuthority
├── page
├── implementationContract
├── visualPlan
├── stylePlan
├── interactionPlan / i18nPlan / assetPlan
├── integrationGuidance
├── target / targetConventions
├── componentMappings / routeMapping
└── businessQuestions / risks / validationHints
```

### 页面还原事实

- `page`：标题、route、摘要、viewport
- `implementationContract.sourceSemantics`：业务区块、状态、路由、生命周期、交互、布局、样式与资源意图
- `visualPlan.sections`：运行态区块、bbox、节点和构建提示
- `visualPlan.nodeAudits`：代表性卡片、列表项、按钮、Tab、AppBar 和其他高风险 UI 单元
- `visualPlan.nodeAudits[*].rows`：局部行结构、文本/图标顺序、bbox 和 computed style
- `visualPlan.nodeAudits[*].instances`：重复项的文本、状态、样式与布局差异
- `stylePlan.facts`：颜色、字体、间距、圆角、边框、阴影、CSS variable 和最终值
- `interactionPlan`：点击、切换、输入、导航、弹窗和确认需求
- `i18nPlan` / `assetPlan`：文案与资源事实

`stylePlan.policy` 规定先保持 source/runtime 值，再由实现 Agent 阅读 B 的主题定义并选择工程表达。PB 不在单条样式事实中决定 B 的具体 theme token。

`canonicalReadPolicy` 由 PB 根据证据覆盖率自动生成，不是配置项。`required=true` 时，Agent 必须在实现前读取 Canonical 中列出的 refs；典型原因是 Overlay 只有 source 证据、runtime 未遍历隐藏状态、source/runtime 不一致或仍有人工确认。

### B 接入建议

`integrationGuidance` 分别描述 module、route、components 和 theme：

- `status`：confirmed / candidate / unresolved
- `confidence`：high / medium / low
- `selected` / `candidates`
- `evidence`
- `nextAction`

`targetConventions` 只保留实现需要的架构摘要和少量证据；完整 target 扫描事实仍在 canonical，也可以通过 `read_target_conventions` 按需重读。

`target.reusableComponents` 只包含与当前页面角色相关的候选，不是目标仓库的全量组件目录。

### 实现辅助

`implementationContract` 包含：

- `fileTree` / `widgetTree`
- `stateStrategy` / `controllerBoundaries`
- `widgetContracts`
- `implementationIndex`
- `overlayPlan` / `conflicts`
- `targetBindings`
- `rules` / `contractWarnings` / `manualQuestions`

`businessQuestions`、`risks` 和 `validationHints` 用于实现前确认和实现后校验。

`overlayPlan` 不只标记弹层存在，还保留标题、状态/条件、触发动作、内部控件、选项集合、绑定与确认/重置/关闭动作。运行态没有打开过的弹层会标记为 `source-only`，并使 `canonicalReadPolicy.required=true`。

## ui-build-review.md

Review 是 plan 的自然语言审查版，通常包含：

1. 页面总览与 Canonical 阅读结论
2. 页面架构图与页面流程图
3. source、runtime、视觉与样式还原事实
4. 隐藏状态与 Overlay 交互契约
5. B 架构摘要、接入建议、文件与 Widget 边界
6. 风险、问题、验收提示与人工修订区

Review 不展开全量节点、样式事实或 B 扫描结果。精确值通过 JSON 引用定位。

以下标记之间的内容在重新生成时保留：

```md
<!-- proto-bridge:manual:start -->
人工确认或修订
<!-- proto-bridge:manual:end -->
```

人工修订优先于自动 B 接入建议。需要修改页面权威事实时，应明确写为“页面事实修正”。

## page-canonical.json

Canonical 保存完整证据：

- `sourceFacts`
- `runtimeFacts`
- `screenshotFacts`
- `targetFacts`
- `sections` / `nodes` / `assets` / `interactions`
- `fieldPriority`
- `mismatches` / `manualConfirmations`
- `provenance` / `orchestrationTrace`

Canonical 使用紧凑 JSON 写出。它面向证据追溯与遗漏诊断，不承担人类阅读职责。完整 `sourceCode` 与结构化 SFC 事实只保留一份原文：结构化 `template/script/styleBlocks` 不再重复写入；source 全局路由表只保留当前页面相关项。runtime、截图、交互、节点、样式及隐藏状态事实仍完整保留。

Plan 或 review 出现明显遗漏时，回到 canonical 判断问题发生在采集、规划还是实现阶段。

## Validation result

`validate_ui_build` 读取 target diff 与 plan，检查预期文件、允许路径、架构约定、Widget contract、占位实现、硬编码样式和导航风险。Target 架构未知时输出 warning 或人工确认，不把未知模式当作硬错误。

## 相关文档

- 原型结构 / 弹层约定（生产者规范）：[conventions.md](conventions.md)
- 原型工作台定稿：[design.md](design.md)
- 能力与适配器：[overview.md](overview.md)
- 用法：[usage.md](usage.md)
