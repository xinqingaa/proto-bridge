# 账本星球产品需求

- Prototype ID：`ledger-planet`
- 产品类型：离线优先的个人账本原型
- 核心任务：记账、查看流水与分析、完成权益任务、管理个人资产和设置

## 产品气质

界面强调清爽与效率。可以使用小面积光斑、细渐变和票券轮廓作为视觉识别，但内容、状态和连续操作优先于装饰。

原型需要走通主流程，不以静态 Demo 或组件拼盘作为完成状态。

## 功能边界

包含：

- 三个一级 Tab 与二级/三级栈页；
- 确定性 mock/fixture；
- 可执行的主路径交互；
- 下拉刷新与加载更多；
- CSS/SVG 图表；
- 帮助文章模拟内容。

不包含：

- 多账本；
- 真实后端与跨设备同步；
- 支付、登录鉴权和真实导入导出；
- 依赖系统时间或网络的不确定数据；
- 业务专用共享 Token；
- 第三方图表库。

## 信息架构

一级 Tab：

1. 记账
2. 权益
3. 我的

记账：

- 首页；
- 全部流水；
- 记一笔；
- 流水详情；
- 图表分析。

权益：

- 活动详情；
- 任务列表；
- 任务详情；
- 券包；
- 券详情。

我的：

- 钱包；
- 个人资料；
- 设置；
- 帮助中心；
- 帮助文章；
- 关于。

## 壳与导航

- 默认 Tab 是记账。
- 一级主体使用 `TabViewport + BottomNavigation`，两者共享选中值。
- 一级 AppBar 按页面需要提供标题和全局操作。
- 二级/三级页使用带返回的 AppBar，不显示 BottomNavigation。
- Tab 切换使用 route replace；二级进栈使用 push。
- 深链页面返回到所属 Tab home。
- 跨 Tab 进栈先规范化目标 Tab parent。
- 记一笔入口位于 AppBar，不使用 FAB。
- 权益任务可以深链到记一笔。

## 业务规则

1. 钱包余额与账本账户余额使用同一套 fixture。
2. 本月结余等于收入减支出。
3. 首页只回答今日、本周、最近流水和一条关键洞察。
4. 全部流水负责时间范围、搜索和组合筛选。
5. 时间范围和高级筛选使用 Bottom Sheet，并提供可复现 Variant。
6. 图表分析共享时间/筛选上下文，图表点击可以回到对应流水结果。
7. 新增和编辑共用金额优先的记账器。
8. 分类、账户、日期和扩展字段使用明确的表单或 Sheet。
9. 日期可以使用原生日期控件，替换为 Design System 组件时不得增加平行契约。

## Design System 规则

- 使用 PBWork AppBar、BottomNavigation、TabViewport、FilterBar、Card、Chip、DataList、ScrollableDataList、Dialog、BottomSheet、Snackbar 等对口组件。
- 业务局部 UI 包括流水行、摘要数字、PeriodSegment 和 CSS/SVG 图形。
- 业务局部 UI 的颜色、字体、间距、尺寸、圆角、边框、阴影和动效全部使用 PB Token。
- Card 只承载独立交互模块；连续列表行不逐项卡片化。
- `DataList` 只负责表面与分隔，`ScrollableDataList` 负责滚动、刷新和分页。

## Tabs 与手势

- 一级主体面板内不嵌套带 window 的 `Tabs`。
- 二级页面可以使用 `Tabs`，每个 item 必须有对应具名 slot。
- 日/周/月/年等维度使用无 window 分段并标记 `data-no-swipe`。
- 券包的未用/已用/过期使用二级 Tabs。
- 页面只有一个主纵滚。
- 嵌套横向区域使用共享手势仲裁。
- 原型内滚动条可以隐藏，但滚动和键盘访问必须保持。

## Runtime 与 Evidence

- 所有 Screen/Variant 在唯一 Registry 注册。
- default 与 critical Variant 声明 `requiredFragments`。
- 关键节点具有稳定 `data-pb-id`、`data-pb-role` 和按需 `data-pb-key`。
- 关键任务通过 Action、Scenario 和 Checkpoint 表达。
- Variant、Theme、Fixture 和 Device 是独立维度。
- 所有 Capture 数据确定性可重置。

## 主路径

1. 首页查看今日预算、本周趋势、消费画像和最近流水。
2. AppBar 新增 → 金额 → 分类/账户/日期 → 保存 → 回首页。
3. 流水详情 → 编辑或删除确认。
4. 全部流水 → 时间、类型、分类、账户和金额联合筛选。
5. 首页/分析 → 分类结果回到流水列表。
6. 权益任务 → 记一笔 → 领奖/券包。
7. 我的 → 钱包、资料、设置、帮助文章。
8. 一级点击与横滑一致，Overlay 和关键状态可由 Variant/Scenario 打开。

## 目录

```text
ledger-planet/
├── LedgerPlanetShell.vue
├── TabRoot.vue
├── DateRangeSheet.vue
├── PeriodSegment.vue
├── nav.ts
├── theme-session.ts
├── panels/
├── screens/
├── mock.ts
├── requirements.md
└── implementation-notes.md
```
