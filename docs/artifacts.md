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
3. `ui-build-plan.json` — Agent 按需读取的精确实现契约
4. `page-canonical.json` — 只有证据冲突或采集异常时读取

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

## ui-build-review.md

Review 是 plan 的自然语言审查版，通常包含：

1. 页面身份与权威边界
2. source 业务语义、状态和交互
3. B 架构摘要与接入建议
4. 文件、Widget、状态与生命周期建议
5. 视觉区块、代表性 UI 单元与样式归纳
6. 文案、交互、风险和验收提示
7. 人工修订区

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

Plan 或 review 出现明显遗漏时，回到 canonical 判断问题发生在采集、规划还是实现阶段。

## Validation result

`validate_ui_build` 读取 target diff 与 plan，检查预期文件、允许路径、架构约定、Widget contract、占位实现、硬编码样式和导航风险。Target 架构未知时输出 warning 或人工确认，不把未知模式当作硬错误。
