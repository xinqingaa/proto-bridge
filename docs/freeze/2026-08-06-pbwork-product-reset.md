# PBWork 产品重置：采集交互 · DS 对齐 · 新原型（后置）

- 日期：2026-08-06（计划修订：2026-08-07）
- 范围：**仅** `apps/pbwork`（Workbench 导航、Capture/Deliver GUI、Design System、业务原型资产与其文档）
- 状态：**第一轮已落地**；后续按下方 P0 → P1 → P2 推进
- **边界（MUST）**：本条目全部是 **PBWork 人机工作台**优化。**不改** Evidence/MCP/Consumer 工作链路，**不改** `packages/core/src/target/flutter-app` 与 Target resolve/Review 行为。

## 一句话

封板剩余主线是 **PBWork 采集/交付交互重做**；其次 **DS 与 Flutter 样板在行为/语义上对齐并拆清大类型组件**；**新主 App 原型最后做**。

## 第一轮已落地（2026-08-07）

| 项 | 结果 |
| --- | --- |
| 旧原型 | 已删除 `field-service`、`ledger-planet`（Vue + Flutter 样例 + 专用 e2e）；registry 仅 `cold-chain-ops` |
| Core 金标 | `reference-case-slice`（`fixtures.referenceCaseSlice`）；新原型禁止再分叉，见 [PBWork 开发规范 §9](../pbwork/development.md#9-新原型与测试边界) |
| 概览 | 无左侧 `resource-panel`（本轮后续仍不动概览内容） |
| 任务中心 | **无默认原型**；待 P0 整页重做 |

---

## P0 — 采集 / 交付交互重做（主战场）

与 DS、新原型不冲突；先做导航信息架构 + 结果页视觉统一。

### 已拍板

| 项 | 决策 |
| --- | --- |
| 新建入口 | **画布**：采某页 / 某控件 / 整原型；**原型侧**：维持现「采原型」 |
| 列表主轴 | **按采集历史**（Bundle/Job 时间线），不是按原型树或 Screen 树；行内展示来自哪个原型、哪些页面等 |
| 任务中心 | 改为以 **采集结果 / 历史** 为主（不再像运维新建台） |
| 结果展示 | EvidenceViewer 等视觉与按屏 Review 重做（现状截图平铺、结构化证据过密） |
| 已有交付物 | **多入口**：有旧则展示历史；支持 **查看已有**、**新生成**、**覆盖（真覆盖同一 delivery，不是另开目录冒充覆盖）** |
| JobCenter | **顶栏铃铛保留**；去掉多余右下角入口（若仍存在）；**FlowSheet 补 case 级进度**（进度单一真相） |
| 概览 | **本轮不动** |

### 实施切分（若必须拆 PR）

1. 导航信息架构 + 结果页视觉统一  
2. 交付物历史 / 查看 / 新生成 / 真覆盖  
3. FlowSheet 进度 + 清理多余 FAB  

### 非目标（P0）

- 不改 MCP Tool、Prompt、Target adapter  
- 不改 Store Evidence 契约语义（仅 GUI 如何展示与触发既有能力）  

---

## P1 — Design System：行为/语义对齐与组件拆分

在 PBWork DS（Contract / Vue / 文档）与 Flutter 样板公共组件之间对齐；**验收停在组件级对照**，不跑冷链全流程还原。

### 已拍板

| 项 | 决策 |
| --- | --- |
| 对齐重点 | **行为、描述、语义**（role、Token 槽、状态矩阵如 loading/empty/disabled）；**不要求** Vue props 与 Dart API 一一镜像 |
| 大类型纪律 | **禁止**「一个组件 + 胶囊/按钮、一级 Tab/二级 Tab 这类大 type」→ **拆成两个组件**，减少采集 `componentId` 歧义 |
| 第一刀 | **先审计清单**；首个落地目标：**Tab**（一级 / 二级分拆） |
| 载体 | **文档 + JSON 协议一起**（PBWork 组件/Token 文档与可机读对照；目标仓落点文档另属 Target，本条目只保证 Producer 侧语义清晰） |
| 验收 | 组件级 DS ↔ Flutter 样板对齐即可 |

### 非目标（P1）

- 不修改 `flutter-app` resolver / Review  
- 不把某产品 `Common*` 表硬编码进 Core  
- 不借 P1 扩一堆新组件表面积（以拆分与文档/协议补齐为主）  

---

## P2 — 新原型（最后，暂定）

| 项 | 决策 |
| --- | --- |
| 现役 | 保留 `cold-chain-ops`（3 屏复杂模块样板） |
| 新建 | **暂缓**；选题与 6–7 屏清单未定 |
| 测试边界 | 落地时遵守 Authoring §15 / 开发规范 §9（禁止新开 Core fixture 分叉；至多一条 Runtime 冒烟 e2e） |

---

## 优先级总表

| 优先级 | 工作包 | 状态 |
| --- | ---: | --- |
| — | 旧原型清理 + 金标改名 + 概览壳 / 任务中心去默认 | **已落地** |
| P0 | 采集导航、历史结果、交付查看/覆盖、FlowSheet 进度 | 待做 |
| P1 | DS↔Flutter 语义对齐；Tab 等大类型拆分；文档+JSON | 待做 |
| P2 | 新主 App 原型 | **暂定** |

---

## 明确非目标

- **Evidence / MCP / Consumer / Target 工作链路**（含 `packages/core/src/target/flutter-app`）：本条目不改动。  
- 不在本阶段做 Kotlin/Swift/RN Target。  
- 不把 PBWork 做成可视化拖拽编辑器。  
- 概览页内容重做：不在 P0。  

---

## 待确认（仅剩实现细节）

- [ ] P0 视觉：结果页「按屏 Review」与「调试用结构化证据」是否同一页两模式，还是两套视图  
- [ ] Tab 审计清单：除一级/二级外，是否还有同批要拆的大类型组件  
- [ ] P2 新原型业务选题（暂缓期间可不填）  
