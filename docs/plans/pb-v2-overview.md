# ProtoBridge / PBWork V2 产品闭环与实施总览

> 状态：实施中；阶段三已完成，可进入阶段四
> 目标分支：`dev`
> 性质：破坏性重构；V2 不兼容 V1 Artifact、CLI 和 MCP 页面工作流
> 当前正式包基线：`0.4.0`
> V2 正式发布目标：`0.5.0`
> 更新时间：2026-07-29

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
16. V2 未完成前保留可用的正式 V1；全部完成后一次性退出 V1，不发布用户可见双轨产品。

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
- 当前 PBWork Registry 的全部 Prototype、25 个 Screen 和 82 个 Variant 迁移；
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

关键任务：

- 让 CLI 支持与 PBWork 等价的 Selection、Preflight、Capture 和 Bundle 管理；
- 让 MCP 按 Workspace、Snapshot 和具体 revision 发现并读取 Evidence；
- 从 Capture 主链移除 Target Flutter 扫描，形成独立查询与验证边界；
- 定稿 Agent Handoff Consumer 指南；
- 建立“目标工程无 ProtoBridge 配置”的消费 E2E。

完成条件：

- PBWork 与 CLI 对同一 Selection 生成相同 Case Matrix；
- MCP 重启后仍可读取历史 Snapshot、Case、Fragment、Issue、Coverage 和 Blob；
- Workspace 不匹配、Snapshot 不存在或 revision 失效时确定性失败，不猜测 Store 路径；
- Agent 能从 Handoff 按需读取 Evidence、读取目标仓库、实现并验证一个真实任务；
- Consumer 始终报告 Handoff 的全部 risks，包括 Evidence Level 限制、required unknown、unresolved conflict 和人工 promotion；
- Target 查询结果不进入 Evidence Bundle；
- CLI、MCP、Consumer 和 Target tests 通过。

### 阶段六：迁移与全链路验收

目标是用完整迁移台账和 3 个代表页面的固定任务集证明 V2 不是只对单个样例成立。

关键任务：

- 从 Registry 自动生成 2 个 Prototype、25 个 Screen、82 个 Variant 的迁移台账；
- 在运行 V2 对比前冻结 V1/目标仓库基线、任务集、计数口径、评分 rubric 和原始记录格式；
- 补齐稳定 ID、Action、Component、Slot、Scenario 和关键 Checkpoint；
- 完成 instrumented-source-runtime、instrumented-runtime、generic-runtime 和 screenshot-only 验收；
- 在固定 3 页基准内验证单 Screen、Fragment、多 Screen、partial 修复和 stale 重采；整个 Prototype 只验证 Selection、Matrix、容量和任务拆分，不执行 25 页重复浏览器回归；
- 在相同目标仓库基线上执行固定 V1/V2 对比任务。

测试范围必须区分：

- 25 Screen / 82 Variant 的迁移台账用于 Registry、Contract、lint、引用和能力覆盖检查；
- 浏览器回归与 V1/V2 实现对比固定选取 3 个代表页面，不要求对 25 个 Screen 逐页重复回归；
- generic runtime、screenshot-only、故障和恢复路径优先复用这 3 个页面或独立最小 fixture，不扩大页面分母。

完成条件：

- 迁移台账中的每个 Screen、Variant、Action 和 Scenario 都有 Contract/lint 通过、明确不适用或带 Issue 的 unsupported 结果，不要求逐项执行浏览器回归；
- Ledger Planet 18 Screen / 54 Variant、Field Service 7 / 28 与当前 Registry 完全一致并有可追踪台账；
- 四种 Evidence Level 的生产、存储、读取和错误路径 E2E 通过；
- `unsupportedAssumptions = 0`；
- V2 完成任务数不低于 V1；
- 人工补充事实数较 V1 至少减少 30%，Evidence 导致的误实现至少减少 50%，相关返工轮次至少减少 30%；
- 原始对比记录和汇总进入发布证据。

### 阶段七：V1 退出与发布

目标是在 V2 完整通过后一次性删除旧产品链路并发布正式版本。

关键任务：

- 冻结 V1 功能变更；
- 删除旧 Artifact writer、Planner、pageId workflow、旧 CLI generate 和旧 MCP resources；
- 删除不再使用的 Target planning 和兼容代码；
- 更新 config、binary、package exports、README、AGENT、产品文档和 Consumer 指南；
- 统一正式包版本并执行安装包验证。

完成条件：

- 前六阶段的完成证据全部存在；
- 仓库中不再有正式入口引用 `page-canonical.json`、`ui-build-plan.json`、`ui-build-review.md` 或旧 page resources；
- V2 CLI、MCP、PBWork、Store 和 Target 包从干净安装环境可运行；
- 真实 PBWork → Handoff → MCP → 目标实现闭环再次通过；
- 所有发布包使用不低于现有 `0.4.0` 的统一正式版本，目标为 `0.5.0`；
- V1 删除、迁移说明和发布说明经复核后发布。

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
- 当前 25 Screen / 82 Variant 完成迁移台账与 Contract 覆盖；
- 四种 Evidence Level 和主要失败路径通过 E2E；
- 3 个代表页面的 V1/V2 固定任务集达到阶段六的量化门槛；
- V1 只在上述条件全部满足后删除并发布 V2。

实施完成以可复现的测试、迁移台账和发布证据判断，不以文档篇幅、代码量或“主要路径可用”判断。
