# 冷链原型 V6 实施问题回查记录

记录日期：2026-08-05（Asia/Shanghai）

验收类型：Evidence 到 Target 实施回查与人工产品效果复核  
验收状态：完成首轮回查，存在实施侧修正项  
本记录性质：问题记录，不改变既有 Phase 5 门禁结论

关联计划：
[冷链原型高保真还原：现状诊断、边界与优化规划](../../2026-08-03-cold-chain-reconstruction-audit-and-optimization-plan.md)

关联原型：`apps/pbwork/src/prototypes/cold-chain-ops`

目标工程：`apps/flutter_pb_app`

## 一、验收目的

本记录针对新建的 `v6` Flutter 实施进行独立问题回查，重点确认：

1. Evidence 的页面结构和滚动所有者是否被准确转译；
2. Source mock、事件、温度序列和表单选项是否被复用；
3. 路由参数是否真正被目标页面消费；
4. Variant、Scenario、筛选、校验、弹层和 Toast 是否闭环；
5. Token 是否不仅使用了 `TS.*`，同时绑定到了正确的 Evidence slot；
6. 区分实施责任、Target 公共组件维护差异和平台迁移因素。

本记录不将“代码可运行”或“测试通过”直接等同于高保真验收通过，也不对 Agent 的主观动机下结论。若干问题表现为实施和回查流程中的 shortcut，但本记录只记录可验证的工程事实。

## 二、固定验收对象

本次回查使用的 Delivery：

`.proto-bridge/deliveries/2026-08-05T17-12-11+08-00`

固定引用：

- Workspace：`pbwork-local`
- Bundle：`bundle-2026-08-05t091141915-d462a2e4`
- Snapshot：`snapshot-2026-08-05t091204633-6598bd9d`
- Handoff：`handoff-2026-08-05t091211029-0adba662`
- Target root：`apps/flutter_pb_app`
- Source：`apps/pbwork/src/prototypes/cold-chain-ops`
- Source Screenshot 数量：16
- Delivery coverage：`complete`
- Delivery freshness：`fresh`

V6 实施范围：

- `apps/flutter_pb_app/lib/features/v6/models.dart`
- `apps/flutter_pb_app/lib/features/v6/exception_queue_page.dart`
- `apps/flutter_pb_app/lib/features/v6/shipment_detail_page.dart`
- `apps/flutter_pb_app/lib/features/v6/resolution_form_page.dart`
- `apps/flutter_pb_app/lib/router/routes.dart`
- `apps/flutter_pb_app/lib/router/router.dart`
- `apps/flutter_pb_app/test/v6_test.dart`

关联入口和回归测试：

- `apps/flutter_pb_app/lib/features/hub/hub_page.dart`
- `apps/flutter_pb_app/test/widget_test.dart`

## 三、实际回查范围

本次回查包含：

- 固定 Handoff 的 Screen packet、structure、components、tokens、interactions；
- Source 三个页面及 `mock.ts`、`nav.ts`；
- 当前 `lib/features/v6` 实施代码；
- V6 Widget tests；
- Target component/token Resolver 结果；
- 已有 Flutter analyze、Flutter test 和 iPhone 14 关键状态视觉验证记录。

本次回查未修改 V6 实施代码，仅新增本记录文档。

## 四、人工验收标准

### 4.1 页面结构

检查：

- Screen packet 的页面组成；
- 页面结构树；
- 主滚动所有者；
- 滚动边界；
- AppBar、root、摘要、列表、表单和操作区的层级关系；
- 首屏和主卡的横向/纵向构图。

### 4.2 公共组件命中

检查：

- `resolve_target_components` 的目标映射；
- 实施代码是否实际复用目标工程公共组件；
- 组件职责是否与 Source/Evidence 一致；
- 私有 Widget 是否只是页面专用内容，还是重复实现了公共组件。

原型组件和 Flutter 公共组件的皮肤差异，如果属于 Target 公共组件实现差异，不直接视为实施失败。

### 4.3 Theme Token 命中

检查：

- `resolve_target_tokens` 的映射；
- `TS.colors`、`TS.textStyle`、`TS.spacing`、`TS.radius` 等实际使用；
- Evidence token slot 是否绑定到正确的目标 token；
- 最终视觉中的颜色、字体、间距、圆角和边框结果。

Token accessor 存在不代表 slot 语义正确。Source/Evidence 明确要求的 `warning-soft`、`on-surface-muted` 等不能被相近但不同的 token 静默替代。

### 4.4 状态与交互命中

检查：

- Case delta；
- Variant；
- Scenario；
- 实际导航和参数消费；
- 搜索、筛选、空态、错误态、加载态；
- Sheet、Dialog、表单校验、主管审批、提交和 Toast；
- Source mock、列表顺序、事件顺序和固定业务数据。

测试覆盖不完整不单独作为主要扣分项，但代码中存在的未实现或错误行为必须记录。

## 五、人工验收结果

### 5.1 已确认的有效还原

当前 V6 实现已经完成：

- 异常队列、运输详情、提交处置三个页面；
- V6 独立目录和命名路由；
- Hub 到 V6 队列的入口；
- 队列到详情、详情到表单的主导航；
- 队列 default、critical-only、empty、loading、error 状态；
- 详情 active excursion、sensor offline 状态；
- 操作 Sheet、接手确认 Dialog；
- 表单校验、主管审批、提交确认和成功 Toast；
- `CommonAppBar`、`CommonCard`、`CommonSearchBar`、`CommonFilterBar`、`CommonScrollableDataList`；
- `CommonFormSection`、`CommonSelect`、`CommonRadioGroup`、`CommonCheckbox`、`CommonSwitch`、`CommonTextArea`；
- Flutter 目标工程的 `TS.*` Theme/Token 体系。

主要横向构图没有发现平台迁移造成的系统性错误：

- 队列风险指标为横向三列；
- 详情运输路线为横向起点、进度线、终点；
- 详情运输事实为双列；
- 温度统计为横向三列。

### 5.2 真实实施问题

以下问题属于 Evidence/Source 到 Target 的真实转译问题，不属于公共组件外观差异。

#### 5.2.1 队列滚动容器边界错误

Evidence structure 要求队列的 `summary`、`search`、`filters` 和 `list` 都属于 `scroll-list`，AppBar 才属于 viewport。

Source 在 `ExceptionQueue.vue:139-150` 将整个内容放入 `ScrollableDataList`。V6 在 `exception_queue_page.dart:104-143` 使用外层 `Column`，把风险卡、搜索和筛选放在滚动列表外，`CommonScrollableDataList` 从 `173` 行才开始承载异常行。

实际结果：

- 风险卡、搜索和筛选固定；
- 只有异常列表滚动；
- 与 Source/Evidence 的主滚动边界不一致。

问题性质：页面结构和滚动所有者错误。  
责任：实施侧。  
严重程度：Major。

#### 5.2.2 `shipmentId` 传递后未消费

队列在 `exception_queue_page.dart:90-96` 传递了 `shipmentId`，但：

- `V6ShipmentDetailPage.fromRouteArgs` 在 `shipment_detail_page.dart:17-20` 只解析 variant；
- 详情概览在 `229-231` 固定显示 `SH-2048`；
- 详情进入表单时在 `56-59` 没有继续传递运单参数；
- 表单摘要也固定显示 `SH-2048`。

问题性质：导航参数消费错误。  
责任：实施侧。  
严重程度：Major。

#### 5.2.3 `ex-031` 的严重状态判断错误

Source 对严重异常统一打开 `active-excursion`。V6 在 `exception_queue_page.dart:94-96` 只对 `ex-017` 设置 active 状态，`ex-031` 虽然也是严重异常，却会进入 default 详情状态。

问题性质：Variant 状态映射错误。  
责任：实施侧。  
严重程度：Major。

#### 5.2.4 “关注”筛选和 severity 模型不完整

Source 有三种 severity：

- 严重；
- 警告；
- 关注。

V6 `models.dart:54` 只有 `critical` 和 `warning`。虽然 FilterBar 声明了 `watch`，但 `_visibleItems` 在 `exception_queue_page.dart:56-60` 没有 watch 分支，选择“关注”会落入默认逻辑，显示全部数据。

问题性质：数据模型和筛选语义错误。  
责任：实施侧。  
严重程度：Major。

#### 5.2.5 Source mock、事件和温度序列未复用

Source `mock.ts` 已提供明确业务数据，但 V6 重新建立了另一组数据：

- Source 有四条异常，V6 `models.dart:82-113` 缺少 `ex-029`；
- `ex-024` Source 为 `8.4°C / 12 分钟 / 14:19`，V6 为 `8.9°C / 16 分钟 / 14:18`；
- Source 有四条运输事件，V6 `shipment_detail_page.dart:464-477` 只实现两条；
- Source 温度序列在 `mock.ts:65-74`，V6 `_TemperaturePainter` 在 `410-412` 使用另一组归一化常量；
- 图表未保留 Source 的完整刻度和时间标签语义；
- Resolution Form 的原因、动作和主管选项也没有完整复用 Source mock。

问题性质：固定业务数据和页面内容未准确转译。  
责任：实施侧。  
严重程度：Major。

#### 5.2.6 当前结果未纳入必填校验

Source 的 `operationalFieldsComplete` 明确要求：

- 异常原因；
- 处置动作；
- 当前结果；
- 三项现场确认。

V6 `resolution_form_page.dart:115-128` 只检查原因、动作和三个 Checkbox，没有检查 `_outcome`。

因此用户可以在未选择“当前结果”时进入主管审批和提交流程。

问题性质：表单业务校验不完整。  
责任：实施侧。  
严重程度：Major。

#### 5.2.7 monitoring、notes、submitted 状态偏离

Source 默认 `continueMonitoring` 为 true，V6 在 `resolution_form_page.dart:37` 初始化为 false。

此外：

- Source ready 状态会预填处置说明；
- V6 ready 状态没有填充 notes；
- V6 `_seedForMode` 在 `76-95` 没有把 submitted 视为完整表单状态；
- V6 提交后清空字段，而 Source submitted 状态保持已填写记录并显示成功 Toast。

问题性质：默认值和 Variant 状态快照不一致。  
责任：实施侧。  
严重程度：Major。

#### 5.2.8 明确的 Token slot 偏差

当前发现四类明确 slot 错误：

1. 队列“等待接手”指标：
   - Source：`warning-soft` / `warning`；
   - V6：`TS.colors.surfaceVariant` / `TS.colors.onSurface`。

2. 队列错误面板：
   - Source 标题：`on-surface`；
   - Source 描述：`on-surface-muted`；
   - V6 标题和描述都使用 `TS.colors.error`。

3. 详情当前温度指标：
   - Source 当前值使用 `color.error`；
   - V6 当前值沿用普通 `TS.textStyle.title`，未单独绑定错误色。

4. 运输事件“车辆离开”：
   - Source tone 为 `primary`；
   - V6 使用 `TS.colors.info`；
   - Resolver 对 `color.info` 只返回 candidate，目标文档没有明确映射。

问题性质：Token accessor 存在，但 Evidence slot 绑定错误。  
责任：实施侧；`color.info` 的文档缺失另属于 Target Resolver 文档问题。  
严重程度：Moderate。

#### 5.2.9 队列 list 的组件语义被折叠

Evidence 同时识别了 `scrollable-data-list` 和内部 `data-list`。V6 通过 `CommonScrollableDataList.itemBuilder` 直接渲染异常行，没有显式落到 `CommonDataList`。

这不是绕过公共组件，而是将两个语义层合并为一个目标组件。  
问题性质：组件职责映射轻微偏差。  
责任：实施侧。  
严重程度：Minor。

### 5.3 可接受差异

以下差异不作为本轮主要实施扣分：

- `AppPop.sheet`、`AppPop.confirm`、`AppPop.success` 与 Source BottomSheet/Dialog/Snackbar 的皮肤差异；
- `CommonFilterBar` 选中态外观差异；
- `CommonBadge` 形态差异；
- `CommonAppBar` 标题对齐和 Material 图标轮廓差异；
- Target 公共组件的字体、圆角、边框和默认动画差异；
- Flutter 中文字体 fallback 导致的字形宽度差异；
- 目标工程没有现成图表组件，因此使用 `CustomPainter` 本身可以接受；
- CSS Grid 翻译为 Flutter Row/Expanded，只要最终轴向和层级正确，不单独扣分。

前提是组件职责、Token slot、状态行为和固定业务数据保持一致。

## 六、分层诊断

### 6.1 Producer/Capture

固定 Delivery 的 Evidence 覆盖了页面、Case、Variant、Scenario、Screenshot、结构、组件、Token 和交互信息，未发现足以单独解释本次问题的采集缺口。

但 Source mock 与完整页面业务数据没有进入实施前的逐字段对照流程，导致实现阶段重新发明了部分数据。这不是 Producer/Capture 缺失，而是 Source 到 Target 的回查边界没有闭环。

结论：Producer/Capture 不是本轮主要瓶颈。

### 6.2 Progressive Consumer

本轮已使用：

- 固定 Handoff；
- Screen packet；
- Case delta；
- structure/components/tokens/interactions projection；
- Target component/token Resolver。

消费效率和可审计性是有效的。但消费结果没有落实为一份实施前后的逐项 contract checklist。

例如 Evidence 已提供 queue filters/list 的 `scrollOwner` 和 semantic parent，但代码回查没有把该结构事实与 `Column + CommonScrollableDataList` 的实际树形做对照。

Resolver 也只证明 symbol/accessor 存在，不能替代 slot 语义核对。

结论：Consumer 读取基本完成，语义闭环检查不足。

### 6.3 Evidence 到 Target 实施

本次主要损耗发生在实施层：

- 使用了自建模型数据，而不是逐字段复用 Source mock；
- 传递了参数但没有追踪到页面消费；
- 只实现了部分状态矩阵；
- 表单 required predicate 没有与 Source 逐项比对；
- Token 只检查“是否使用 TS”，没有检查“是否使用正确 TS slot”；
- 队列滚动容器采用了更方便的外层 Column 结构，偏离 Evidence scroll owner。

结论：主流程实施完成，但没有形成稳定的 Evidence → Source → Target 三方对照闭环。

### 6.4 为什么首次验收没有发现

本次问题能够逃过首次验收，主要原因是：

1. 测试集中验证主路径，未验证非默认参数、全部数据集合和完整状态矩阵；
2. 测试与实现使用同一套手写数据，缺少独立 Source oracle；
3. 视觉验证集中在队列默认态、详情 active 态和表单 ready 态；
4. 没有实际验证队列滚动后 toolbar 是否仍固定；
5. 没有为 `shipmentId` 做非默认运单导航断言；
6. Resolver 被用于组件/accessor 存在性确认，而不是 slot 语义验收；
7. `validate_target_changes` 和 reconstruction summary 能确认文件、映射和覆盖范围，但不能自动证明数据流、业务校验和最终视觉完全正确；
8. 已有 review session 未形成新的 authoritative Target Review receipt。

因此，本次回查判定为“实施和验收流程 shortcut”，但不对 Agent 是否主观偷懒作动机判断。

## 七、四维评分

按 0–10 分人工评分：

- 页面结构：`7.5/10`
- 组件命中：`8.5/10`
- 主题 Token 命中：`8.0/10`
- 状态 / 交互命中：`7.0/10`
- 简单平均：`7.75/10`，约 `7.8`

评分解释：

- 页面结构：详情和表单结构基本正确，但队列主滚动边界明确错误；
- 组件命中：公共组件复用面高，只有 list 语义折叠和 spinner resolver candidate；
- Token：整体走 TS，但存在四处明确 slot 偏差；
- 状态/交互：主路径闭环，但参数、筛选、数据和表单状态仍有多个实施问题。

该分数用于本次人工回查，不作为 Phase 5 机器门禁或 authoritative Target Review 结果。

## 八、分层责任结论

### 8.1 实施 / Agent 责任

- 队列 scroll owner 和滚动边界错误；
- `shipmentId` 传递后未消费；
- `ex-031` active 状态判断错误；
- “关注” severity 和筛选语义不完整；
- Source mock、事件和温度序列未对齐；
- 当前结果未纳入 required predicate；
- monitoring、notes、submitted 状态偏离；
- 四处明确 Token slot 错误；
- 队列内部 `data-list` 语义未显式落地。

### 8.2 Target 维护者 / Resolver 文档责任

- `spinner` 的 Resolver 声明不完整，只能得到 candidate；
- `color.info` 和部分扩展 TS accessor 没有完整出现在目标映射文档中；
- `CommonFilterBar`、`CommonBadge`、`AppPop` 等公共组件与 Source 的皮肤差异不应重复计入实施责任。

### 8.3 平台因素

- CSS Grid 到 Flutter Row/Expanded 的迁移没有造成主要横向构图错误；
- 目标工程没有共享温度图表组件，使用 CustomPainter 是合理的目标侧实现选择；
- 但图表数据、标签、颜色语义和滚动边界已经由 Source/Evidence 明确，不能归因于平台限制。

## 九、后续建议

下一轮不建议扩大 Capture 或重新读取无关旧实现，应进行一次有界的实施闭环：

1. 将 queue 的 summary、search、filters、list 统一放入同一个主滚动容器；
2. 增加非默认 `shipmentId` 的端到端导航断言；
3. 直接从 Source mock 对齐异常、事件、温度序列和表单选项；
4. 补充 `ex-031`、`关注`筛选、完整列表、submitted、default monitoring、notes 的测试；
5. 将 Source 的 required predicate 原样拆解为 Flutter 校验条件；
6. 按 Evidence token binding 逐项复核 warning、error、muted、primary slot；
7. 用独立验收清单复查，不让实现代码和测试共享同一组未经核对的常量；
8. 修正后重新执行固定尺寸 iPhone 14 截图和滚动操作验收；
9. 如服务恢复，再创建新的 authoritative Target Review receipt。

完成以上修正后，再重新评估四维分数。

## 十、证据限制

本记录的结论来自：

- 固定 Delivery、Handoff、Bundle 和 Snapshot；
- ProtoBridge Evidence 的 Screen packet、结构、组件、Token 和交互投影；
- Source 原型页面、`mock.ts` 和 `nav.ts`；
- 当前 V6 Flutter 实施代码；
- 当前 V6 Widget tests；
- 已有 Flutter analyze、Flutter test 和关键状态视觉验证记录；
- 当前 Target component/token Resolver 结果。

当前没有形成新的 authoritative Target Review receipt。此前 review session 存在本地服务会话失效/过期问题，reconstruction summary 也不等同于独立视觉验收。

因此本记录：

- 不宣称完成像素级自动验收；
- 不把公共组件皮肤差异误判为实施失败；
- 不把 Grid/Flutter 原语差异误判为平台失败；
- 但会将参数未消费、数据未对齐、状态逻辑错误、滚动边界错误和 Token slot 错误计入实施责任。
