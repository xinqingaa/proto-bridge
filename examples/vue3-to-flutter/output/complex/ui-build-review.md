# P&L Analysis Review

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

- Page: 盈亏分析
- Route: /prototype/asset/pnl-analysis
- screenId: asset.pnl-analysis
- Source module: asset
- Target module: account
- Implementation shape: BaseGetView
- Status: ready
- Owner: ProtoBridge Example

### 迁移结论

- Flutter complexity: complex
- Page pattern: quote-detail
- Pattern confidence: high
- Recommended shape: BaseGetView
- Target module: account
- Direct implementation: 可以进入实现
- Implementation summary: 该页面属于复杂页面，页面模式识别为行情详情页，置信度高；建议使用父页面编排 + 多个子 Widget + Controller/数据适配层分层实现；状态管理只保留 Flutter 实现需要的页面状态，避免把来源页面的临时状态逐项搬进 GetX。图表/指标计算应单独放入 adapter 或 service，避免在 Widget build 中复算。
- Top risks: (none)

### Flutter 实现规划

#### 目标文件

- `lib/app/modules/account/asset_pnl_analysis/asset_pnl_analysis_page.dart`: 父页面入口，绑定 route、Controller、Scaffold/SafeArea，并编排子 Widget。 (父页面不直接承载复杂业务计算。)
- `lib/app/modules/account/asset_pnl_analysis/asset_pnl_analysis_controller.dart`: 管理页面级 UI 状态、路由参数、滚动控制和事件分发。 (按 UI 状态、业务数据、派生数据重新归类，不要把来源页面临时状态逐项搬迁。)
- `lib/app/modules/account/asset_pnl_analysis/asset_pnl_analysis_binding.dart`: 注册 Controller 及必要 service/repository 依赖。
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_body.dart`: 按内容顺序组合私有 Widget。 (content composition)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_header.dart`: 优先复用 CommonAppBar 或现有 header pattern。 (header)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_quote_summary.dart`: 展示核心行情、涨跌幅、关键指标和收藏/更多入口状态。 (summary)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_primary_tabs.dart`: 展示一级页签和选中态，通过回调通知父级切换。 (tabs)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_chart_panel.dart`: 消费 chart adapter 输出，不在 build 内计算指标。 (chart)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_data_sections.dart`: 展示持仓、历史、指标等数据区块；根据数据量选择 Column/ListView。 (list)
- `lib/app/modules/account/asset_pnl_analysis/models/asset_pnl_analysis_ui_model.dart`: 定义 UI 所需字段模型；真实数据源待业务接口确认后替换 mock。

#### Widget 组成

- AssetPnlAnalysisPage: route/page composition; 建议只负责页面级布局和子 Widget 编排。
- AssetPnlAnalysisBody -> AssetPnlAnalysisPage: content composition; 按内容顺序组合私有 Widget。
- AssetPnlAnalysisHeader -> AssetPnlAnalysisPage: header; 优先复用 CommonAppBar 或现有 header pattern。
- AssetPnlAnalysisQuoteSummary -> AssetPnlAnalysisBody: summary; 展示核心行情、涨跌幅、关键指标和收藏/更多入口状态。
- AssetPnlAnalysisPrimaryTabs -> AssetPnlAnalysisBody: tabs; 展示一级页签和选中态，通过回调通知父级切换。
- AssetPnlAnalysisChartPanel -> AssetPnlAnalysisBody: chart; 消费 chart adapter 输出，不在 build 内计算指标。
- AssetPnlAnalysisDataSections -> AssetPnlAnalysisBody: list; 展示持仓、历史、指标等数据区块；根据数据量选择 Column/ListView。

#### Widget 契约

- AssetPnlAnalysisBody: inputs=[section data model], callbacks=[none], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetPnlAnalysisHeader: inputs=[quote/ui summary model], callbacks=[onBack, onMore], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetPnlAnalysisQuoteSummary: inputs=[quote/ui summary model], callbacks=[none], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetPnlAnalysisPrimaryTabs: inputs=[tabs, activeKey], callbacks=[onTabChanged], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetPnlAnalysisChartPanel: inputs=[chartViewModel, selectedPeriod, selectedIndicator], callbacks=[onPeriodChanged, onIndicatorChanged], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。
- AssetPnlAnalysisDataSections: inputs=[section data model], callbacks=[none], readsController=false; 默认通过构造参数传入数据和 callback；除父页面/组合层外，不建议子 Widget 直接 Get.find 整个 Controller。

#### Controller 边界

- AssetPnlAnalysisController: 页面 orchestration controller；负责状态组合、生命周期和事件分发，不负责绘制细节。; owns=[页面级 UI 状态, 路由参数读取, 事件分发, 滚动/监听生命周期, 导航行为]; avoids=[逐层照搬来源页面结构, 在 build 中做重计算, 让所有子 Widget 直接读整个 Controller]
- AssetPnlAnalysisData/Chart Adapter: 将接口或 mock 数据整理成 UI/图表绘制模型。; owns=[mock 到 model 的转换, 派生数据和图表 series 计算, 缓存策略]; avoids=[直接依赖 BuildContext, 触发导航, 持有 Widget 状态]

#### 不要直译

- 不要把来源页面结构逐层翻译成 Flutter Widget；按业务区块和 Flutter 布局模型重组。
- 不要把临时 mock 数据直接写在 Widget build 中；先确认接口/model/fixture 边界。
- 不要让每个子 Widget 都直接依赖整个 Controller；优先通过构造参数传入数据，并用回调上报交互。
- 不要把来源页面的临时状态一对一迁移为 Rx；先按 UI 状态、业务数据、派生数据、生命周期副作用分类。
- 不要忽略 fixed/sticky/scroll/safe-area；先确定 Scaffold、Stack、ScrollController/Sliver 的组合。

### 状态与交互

#### 状态策略

- 页面级 UI 状态 (controller): 建议放入页面 Controller，按 tab/展开/选择态分组管理：tabs。
- 业务数据与 mock 数据 (repository): 不要把临时 mock 数组直接写入 Widget；先定义 UI model，再由接口/repository/fixture 填充。
- 路由与参数 (controller): Controller 统一读取 route 参数并暴露页面初始状态；子 Widget 只通过 callback 触发导航。
- 生命周期与副作用 (controller): ScrollController/listener/watch 副作用必须有明确注册和释放位置；默认放 Controller.onInit/onClose，只有依赖首帧布局或滚动定位时再使用 onReady/首帧回调。

#### 生命周期与副作用

- onMounted: route query initialization - 迁移到 Controller.onReady 或页面首帧回调；涉及滚动需绑定 ScrollController 后执行。
- watch: () => store.activePnlTab - 迁移为 ever/worker、Rx 监听或在 setter 中触发副作用。

#### 交互事件

- click: store.openFilterSheet - @click="store.openFilterSheet"
- click: store.setPnlTab(tab.value) - @click="store.setPnlTab(tab.value)"
- click: store.refreshPage - @click="store.refreshPage"
- click: store.openRecord(record) - @click="store.openRecord(record)"
- click: store.closeFilterSheet - @click="store.closeFilterSheet"
- click: store.setRiskFilter(risk) - @click="store.setRiskFilter(risk)"
- click: store.closeRecord - @click="store.closeRecord"
- click: store.pushPage('/prototype/asset/holding-list', { symbol: store.selectedRecord.symbol }) - @click="store.pushPage('/prototype/asset/holding-list', { symbol: store.selectedRecord.symbol })"
- conditional: store.loading - v-if="store.loading"
- conditional: store.filterSheetOpen - v-if="store.filterSheetOpen"
- conditional: store.selectedRecord - v-if="store.selectedRecord"
- loop: tab in tabs - v-for="tab in tabs"
- loop: metric in store.pnlMetrics - v-for="metric in store.pnlMetrics"
- loop: (point, index) in store.trendPoints - v-for="(point, index) in store.trendPoints"
- loop: record in store.filteredRecords - v-for="record in store.filteredRecords"
- loop: risk in riskOptions - v-for="risk in riskOptions"
- watch: (unknown) - watch(...)

### 路由与布局

#### 路由与参数

- Source route: /prototype/asset/pnl-analysis
- Target route files: lib/app/routes/app_routes.dart, lib/app/routes/app_pages.dart

#### 路由行为

- navigate: /prototype/asset/holding-list / { symbol: store.selectedRecord.symbol } - 映射到 Get.toNamed/AppRoutes，确认 /prototype/asset/holding-list 对应 Flutter route 和参数。
- read-query: tab - 从 Get.parameters/Get.arguments 读取 tab，确认默认值和来源页面。

#### 布局模型

- grid .tab-bar: 迁移为 GridView/Wrap 或自定义布局。
- spacing .tab-bar: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- grid .metrics-grid: 迁移为 GridView/Wrap 或自定义布局。
- spacing .metrics-grid: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .metric-card: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .metric-card strong: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .metric-card small: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .trend-panel, .record-panel: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- flex .section-heading: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- spacing .section-heading: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .section-heading h2: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .section-heading p: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- flex .trend-chart: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- grid .trend-chart: 迁移为 GridView/Wrap 或自定义布局。
- spacing .trend-chart: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- flex .record-row: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- grid .record-row: 迁移为 GridView/Wrap 或自定义布局。
- spacing .record-row: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .record-row span, .record-value span: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .loading-state, .empty-state: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- fixed .sheet-backdrop: 使用 Stack/Positioned 或 Scaffold.bottomNavigationBar，注意 SafeArea 与内容底部 padding。
- flex .sheet-backdrop: 迁移为 Row/Column/Flex，确认主轴、间距和对齐。
- spacing .sheet-backdrop: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .filter-sheet, .detail-sheet: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .sheet-option: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- grid .detail-grid: 迁移为 GridView/Wrap 或自定义布局。
- spacing .detail-grid: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .detail-grid div: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。
- spacing .detail-grid dd: 将间距抽成 EdgeInsets/SizedBox，优先复用设计间距 token。

### 主题、I18n 与资源

#### 源码样式 Token

- .pnl-page.background: --pb-bg
- .tab-bar.border: --pb-border
- .metric-card span.color: --pb-muted
- .section-heading p.color: --pb-muted
- .trend-chart.background: --pb-surface-soft
- .trend-bar.background: #176b87
- .record-row.border-bottom: --pb-border
- .record-row span, .record-value span.color: --pb-muted
- .loading-state, .empty-state.color: --pb-muted
- .sheet-option.border: --pb-border
- .sheet-option.background: --pb-surface
- .sheet-option.color: --pb-text
- .sheet-option.active.border-color: --pb-primary
- .sheet-option.active.background: --pb-primary-soft
- .sheet-option.active.color: --pb-primary
- .detail-grid div.background: --pb-surface-soft
- .detail-grid dt.color: --pb-muted

#### I18n

- title: P&L Analysis
- subtitle: Break down realized and unrealized returns
- tabs.overview: Overview
- tabs.realized: Realized
- tabs.risk: Risk
- actions.filter: Filter
- actions.export: Export
- actions.close: Close

#### Assets

- icon: (inline) - 确认是否已有 CommonSvg/IconFont/本地 asset 可复用。

### 目标工程可复用能力

- Widgets: CommonAppBar, CommonButton, CommonEmpty, CommonLoading
- Route files: lib/app/routes/app_routes.dart, lib/app/routes/app_pages.dart
- Translation files: lib/app/translations/en_US.dart, lib/app/translations/zh_CN.dart
- Asset directories: assets/images, assets/svg, assets/json
- Similar files: lib/app/modules/account/presentation/pages/pnl_analysis_page.dart, lib/app/modules/account/application/asset_cubit.dart, lib/app/modules/account/application/asset_state.dart, lib/app/modules/account/data/asset_repository.dart, lib/app/modules/account/domain/asset_models.dart, lib/app/modules/account/presentation/widgets/asset_summary_card.dart, lib/app/modules/account/presentation/widgets/pnl_metric_card.dart, lib/app/modules/account/presentation/widgets/pnl_record_tile.dart, lib/app/modules/account/presentation/pages/holding_list_page.dart, lib/app/modules/account/presentation/widgets/filter_chip_bar.dart, lib/app/modules/account/presentation/widgets/holding_tile.dart, lib/app/modules/account/presentation/widgets/trend_chart.dart

### 人工确认

- 确认静态 mock 数据对应真实接口、Controller 字段或本地状态。
- 确认页面路由参数、返回行为和埋点是否与 YouFi 现有模块一致。
- 确认来源资源是否已有 Flutter 侧等价图片或 SVG，可复用时避免重复迁移。
- P0: 确认目标 Flutter route、Binding、Controller 文件位置符合 YouFi 模块规范。
- P0: 确认 UI 首屏结构、颜色、字号、间距和 i18n 文案与原型一致。
- P0: 确认所有跳转目标和参数映射到 Flutter routes。
- P0: 确认 ScrollController/listener/watch 在 dispose/onClose 中释放。
- P1: 确认图片、SVG、icon、暗色模式资源是否复用现有 assets。
- P2: 为核心子 Widget 保留可独立调试入口或最小 fixture。

## 重构摘要

- Page: `page_pnl-analysis_mp9owcn4`
- Plan: `plan_page_pnl-analysis_mp9owcn4_mp9owd96`
- Route: /prototype/asset/pnl-analysis
- Target module: account
- Viewport: 390x844

该计划来自统一 PageCanonical，聚焦可见 UI 还原；识别到 19 个视觉区块、40 条文案线索和 0 个资源线索。source facts 包含 17 个语义区块、17 个语义组件、17 个交互线索和 2 个状态线索。增强能力包括 tab traversal。业务接口、权限、风控和埋点不在本计划中做确定性推断。

## 视觉区块

- section: section_node_1 (0, 0, 390, 949.11)
- section: section_node_3 (0, 0, 390, 949.11)
- section: Analysis tabs (0, 0, 390, 949.11)
- app-bar: ⌘ (18, 18, 354, 48.11)
- tab-bar: Analysis tabs (18, 82.11, 354, 44)
- section: section_node_14 (18, 140.11, 354, 202)
- card: Total P&L (18, 140.11, 172, 96)
- card: Realized (200, 140.11, 172, 96)
- card: Unrealized (18, 246.11, 172, 96)
- card: Risk Budget (200, 246.11, 172, 96)
- card: P&L trend chart (18, 354.11, 354, 220)
- section: Refresh (35, 371.11, 320, 38)
- card: P&L trend chart (35, 425.11, 320, 132)
- card: section_node_46 (18, 586.11, 354, 335)
- section: Filter (35, 603.11, 320, 38)
- section: section_node_52 (35, 641.11, 320, 66)
- section: section_node_59 (35, 707.11, 320, 66)
- section: section_node_66 (35, 773.11, 320, 66)
- section: section_node_73 (35, 839.11, 320, 65)

## 计划文件

- `lib/app/modules/account/asset_pnl_analysis/asset_pnl_analysis_page.dart`: 页面入口，按 YouFi 页面基类、Scaffold/SafeArea 和可见区块编排 UI。 (只实现可见 UI；业务数据和接口接入保留 TODO。)
- `lib/app/modules/account/asset_pnl_analysis/asset_pnl_analysis_controller.dart`: 承载轻量 UI 状态，例如 tab、选中项、展开态和点击事件占位。 (不得在 Phase 1 中伪造接口字段、权限或交易规则。)
- `lib/app/modules/account/asset_pnl_analysis/asset_pnl_analysis_binding.dart`: 注册页面 Controller，保持与 YouFi 模块内相似页面一致。
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_section.dart`: 还原 section 区块，bbox=0,0,390,949.11。 布局特征：descendants=48。 (section)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_analysis_tabs.dart`: 还原 section 区块，bbox=0,0,390,949.11。 布局特征：padding=18px 18px 28px, descendants=48。 (section)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_migrated.dart`: 还原 app-bar 区块，bbox=18,18,354,48.11。 布局特征：display=flex, alignItems=center, justifyContent=space-between, gap=12px, margin=0px 0px 16px, descendants=4。 (app-bar)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_total_pl.dart`: 还原 card 区块，bbox=18,140.11,172,96。 布局特征：padding=14px, descendants=3。 (card)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_realized.dart`: 还原 card 区块，bbox=200,140.11,172,96。 布局特征：padding=14px, descendants=3。 (card)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_unrealized.dart`: 还原 card 区块，bbox=18,246.11,172,96。 布局特征：padding=14px, descendants=3。 (card)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_risk_budget.dart`: 还原 card 区块，bbox=200,246.11,172,96。 布局特征：padding=14px, descendants=3。 (card)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_pltrend_chart.dart`: 还原 card 区块，bbox=18,354.11,354,220。 布局特征：padding=16px, margin=12px 0px 0px, descendants=14。 (card)
- `lib/app/modules/account/asset_pnl_analysis/widgets/asset_pnl_analysis_refresh.dart`: 还原 section 区块，bbox=35,371.11,320,38。 布局特征：display=flex, alignItems=center, justifyContent=space-between, gap=12px, descendants=4。 (section)

## Widget 树

- AssetPnlAnalysisPage: page; 使用 YouFi 页面基类承载整体结构，按 evidence sections 编排子 Widget。
- AssetPnlAnalysisSection -> AssetPnlAnalysisPage: section; 还原 section 区块，bbox=0,0,390,949.11。 布局特征：descendants=48。
- AssetPnlAnalysisAnalysisTabs -> AssetPnlAnalysisPage: section; 还原 section 区块，bbox=0,0,390,949.11。 布局特征：padding=18px 18px 28px, descendants=48。
- AssetPnlAnalysisMigrated -> AssetPnlAnalysisPage: app-bar; 还原 app-bar 区块，bbox=18,18,354,48.11。 布局特征：display=flex, alignItems=center, justifyContent=space-between, gap=12px, margin=0px 0px 16px, descendants=4。
- AssetPnlAnalysisTotalPL -> AssetPnlAnalysisPage: card; 还原 card 区块，bbox=18,140.11,172,96。 布局特征：padding=14px, descendants=3。
- AssetPnlAnalysisRealized -> AssetPnlAnalysisPage: card; 还原 card 区块，bbox=200,140.11,172,96。 布局特征：padding=14px, descendants=3。
- AssetPnlAnalysisUnrealized -> AssetPnlAnalysisPage: card; 还原 card 区块，bbox=18,246.11,172,96。 布局特征：padding=14px, descendants=3。
- AssetPnlAnalysisRiskBudget -> AssetPnlAnalysisPage: card; 还原 card 区块，bbox=200,246.11,172,96。 布局特征：padding=14px, descendants=3。
- AssetPnlAnalysisPLTrendChart -> AssetPnlAnalysisPage: card; 还原 card 区块，bbox=18,354.11,354,220。 布局特征：padding=16px, margin=12px 0px 0px, descendants=14。
- AssetPnlAnalysisRefresh -> AssetPnlAnalysisPage: section; 还原 section 区块，bbox=35,371.11,320,38。 布局特征：display=flex, alignItems=center, justifyContent=space-between, gap=12px, descendants=4。

## 组件映射

- section: (local widget) [low] - No clear YouFi component was detected for evidence role section; implement with local Widget and target theme.
- app-bar: CommonAppBar [high] - Evidence role app-bar can likely use CommonAppBar.
- icon: CommonImage [low] - Evidence role icon can likely use CommonImage.
- tab-bar: (local widget) [low] - No clear YouFi component was detected for evidence role tab-bar; implement with local Widget and target theme.
- button: CommonButton [high] - Evidence role button can likely use CommonButton.
- card: (local widget) [low] - No clear YouFi component was detected for evidence role card; implement with local Widget and target theme.
- modal: Pop.sheet [low] - Source component FilterByRiskModal (modal) can likely use Pop.sheet.
- modal: Pop.sheet [low] - Source component DetailModal (modal) can likely use Pop.sheet.
- tab-bar: (local widget) [medium] - Source component TabBar (tabs) should become a local widget unless target examples show a reusable component.
- tab-bar: (local widget) [medium] - Source component TabButtonTabBar (tabs) should become a local widget unless target examples show a reusable component.
- list: SmartRefresher [low] - Source component PanelList (list) can likely use SmartRefresher.
- section: (local widget) [medium] - Source component ReturnTrendChart (chart) should become a local widget unless target examples show a reusable component.
- section: (local widget) [medium] - Source component TrendChart (chart) should become a local widget unless target examples show a reusable component.
- list: SmartRefresher [low] - Source component TradeRecordsList (list) can likely use SmartRefresher.
- section: (local widget) [medium] - Source component TradeRecordsSection (content-section) should become a local widget unless target examples show a reusable component.
- section: (local widget) [medium] - Source component FilterByRiskSection (content-section) should become a local widget unless target examples show a reusable component.
- modal: Pop.sheet [low] - Source component SheetOptionModal (modal) can likely use Pop.sheet.
- section: (local widget) [medium] - Source component DetailSection (content-section) should become a local widget unless target examples show a reusable component.
- app-bar: CommonAppBar [high] - Source component PLAnalysisAppBar (header) can likely use CommonAppBar.

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
- color color = `rgb(107, 120, 134)` -> themeService.colors.* [low, family] (nodes=17)
- typography font = `12px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=1)
- border border = `0px none rgb(107, 120, 134)` -> (manual) [low, manual] (nodes=17)
- spacing margin = `0px 0px 4px` -> (manual) [low, manual] (nodes=1)
- typography font = `26px/29.12px/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=1)
- color backgroundColor = `rgb(255, 255, 255)` -> themeService.colors.colorBgBase [medium, ambiguous] (nodes=7) candidates: themeService.colors.colorBgBase, themeService.colors.colorPopupBg, themeService.colors.colorSheetBg, themeService.colors.colorTextLight, themeService.colors.colorTextLight1
- radius borderRadius = `8px` -> (manual) [low, manual] (nodes=11)
- shadow boxShadow = `rgba(32, 48, 66, 0.08) 0px 8px 20px 0px` -> (manual) [low, manual] (nodes=1)
- spacing padding = `1px 6px` -> (manual) [low, manual] (nodes=4)
- color backgroundColor = `rgba(255, 255, 255, 0.78)` -> themeService.colors.* [low, family] (nodes=1)
- border border = `1px solid rgb(216, 225, 234)` -> (manual) [low, manual] (nodes=7)
- spacing padding = `4px` -> (manual) [low, manual] (nodes=1)
- spacing margin = `0px 0px 14px` -> (manual) [low, manual] (nodes=1)
- color color = `rgb(255, 255, 255)` -> themeService.colors.colorTextLight [medium, ambiguous] (nodes=1) candidates: themeService.colors.colorTextLight, themeService.colors.colorTextLight1, themeService.colors.colorBgBase, themeService.colors.colorPopupBg, themeService.colors.colorSheetBg
- color backgroundColor = `rgb(23, 107, 135)` -> themeService.colors.* [low, family] (nodes=1)
- typography font = `13px/normal/800/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=3)
- radius borderRadius = `7px` -> (manual) [low, manual] (nodes=3)
- border border = `0px none rgb(255, 255, 255)` -> (manual) [low, manual] (nodes=1)
- spacing margin = `0px 0px 12px` -> (manual) [low, manual] (nodes=1)
- shadow boxShadow = `rgba(32, 48, 66, 0.08) 0px 8px 24px 0px` -> (manual) [low, manual] (nodes=6)
- spacing padding = `14px` -> (manual) [low, manual] (nodes=4)
- typography font = `12px/normal/400/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=14)
- color color = `rgb(22, 133, 91)` -> themeService.colors.* [low, family] (nodes=9)
- typography font = `21px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=4)
- border border = `0px none rgb(22, 133, 91)` -> (manual) [low, manual] (nodes=9)
- spacing margin = `8px 0px 0px` -> (manual) [low, manual] (nodes=4)
- typography font = `12px/normal/800/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=4)
- spacing margin = `4px 0px 0px` -> (manual) [low, manual] (nodes=12)
- spacing padding = `16px` -> (manual) [low, manual] (nodes=2)
- spacing margin = `12px 0px 0px` -> (manual) [low, manual] (nodes=2)
- typography font = `17px/normal/700/Inter, ui-sans-serif, system-ui, -apple-system, "system-ui", "Segoe UI", sans-serif` -> themeService.textStyles.* [low, family] (nodes=2)

## 文案 / i18n

Visible text should use YouFi .tr conventions when the target module already has translations; otherwise keep local constants with TODO for translation keys.

- `asset_center`: Asset Center
- `p_l_analysis`: P&L Analysis
- (key TBD): ⌘
- `analysis_tabs`: Analysis tabs
- `overview`: Overview
- `realized`: Realized
- `risk`: Risk
- `total_p_l`: Total P&L
- `18_206`: +$18,206
- `12_8`: +12.8%
- `7_418`: +$7,418
- `4_6`: +4.6%
- `unrealized`: Unrealized
- `10_788`: +$10,788
- `8_2`: +8.2%
- `risk_budget`: Risk Budget
- `63`: 63%
- `5_pts`: -5 pts
- `return_trend`: Return Trend
- `8_sessions_current_tab_overview`: 8 sessions, current tab: overview
- `refresh`: Refresh
- `p_l_trend_chart`: P&L trend chart
- `trade_records`: Trade Records
- `risk_filter_all`: Risk filter: All
- `filter`: Filter
- `nvda`: NVDA
- `take_profit_09_42`: Take Profit · 09:42
- `2_180_00`: +$2,180.00
- `medium`: Medium
- `aapl`: AAPL
- `covered_call_10_18`: Covered Call · 10:18
- `620_40`: +$620.40
- `low`: Low
- `tsla`: TSLA
- `stop_loss_11_05`: Stop Loss · 11:05
- `430_20`: -$430.20
- `high`: High
- `msft`: MSFT
- `add_position_13_24`: Add Position · 13:24
- `780_90`: +$780.90

## 资源

Prefer existing assets/images, assets/dark_images, assets/svg, and assets/json entries before adding new files.

- icon: (inline) - 确认是否已有 CommonSvg/IconFont/本地 asset 可复用。

## 交互

- tap: ⌘ - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Overview - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Realized - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Risk - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Refresh - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Filter - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_52 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_53 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: NVDA - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Take Profit · 09:42 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_56 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: +$2,180.00 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Medium - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_59 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_60 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: AAPL - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Covered Call · 10:18 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_63 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: +$620.40 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Low - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_66 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_67 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: TSLA - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Stop Loss · 11:05 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_70 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: -$430.20 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: High - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_73 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_74 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: MSFT - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Add Position · 13:24 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: node_77 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: +$780.90 - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: Medium - Implement only the visible UI response or callback boundary in Phase 1; leave business behavior as TODO unless a similar YouFi example confirms it.
- tap: store.openFilterSheet - @click="store.openFilterSheet"
- tap: store.setPnlTab(tab.value) - @click="store.setPnlTab(tab.value)"
- tap: store.refreshPage - @click="store.refreshPage"
- tap: store.openRecord(record) - @click="store.openRecord(record)"
- tap: store.closeFilterSheet - @click="store.closeFilterSheet"
- tap: store.setRiskFilter(risk) - @click="store.setRiskFilter(risk)"
- tap: store.closeRecord - @click="store.closeRecord"
- tap: store.pushPage('/prototype/asset/holding-list', { symbol: store.selectedRecord.symbol }) - @click="store.pushPage('/prototype/asset/holding-list', { symbol: store.selectedRecord.symbol })"
- unknown: store.loading - v-if="store.loading"
- unknown: store.filterSheetOpen - v-if="store.filterSheetOpen"
- unknown: store.selectedRecord - v-if="store.selectedRecord"
- unknown: tab in tabs - v-for="tab in tabs"
- unknown: metric in store.pnlMetrics - v-for="metric in store.pnlMetrics"
- unknown: (point, index) in store.trendPoints - v-for="(point, index) in store.trendPoints"
- unknown: record in store.filteredRecords - v-for="record in store.filteredRecords"
- unknown: risk in riskOptions - v-for="risk in riskOptions"
- unknown: source:interaction:16 - watch(...)

## 业务问题

- 确认页面真实数据来源、接口字段和加载/空态策略。
- 确认点击、跳转、弹层、筛选和输入行为的业务规则。
- 确认权限、风控、埋点和异常处理是否需要在本页面接入。
- PageCanonical 识别到 34 个可交互区域，需要逐项确认业务动作。
- Source facts 识别到 2 个状态线索，需要确认哪些属于真实业务状态、哪些只是 UI 临时状态。

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
