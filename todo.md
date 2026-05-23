# 问题清单与评估记录

本文件只记录本轮调研发现的问题，不改代码。
真实的 youfi / TradeApp 环境当前不在本机，下面所有风险判断都应在真实环境回来后再复核。

## 总览

- 严重：`packages/core/src/target/flutter-app/theme-mapping.ts`
- 严重：`packages/core/src/target/flutter-app/context.ts`
- 严重：`packages/core/src/target/flutter-app/planners/page-pattern-classifier.ts`
- 严重：`packages/core/src/target/flutter-app/planning/ui-reconstruction-planner.ts`
- 严重：`packages/core/src/target/flutter-app/target-connect.ts`
- 中等：`packages/core/src/source/vue3-prototype/vue-sfc.ts`
- 较低：`packages/core/src/target/flutter-app/planning/migration-planner.ts`
- 暂不视为问题：`packages/core/src/target/flutter-app/architecture-profile.ts`
- 暂不视为问题：`packages/core/src/target/flutter-app/validation/index.ts`

## 1. `packages/core/src/target/flutter-app/context.ts`

- 问题：存在硬编码模块映射，如 `stock -> order`、`options -> option`、`options-trade -> option`、`asset -> account`、`security -> auth`。
- 为什么是问题：模块落点应该尽量来自 target 证据，而不是 core 默认写死某个业务域。
- 保留风险：会把页面推向错误 module，连带影响文件树、相似文件检索、组件推荐和 plan 的落点。
- 直接移除风险：自动猜模块能力下降，初期可能更依赖显式配置或 target 扫描结果。
- 需要真实环境验证：youfi / TradeApp 的真实 module 命名、route 到 module 的映射、是否存在稳定别名。

## 2. `packages/core/src/target/flutter-app/planners/page-pattern-classifier.ts`

- 问题：`trade-ticket`、`quote-detail`、`portfolio` 等页面模式直接带业务域语义。
- 问题：`trade / order / buy / sell / option / quote / ticker / price / kline / holding / fund / etf / stock` 参与打分。
- 为什么是问题：页面分类可以绑定 Flutter 结构，但不应默认绑定具体业务词表。
- 保留风险：普通详情页、列表页可能被误判成交易/行情/资产页，影响后续 planner 方向。
- 直接移除风险：页面模式识别会变粗，部分高价值页面提示会丢失。
- 需要真实环境验证：这些词表是否真能稳定提升 youfi / TradeApp 的页面模式判别。

## 3. `packages/core/src/source/vue3-prototype/vue-sfc.ts`

- 问题：SFC 抽取里使用了 `quote`、`price`、`holding`、`trade-action`、`kline`、`order-book` 等业务词。
- 问题：这些词参与 section、component、data hint、layout 和 fixed bottom bar 识别。
- 为什么是问题：source adapter 的通用抽取被业务词污染，语义结果会偏向某个域。
- 保留风险：会把页面语义、底部操作栏、图表和列表识别往交易/持仓域倾斜。
- 直接移除风险：source 语义抽取会变钝，部分页面结构和交互线索的召回率下降。
- 需要真实环境验证：这些词是否只是当前项目的高频语义，还是确实可泛化。

## 4. `packages/core/src/target/flutter-app/planning/ui-reconstruction-planner.ts`

- 问题：`inferModule` 里直接写了 `stock -> order`、`option -> option`、`asset/account -> account`、`auth -> auth`。
- 问题：部分节点和文案判断还使用了 `持仓`、`可行权`、`行权`、`到期`、`交易规则` 这类业务词。
- 为什么是问题：planner 是产物编排核心，业务词会直接影响最终 plan 的结构和建议。
- 保留风险：模块推断、node audit 选择、dynamic text 识别和建议文案会持续向某一业务域收敛。
- 直接移除风险：短期内 plan 会少一些强提示，模块推断和部分文案风险更保守。
- 需要真实环境验证：这些词是否在 youfi / TradeApp 里属于稳定增强，还是历史遗留偏置。

## 5. `packages/core/src/target/flutter-app/target-connect.ts`

- 问题：默认 known symbols 偏向特定 target 经验，如 `CommonAppBar`、`CommonButton`、`YouFiPop`、`BaseGetView`、`BaseGetPullView`、`themeService.*`、`.tr`。
- 问题：`quote|detail|trade` 之类 pattern 会直接导向 `CommonAppBar / AppBar / Scaffold` 组合。
- 为什么是问题：这些可以作为 target 扫描证据，但不宜成为默认偏好。
- 保留风险：组件推荐、例子检索和角色识别会偏向某一套工程约定。
- 直接移除风险：target 连接能力会变弱，尤其是现有工程里公共组件复用率可能下降。
- 需要真实环境验证：这些组件和符号是否在 youfi / TradeApp 中足够稳定，是否应作为 profile 而非默认值。

## 6. `packages/core/src/target/flutter-app/planning/migration-planner.ts`

- 问题：包含 `K 线`、指标、`trade records`、持仓、行权等迁移提示。
- 为什么是问题：这会让迁移建议偏业务化，但主要影响文案层，不太影响主结构。
- 保留风险：建议会更偏某一业务域，泛化性略差。
- 直接移除风险：图表和交易类页面的迁移提示会变少。
- 需要真实环境验证：这些提示是否对当前项目确实有帮助，还是仅对示例域有效。

## 7. `packages/core/src/target/flutter-app/theme-mapping.ts`

- 问题：固定把大量 color / typography token 映射到 `themeService.colors` 和 `themeService.textStyles`。
- 问题：token 表里还带有 `YouFi` 设计系统的明确倾向。
- 为什么是问题：这是强 target 绑定，也是当前还原质量的重要来源。
- 保留风险：会继续把某个设计系统当成默认经验，换项目时不容易干净切换。
- 直接移除风险：视觉还原质量可能明显下降，尤其是主题命中率、`lockToken` 和字号一致性。
- 需要真实环境验证：这些 token 映射是否真是 youfi / TradeApp 的稳定约定，还是只适用于当前已知环境。

## 8. `packages/core/src/target/flutter-app/architecture-profile.ts`

- 暂不视为问题。
- 原因：这是 target 工程扫描器，识别 GetX、Riverpod、Provider、theme、i18n 等工程事实，不是业务硬编码本身。

## 9. `packages/core/src/target/flutter-app/validation/index.ts`

- 暂不视为问题。
- 原因：这是实现后校验 target 约定的守门逻辑，属于工程扫描和契约校验，不是业务绑定。

## 风险汇总

- 不处理的风险：通用工作流会持续被某个业务域和某个 target 经验污染，后续换项目时容易误判。
- 直接删除的风险：现有高质量产物可能退化，尤其是主题映射、模块落点、组件推荐和页面模式判别。
- 当前最大的不确定性：没有真实 youfi / TradeApp 环境，无法判断哪些规则是必要增强，哪些只是当前项目的历史偏置。

## 简要建议

- 推荐把强关联能力从默认通用链路里挪出去，改成可选的 `restoration profile`。
- core 保持通用，profile 负责业务词表、模块别名、页面模式偏置、组件偏好和主题偏好。
- 先保留能力，再标记来源，等真实环境回来后再决定哪些规则该保留、降权或删除。

## 目标设想

- 通用能力继续保留，但预留一个很薄的扩展口，通过 skill 增强 ProtoBridge 现有能力。
- 特定能力指当前 ProtoBridge 中与 youfi 强关联的逻辑，尽量不要继续散落在通用代码链路里。
- 这类强关联能力更适合收拢到少量 skill 中，由 skill 负责约束和增强，而不是在核心代码里继续叠加配置和分支。
- 理想状态是“1 个通用 skill + 1 个 YouFi 强化 skill”，再配一个很薄的代码扩展点。
- 原则是保证现在的输入结果，现在的产物的效果是比较合理、满意的。
