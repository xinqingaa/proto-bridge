# Profile 重构计划与问题清单

本文件记录当前发现的强关联问题，以及后续重构执行计划。
目标是在不牺牲 youfi / TradeApp 当前高质量产物的前提下，把业务和目标工程强绑定逻辑从通用 core 链路中收拢到可选 profile。

当前满意产物回归基准：

```text
../youfi/output/early-exercise-mpgollpe-364470
```

重构完成后，这份产物的核心能力不能明显退化。

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

## 重构结论

采用轻量 `profile` 方案，不采用纯 skill-only 方案。

原因：

- `skill` 适合约束 agent 如何消费 `ui-build-plan.json`，例如优先读取 node audit、优先复用 CommonAppBar、i18n key 查重等。
- 但 `skill` 很难补足产物生成阶段的信息。`target.module`、`componentMappings`、`themeMappings`、`similarExamples`、`sourceSemantics` 都在生成 plan 时已经确定。
- 直接删除 YouFi / 业务硬编码再靠 skill 补，会让 high quality plan 退化，尤其是 early exercise 这类复杂页面。
- 更合理的边界是：core 负责通用证据采集、归一、计划、验证；profile 负责项目/业务增强；skill 负责 restore 执行约束。

最终结构目标：

```text
packages/core/src/
├── profile/
│   ├── index.ts
│   ├── types.ts
│   ├── registry.ts
│   ├── generic.ts
│   └── youfi.ts
├── source/
├── target/
└── workflows/
```

profile 与 `source`、`target` 同级，集中维护业务和项目增强逻辑，避免散落在 target/source/planner 深处。

## 配置规则

在 `proto-bridge.config.json` 顶层增加可选 `profile` 字段，与 `source`、`target` 同级。

推荐真实项目配置保持低心智负担：

```json
{
  "schemaVersion": 1,
  "source": {
    "adapter": "vue3-prototype",
    "root": "../TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "../youfi"
  },
  "profile": "auto"
}
```

`profile` 解析优先级：

1. 显式配置 `"youfi"`：强制启用 YouFi profile。
2. 显式配置 `"generic"` 或 `false`：只用通用能力，禁用业务 profile。
3. 配置 `"auto"` 或不配置：从 `target.root` 的目录名推断 profile。
4. 目录名命中已注册 profile 时启用该 profile，例如 `../youfi` -> `youfi`。
5. 推断不到已注册 profile 时回退 `generic`。

约束：

- profile 可以提供候选和增强，但不能伪造 target 事实。
- `CommonAppBar`、`themeService.colors`、`.tr` 等只有被 target 扫描证明存在时，才能进入高置信 plan。
- module alias 只有目标模块真实存在时才生效。
- 产物中的 profile 影响应尽量带来源标记，例如 `profile=youfi` 或 reason 中说明来自 profile enhancement。

## 执行边界

### 1. 命名边界

配置字段仍使用顶层 `profile`，保持使用者心智负担低。
代码类型和产物字段使用 `RestorationProfile` / `restorationProfile`，避免和现有 `targetConventions.architectureProfile`、文档中的 target profile 概念混淆。

约束：

- `profile` 是用户配置入口。
- `RestorationProfile` 是 source / target 之外的项目增强层。
- `architectureProfile` 仍只表示 target 扫描出来的架构事实。
- 文档中应明确区分 restoration profile 与 target architecture profile。

### 2. 入口边界

profile 不能只接入单个 planner，需要贯穿所有会影响产物的入口。

必须贯通：

- `resolveProtoBridgeInput`
- `ReconstructPageContextInput`
- `source.analyze`
- `target.inspect`
- `buildSourceAwareSemantics`
- `ui.plan`
- `buildFlutterUiReconstructionPlan`

约束：

- 同一次 reconstruct 中 source、target、merge、plan 必须使用同一个 resolved profile。
- CLI / MCP 走 `proto-bridge.config.json` 时不需要额外参数即可使用 auto profile。
- 如果后续增加 CLI / MCP 显式 profile override，优先级应高于 config，但低于本次调用内部已解析出的 resolved profile。

### 3. 证据边界

profile 只能提供候选、别名、词表和 token 映射，不能直接伪造 target evidence。

硬规则：

- target symbol 要成为 high confidence，必须在 target repo 中被扫描到定义或使用。
- `themeService.colors`、`themeService.textStyles` 只有在 `targetConventions.architectureProfile.theme.patterns` 中存在时，才允许进入高置信 theme mapping。
- `.tr`、`Get.toNamed`、`Get.back` 只有被 architecture profile 或 usage scan 证明时，才作为 target 推荐。
- module alias 只有映射后的 module 存在于 `existingModules` 时才生效；不存在时降级为原始候选或 generic fallback。
- profile reason / provenance 只能解释“为什么纳入候选”，不能替代扫描证据。

### 4. 产物边界

`ui-build-plan.json` 需要保留 profile 影响来源，方便后续排查为什么命中了某个项目增强。

建议新增轻量字段：

```ts
restorationProfile?: {
  id: string;
  mode: 'explicit' | 'auto' | 'generic';
  inferredFrom?: string;
  warnings: string[];
};
```

约束：

- `generic` 也应显式记录，避免无法判断是否启用了 profile。
- profile provenance 只描述增强来源，不改变 targetConventions 的证据语义。
- 如新增该字段，需要同步 `docs/artifacts.md` 和 review markdown 中的说明。

## 执行步骤

### 1. 建立 profile 框架并贯穿输入链路

目标：先建立扩展口，不做大规模行为改变。

修改范围：

- 新增 `packages/core/src/profile/`。
- 定义 `RestorationProfile` 类型。
- 新增 `genericProfile` 和 `youfiProfile`。
- 新增 profile registry，用于根据显式名称或 target 目录名解析 profile。
- `ProtoBridgeConfig` 顶层新增 `profile` 字段。
- `resolveProtoBridgeInput` 输出 resolved profile 信息。
- `ReconstructPageContextInput`、capabilities、workflow、planner 入参贯穿 profile。

建议 profile 类型至少包含：

```ts
type RestorationProfile = {
  id: string;
  moduleAliases?: Record<string, string>;
  targetSymbols?: Array<{ symbol: string; role: FlutterComponentRole; reason: string }>;
  roleSymbols?: Partial<Record<FlutterComponentRole, string[]>>;
  themeTokens?: {
    colors?: Record<string, string>;
    colorValues?: Record<string, string>;
    typography?: Record<string, string>;
    typographyValues?: Record<string, string>;
  };
  sourceLexicon?: {
    sectionClassTerms?: string[];
    chartTerms?: string[];
    listTerms?: string[];
    summaryTerms?: string[];
    bottomActionTerms?: string[];
    dynamicQuantityTerms?: string[];
    listHeadingTerms?: string[];
  };
};
```

验收标准：

- 不配置 `profile` 时，`../youfi` 能自动解析为 `youfi`。
- 非 `youfi` target 目录能回退 `generic`。
- `pnpm run typecheck` 通过。
- README / AGENT / docs 后续需要补充 profile 规则，但本步骤可以先只改核心代码和最小说明。

### 2. 迁移 target 侧强绑定逻辑到 profile

目标：把影响落文件、组件推荐、示例检索和主题映射的 YouFi 经验从 target 通用代码中移走。

迁移内容：

- 从 `packages/core/src/target/flutter-app/context.ts` 移出 `MODULE_MAP`：
  - `stock -> order`
  - `options -> option`
  - `options-trade -> option`
  - `asset -> account`
  - `security -> auth`
  - `onboard -> account`
- 从 `packages/core/src/target/flutter-app/planning/ui-reconstruction-planner.ts` 移出 `inferModule` 里的业务 fallback：
  - `stock -> order`
  - `option -> option`
  - `asset/account -> account`
  - `auth -> auth`
- 从 `packages/core/src/target/flutter-app/target-connect.ts` 移出 YouFi / 特定 target symbols：
  - `CommonAppBar`
  - `CommonButton`
  - `CommonImage`
  - `CommonSvg`
  - `CommonNetImage`
  - `CommonToast`
  - `CommonEmpty`
  - `CommonLoading`
  - `Pop.sheet`
  - `YouFiPop`
  - `BaseGetView`
  - `BaseGetPullView`
  - `themeService.colors`
  - `themeService.textStyles`
  - `.tr`
  - `Get.toNamed`
  - `Get.back`
- 从 `packages/core/src/target/flutter-app/theme-mapping.ts` 移出 YouFi token 表：
  - `COLOR_TOKEN_MAP`
  - `TYPOGRAPHY_TOKEN_MAP`
  - `COLOR_TOKEN_VALUES`
  - `TYPOGRAPHY_TOKEN_VALUES`

通用 core 保留的能力：

- 目标目录扫描。
- architecture profile detection。
- module 直接命中逻辑：source module / route segment 与 existingModules 完全匹配。
- Flutter/Material 通用候选，例如 `AppBar`、`Scaffold`、`TextButton`、`Image.asset`、`showModalBottomSheet`。
- theme mapping 算法：normalize、exact match、ambiguous match、family fallback、targetConventions support check。

验收标准：

- `genericProfile` 下不再默认出现 YouFi、themeService、BaseGetView、CommonAppBar 这类项目经验。
- `youfiProfile` 下 early-exercise 仍能识别：
  - `target.module = option`
  - `CommonAppBar`
  - `CommonButton`
  - `Pop.sheet` / `YouFiPop`
  - `BaseGetView`
  - `themeService.colors`
  - `themeService.textStyles`
  - `.tr`
- target symbols 仍必须经过 target repo 扫描，不能只因 profile 存在就高置信输出。

### 3. 迁移 source / planner 业务词表到 profile

目标：把 Vue source adapter 和 planner 中的业务词污染移入 profile lexicon，保留通用结构识别能力。

迁移内容：

- 从 `packages/core/src/source/vue3-prototype/vue-sfc.ts` 中拆出业务词：
  - `quote`
  - `price`
  - `holding`
  - `trade-action`
  - `kline`
  - `order-book`
  - `ticker`
  - `fund`
  - `option`
  - `stock`
- 从 `packages/core/src/target/flutter-app/planning/ui-reconstruction-content.ts` 和 `ui-reconstruction-visual.ts` 中拆出动态文本和 list heading 的业务词：
  - `持仓`
  - `可行权`
  - `行权`
  - `到期`
  - `交易规则`
  - `Held`
  - `position`
  - `shares`
  - `orders`
- `page-pattern-classifier.ts` 当前未被活跃 workflow 调用，优先级低，但应同步调整为 profile lexicon 驱动或后续删除。

generic source lexicon 保留：

- `section`
- `card`
- `panel`
- `list`
- `chart`
- `tab`
- `tabs`
- `header`
- `nav`
- `bottom-bar`
- `footer`
- `modal`
- `popup`
- `sheet`
- `metric`
- `history`
- `filter`
- `search`
- `sort`

youfi source lexicon 增强：

- 期权、交易、持仓、行情、行权相关词。
- YouFi 原型平台中的 token / class 命名习惯。
- early exercise 中数量、到期、ITM/OTM、DNE、Exercise、rules、warning modal 等识别增强。

验收标准：

- generic source-only / runtime-only 页面不会因为 `quote/holding/option` 词表被默认误导。
- youfi profile 下 early-exercise 的 source semantics 不退化：
  - Header callback 仍能表达 `onBack`、`onHistory`、`onRules`。
  - List / card / overlay / filter 的结构仍能被识别。
  - dynamic text hints 仍能覆盖金额、日期、数量、百分比。
  - absence hints 仍能表达不要补不存在字段。

### 4. 回归验证与文档收口

目标：确认重构成功，同时把新的边界同步到正式文档。

必须回归的产物基准：

```text
../youfi/output/early-exercise-mpgollpe-364470
```

核心字段不能明显退化：

- `target.module = option`
- `targetConventions.architectureProfile.state.pattern = getx`
- `targetConventions.architectureProfile.routing.pattern = getx`
- `targetConventions.architectureProfile.i18n.pattern = getx_tr`
- `targetConventions.architectureProfile.theme.patterns` 包含 `themeService.colors` 和 `themeService.textStyles`
- `target.reusableComponents` 包含 CommonAppBar、CommonButton、CommonImage、CommonSvg、Pop.sheet、YouFiPop、BaseGetView
- `target.similarExamples` 仍优先命中 `lib/app/modules/option/**`
- `fileTree` 仍落在 `lib/app/modules/option/option_early_exercise/**`
- `componentMappings` 对 app-bar/button/sheet 仍有高置信 target candidate
- `themeMappings` / `themeMappingGroups` 中高置信 typography token 不明显减少
- `visualPlan.nodeAudits` 保持 3 个高价值审计左右，不退回大量重复 audit
- `visualPlan.dynamicTextHints` 保持 early-exercise 关键动态值覆盖
- `implementationContract.overlayPlan` 保持 submit-sheet、otm-warn、success-modal、rules 四类 overlay
- `implementationContract.implementationIndex.repeatedGroups` 保持 1 个持仓卡片重复组
- `implementationContract.conflicts` 仍保留 source/runtime layout conflict，而不是静默吞掉

命令验证：

```bash
pnpm run typecheck
pnpm run test:config
```

如改动 CLI / MCP 参数或 artifact contract，再补：

```bash
pnpm run test:e2e:cli
pnpm run test:e2e:mcp
```

文档同步：

- `README.md`：补充 profile 是 source/target 之外的可选增强层。
- `AGENT.md`：说明 agent 应读取 plan 中的 profile provenance，但仍以 target evidence 为准。
- `docs/architecture.md`：补充 core / profile / skill 三层边界。
- `docs/workflows.md`：补充 profile auto resolution。
- `docs/artifacts.md`：如 plan 中新增 profile provenance 字段，需要描述字段意义。
- `skills/protobridge-flutter-restore/skill.md`：保留执行约束，不把 profile 生成逻辑写进 skill。

## 风险汇总

- 不处理的风险：通用工作流会持续被某个业务域和某个 target 经验污染，后续换项目时容易误判。
- 直接删除的风险：现有高质量产物可能退化，尤其是主题映射、模块落点、组件推荐和页面模式判别。
- 过度配置化风险：如果 profile 变成大型配置系统，会增加用户心智负担；因此优先使用内置 profile + auto resolution。
- profile 滥用风险：profile 只能提供候选和增强，不能绕过 target evidence。
- 回归风险：每迁移一类强绑定逻辑，都要用 early-exercise 基准检查 plan 质量。
