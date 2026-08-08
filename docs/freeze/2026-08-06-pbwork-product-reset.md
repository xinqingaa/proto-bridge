# PBWork 产品重置：采集交互 · DS 对齐 · 新原型（后置）

- 日期：2026-08-06（计划修订：2026-08-08）
- 范围：**仅** `apps/pbwork`（Workbench 导航、Capture/Deliver GUI、Design System、业务原型资产与其文档）
- 状态：**P0 已落地**；**P1 已拍板并开工**（协议 / Playground / Tab 拆分 / Lucide）
- **边界（MUST）**：本条目全部是 **PBWork 人机工作台**优化。**不改** Evidence/MCP/Consumer 工作链路，**不改** `packages/core/src/target/flutter-app` 与 Target resolve/Review 行为。

## 一句话

**P0 采集/交付交互重做已完成**；剩余主线是 **先在 PBWork 把 DS 语义协议与展示做清（必要时拆大类型）**，**满意后再同步 Flutter 样板**；**新主 App 原型最后做**。

## 第一轮已落地（2026-08-07）

| 项        | 结果                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 旧原型    | 已删除 `field-service`、`ledger-planet`（Vue + Flutter 样例 + 专用 e2e）；registry 仅 `cold-chain-ops`                                          |
| Core 金标 | `reference-case-slice`（`fixtures.referenceCaseSlice`）；新原型禁止再分叉，见 [PBWork 开发规范 §9](../pbwork/development.md#9-新原型与测试边界) |
| 概览      | 无左侧 `resource-panel`（本轮后续仍不动概览内容）                                                                                               |
| 任务中心  | **无默认原型**；待 P0 整页重做                                                                                                                  |

---

## P0 — 采集 / 交付交互重做（主战场）

### 已拍板（2026-08-08）

| 项         | 决策                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| 一级导航   | **采集**（原「采集证据」）                                                                                  |
| 二级导航   | **仅「采集历史」一级**；其下挂 Job 子项，点击进详情并选中该子项；历史页仍保留完整时间线                           |
| 新建入口   | **画布**：采某页 / 某控件 / 整原型；**原型侧**：维持现「采原型」；历史页不做新建台                          |
| 列表主轴   | **线性时间线**；单行：范围、**突出 case 数**、状态徽章、👁；支持 **新↔旧排序**与搜索                         |
| 清理       | 常驻「清空所有原型证据」+ 行内清理；**均二次确认**（全量走 Workspace reset）                                |
| 进行中点行 | 拉起 **Deliver FlowSheet**                                                                                  |
| 结果页     | **三栏结果工作台**：自适应画面 + 概览/结构/交互/Token/提示词检查器 + 右侧证据导航；不再使用四屏 Review Sheet |
| Deliver    | **满宽贴底**、**固定高度**、左右滑动翻页；点蒙层收起不停任务                                                |
| JobCenter  | 顶栏铃铛 + case 进度；无右下角 snackbar                                                                     |
| 已有交付   | 提示词正文可直接回看；同 Snapshot 的历史交付可切换；重新生成弱化到交付信息                                  |
| 概览      | **本轮不动内容**（仅链到采集历史文案）                                                                      |

### 第二轮已落地（2026-08-08）

- 画布、原型、稳定控件入口会先识别进行中任务和已有 Evidence；已有结果默认回看，重采变为显式操作。
- Job 历史按 `runId` 固定到真实 Snapshot，不再让旧 Job 偷用 Bundle 的最新 active Snapshot；部分完成的 Snapshot 也允许查看。
- Delivery 增加正文读取，结果页可再次打开既有 `agent-prompt.md`，不依赖 Pinia 临时状态。
- 删除 `EvidenceReviewSheet` 四屏向导，结果改为三栏工作台；截图在容器内自适应，检查器复用 `WorkbenchTabs`，证据导航靠右。
- 采集导航仅保留「采集历史」一级，其下挂 Job 子项；点击子项进入对应结果并保持选中。
- Deliver FlowSheet 满宽贴底 + case 进度；JobCenter 顶栏铃铛；历史时间线支持搜索/排序/清理确认。

### 非目标（P0）

- 不改 MCP Tool、Prompt、Target adapter
- 不改 Store Evidence 契约语义（仅 GUI 如何展示与触发既有能力；delivery 目录重写除外）
- 不做按控件指纹全局去重；不做自动作废旧 Snapshot

---

## P1 — Design System：扩展基础、语义协议、Playground 展示

协议正文：[alignment-protocol.md](../../apps/pbwork/docs/components/alignment-protocol.md) · 审计：[audit-large-types.md](../../apps/pbwork/docs/components/audit-large-types.md)

### 已拍板（2026-08-08）

| 项 | 决策 |
| --- | --- |
| 载体 | **文档 + 扩展既有 Contract JSON**；不新开平行协议 |
| Schema | **`schemaVersion: 1` + 可选字段**；`playground.presentation` **必填** |
| 对齐重点 | 行为、描述、语义；**不要求** Vue props ↔ Dart API 镜像 |
| 同步纪律 | **分级同步**（语义→Contract+Vue；叙事→文档；Flutter→P1.5）；禁止三份全文镜像 |
| 大类型 | 禁止一组件大 type 兼多角色；**首刀**：`tabs`（pill）+ `underline-tabs` |
| button tone | **不拆** |
| Playground | **`single` 默认**；**`tile` 仅 button / icon**；overlay 用 `trigger`；取消「矩阵+自由调试」双区 |
| 图标 | Lucide 为 DS 唯一包；Flutter 换包属 P1.5 |
| Flutter | **P1.5**；P1 验收停在 Producer |

### 本轮落地范围

1. Contract 字段：`summary` / `behavior` / `states[].kind` / `playground` / `icons`
2. Playground：`single` / `tile`(仅 button·icon) / `trigger`；去掉顶栏 preset 与双预览区
3. 新增基础组件 `icon`（Lucide 策展清单）
4. Tab 拆分落地；审计表定稿
5. skill / checklist / overview 同步

### 非目标（P1）

- 不修改 `flutter-app` resolver / Review / MCP / Evidence 契约
- 不做 tokens.json → Dart codegen
- 不要求 propsSchema 与 Dart API 同构
- 不借 P1 扩大量新组件

---

## P1.5 — Flutter 同步（闸门后）

- 补全 `proto-bridge.md` 缺行；Demo 对照；`lucide_icons`；Tab 拆分后的 Common* 对齐
- 仍不改 Core Target adapter 硬编码表

---

## P2 — 新原型（最后，暂定）

| 项       | 决策                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------- |
| 现役     | 保留 `cold-chain-ops`（3 屏复杂模块样板）                                                       |
| 新建     | **暂缓**；选题与 6–7 屏清单未定                                                                 |
| 测试边界 | 落地时遵守 Authoring §15 / 开发规范 §9（禁止新开 Core fixture 分叉；至多一条 Runtime 冒烟 e2e） |

---

## 优先级总表

| 优先级 |                                            工作包 | 状态       |
| ------ | ------------------------------------------------: | ---------- |
| —      |   旧原型清理 + 金标改名 + 概览壳 / 任务中心去默认 | **已落地** |
| P0     | 采集导航、历史结果、交付查看/覆盖、FlowSheet 进度 | **已落地** |
| P1     | DS 协议 + Playground 平铺/触发 + Tab 拆分 + Lucide | **进行中** |
| P1.5   | Flutter Common* / Demo / 图标语义对照             | 未开       |
| P2     |                                     新主 App 原型 | **暂定**   |

---

## 明确非目标

- **Evidence / MCP / Consumer / Target 工作链路**（含 `packages/core/src/target/flutter-app`）：本条目不改动。
- 不在本阶段做 Kotlin/Swift/RN Target。
- 不把 PBWork 做成可视化拖拽编辑器。
- 概览页内容重做：不在 P0。

---

## 待确认

- [x] P0 视觉与采集 / 交付交互重做
- [x] P1 协议：v1 可选字段 + `playground` 必填
- [x] P1 Flutter 同步单列 P1.5
- [x] Tab 拆分为 `tabs` + `underline-tabs`；button 不拆
- [ ] P1 实现收口验收（协议 + Playground + Tab + Lucide 约定）
- [ ] P2 新原型业务选题（暂缓）
