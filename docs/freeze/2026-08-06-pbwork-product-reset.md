# PBWork 产品重置：DS 精修 · 原型收敛 · 采集交互

- 日期：2026-08-06
- 范围：`apps/pbwork` 工作台、Design System、业务原型资产、Capture/Deliver GUI（不含 MCP Tool 表面，见同目录 MCP 条目）
- 依据：`workbench/navigation.ts`、`views/WorkbenchOverview.vue`、`capture/*`、`app/stores/capture.ts`、`prototypes/registry.ts`、`docs/components|tokens`
- 状态：封板前待决（未改代码）
- 相关：`2026-08-06-structure-assertions.md`（结构断言另项）；目标还原暂限 Flutter（`apps/flutter_pb_app`）

## 一句话

前期重心在 Evidence / Agent 链路；PBWork 作为人机工作台仍处「能跑通」阶段。封板前需要一次**产品向重置**：精修组件与 Token、清理示范原型并做 1 个完整 App 量级样板（约 6–7 屏）、重做采集与 Review 交互。

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

### 现状

| 原型 | 屏数 | 角色 |
| --- | --- | --- |
| `cold-chain-ops` | 3 | 保留：Evidence/消费样板，场景密 |
| `field-service` | 7 | 早期示范，生命周期仍 active |
| `ledger-planet` | 18 | 最大示范；任务中心默认还指向它 |

### 问题

- 三套并行：维护成本高，Workbench 概览/任务列表被账本体量淹没。
- 「完整 App」叙事落在账本 18 屏，与封板目标（6–7 屏可控样板）不一致。
- 清理后若默认原型仍硬编码 `ledger-planet`，任务中心会继续「像记账中心」。

### 目标形态

- **保留**：冷链（复杂模块样板，可继续打磨，不强制扩到整 App）。
- **删除/归档**：`field-service`、`ledger-planet`（及对应 Flutter 演示 feature，若仅作样例）。
- **新建 2–3 个原型**，其中 **1 个主样板 App**：
  - 总页约 **6–7**；
  - 含简单页（设置/空态/表单）与复杂页（列表+筛选+滚动、详情+Sheet/Dialog、跨屏 Scenario）；
  - 一律按 Authoring Contract 可采集；
  - 交付目标：**只还原 Flutter**。

### 取舍草案

| 项 | 建议 |
| --- | --- |
| 清理顺序 | 先改任务中心默认原型 → 再下线账本/现场服务入口 → 最后删代码 |
| 新 App 选题 | 独立业务域（勿再挂账本）；先写 Screen 清单再写页 |
| 冷链 | 保留为「复杂三页模块」，不强制并进新 App |

## 三、采集 / 工作台交互现状盘点

### 3.1 信息架构

```text
一级导航：概览 | 设计基础 | 组件 | 原型 | 采集证据
采集主路径：原型/画布「交付到 Agent」→ DeliverFlowSheet
次路径：/workbench/capture 任务中心、EvidenceViewer、右下角 CaptureJobCenter
```

### 3.2 已观察到的体验问题（对照代码）

| 用户感知 | 代码侧对应 |
| --- | --- |
| 概览不需要二级导航 | Layout 对 overview 仍挂二级/树壳；`getSecondaryNavigation("overview")` 为空但仍占导航范式 |
| 概览「采集区域」抽象 | `WorkbenchOverview`「最近采集」三统计 + Bundle 列表，缺「对哪个原型、采了什么、能否交付」的人话 |
| FlowSheet 无进度、任务中心有 | `DeliverFlowSheet` step1 仅 Loader + case 总数；`CaptureJobCenter` / Console 有 `progress`；store 注释写「进度留在 FlowSheet」但 UI 未做 |
| 右下角蓝色区域 | `CaptureJobCenter` 全局 activator；执行中 `tone="action"`，与 FlowSheet 双轨并存，认知分裂 |
| 任务中心像记账 | `CaptureConsole` 默认 `selectedPrototypeId = ledger-planet`；证据库存也被账本 Bundle 主导 |
| 采集结果眼花缭乱 | `EvidenceViewer` 全 Case 截图平铺 + 底部全量证据；难做「按屏 Review」 |
| 有结果 vs 有提示词无差别 | 有 `existingHandoffs` 时主按钮几乎只有「重新生成 Agent 提示词」；缺「打开已有 delivery / 复制旧提示词 / 差异」 |
| 能否重复采集 | **能**：`recaptureEvidence`、结果页/任务「重新采集」；但与「整原型再交付」关系未产品化说明 |

### 3.3 根因判断（草案）

重点长期在 Core/MCP/Agent，PBWork Capture GUI 是 **Producer 控制面的最小可用壳**：FlowSheet 串通 Deliver，任务中心/结果页偏运维清单，未按「选范围 → 执行感知 → 按屏 Review → 交付/再交付」做主路径设计。

### 3.4 交互重设计方向（待决，非实现）

1. **一条主路径**：交付 Flow 内完成选范围 / 进度 / 摘要风险 / 提示词；JobCenter 降为可选后台入口或合并。
2. **进度单一真相**：FlowSheet step「执行中」显示 case 级进度（复用 journal），避免「别处有进度、主面板只有转圈」。
3. **任务中心改名或改内容**：按「采集任务 / Bundle」组织，默认原型跟最近工作或冷链/新主 App，禁止写死账本。
4. **结果页按 Screen 分组 Review**：先屏后态；截图矩阵可折叠；结构化证据默认折叠，按选中 Case 展开。
5. **交付物状态可视**：区分「仅有 Snapshot」「已有 Handoff」「已有 delivery 目录」；支持打开/复制已有提示词，而不仅是重新生成。
6. **重复采集产品化**：明确「追加 Case / 整页重采 / 整原型再交付」三档，并写进概览与结果页文案。
7. **概览减负**：去掉无意义二级导航；采集区改为「可继续的交付」卡片（原型名、范围、状态、下一步 CTA）。

## 四、建议工作包与优先级

| 优先级 | 工作包 | 产出 |
| --- | ---: | --- |
| P0 | 采集交互主路径重设计（信息架构 + FlowSheet 进度 + 结果 Review） | 交互稿/清单 → 再改 Vue |
| P0 | 去掉任务中心对 `ledger-planet` 的硬编码默认 | 小修复，立刻减「记账感」 |
| P1 | 原型清理：下线 field-service / ledger-planet | 仓库与导航变干净 |
| P1 | 新主 App 原型（6–7 屏）+ Flutter 还原一轮 | 封板样板 |
| P1 | 冷链保留为模块样板；结构断言项见另 freeze | 不阻塞 |
| P2 | DS / Token 精修一轮（文档+Contract+Bind 池） | 作者与还原稳定性 |
| P2 | 第 2–3 个小原型（可选：组件橱窗或单模块） | 覆盖面 |

## 五、非目标

- 不在本条目展开 MCP Tool 删减（见 `2026-08-06-mcp-surface.md`）。
- 不在本阶段做 Kotlin/Swift/RN Target。
- 不把 PBWork 做成可视化拖拽编辑器；仍以代码资产 + Agent 作者 + Workbench Review/Capture 为准。

## 六、第二轮待确认

- [ ] 新主 App 业务选题与 6–7 屏清单
- [ ] field-service / ledger-planet：删除 vs `archived` 生命周期
- [ ] JobCenter：保留弱化 vs 并入 FlowSheet 后删除 FAB
- [ ] EvidenceViewer：是否拆「Review 工作台」与「调试证据」两模式
- [ ] DS 精修是否绑定 Flutter `Common*` 对照表为验收物
