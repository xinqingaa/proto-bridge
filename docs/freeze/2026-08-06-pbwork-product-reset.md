# PBWork 产品重置：DS 精修 · 原型收敛 · 采集交互

- 日期：2026-08-06
- 范围：`apps/pbwork` 工作台、Design System、业务原型资产、Capture/Deliver GUI（不含 MCP Tool 表面，见同目录 MCP 条目）
- 依据：`workbench/navigation.ts`、`views/WorkbenchOverview.vue`、`capture/*`、`app/stores/capture.ts`、`prototypes/registry.ts`、`docs/components|tokens`
- 状态：**第一轮已落地（原型清理 + 壳修正）；采集交互重做 / DS 精修 / 新主 App 仍待决**
- 相关：`2026-08-06-structure-assertions.md`（结构断言另项）；目标还原暂限 Flutter（`apps/flutter_pb_app`）

## 一句话

前期重心在 Evidence / Agent 链路；PBWork 作为人机工作台仍处「能跑通」阶段。封板前需要一次**产品向重置**：精修组件与 Token、清理示范原型并做 1 个完整 App 量级样板（约 6–7 屏）、重做采集与 Review 交互。

## 第一轮已落地（2026-08-07）

| 项 | 结果 |
| --- | --- |
| 旧原型 | 已删除 `field-service`、`ledger-planet`（Vue + Flutter 样例 + 专用 e2e）；registry 仅 `cold-chain-ops` |
| Core 金标 | `ledger-planet-task-list` → `reference-case-slice`（`fixtures.referenceCaseSlice`，合成 ID `sample`）；禁止按原型再分叉，见 [PBWork 开发规范 §9](../pbwork/development.md#9-新原型与测试边界) |
| 概览 | 无左侧 `resource-panel` |
| 任务中心 | **无默认原型**（待后续重做）；需显式选择后才能新建采集 |

## 目标（本条目对齐的产品意图）

1. **DS**：组件规范与 Token 从「粗可用」做到「可指导作者与 Agent 稳定落点」的一轮精修。
2. **原型资产**：除冷链外全部清理；另做 **2–3 个** 新原型，其中至少 **1 个完整 App**（简单页 + 复杂页，**约 6–7 个页面**），并走 Flutter 还原闭环（暂不考虑其它客户端技术栈）。
3. **工作台采集交互**：按真实操作路径重设计，先盘点后改，不继续在现有「任务中心 / 结果页 / FlowSheet」上打补丁式堆叠。

## 一、Design System / Token 现状与问题

### 现状

- Contract 约 29 个（basic + complex）；Token ~97；Foundations / Playground / 文档目录齐。
- 权威链文档已有（`docs/tokens/overview.md`、`docs/components/overview.md`），但组件页深度、状态矩阵、反例、与 Flutter `Common*` 映射完整度不齐。
- 冷链验收暴露：公共组件命中高，但 Token key 偏差、局部构图仍靠人审——说明 **DS 语义槽与作者纪律仍粗**。

### 问题

- 规范「粗」：能组页，但不足以当验收尺子（何时用 FilterBar vs 自定义、Token 槽是否齐全、业务局部 `data-pb-token-*` 门禁体验差）。
- Playground / 文档与真实 Capture 语义（role policy、inspectId）耦合讲解不足，新人易写出「看起来对、Evidence 弱」的页。

### 取舍草案

| 选项 | 做法 |
| --- | --- |
| P0 精修包 | 定「Flutter 还原所需」最小组件集 + Token Bind 池审计；补齐文档反例与检查单 |
| 暂缓新组件 | 封板前原则上不扩 DS 表面积，优先修现有 29 个的语义与文档 |

## 二、原型资产：清理与重建

### 现状（第一轮后）

| 原型 | 屏数 | 角色 |
| --- | ---: | --- |
| `cold-chain-ops` | 3 | **唯一现役**：Evidence/消费样板 |

### 目标形态（后续轮）

- **保留**：冷链（复杂三页模块）。
- **新建 2–3 个原型**，其中 **1 个主样板 App**（约 6–7 屏；简单+复杂；只还原 Flutter）。
- 新原型测试边界见 Authoring §15 / PBWork 开发规范 §9（禁止再开 Core fixture 分叉）。

## 三、采集 / 工作台交互（后续轮）

主路径仍待按「选范围 → 执行感知 → 按屏 Review → 交付」重设计。第一轮仅去掉概览二级导航壳与任务中心硬编码默认；任务中心 UI 整页重做另开轮次。

## 四、剩余工作包

| 优先级 | 工作包 | 状态 |
| --- | ---: | --- |
| P0 | 采集交互主路径重设计 | 待决 |
| P1 | 新主 App 原型（6–7 屏）+ Flutter 还原 | 待决 |
| P2 | DS / Token 精修 | 待决 |
| P2 | 第 2–3 个小原型 | 待决 |

## 五、非目标

- 不在本条目展开 MCP Tool 删减（见 `2026-08-06-mcp-surface.md`）。
- 不在本阶段做 Kotlin/Swift/RN Target。
- 不把 PBWork 做成可视化拖拽编辑器；仍以代码资产 + Agent 作者 + Workbench Review/Capture 为准。

## 六、第二轮待确认

- [ ] 新主 App 业务选题与 6–7 屏清单
- [x] field-service / ledger-planet：已删除（非 archived）
- [ ] JobCenter：保留弱化 vs 并入 FlowSheet 后删除 FAB
- [ ] EvidenceViewer：是否拆「Review 工作台」与「调试证据」两模式
- [ ] DS 精修是否绑定 Flutter `Common*` 对照表为验收物
- [ ] 任务中心整页重做信息架构
