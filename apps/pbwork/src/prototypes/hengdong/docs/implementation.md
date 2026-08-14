---
prototypeId: hengdong
---

# 恒动实现说明

产品与体验基线见 `design.md`。本文件只记录正式 PBWork 转译、交付状态和原型局部实现决定。

## 页面交付状态

| 页面       | 页面设计 | Delivery Gate | Experience Gate |
| ---------- | -------- | ------------- | --------------- |
| 今天       | approved | passed        | accepted        |
| 训练执行   | pending  | legacy-draft  | pending         |
| 训练总结   | pending  | legacy-draft  | pending         |
| 计划       | pending  | legacy-draft  | pending         |
| 计划详情   | pending  | legacy-draft  | pending         |
| 进度       | pending  | legacy-draft  | pending         |
| 设置与目标 | pending  | legacy-draft  | pending         |
| 登录       | pending  | legacy-draft  | pending         |
| 注册       | pending  | legacy-draft  | pending         |

`legacy-draft` 表示现有代码可以保留用于后续调整，但不代表页面设计或体验已经通过。

## 通用实现基线

- 注册 9 个 Screen：登录、注册、今天、计划、进度、计划详情、训练执行、训练总结、设置与目标。
- 根目的地切换使用 `replace`，二级任务使用 `push` 和可恢复 parent。
- 本地状态统一保存在 `hengdong.app.v2`；账号、目标、当前计划、训练会话、活动记录和主题共享同一数据源。
- 正式训练与快速记录写入同一记录集合；进度摘要、趋势、日历和列表从记录派生。
- 计划编辑和快速记录使用 FlowSheet；记录详情与筛选使用 BottomSheet；退出、删除和重置使用确认组件。
- 关键页面状态使用 Variant 或确定 fixture 准备，不依赖上一次浏览器会话。

## Promotion Mapping

| 视觉或交互元素     | 分类                    | 正式转译                                                        |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| 周目标环           | Token 驱动的业务局部 UI | 真实主路径热区，声明状态、Token Evidence 和 reduced-motion 行为 |
| 七日节奏           | Token 驱动的业务局部 UI | 每日为稳定业务热区，与活动记录同源                              |
| 活动类型图标       | 现有 PBWork Icon        | 使用稳定 Lucide id，不引入第二套图标                            |
| 主次按钮、设置入口 | 现有 PBWork DS          | 使用 Button / IconButton 公开 Contract                          |
| 最近记录列表       | 现有 DS 组合            | ScrollableDataList + DataList；只保留行间分隔                   |
| 快速记录           | 现有 PBWork DS          | FlowSheet + 表单组件；结果在相关内容区持续反馈                   |
| 记录详情           | 现有 PBWork DS          | BottomSheet；今天与进度复用业务内容，不复制 Sheet               |
| 动作序列           | 现有 DS 组合优先        | 待对应页面契约批准后转译                                        |
| 动作舞台           | Token 驱动的业务局部 UI | 待训练页面契约批准后转译                                        |
| 姿态资产           | 外部资产契约            | 第一阶段状态与降级仍待批准                                      |

## 今天页正式调整

### 确定状态

- `default`：存在当前计划，无进行中会话，当天未完成。
- `in-progress`：存在可恢复会话。
- `completed`：当天已有活动记录，主路径降低强调。
- `no-plan`：没有当前计划，主路径进入计划页。
- `recent-empty`：最近记录为空，主行动不受影响。
- `quick-record-open`：快速记录流程打开。
- `record-detail-open`：今天页记录详情打开。
- `day-empty-feedback`：无记录节奏日反馈可见。

### 独立验收节点

- 今天页根、工具行、主行动摘要、周目标环、主行动区、本周节奏、最近记录；
- 每个节奏日使用日期作为稳定 key；
- 最近记录行使用记录 id 作为稳定 key；
- 快速记录 Sheet、记录详情 Sheet 和页内状态反馈；
- 主按钮与环分别作为同一业务结果的 Action target。

### 关键 Action 与 Scenario

- 主按钮开始/继续训练；
- 环开始/继续训练；
- 无计划时主按钮或环进入计划；
- 有记录日期打开今天页记录详情；
- 无记录日期显示轻量反馈；
- 最近记录打开今天页记录详情；
- 快速记录保存后更新今天和本周数据。

### Experience Gate 基线

- 目标视口 `390 × 844`；
- 默认浅色与深色；
- 进行中、完成、无计划、最近为空；
- 环、主按钮、七个日期和最近记录逐项验证；
- 检查首屏焦点、阅读顺序、分割线、重复元素基线、文字适配、键盘焦点和底栏遮挡。

### 双门禁验收结果

- Delivery Gate：Token-only、DS-first、Flex-only、Registry、类型检查、组件与 Registry 测试、Runtime e2e 和文档验证通过；
- Experience Gate：在 `390 × 844` 实际浏览器中检查浅色、深色、进行中、完成、无计划、最近为空、两种 Overlay 和页内日期反馈；
- 环与主按钮实际进入同一训练会话；有记录日期与最近记录在今天页打开详情；无记录日期显示不遮挡底栏的反馈；
- 七个标记的尺寸与纵向位置一致，日期保留原生按钮语义和可见焦点；完成态主按钮降低强调，区块与列表只保留表达结构所需的分隔。

今天页已通过 Delivery Gate 与 Experience Gate，其余页面按 `design.md` 的旅程顺序推进。
