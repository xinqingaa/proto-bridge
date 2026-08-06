# 冷链 ops_evidence 人工五维保真对照

记录日期：2026-08-06（Asia/Shanghai）

验收类型：人工五维保真对照  
验收状态：完成首轮验收，带已知修正项

关联模板：[human-fidelity-acceptance.md](../../templates/human-fidelity-acceptance.md)

关联原型：`apps/pbwork/src/prototypes/cold-chain-ops`

目标工程：`apps/flutter_pb_app`

实施路径：`apps/flutter_pb_app/lib/features/cold_chain_ops_evidence/`

## 一、验收目的

对照 Source 原型与 `cold_chain_ops_evidence` 实施代码，按五维判断当前默认消费链路下的还原质量，并区分实施问题与 Target 维护差异。

本记录只供人工 Review 归档，不驱动 Agent 反复回查，也不替代 authoritative Target Review。当前默认流程见 [产品工作流](../../../product/workflow.md) 与 [Agent 消费指南](../../../guides/agent-consumption.md)。

## 二、固定验收对象

实施代码自述固定引用：

- Handoff：`handoff-2026-08-06t083549353-ed70750c`
- Snapshot：`snapshot-2026-08-06t083545838-791e7d4e`
- Source：`apps/pbwork/src/prototypes/cold-chain-ops`
- Target root：`apps/flutter_pb_app`

实施文件：

- `lib/features/cold_chain_ops_evidence/models.dart`
- `lib/features/cold_chain_ops_evidence/exception_queue_page.dart`
- `lib/features/cold_chain_ops_evidence/shipment_detail_page.dart`
- `lib/features/cold_chain_ops_evidence/resolution_form_page.dart`
- 路由：`lib/router/routes.dart`、`lib/router/router.dart`
- Hub 入口：`lib/features/hub/hub_page.dart`

对照依据：

- Source `mock.ts`、`ExceptionQueue.vue`、`ShipmentDetail.vue`、`ResolutionForm.vue`、`nav.ts`
- 上述 Flutter 实施代码（静态阅读）

未执行新的 Simulator 全量截图；视觉观感以代码结构与文案/数据对照为主。

## 三、操作时间线

时区 Asia/Shanghai。本轮由操作者在实施会话结束后提供；采集在 PBWork/CLI，不在 Agent 对话内。

| 阶段 | 起止 | 执行方 | 备注 |
| --- | --- | --- | --- |
| 采集证据 | 16:35–16:37 | PBWork / CLI | 约 2 分钟 |
| 只读计划 | 16:37–16:44 | Agent 对话 1 | 约 7 分钟 |
| 实施代码 | 16:44–16:50 | Agent 对话 2 | 约 6 分钟 |
| AI 自测 / 验收 | 16:50–17:00 | Agent 对话 2 尾声 | 约 10 分钟 |
| Agent 合计 | 16:37–17:00 | 对话 1 起 → 对话 2 止 | **约 23 分钟**（不含采集） |
| 端到端合计 | 16:35–17:00 | 采集起 → 自测止 | **约 25 分钟**（操作者口述约 30 分钟量级） |

归档触发：实施会话已结束；本记录为旁路人工对照归档，不回写实施链路。

## 四、计分规则（本记录采用）

| 维度 | 看什么 | 不扣分 | 扣分 |
| --- | --- | --- | --- |
| 页面结构 | 壳层、主滚动、section 层级、构图轴向 | 平台原语差异 | scroll owner / 层级 / 构图明显偏离 |
| 组件命中 | Evidence componentId → 目标公共组件是否正确选用 | **命中了但皮肤不同** | 该用公共组件却自造或错用 |
| 主题 Token | Evidence token **key** 是否落到正确 accessor | **key 命中**但最终观感因组件实现不同 | key 未命中或用相近 key 顶替 |
| 状态命中 | Variant、默认值、可见性、固定业务数据 | — | mock 自造、默认值错、参数未消费 |
| 交互命中 | 导航、筛选、弹层、校验、Scenario | 弹层皮肤差异 | 行为缺失或错误 |

## 五、有效还原

已确认：

- 三个 Screen：异常队列、运输详情、提交处置，均有独立路由与 Hub 入口
- 队列根页 `CommonAppBar` 默认 `showBack: false`，符合根页面壳层
- 队列 `summary` / `search` / `filters` / `list` / footer 处于同一 `CommonScrollableDataList`（主滚动边界正确，优于 V6）
- 详情页横向路线构图（起点 → 进度 → 终点）存在
- 公共组件复用面高：`CommonAppBar`、`CommonCard`、`CommonSearchBar`、`CommonFilterBar`、`CommonScrollableDataList`、`CommonEmptyState`、`CommonSpinner`、`CommonBadge`、`CommonButton`、`CommonFormSection`、`CommonSelect`、`CommonRadioGroup`、`CommonCheckbox`、`CommonSwitch`、`CommonTextArea`、`AppPop`
- 队列含 default / critical-only / empty / loading / error；详情含 active-excursion / sensor-offline / sheet / dialog；表单含 ready / validation / approval / confirm / submitted
- 严重异常导航到 `active-excursion`（`ex-017` 与 `ex-031` 均覆盖，优于 V6）
- 筛选含全部 / 严重 / 警告 / 关注，且 `watch` 有真实过滤分支
- 四条异常 key（`ex-017` / `ex-031` / `ex-024` / `ex-029`）与运单号主数据对齐 Source

## 六、真实问题

按 Major / Moderate / Minor 列出；每条标明责任：实施 / Target 维护 / 平台。

### 6.1 Major

#### 6.1.1 温度序列未对齐 Source mock

Source `temperatureReadings`：

`5.4, 5.8, 6.6, 7.4, 8.2, 9.1, 10.2, 10.8`

实施 `models.dart`：

`4.8, 5.2, 5.8, 6.4, 8.6, 9.4, 10.2, 10.8`

前半段偏低、中段跃迁形态不同，不能准确表达“逐步升高到超温”。

问题性质：固定业务数据未准确转译。  
责任：实施侧。  
维度：状态命中。

#### 6.1.2 表单选项目录被裁剪

Source 有完整列表：

- 原因 4 项、动作 4 项、主管 2 项

实施仅保留各 1 项（注释称 compact Evidence 未证明全量）。Source `mock.ts` 与原型页面本身已提供完整选项；按本验收标准应复用 Source。

问题性质：固定业务数据不完整。  
责任：实施侧。  
维度：状态命中。

#### 6.1.3 提交校验未要求“当前结果”

Source `operationalFieldsComplete` 要求 `cause && action && outcome` 以及三项 Checkbox。

实施 `_submit` 只检查 cause / action / 三项确认，**不检查 `_outcome`**。用户可不选当前结果进入主管审批与提交流程。

问题性质：业务校验不完整。  
责任：实施侧。  
维度：交互命中 / 状态命中。

#### 6.1.4 风险指标内部构图偏离

Source `.metric`：图标与数值同一行，标签跨列在下一行。

实施 `_MetricTile`：图标 → 数值 → 标签纵向堆叠。

问题性质：局部信息层级 / 构图问题。  
责任：实施侧。  
维度：页面结构。

#### 6.1.5 运输事件时间未对齐

Source：

- 接近上限 `13:45`
- 确认超温 `14:02`

实施：

- `13:58` / `14:12`

事件文案大体正确，时间戳偏离 Source。

问题性质：固定业务数据偏差。  
责任：实施侧。  
维度：状态命中。

### 6.2 Moderate

#### 6.2.1 `ex-024` / `ex-029` 缺持续时长与更新时间

Source 有 `12 分钟 / 14:19` 与 `6 分钟 / 14:11`。实施留空，列表只显示上限文案。

问题性质：行级业务数据不完整。  
责任：实施侧（过度保守于 compact Evidence，未回查 Source mock）。  
维度：状态命中。

#### 6.2.2 详情页接收 `shipmentId` 但数据固定为 SH-2048

路由参数已解析，但 `_data` 恒为 `kShipmentSh2048`。从 `ex-031` 进入详情仍显示 SH-2048 概览。

问题性质：导航参数消费不完整。  
责任：实施侧。  
维度：状态命中。

#### 6.2.3 ready 态未预填处置说明

Source ready 会填入 notes；实施 `_applyVariant` 未写入 `_notes`。

问题性质：Variant 状态快照不完整。  
责任：实施侧。  
维度：状态命中。

#### 6.2.4 等待接手指标 Token key 偏离

Source：`warning-soft` / `warning`。  
实施非 emphasize 指标使用 `surfaceVariant` / `onSurface`。

按本记录规则：**token key 未命中，扣分**（不是皮肤差异）。

责任：实施侧。  
维度：主题 Token。

#### 6.2.5 队列错误面板 Token key 偏离

Source 标题 `on-surface`、描述 `on-surface-muted`。  
实施标题与描述均使用 `error`。

责任：实施侧。  
维度：主题 Token。

### 6.3 Minor

#### 6.3.1 队列仍用 builder 下标分支组织 header

`itemBuilder` 中 `index == 0/1/2` 分别返回 summary / search / filter。主滚动语义正确，但编码仍带位置气味；更自然的是先组 `List<Widget>` 再挂到同一滚动容器。

责任：实施侧。  
维度：页面结构（轻微）。

#### 6.3.2 详情默认当前温度文案

`kShipmentSh2048.currentTemp = 6.1°C`，active 时覆盖为 `10.8°C`。默认态数值与 Source 展示是否一致存疑，但不影响超温态主路径。

责任：实施侧。  
维度：状态命中（轻微）。

## 七、可接受差异

以下不作为扣分：

- PBWork 组件与 Flutter 公共组件皮肤差异（Badge、FilterBar、AppPop、图标轮廓）
- 无共享温度图组件时使用 `CustomPainter`
- CSS Grid 翻译为 `Row` / `Expanded`（详情路线轴向正确）
- `CommonEmptyState` 图标选型与 Lucide 不同（组件职责已命中）
- `CommonFormSection` 外包一层 `_SectionCard`（仍落到公共 FormSection）

## 八、五维评分

| 维度 | 分数 | 说明 |
| --- | ---: | --- |
| 页面结构 | 7.5 | 主滚动正确；指标内部构图偏离；header 下标组织轻微 |
| 组件命中 | 8.8 | 公共组件复用充分；皮肤差异不扣分 |
| 主题 Token | 7.5 | 主体走 TS；等待接手与错误面板存在明确 key 偏离 |
| 状态命中 | 6.5 | 主路径 Variant 在；温度序列/选项/部分行字段/shipment 消费有缺口 |
| 交互命中 | 7.5 | 导航筛选弹层闭环；当前结果未进校验 |
| 简单平均 | **7.6** | |

评分解释：相对 V6（约 7.8，但滚动错误更严重）与 V5（约 8.0–8.2），本轮 **主滚动与严重态导航更好**，但 **业务数据与表单完整性回退**，总分略低于 V5 水位。

## 九、总评

> `cold_chain_ops_evidence`：**结构主路径明显改善（单滚动正确）**，组件命中良好；主要损耗仍在固定业务数据与表单校验完整性。达到可用的人工对照基线，但未稳定到 8 分以上。

建议有界修正优先级：

1. 温度序列与事件时间对齐 Source `mock.ts`
2. 表单选项恢复完整目录；校验纳入 `outcome`
3. 等待接手 / 错误面板 Token key 对齐
4. 指标内部改为图标+数值同行
5. 非默认 `shipmentId` 至少驱动概览身份文案；补全 `ex-024`/`ex-029` 时长与时间

## 十、证据限制

本记录结论来自：

- 实施代码内固定 Handoff/Snapshot 注释
- Source 原型与 `mock.ts`
- `cold_chain_ops_evidence` 静态代码阅读
- 操作者提供的会话时间线（近似）

未形成新的 authoritative Target Review receipt，也未做全 Case Simulator 截图矩阵。因此：

- 不宣称像素级自动验收；
- 不把公共组件皮肤差异计为实施失败；
- 但会将数据未对齐、校验缺失、Token key 偏离、构图偏离计入实施责任。
- 操作时间线不作为性能基准，也不回写 Agent 实施链路。
