# ProtoBridge / PBWork V2 产品闭环与实施总览

> 状态：阶段六、阶段七按收敛范围完成；仓库进入 V2-only 可用态，未发布
> 目标分支：`dev`
> 性质：破坏性重构；V2 不兼容 V1 Artifact、CLI 和 MCP 页面工作流
> 当前正式包基线：`0.4.0`
> 当前目标：仓库干净、可用并形成产品闭环；不要求发布或统一版本号
> 更新时间：2026-07-30

本文件是 ProtoBridge V2 的唯一实施入口，固定长期目标、产品闭环、职责边界、关键取舍、七个实施阶段和最终完成条件。

配套文档：

- [PBWork 与 PB 的操作闭环](./pbwork-pb-v2-workflow.md)：PBWork 如何选择、预检、采集、检查、重采和交接。
- [V2 核心规范](./pb-v2-spec.md)：跨 PBWork、Core、Store、CLI、MCP 和 Agent 必须一致的语义。
- [V2 实施指南](./pb-v2-implementation-guide.md)：结合当前代码库的落地顺序、模块边界、测试和迁移策略。

四篇文档的权威关系是：

```text
本总览固定产品目标与阶段
→ 核心规范固定不可违背的语义
→ PBWork 流程固定用户可见行为
→ 实施指南说明当前代码库的落地策略
→ 实施中的可执行 Schema 与测试固定具体字段和算法
```

若实施发现具体方案不适合，可以调整实施指南、代码结构和算法；若要改变产品边界、核心规范或阶段完成条件，必须先更新对应文档并说明原因。不得先让代码形成另一套产品语义，再反向补文档。

## 为什么进入 V2

V1 已经可以从原型页面、Runtime 和目标 Flutter 工程生成产物，再由 Agent 完成实现，基本闭环成立。V2 不是因为 V1 完全不可用，而是因为它在证据不足时仍会生成大量实现推导：

- 默认态之外的状态、Overlay、动作条件和页面关系缺少稳定证据；
- Source、Runtime、Screenshot、Target 候选和实现建议混在同一条生成链；
- 单页面产物难以表达 Prototype、多 Variant、跨页面 Flow 和共享组件；
- 每次目标实现都重新扫描和生成，证据不能稳定复用；
- 产物体积增长没有同步提高可信度，Agent 仍需判断哪些内容是事实、推断或建议。

如果继续增强 Planner，PB 会越来越像一个脆弱的目标工程代码生成器，却不能解决证据覆盖和可追溯性问题。V2 因此把中心从“生成更完整的 Flutter 计划”转为“生产可复查、可复用、可按需读取的原型证据”。

## 长期产品目标

ProtoBridge 的长期形态是本地原型证据基础设施：

> 从 PBWork 和其他原型 Runtime 中，可靠地发现、采集、组织和暴露页面、状态、组件、视觉、动作与页面关系，为不同目标技术栈和 Coding Agent 提供可追溯证据。

长期目标不依赖 Flutter，也不依赖某个 Agent 产品：

- 原型作者用显式 Contract 表达稳定身份和业务语义；
- PB 以确定性方式采集并保存不可变 Evidence；
- PBWork、CLI 和自动化入口使用同一套证据生产能力；
- MCP 向 Agent 暴露固定版本、按需读取的 Evidence；
- Agent 结合目标仓库自行决定文件、组件、路由、状态管理和 Token 表达；
- 后续可以增加新的 Source Adapter、Runtime Adapter 和 Target Adapter，但不改变 Evidence 的核心语义。

V2 是这个长期目标的第一个完整版本：本地、单用户、以 PBWork 为首要原型与采集控制面，以 CLI 和 MCP 完成自动化与消费闭环。

## 产品职责

### ProtoBridge 负责

- 发现 Prototype、Screen、Variant、Theme、Device、Fragment 和 Scenario；
- 读取显式 Runtime Contract、`data-pb-*`、Source 和 Runtime observation；
- 确定性准备并采集所选 Case；
- 保存 provenance、Coverage、Issue、unknown、Screenshot 和 Debug Evidence；
- 以不可变 revision 和 Snapshot 组织 Evidence；
- 通过 PBWork、CLI 和 MCP 暴露同一份持久化证据；
- 判断 Evidence 是否 partial 或相对当前输入 stale；
- 向 Agent 生成固定 Snapshot 的 Handoff。

### ProtoBridge 不负责

- 决定 Flutter 文件、Widget Tree、路由、状态框架、组件或 Token；
- 自动把 Source component 映射为 Target component；
- 根据 DOM click 或名称相似度推导完整业务动作；
- 把 unknown、冲突或缺失证据补成确定事实；
- 修改 Source 或 Target；
- 在 V2 中提供 Agent Chat、账号、角色、审批或多人云协作。

### PBWork、PB 与 Agent

- PBWork Registry、原型源码和 Runtime Contract 维护原型事实；
- PBWork Capture 是用户操作证据生产过程的首要控制面；
- PB Core 负责校验、展开、采集、合并和存储；
- Local Service 连接浏览器端 PBWork 与 Node/Playwright/Store；
- CLI 是同一 Capture 能力的命令行入口；
- MCP 是 Agent 读取 Evidence 的正式入口，并可暴露独立 Target 查询；
- Coding Agent 读取固定 Evidence 和目标仓库，自行实现并验证生产代码。

## 完整产品闭环

一次任务可以选择一个 Fragment、一个 Screen、一组 Screen 或整个 Prototype，但都走同一条闭环：

| 环节       | 用户或系统行为                                                                                | 产物                       |
| ---------- | --------------------------------------------------------------------------------------------- | -------------------------- |
| 原型声明   | Registry、组件 Contract、页面源码和 Runtime 声明 Screen、Variant、Action、Scenario 和稳定节点 | 可发现的原型语义           |
| 选择范围   | PBWork 或 CLI 选择 Screen、Variant、Fragment、Theme、Device 和 Scenario                       | Selection Draft            |
| 预检       | 校验身份、引用、Runtime 能力、预计 Case 和风险                                                | 可执行 Matrix 或阻塞 Issue |
| 创建任务   | 用户确认 Matrix 和 warning 后启动后台采集                                                     | Capture Job                |
| 准备与采集 | Core 导航 Runtime，准备 Case，执行 Scenario，在 Checkpoint 采集语义和视觉                     | Case Evidence              |
| 持久化     | Store 提交 Run、Attempt、Evidence revision、Catalog revision、Blob 和新 Snapshot              | Evidence Bundle Snapshot   |
| 检查与恢复 | PBWork 展示 Coverage、Issue、unknown、Screenshot、partial 和 stale                            | 修复、重试或重采范围       |
| 交接       | 用户选择固定 Snapshot 和实现范围，确认必要风险                                                | Agent Handoff              |
| 消费与实现 | Agent 通过 MCP 读取固定 Evidence，再读取目标仓库并实现                                        | 目标代码与验证结果         |

原型变化后只重新采集受影响的 Case。新的 Run 和 Snapshot 不覆盖历史 Evidence，也不改变已经生成的 Handoff。

## 两个独立生命周期

证据生产生命周期：

```text
原型声明 → 选择 → 预检 → 采集 → 检查 → 持久化 → 重采
```

目标实现生命周期：

```text
接收 Handoff → 校验 Workspace → 按需读取 Evidence
→ 读取目标仓库 → 实现 → 验证
```

两个生命周期只通过 Agent Handoff 和 MCP Evidence 连接。Target 查询属于实现生命周期，不能写回来源 Evidence；Capture 也不能因为目标仓库缺少某个组件而失败。

## 必须保持的产品决策

以下决策用于裁决实施中的分歧：

1. V2 的核心产物是 Evidence，不是目标工程实现计划。
2. PBWork 和 CLI 必须提交等价的选择语义，并调用同一个 Core Capture 能力。
3. PBWork 必须完成选择、预检、采集、检查、修复、重采和 Handoff 的完整闭环。
4. MCP 是 Agent 读取 Evidence 的正式边界；Agent 不直接解析 Store 目录。
5. Target Adapter 只查询和验证目标仓库，不参与 Capture，不写 Evidence。
6. 稳定 Case 身份与一次采集产生的 Evidence revision 分离。
7. Run、Attempt、Evidence revision、Snapshot、Staleness Report 和 Handoff 均不可变。
8. Bundle 当前态由 Snapshot 表达，不能用“最近一次 Run”冒充整个 Bundle 当前证据。
9. 失败重试只更新最新 Attempt；不能清除最后一次成功 Evidence。
10. Handoff 必须固定 Snapshot 和具体 Evidence revision；后续重采不得使旧 Handoff 漂移。
11. stale 是指定 Snapshot 相对于一次明确输入检查的结果，不能回写历史对象。
12. Runtime 页面导航由 Core/Playwright 控制；Runtime 只准备和验证当前页面状态。
13. Scenario 是正式 Case 来源，Checkpoint 具有可重复采集的稳定身份。
14. partial、stale、failed、skipped、unsupported、cancelled、interrupted 和 unknown 对用户与 Agent 可见。
15. 目标工程不需要提交 PB Workspace、Store 或 Source 配置。
16. 阶段六、七合并收敛：以账本星球三个代表页面验证闭环；删除 V1 产品链与 CLI `v2` 前缀，但不要求发布。

这些决策的精确对象关系和验证规则见 [V2 核心规范](./pb-v2-spec.md)。

## 产品范围

### V2 必做

- Prototype、Screen、Variant、Fragment 和 Scenario Selection；
- instrumented runtime、generic runtime 和 screenshot-only 三种证据入口；
- Runtime discovery、prepare、stability、semantic snapshot、Scenario step 和 reset；
- Screen × Variant × Theme × Device × Scenario Checkpoint 的确定性 Case；
- Source、Runtime、ARIA、Screenshot 和显式 Contract 的 provenance；
- Bundle、Snapshot、Run、Attempt、Evidence revision、Blob、Coverage、Issue 和 Staleness Report；
- 增量采集、失败隔离、重试、取消、崩溃恢复和安全清理；
- PBWork 四类 Capture 入口及完整操作闭环；
- CLI 的采集、检查和 Bundle 生命周期能力；
- MCP 的持久 Evidence 发现与按需读取；
- Agent Handoff、Consumer 读取顺序和确定性错误；
- 独立 Flutter Target 查询与验证能力；
- 新增 Screen 默认执行严格证据门禁，存量未迁移页面显式进入 legacy allowlist；
- 账本星球任务列表、任务详情、账本列表完成代表性迁移与浏览器回归；
- V1 Artifact、Planner、旧 CLI/MCP 页面工作流和死代码退出。

### V2 不做

- Vue、HTML 或 CSS 到 Dart 的自动翻译；
- 自动选择目标文件、组件、路由、状态框架或 Token；
- 无边界自动点击和爬取；
- 修改 Source 或 Target；
- V1 Artifact 兼容读取或旧 output 自动迁移；
- 账号、角色权限、审批、远程 Job、共享云 Store 和多人并发编辑。

## 唯一实施阶段

实施只使用以下七个阶段。其他文档不得再创建另一套执行编号或独立门禁。每个阶段的完成条件就是进入下一阶段的门槛。

### 阶段一：核心产品语义

目标是把计划级约束落成可执行的最小 V2 Contract，使后续 Store、Runtime 和入口不会各自解释核心概念。

关键任务：

- 在现有 Core 中建立 V2 命名空间和可执行 Schema；
- 固定稳定身份、核心对象关系、状态语义、provenance 和错误分类；
- 为 Selection、Case、Evidence revision、Snapshot、Handoff 建立最小示例与无效示例；
- 示例同时覆盖 full Case primary active 与 Fragment scoped active 的解析和防降级；
- 建立 schema compatibility、cross-reference 和历史不可变测试；
- 保持 V1 导出和行为不变，不在本阶段迁移入口。

完成条件：

- [V2 核心规范](./pb-v2-spec.md) 中关于身份、对象关系、状态和引用的规则已有 Schema、断言和 fixtures；其余行为规则已有对应的验收场景；
- PBWork、CLI、MCP 不需要维护第二套核心枚举；
- 示例覆盖成功、冲突、partial、stale、失败重试和 Handoff 固定引用；
- 具体字段已经由代码中的可执行 Schema 决定，计划文档不再充当类型源文件；
- Core build、typecheck 和新增 Contract tests 通过。

### 阶段二：证据模型与存储

目标是让 Evidence 可以长期保存、增量更新、崩溃恢复，并保证历史读取不漂移。

关键任务：

- 实现 Store interface 和本地持久化实现；
- 实现持久 Job record、execution journal、orphan detection 和重启终结；
- 实现 Bundle、Snapshot、Run、Attempt、Catalog/Evidence revision 和 Blob；
- 实现 active successful Evidence 与 latest Attempt 分离；
- 实现引用完整性、事务提交、并发写保护、崩溃恢复和容量检查；
- 实现 Case 依赖摘要、增量复用、Staleness Report、fork、archive 和安全 clean。

完成条件：

- 进程重启后可以读取相同 Snapshot 和全部被引用对象；
- Service 重启后非终态 Job 可以确定性终结为 interrupted Run、Coverage 和 Snapshot；
- 新 Run、失败重试和新 Snapshot 不改变历史 Run、Evidence revision 或 Handoff 解析结果；
- 失败写入不会留下被 active Snapshot 引用的半成品；
- 无关 Screen 或依赖变化不会使全部 Case 同时 stale；
- clean 不删除 active Snapshot、未归档 Bundle 或 Handoff 引用的对象；
- Store contract、transaction、recovery、concurrency 和 retention tests 通过。

### 阶段三：Runtime 与捕获

目标是建立从 Selection 到持久化 Snapshot 的确定性证据生产能力。

关键任务：

- 在 PBWork pure Runtime 上实现独立于现有 Workbench Bridge 的 V2 Capture Protocol；
- 实现 Manifest、Contract、prepare、stability、semantic snapshot、Scenario step 和 reset；
- 实现 Selection resolver、Preflight、Case Matrix 和 Capture Orchestrator；
- 复用 Playwright Browser、隔离 Case Context、固定环境并保存失败诊断；
- 支持 instrumented、generic runtime 和 screenshot-only 的能力降级。

完成条件：

- 一个 Screen 的 default/critical Variant、Fragment 和至少一个 Scenario Checkpoint 可以从 Selection 生成 Snapshot；
- Runtime prepare 后实际 Screen、Variant、Theme 和 fixture 与请求一致；Core/Playwright 对 Device identity、viewport 和 DPR 负责并验证，不一致时明确失败；
- 同一固定输入重复采集的语义结果稳定，视觉差异可诊断；
- 单 Case 失败、取消或 unsupported 不阻止其他 Case 提交；
- 失败重试保留上一成功 Evidence；
- Runtime、Preflight、Capture、Scenario 和故障路径 tests 通过。

### 阶段四：PBWork 操作闭环

目标是让用户可以在 PBWork 中独立完成一次完整证据生产任务。

关键任务：

- 建立 PBWork 与 Core/Playwright/Store 之间的本地 Service 边界；
- 实现当前 Screen、选中 Fragment、自定义范围、整个 Prototype 四类入口；
- 实现 Selection Draft、Preflight、Matrix 确认、Job 进度和恢复；
- 实现 Snapshot Evidence、Coverage、Issue、Screenshot、unknown 和 stale 检查；
- 实现 cancel、retry、stale recapture、Bundle fork/archive 和 Handoff。

完成条件：

- 四类入口在进入 Preflight 后共用同一套 Job 和 Store 能力；
- 页面关闭后 Job 继续，重新进入可以恢复；Service 中断显示 interrupted，不伪装继续；
- warning 未确认、Preflight 过期、稳定身份缺失或 Matrix 超限时不能创建 Job；
- partial、stale 或包含 policy-required risk 的 Handoff 只有在用户逐项明确接受后才能生成；
- 已生成 Handoff 在后续重采后仍解析到原 Snapshot；
- PBWork unit、interaction 和真实浏览器 E2E 通过。

### 阶段五：CLI、MCP 与消费链路

目标是让自动化生产者和 Coding Agent 使用同一份持久 Evidence 完成目标实现。

进入本阶段前先使用 `ledger-planet.task-list` 的 default、critical、Fragment 和 Scenario Checkpoint 作为充分仪表化黄金样本，确认语义、视觉、行为、provenance、复用和 Store owner refs 可以被独立回归。未声明完整覆盖边界的页面只采集实际观测证据并报告 required unknown；这个门禁不要求提前迁移或重做其他原型页面。

关键任务：

- 让 CLI 支持与 PBWork 等价的 Selection、Preflight、Capture 和 Bundle 管理；
- 让 MCP 按 Workspace、Snapshot 和具体 revision 发现并读取 Evidence；
- 从 Capture 主链移除 Target Flutter 扫描，形成独立查询与验证边界；
- 定稿 Agent Handoff Consumer 指南；
- 建立“目标工程无 ProtoBridge 配置”的消费 E2E。

完成记录（2026-07-30）：

- CLI 已使用 Workspace 配置接入 Core 的 Selection、Preflight、Capture、Job、Bundle、stale 和 Handoff 能力；
- MCP 已覆盖 Workspace、历史、Run、Snapshot、revision、Fragment、Catalog、Issue、Staleness、Handoff 和受引用约束的 Blob 只读消费，并提供确定性结构化错误；
- Capture 与 Flutter Target 已建立单向边界，Target 只提供独立查询和变更验证，不要求目标工程存在 ProtoBridge 配置，也不写入 Evidence；
- Agent Handoff Consumer 指南、MCP resource/prompt 和真实 Target 消费 E2E 已完成，Consumer 会保留并报告全部 Handoff risks；
- 当前统一入口 `pnpm verify` 覆盖 CLI/PBWork Matrix 等价、历史读取、Consumer、Target 和 PBWork → Store → MCP 垂直切片门禁。

完成条件：

- PBWork 与 CLI 对同一 Selection 生成相同 Case Matrix；
- MCP 重启后仍可读取历史 Snapshot、Case、Fragment、Issue、Coverage 和 Blob；
- Workspace 不匹配、Snapshot 不存在或 revision 失效时确定性失败，不猜测 Store 路径；
- Agent 能从 Handoff 按需读取 Evidence、读取目标仓库、实现并验证一个真实任务；
- Consumer 始终报告 Handoff 的全部 risks，包括 Evidence Level 限制、required unknown、unresolved conflict 和人工 promotion；
- Target 查询结果不进入 Evidence Bundle；
- CLI、MCP、Consumer 和 Target tests 通过。

### 阶段六：代表性真实产品闭环验证

目标是用少量但完整可靠的真实证据验证产品闭环，并让之后新增的 PB 原型天然符合证据规范。

关键任务：

- 对新增 Screen 建立默认严格门禁：默认态和关键 Variant 必须声明并实现 `requiredFragments`；
- 将暂不迁移的存量 PBWork 页面放入显式 legacy allowlist，禁止 allowlist 无限增长；
- 迁移并回归账本星球的任务列表、任务详情和账本列表；
- 验证 Runtime Evidence、真实截图、Store Capture 与 Handoff 消费链；
- 验证 Instrumented Runtime、通用 Runtime 和 Screenshot-only 的能力边界。

本阶段明确不要求：

- PBWork 25 个 Screen、82 个 Variant 全量迁移；
- Source Adapter 作为完成前提；
- V1 / V2 定量对照；
- 反复扩展 CLI / MCP 测试矩阵。

完成条件：

- 未来新增 Screen 若缺少证据边界会在注册表校验中失败；
- 三个账本星球页面均完成真实浏览器采集与片段可见性验证；
- 证据可写入 Store，并可由现有 CLI / MCP 消费；
- 风险与能力降级规则有明确文档和自动化测试。

### 阶段七：V1 退出与仓库收口

目标是删除 V1 产品链，留下单一、干净、可用的 Evidence 产品，不以发布为完成条件。

关键任务：

- 删除 V1 采集、生成、规划、配置、页面重建及兼容代码；
- CLI 移除 `v2` 前缀，默认直接暴露 Evidence 工作流；
- MCP 删除 V1 页面工具、资源、Prompt 与配置入口；
- 清理旧导出、旧依赖、旧脚本、旧环境变量和文档口径；
- 在 V1 删除后重新验证 CLI、MCP、Store、Runtime 与 Handoff 闭环；
- 使用锁文件冻结安装、构建、类型检查、测试与真实浏览器回归验证仓库可用性。

本阶段明确不要求：

- 发布 npm 包；
- 统一版本号；
- 迁移所有存量 PBWork 原型。

完成条件：

- 正式源码与产品入口不再提供 V1 能力；
- 顶层 CLI 无 `v2` 前缀，MCP 只暴露 Evidence 与目标查询能力；
- 依赖安装、构建、类型检查、单测和端到端测试全部通过；
- 仓库无验证过程产生的临时文件，未执行发布。

完成记录（2026-07-30）：`pnpm verify` 全部通过；冻结锁文件安装、仓库构建与类型检查成功，Core 169、Local Service 6、CLI 5、PBWork 72 个测试通过，Runtime 4 个浏览器用例、MCP、Consumer 和 Evidence 垂直切片均通过。

## 最终 Definition of Done

V2 完成必须同时满足：

- 用户能从 PBWork 四类入口或 CLI 选择并采集证据；
- Runtime 能确定性准备、验证、执行和重置 Case；
- Case identity 覆盖 Theme、Device、Scenario 和 Checkpoint；
- Evidence 具有来源、可信度、引用、冲突和 unknown；
- Store 支持不可变历史、增量更新、事务恢复和安全清理；
- Snapshot Coverage 与单次 Run Coverage 分离；
- Snapshot 固定截至提交时的 scoped latest Attempt 和 Coverage，后续 Run 不改变旧 Snapshot 的解释；
- latest Attempt 不覆盖 active successful Evidence；
- stale 相对指定 Snapshot 和输入生成，历史对象不被回写；
- Handoff 固定 Snapshot 和 revision，后续重采不导致漂移；
- Handoff 分开固定 Coverage、freshness 和全部 risks，非完整/新鲜或需确认风险不能被隐藏；
- MCP 能按需读取完整消费链所需 Evidence；
- Agent 不需要读取 Store 路径或在目标仓库保存 PB 配置；
- Target 查询与 Capture 解耦，目标事实不污染来源证据；
- 新增 PBWork Screen 默认受严格证据门禁约束，存量例外显式隔离；
- 账本星球三个代表页面完成 Runtime、截图、Store 与 Handoff 回归；
- 三种 Evidence Level 和主要失败路径通过 E2E；
- V1 产品代码、兼容入口、旧依赖与 CLI `v2` 前缀已移除；
- `pnpm verify` 覆盖冻结安装、构建、类型检查、单测和端到端闭环；
- 仓库保持可用且未执行发布。

实施完成以可复现测试和代表性真实证据判断，不以全量旧原型迁移、文档篇幅、代码量或发布动作判断。
