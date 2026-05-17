# Portfolio Holdings Review

## 能力上下文

- Merge strategy: source-runtime
- Capabilities: source.analyze, runtime.capture, target.inspect, page.merge
- Facts: source=true, runtime=true, screenshot=true, target=true

### 字段优先级

- module / screenId / semantic section / interaction intent / state space: source > runtime > screenshot > target - Source is best at expressing design intent, semantic structure, and latent states.
- visible / bbox / computed style / actual active state / actual visible text: runtime > screenshot > source > target - Runtime capture reflects the current rendered page and viewport-specific facts.
- pixel appearance / OCR text / visual comparison: screenshot > runtime > source > target - Screenshot and OCR are the final visual evidence and text fallback.
- component reuse / theme target / file tree / route placement: target > source > runtime > screenshot - Target repo conventions decide what should be reused or where new Flutter code should live.

### 人工确认项

- [ ] confirm-1 [info]: Target suggested module (account) differs from source module (asset).

## 有源码实现交接

### 对齐检查清单

- 页面元信息: covered (source.route, source.screenId, target.suggestedModule)
- 迁移结论: covered (implementationPlan.summary, recommendations.risks)
- Flutter 实现规划: covered (fileTree, widgetTree, widgetContracts)
- 状态与交互建议: covered (stateStrategy, source.sfc.interactions)
- 路由与布局: covered (source.route, source.sfc.routes, source.sfc.layout)
- 样式、i18n 和资源: covered (source.sfc.styleTokens, source.i18n, source.sfc.assets)
- 可复用组件: covered (target.reusableWidgets, target.routesFiles, target.assetDirectories)
- 人工确认项: covered (manualQuestions, checklist)

### 页面元信息

- Page: 持仓列表
- Route: /prototype/asset/holding-list
- screenId: asset.holding-list
- Source module: asset
- Target module: account
- Implementation shape: BaseGetView
- Status: ready
- Owner: ProtoBridge Example

### 迁移结论

- Flutter complexity: moderate
- Page pattern: portfolio
- Pattern confidence: medium
- Recommended shape: BaseGetView
- Target module: account
- Direct implementation: 可以进入实现
- Implementation summary: 该页面建议拆成父页面、Controller 和若干子 Widget；页面模式识别为资产/持仓页，置信度中；Controller 负责页面级 UI 状态，子 Widget 通过构造参数接收数据并通过回调上报交互。
- Top risks: (none)

### Flutter 实现规划

#### 目标文件

- `lib/app/modules/account/asset_holding_list/asset_holding_list_page.dart`: 父页面入口，绑定 route、Controller、Scaffold/SafeArea，并编排子 Widget。 (父页面不直接承载复杂业务计算。)
- `lib/app/modules/account/asset_holding_list/asset_holding_list_controller.dart`: 管理页面级 UI 状态、路由参数、滚动控制和事件分发。 (按 UI 状态、业务数据、派生数据重新归类，不要把来源页面临时状态逐项搬迁。)
- `lib/app/modules/account/asset_holding_list/asset_holding_list_binding.dart`: 注册 Controller 及必要 service/repository 依赖。
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_body.dart`: 按内容顺序组合私有 Widget。 (content composition)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_header.dart`: 优先复用 CommonAppBar 或现有 header pattern。 (header)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_asset_summary.dart`: 展示资产、收益、账户摘要等关键指标。 (summary)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_position_list.dart`: 展示持仓或资产明细，确认空态和刷新策略。 (data-list)
- `lib/app/modules/account/asset_holding_list/models/asset_holding_list_ui_model.dart`: 定义 UI 所需字段模型；真实数据源待业务接口确认后替换 mock。

#### Widget 组成

- AssetHoldingListPage: route/page composition; 建议只负责页面级布局和子 Widget 编排。
- AssetHoldingListBody -> AssetHoldingListPage: content composition; 按内容顺序组合私有 Widget。
- AssetHoldingListHeader -> AssetHoldingListPage: header; 优先复用 CommonAppBar 或现有 header pattern。
- AssetHoldingListAssetSummary -> AssetHoldingListBody: summary; 展示资产、收益、账户摘要等关键指标。
- AssetHoldingListPositionList -> AssetHoldingListBody: data-list; 展示持仓或资产明细，确认空态和刷新策略。

#### Widget 契约

- AssetHoldingListBody: inputs=[items / section model], callbacks=[onItemTap], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetHoldingListHeader: inputs=[quote/ui summary model, items / section model], callbacks=[onBack, onMore, onItemTap], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetHoldingListAssetSummary: inputs=[items / section model], callbacks=[onItemTap], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetHoldingListPositionList: inputs=[items / section model], callbacks=[onItemTap], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。

#### Controller 边界

- AssetHoldingListController: 页面 orchestration controller；负责状态组合、生命周期和事件分发，不负责绘制细节。; owns=[页面级 UI 状态, 路由参数读取, 事件分发, 滚动/监听生命周期, 导航行为]; avoids=[逐层照搬来源页面结构, 在 build 中做重计算, 让所有子 Widget 直接读整个 Controller]
- AssetHoldingListData/Chart Adapter: 将接口或 mock 数据整理成 UI/图表绘制模型。; owns=[mock 到 model 的转换, 派生数据和图表 series 计算, 缓存策略]; avoids=[直接依赖 BuildContext, 触发导航, 持有 Widget 状态]

#### 不要直译

- 不要把来源页面结构逐层翻译成 Flutter Widget；按业务区块和 Flutter 布局模型重组。
- 不要把临时 mock 数据直接写在 Widget build 中；先确认接口/model/fixture 边界。
- 不要让每个子 Widget 都直接依赖整个 Controller；优先通过构造参数传入数据，并用回调上报交互。
- 不要忽略 fixed/sticky/scroll/safe-area；先确定 Scaffold、Stack、ScrollController/Sliver 的组合。

### 状态与交互

#### 状态策略

- 业务数据与 mock 数据 (repository): 不要把临时 mock 数组直接写入 Widget；先定义 UI model，再由接口/repository/fixture 填充。
- 路由与参数 (controller): Controller 统一读取 route 参数并暴露页面初始状态；子 Widget 只通过 callback 触发导航。
- 生命周期与副作用 (controller): ScrollController/listener/watch 副作用必须有明确注册和释放位置；默认放 Controller.onInit/onClose，只有依赖首帧布局或滚动定位时再使用 onReady/首帧回调。

#### 生命周期与副作用

- onMounted: route query initialization - 迁移到 Controller.onReady 或页面首帧回调；涉及滚动需绑定 ScrollController 后执行。

#### 交互事件

- click: store.refreshPage - @click="store.refreshPage"
- click: store.setHoldingFilter(filter) - @click="store.setHoldingFilter(filter)"
- click: store.pushPage('/prototype/asset/pnl-analysis', { source: 'holding-list' }) - @click="store.pushPage('/prototype/asset/pnl-analysis', { source: 'holding-list' })"
- conditional: store.loading - v-if="store.loading"
- loop: filter in filters - v-for="filter in filters"
- loop: item in store.filteredHoldings - v-for="item in store.filteredHoldings"

### 路由与布局

#### 路由与参数

- Source route: /prototype/asset/holding-list
- Target route files: lib/app/routes/app_routes.dart, lib/app/routes/app_pages.dart

#### 路由行为

- navigate: /prototype/asset/pnl-analysis / { source: 'holding-list' } - 映射到 Get.toNamed/AppRoutes，确认 /prototype/asset/pnl-analysis 对应 Flutter route 和参数。
- read-query: sector - 从 Get.parameters/Get.arguments 读取 sector，确认默认值和来源页面。

#### 布局模型

- flex .holding-header: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- grid .summary-card: 迁移为 GridView/Wrap 或自定义布局。
- spacing .summary-card: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .summary-card strong: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .summary-label: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .rate: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- scroll .filter-row: 使用 SingleChildScrollView/ListView/CustomScrollView，并保留滚动方向。
- flex .filter-row: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- spacing .filter-row: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .filter-chip: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- flex .list-header: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- spacing .list-header: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .list-header h2: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- flex .holding-row: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- grid .holding-row: 迁移为 GridView/Wrap 或自定义布局。
- spacing .holding-row: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .symbol-block span, .amount-block span, .pnl-block span: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .loading-state, .empty-state: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。

### 主题、I18n 与资源

#### 源码样式 Token

- .holding-page.background: --pb-bg
- .summary-label.color: --pb-muted
- .rate.color: --pb-positive
- .filter-chip.border: --pb-border
- .filter-chip.background: --pb-surface
- .filter-chip.color: --pb-muted
- .filter-chip.active.border-color: --pb-primary
- .filter-chip.active.background: --pb-primary-soft
- .filter-chip.active.color: --pb-primary
- .list-header.border-bottom: --pb-border
- .list-header span.color: --pb-muted
- .holding-row.border-bottom: --pb-border
- .symbol-block span, .amount-block span, .pnl-block span.color: --pb-muted
- .pnl-block.positive strong, .pnl-block.positive span.color: --pb-positive
- .pnl-block.negative strong, .pnl-block.negative span.color: --pb-negative
- .loading-state, .empty-state.color: --pb-muted

#### I18n

- title: Portfolio Holdings
- subtitle: Realtime snapshot for long-term positions
- empty: No holdings match current filter
- actions.rebalance: Rebalance
- actions.detail: View detail

#### Assets

- icon: (inline) - 确认是否已有 CommonSvg/IconFont/本地 asset 可复用。

### 目标工程可复用能力

- Widgets: CommonAppBar, CommonButton, CommonEmpty, CommonLoading
- Route files: lib/app/routes/app_routes.dart, lib/app/routes/app_pages.dart
- Translation files: lib/app/translations/en_US.dart, lib/app/translations/zh_CN.dart
- Asset directories: assets/images, assets/svg, assets/json
- Similar files: lib/app/modules/account/presentation/pages/holding_list_page.dart, lib/app/modules/account/application/asset_cubit.dart, lib/app/modules/account/application/asset_state.dart, lib/app/modules/account/data/asset_repository.dart, lib/app/modules/account/domain/asset_models.dart, lib/app/modules/account/presentation/widgets/asset_summary_card.dart, lib/app/modules/account/presentation/widgets/holding_tile.dart, lib/app/modules/account/presentation/pages/pnl_analysis_page.dart, lib/app/modules/account/presentation/widgets/filter_chip_bar.dart, lib/app/modules/account/presentation/widgets/pnl_metric_card.dart, lib/app/modules/account/presentation/widgets/pnl_record_tile.dart, lib/app/modules/account/presentation/widgets/trend_chart.dart

### 人工确认

- 确认静态 mock 数据对应真实接口、Controller 字段或本地状态。
- 确认页面路由参数、返回行为和埋点是否与 YouFi 现有模块一致。
- 确认来源资源是否已有 Flutter 侧等价图片或 SVG，可复用时避免重复迁移。
- P0: 确认目标 Flutter route、Binding、Controller 文件位置符合 YouFi 模块规范。
- P0: 确认 UI 首屏结构、颜色、字号、间距和 i18n 文案与原型一致。
- P0: 确认所有跳转目标和参数映射到 Flutter routes。
- P0: 确认 ScrollController/listener/watch 在 dispose/onClose 中释放。
- P1: 确认图片、SVG、icon、暗色模式资源是否复用现有 assets。

## 重构摘要

- Page: `page_holding-list_mp9owbtw`
- Plan: `plan_page_holding-list_mp9owbtw_mp9owck1`
- Route: /prototype/asset/holding-list
- Target module: account
- Viewport: 390x844

该计划来自统一 PageCanonical，聚焦可见 UI 还原；识别到 12 个视觉区块、37 条文案线索和 0 个资源线索。source facts 包含 6 个语义区块、6 个语义组件、6 个交互线索和 1 个状态线索。业务接口、权限、风控和埋点不在本计划中做确定性推断。

## 视觉区块

- section: section_node_1 (0, 0, 390, 844)
- section: section_node_3 (0, 0, 390, 844)
- section: Holding filters (0, 0, 390, 572.11)
- app-bar: ↻ (18, 18, 354, 48.11)
- card: section_node_10 (18, 82.11, 354, 91)
- section: Holding filters (18, 189.11, 354, 36)
- list: section_node_26 (18, 241.11, 354, 249)
- list: Positions (19, 242.11, 352, 53)
- section: section_node_30 (19, 295.11, 352, 65)
- section: section_node_40 (19, 360.11, 352, 65)
- section: section_node_50 (19, 425.11, 352, 64)
- bottom-bar: View analysis (18, 506.11, 354, 38)

## 计划文件

- `lib/app/modules/account/asset_holding_list/asset_holding_list_page.dart`: 页面入口，按 YouFi 页面基类、Scaffold/SafeArea 和可见区块编排 UI。 (只实现可见 UI；业务数据和接口接入保留 TODO。)
- `lib/app/modules/account/asset_holding_list/asset_holding_list_controller.dart`: 承载轻量 UI 状态，例如 tab、选中项、展开态和点击事件占位。 (不得在 Phase 1 中伪造接口字段、权限或交易规则。)
- `lib/app/modules/account/asset_holding_list/asset_holding_list_binding.dart`: 注册页面 Controller，保持与 YouFi 模块内相似页面一致。
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_section.dart`: 还原 section 区块，bbox=0,0,390,844。 布局特征：descendants=48。 (section)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_holding_filters.dart`: 还原 section 区块，bbox=0,0,390,572.11。 布局特征：padding=18px 18px 28px, descendants=48。 (section)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_migrated.dart`: 还原 app-bar 区块，bbox=18,18,354,48.11。 布局特征：display=flex, alignItems=flex-start, justifyContent=space-between, gap=12px, margin=0px 0px 16px, descendants=4。 (app-bar)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_card.dart`: 还原 card 区块，bbox=18,82.11,354,91。 布局特征：display=grid, gap=12px, padding=16px, descendants=10。 (card)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_list.dart`: 还原 list 区块，bbox=18,241.11,354,249。 布局特征：descendants=33。 (list)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_positions.dart`: 还原 list 区块，bbox=19,242.11,352,53。 布局特征：display=flex, alignItems=center, justifyContent=space-between, padding=16px, descendants=2。 (list)
- `lib/app/modules/account/asset_holding_list/widgets/asset_holding_list_view_analysis.dart`: 还原 bottom-bar 区块，bbox=18,506.11,354,38。 布局特征：display=grid, gap=10px, margin=16px 0px 0px, descendants=2。 (bottom-bar)

## Widget 树

- AssetHoldingListPage: page; 使用 YouFi 页面基类承载整体结构，按 evidence sections 编排子 Widget。
- AssetHoldingListSection -> AssetHoldingListPage: section; 还原 section 区块，bbox=0,0,390,844。 布局特征：descendants=48。
- AssetHoldingListHoldingFilters -> AssetHoldingListPage: section; 还原 section 区块，bbox=0,0,390,572.11。 布局特征：padding=18px 18px 28px, descendants=48。
- AssetHoldingListMigrated -> AssetHoldingListPage: app-bar; 还原 app-bar 区块，bbox=18,18,354,48.11。 布局特征：display=flex, alignItems=flex-start, justifyContent=space-between, gap=12px, margin=0px 0px 16px, descendants=4。
- AssetHoldingListCard -> AssetHoldingListPage: card; 还原 card 区块，bbox=18,82.11,354,91。 布局特征：display=grid, gap=12px, padding=16px, descendants=10。
- AssetHoldingListList -> AssetHoldingListPage: list; 还原 list 区块，bbox=18,241.11,354,249。 布局特征：descendants=33。
- AssetHoldingListPositions -> AssetHoldingListPage: list; 还原 list 区块，bbox=19,242.11,352,53。 布局特征：display=flex, alignItems=center, justifyContent=space-between, padding=16px, descendants=2。
- AssetHoldingListViewAnalysis -> AssetHoldingListPage: bottom-bar; 还原 bottom-bar 区块，bbox=18,506.11,354,38。 布局特征：display=grid, gap=10px, margin=16px 0px 0px, descendants=2。

## 组件映射

- section: (local widget) [low] - No clear YouFi component was detected for evidence role section; implement with local Widget and target theme.
- app-bar: CommonAppBar [high] - Evidence role app-bar can likely use CommonAppBar.
- icon: CommonImage [low] - Evidence role icon can likely use CommonImage.
- card: (local widget) [low] - No clear YouFi component was detected for evidence role card; implement with local Widget and target theme.
- button: CommonButton [high] - Evidence role button can likely use CommonButton.
- list: SmartRefresher [low] - Evidence role list can likely use SmartRefresher.
- bottom-bar: CommonButton [high] - Evidence role bottom-bar can likely use CommonButton.
- app-bar: CommonAppBar [high] - Source component PortfolioHoldingsAppBar (header) can likely use CommonAppBar.
- section: (local widget) [medium] - Source component PanelSection (content-section) should become a local widget unless target examples show a reusable component.
- list: SmartRefresher [low] - Source component PositionsList (list) can likely use SmartRefresher.
- app-bar: CommonAppBar [high] - Source component PositionsAppBar (header) can likely use CommonAppBar.
- list: SmartRefresher [low] - Source component HoldingRowList (list) can likely use SmartRefresher.
- list: SmartRefresher [low] - Source component PortfolioHoldingsList (list) can likely use SmartRefresher.

## 主题映射

- color color = `rgb(23, 32, 42)` -> themeService.colors.* [low, family] (nodes=24)
- color backgroundColor = `rgb(238, 243, 248)` -> themeService.colors.* [low, family] (nodes=2)
- typography font = `16px/normal/400/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=24)
- radius borderRadius = `0px` -> (manual) [low, manual] (nodes=24)
- border border = `0px none rgb(23, 32, 42)` -> (manual) [low, manual] (nodes=24)
- spacing padding = `0px` -> (manual) [low, manual] (nodes=24)
- spacing margin = `0px` -> (manual) [low, manual] (nodes=24)
- spacing padding = `18px 18px 28px` -> (manual) [low, manual] (nodes=1)
- spacing margin = `0px 0px 16px` -> (manual) [low, manual] (nodes=1)
- color color = `rgb(107, 120, 134)` -> themeService.colors.* [low, family] (nodes=14)
- typography font = `12px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=2)
- border border = `0px none rgb(107, 120, 134)` -> (manual) [low, manual] (nodes=11)
- spacing margin = `0px 0px 4px` -> (manual) [low, manual] (nodes=1)
- typography font = `26px/29.12px/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=1)
- color backgroundColor = `rgb(255, 255, 255)` -> themeService.colors.colorBgBase [medium, ambiguous] (nodes=6) candidates: themeService.colors.colorBgBase, themeService.colors.colorPopupBg, themeService.colors.colorSheetBg, themeService.colors.colorTextLight, themeService.colors.colorTextLight1
- radius borderRadius = `8px` -> (manual) [low, manual] (nodes=9)
- shadow boxShadow = `rgba(32, 48, 66, 0.08) 0px 8px 20px 0px` -> (manual) [low, manual] (nodes=1)
- spacing padding = `1px 6px` -> (manual) [low, manual] (nodes=1)
- border border = `1px solid rgb(216, 225, 234)` -> (manual) [low, manual] (nodes=5)
- shadow boxShadow = `rgba(32, 48, 66, 0.08) 0px 8px 24px 0px` -> (manual) [low, manual] (nodes=2)
- spacing padding = `16px` -> (manual) [low, manual] (nodes=2)
- typography font = `12px/normal/400/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=13)
- typography font = `19px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=3)
- spacing margin = `2px 0px 0px` -> (manual) [low, manual] (nodes=3)
- color color = `rgb(22, 133, 91)` -> themeService.colors.* [low, family] (nodes=8)
- border border = `0px none rgb(22, 133, 91)` -> (manual) [low, manual] (nodes=8)
- spacing margin = `3px 0px 0px` -> (manual) [low, manual] (nodes=10)
- spacing padding = `0px 0px 2px` -> (manual) [low, manual] (nodes=1)
- spacing margin = `16px 0px` -> (manual) [low, manual] (nodes=1)
- color color = `rgb(23, 107, 135)` -> themeService.colors.* [low, family] (nodes=2)
- color backgroundColor = `rgb(216, 238, 243)` -> themeService.colors.* [low, family] (nodes=2)
- typography font = `13px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=4)
- border border = `1px solid rgb(23, 107, 135)` -> (manual) [low, manual] (nodes=1)
- spacing padding = `0px 12px` -> (manual) [low, manual] (nodes=4)
- typography font = `17px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=1)
- spacing padding = `14px 16px` -> (manual) [low, manual] (nodes=3)
- typography font = `15px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=9)
- color color = `rgb(196, 69, 60)` -> themeService.colors.* [low, family] (nodes=3)
- border border = `0px none rgb(196, 69, 60)` -> (manual) [low, manual] (nodes=3)
- spacing margin = `16px 0px 0px` -> (manual) [low, manual] (nodes=1)

## 文案 / i18n

Visible text should use YouFi .tr conventions when the target module already has translations; otherwise keep local constants with TODO for translation keys.

- `asset_center`: Asset Center
- `portfolio_holdings`: Portfolio Holdings
- (key TBD): ↻
- `market_value`: Market value
- `128_420_36`: $128,420.36
- `today_p_l`: Today P&L
- `2_364_20`: +$2,364.20
- `1_87`: +1.87%
- `risk`: Risk
- `balanced`: Balanced
- `holding_filters`: Holding filters
- `all`: All
- `semiconductor`: Semiconductor
- `consumer_electronics`: Consumer Electronics
- `ev`: EV
- `positions`: Positions
- `3_items`: 3 items
- `nvda`: NVDA
- `nvidia_corp`: NVIDIA Corp.
- `42_300_00`: $42,300.00
- `120_shares`: 120 shares
- `6_830_20`: +$6,830.20
- `19_2`: +19.2%
- `aapl`: AAPL
- `apple_inc`: Apple Inc.
- `28_740_80`: $28,740.80
- `160_shares`: 160 shares
- `1_420_10`: +$1,420.10
- `5_2`: +5.2%
- `tsla`: TSLA
- `tesla_inc`: Tesla Inc.
- `18_620_60`: $18,620.60
- `48_shares`: 48 shares
- `840_30`: -$840.30
- `4_3`: -4.3%
- `view_analysis`: View analysis
- `rebalance`: Rebalance
- `realtime_snapshot_for_long_term_positions`: Realtime snapshot for long-term positions
- `no_holdings_match_current_filter`: No holdings match current filter
- `view_detail`: View detail

## 资源

Prefer existing assets/images, assets/dark_images, assets/svg, and assets/json entries before adding new files.

- icon: (inline) - 确认是否已有 CommonSvg/IconFont/本地 asset 可复用。

## 交互

- tap: ↻ - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: All - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Semiconductor - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Consumer Electronics - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: EV - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: View analysis - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Rebalance - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: store.refreshPage - @click="store.refreshPage"
- tap: store.setHoldingFilter(filter) - @click="store.setHoldingFilter(filter)"
- tap: store.pushPage('/prototype/asset/pnl-analysis', { source: 'holding-list' }) - @click="store.pushPage('/prototype/asset/pnl-analysis', { source: 'holding-list' })"
- unknown: store.loading - v-if="store.loading"
- unknown: filter in filters - v-for="filter in filters"
- unknown: item in store.filteredHoldings - v-for="item in store.filteredHoldings"

## 业务问题

- 确认页面真实数据来源、接口字段和加载/空态策略。
- 确认点击、跳转、弹层、筛选和输入行为的业务规则。
- 确认权限、风控、埋点和异常处理是否需要在本页面接入。
- PageCanonical 识别到 7 个可交互区域，需要逐项确认业务动作。
- Source facts 识别到 1 个状态线索，需要确认哪些属于真实业务状态、哪些只是 UI 临时状态。

## 风险

- PageCanonical 只能证明当前采集到的可见 UI 与增强证据，不能证明隐藏状态或业务逻辑。
- 少量 computed style 仍可能映射到多个 YouFi 语义 token，需结合 node 上下文和截图二次确认。
- Target suggested module (account) differs from source module (asset).

## 证据来源

- source-analysis: sourceFacts, page.title, page.route, semantic structure, state space, interactions
- runtime-capture: runtimeFacts, sections, nodes, text, tokens, assets, interactions, screenshots
- target-inspect: targetFacts, module, routes, theme, components, examples
- page-merge: fieldPriority, mismatches, manualConfirmations

## 验证提示

- Compare the generated Flutter screen against the source screenshot before adding business behavior.
- Treat typography, CSS colors, spacing, and layout as P0 visual fidelity items; prefer exact evidence matches before approximate fallback.
- Use node-level themeMappings first; when a theme token is resolved exactly, do not replace it with a larger or heavier nearby token.
- Check spacing, radius, border, and shadow values against reusable YouFi widgets before introducing local constants.
- Keep business data, API fields, permission checks, risk controls, and tracking as TODOs unless confirmed by YouFi examples.
- Prefer similar module examples and common widgets over one-to-one DOM translation.
