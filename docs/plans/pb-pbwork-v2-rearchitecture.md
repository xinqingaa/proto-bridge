# ProtoBridge / PBWork V2 重构计划

> 状态：W0 计划冻结候选；代码实施尚未开始
> 目标分支：`dev`
> 性质：破坏性重构；不兼容 V1 Artifact、CLI 和 MCP 页面工作流
> 更新时间：2026-07-28

本文件是 V2 的决策与交付入口，回答为什么重构、完整终态是什么、如何实施以及满足哪些条件才算完成。

精确类型与协议见 [PB V2 Contract 规范](./pb-v2-contracts.md)。
代码落点、CLI / MCP、测试和切换步骤见 [PB V2 实施规格](./pb-v2-implementation.md)。
PBWork 的选择、预检、采集、检查、重采和交接见 [PBWork V2 Capture 体验规格](./pbwork-v2-capture-experience.md)。

V2 执行只以本文件为入口，并按上面三份计划附件读取精确 Contract、代码落点和 PBWork 行为。`docs/design.md`、现有 README、AGENT、skills 和 V1 代码只作为迁移现状，不得覆盖本计划的 V2 决策；需要保留的现状必须先进入 W9 台账。实施中不得从代码反向产生未记录的新产品目标。

## 1. 为什么重构

### 1.1 V1 的真实状态

V1 不是不能用。它已经可以从原型页面、Runtime 和目标 Flutter 工程生成产物，再由 Agent 完成实现，基本闭环成立。

这次重构也不是因为某一次页面还原失败，而是审查多批产物后发现：V1 的主要问题不是“输出格式不好看”，而是证据不足时仍会继续生成大量实现推导。

目前的问题按严重程度排序：

1. **证据不足却继续推导。** 默认态之外的状态、Overlay、动作条件、组件身份和页面关系没有充分证明，Planner 仍会补出看似完整的结论。
2. **事实和建议混在一起。** Source component、Runtime observation、target candidate 和 Flutter 实现建议进入同一条生成链，Agent 很难区分哪些必须遵守、哪些只是候选。
3. **采集对象过小。** V1 以单页面为中心，不能稳定表达整个 Prototype、跨页面 Flow、共享组件和多 Variant。
4. **证据难复用。** 每次进入目标工程重新扫描、重新生成，采集生命周期与实现生命周期耦合。
5. **产物大但可信度不随体积提升。** Agent 读到更多 JSON，不等于获得更多已证明事实。

如果继续增强 Planner，PB 的职责会越来越重，但最关键的证据缺口仍然存在。因此 V2 不再把重点放在“生成更完整的 Flutter 计划”，而是先保证原型事实可以被可靠证明、复查和按需读取。

## 2. V2 产品定位

V2 中，ProtoBridge 是一个本地原型证据系统：

> 从 PBWork 和其他原型 Runtime 中，可靠地发现、采集、组织和暴露页面、状态、组件、视觉、动作与页面关系，为后续实现提供可追溯证据。

V2 的价值不是替 Agent 做更多决定，而是减少 Agent 必须猜测的部分。

### 2.1 PB 负责什么

- 发现 Prototype、Screen、Variant、Theme、Device 和 Fragment；
- 读取显式 Runtime Contract 与 `data-pb-*`；
- 补充可追溯的 Source 逻辑证据；
- 确定性采集不同页面和状态；
- 记录 Coverage、Issue、unknown 和 provenance；
- 持久化 Evidence Bundle；
- 通过 CLI、PBWork 和 MCP 暴露同一份证据。

### 2.2 PB 不负责什么

- 决定 Flutter 文件、Widget Tree、路由和状态框架；
- 自动选择目标工程组件或 Token；
- 把一次 DOM click 推导成完整业务动作；
- 把名称相似当成 target mapping；
- 修改 Source 或 Target；
- 代替 Coding Agent 实现生产代码。

### 2.3 PBWork、PB 与 Agent 的关系

当前是本地单用户工具，不要求用户声明身份或切换角色。

- **PBWork 与原型源码**维护原型事实和显式 Contract；
- **PB Core**校验、采集、合并和存储证据；
- **Coding Agent**读取证据与目标仓库，自行实现和验证。

账号、人物角色、RBAC 和审批不进入 V2。PBWork、CLI 和 MCP 只根据当前配置中是否存在 Runtime、Store 和 Target 能力来决定可用功能。

### 2.4 不可变产品决策

以下决策用于裁决后续设计和实现分歧，V2 实施不得反向改变：

1. V1 可以完成页面级闭环；V2 重构的原因是证据覆盖、可信度和复用能力不足，不是 V1 完全不可用。
2. PB 的核心产物是 Evidence，不是目标工程实现计划。
3. PBWork 和 CLI 是同一证据生产能力的两个入口，必须提交同一种 `CaptureRequest` 并写入同一个 Workspace Store。
4. PBWork 是首要采集控制面，必须完成选择、预检、采集、检查、修复、重采和交接闭环。
5. MCP 是 Agent 读取 Evidence 的正式入口；目标工程和 Agent 不直接解析 Store 目录。
6. Handoff 只标识实现范围、证据引用、Coverage 和 unknown，不复制整份 Evidence，也不携带 Store 物理路径。
7. Coding Agent 读取 Evidence 和目标仓库后自行决定文件、组件、路由、状态管理和 Token 表达。
8. Target Adapter 只查询和验证当前目标仓库，不参与 Capture，不写 Evidence。
9. 目标工程不需要提交 ProtoBridge 配置文件；Store 连接属于 MCP 运行环境。
10. V2 不提供用户可见的 V1/V2 中间产品，全部 DoD 通过后一次性切换。
11. `caseId` 表示稳定 Case 身份；一次采集产生不可变 `caseEvidenceRevisionId`，历史 Run 只引用具体 revision。
12. Bundle 当前态由不可变 `BundleSnapshot` 表达，不以“最近一次 Run”冒充整个 Bundle 当前证据。
13. Handoff 必须固定到 `bundleSnapshotId` 和具体 Evidence revision；后续重采不得改变已经生成的 Handoff。
14. Preflight、Job、Run、Case attempt 和 Bundle snapshot 是不同对象，不共享或混用状态字段。
15. Runtime 页面导航由 Core / Playwright 负责；Runtime Protocol 只准备并验证当前 canonical 页面中的状态。
16. Scenario 必须是可选择、可逐步执行、可在 Checkpoint 采集的正式 Case 来源。
17. Stale 是一个 Snapshot 相对于一次明确输入评估的结果，由独立 `StalenessReport` 表达，不回写历史 Run 或 Snapshot。
18. V2 发布版本不得低于现有已发布包版本；当前正式切换目标为 `0.5.0`。

## 3. 一次完整使用如何流转

以下流程同时适用于采集一个控件、一个页面、一组页面或整个 Prototype。

| 步骤          | 发生什么                                                                                | 主要输入                     | 产生什么                                |
| ------------- | --------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------- |
| 1. 原型声明   | PBWork Registry、DS Contract 和页面源码声明 Screen、Variant、Component、Token 和 Action | 原型源码                     | 可发现的 Prototype Contract             |
| 2. 选择范围   | 用户在 PBWork 或 CLI 选择 Prototype / Screen / Variant / Fragment、Theme 和 Device      | CaptureSelection             | Selection Draft                         |
| 3. 预检       | Runtime 与 Core 校验 Contract、稳定 ID、选择引用和采集上限                              | Selection + Manifest         | 可执行 Matrix 或阻塞 Issue              |
| 4. 展开任务   | PB Core 将通过预检的选择展开成完整 Case Matrix                                          | Selection + Manifest         | Base Case 与 Scenario Checkpoint Case    |
| 5. 准备状态   | Core 导航 canonical URL，Pure Runtime 按 Case 设置 fixture、Variant 和 Theme 并报告是否稳定 | Case                      | 可验证的 Runtime 状态                   |
| 6. 采集证据   | Core 结合 Runtime、Source 和 Screenshot 采集语义、视觉、组件和动作证据                  | 稳定 Runtime + 可选 Source   | Case Evidence                           |
| 7. 持久化     | Store 以事务方式写入 Catalog revision、Run、Case Evidence revision、Blob 和 Bundle Snapshot | Case Evidence             | Evidence Bundle Snapshot                |
| 8. 检查与交接 | PBWork 显示 Snapshot Coverage、Issue、Screenshot 和 stale，并生成固定 Snapshot 的 Handoff | Bundle Snapshot            | workspaceId、bundleId、snapshotId 和 refs |
| 9. Agent 消费 | Agent 按 Consumer 规范通过 MCP 读取固定 Snapshot、Coverage、Catalog、Case revision、Fragment 和图片 | Handoff + MCP          | 当前实现需要的 Evidence                 |
| 10. 目标实现  | Agent 读取目标仓库；必要时调用独立 Target Adapter 查找规范和示例                        | Evidence + Target Repository | 生产代码与验证结果                      |

原型发生变化时重新执行步骤 2–7。未变化的 Case Evidence revision 和 Blob 可复用；新的 Run 产生新的 Bundle Snapshot，但不覆盖历史 Run、历史 Snapshot 或已经生成的 Handoff。

### 3.1 两个生命周期

**证据生产生命周期**

```text
原型声明 →选择范围 →预检 →准备状态 →采集 →检查 →持久化
```

它发生在 PBWork / CLI 和 PB 本地服务一侧，结果可以被多个任务复用。

**目标实现生命周期**

```text
接收 Handoff →验证 Workspace →按需读取 Evidence →读取目标仓库 →实现 →验证
```

它发生在目标工程和 Coding Agent 一侧。Target 查询只辅助这次实现，不反向污染原型 Evidence。

### 3.2 两个生命周期如何交接

`AgentHandoff` 是两个生命周期之间的唯一任务交接对象：

```text
workspaceId + bundleId + bundleSnapshotId + selection + intent + coverageSummary + stalenessReportId + riskAcceptance + unknowns
```

Handoff 不内嵌整份 Evidence，不包含 Store 绝对路径、target root、目标组件映射或 Flutter 文件计划。PBWork 生成 Handoff 后，Agent 使用已连接对应 Workspace 的 MCP 读取其固定 Snapshot；MCP 连接错误、Workspace 不匹配、Snapshot 不存在或 revision 引用失效时必须显式失败，不能回退为路径猜测，也不能静默读取 Bundle 的更新当前态。

## 4. 目标架构

目标架构按四层划分，不依赖图也可以理解：

| 层         | 组件                                                                      | 职责                                                      | 不进入下一层的内容 |
| ---------- | ------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------ |
| 原型声明层 | PBWork Registry、Component/Token Contract、Prototype Source、Pure Runtime | 声明原型有哪些页面、状态、组件、动作和可复现输入          | 目标 Flutter 决策  |
| 证据生产层 | PBWork Capture、CLI、Local Service、PB Core、Source Adapter、Playwright   | 选择范围、准备 Runtime、采集并校验证据                    | 未证明的业务结论   |
| 证据存储层 | Evidence Store                                                            | 保存 Bundle、Catalog、Run、Case、Screenshot 和 Debug Blob | 目标工程扫描结果   |
| 实现消费层 | MCP、Coding Agent、Target Flutter Adapter                                 | 按需读取证据、理解目标仓库、实现和验证                    | 不写回原型事实     |

### 4.1 组件之间如何连接

1. PBWork Capture 和 CLI 都把同一个 `CaptureRequest` 交给 Local Service / JobHost。
2. Local Service 只管理 Job、进度、并发和本地安全，不实现第二套采集逻辑。
3. PB Core 根据 Selection 调用 Pure Runtime Protocol、Source Adapter 和 Playwright。
4. PB Core 将结果写入 Evidence Store。
5. PBWork 从 Service 读取 Job、Coverage、Issue 和 Screenshot。
6. MCP 直接从持久化 Store 读取证据，不依赖 Capture 进程仍然存活。
7. Coding Agent 同时读取 MCP Evidence 和目标仓库。
8. Target Flutter Adapter 只查询和验证目标工程，不参与 Capture，也不写 Bundle。

### 4.2 配置与数据归属

| 信息                                      | 归属                                       | 不得放入          |
| ----------------------------------------- | ------------------------------------------ | ----------------- |
| Runtime、Source、Store、Service、Capture  | PB 采集工作区配置                          | 目标工程配置      |
| MCP 到 Workspace Store 的连接             | 用户、Codex 或 IDE 的 MCP 启动配置         | Agent Handoff     |
| workspaceId、bundleId、选择范围和任务意图 | Agent Handoff                              | Store 绝对路径    |
| target root                               | 当前 Agent 工作目录或单次 target tool 参数 | Evidence Bundle   |
| 目标工程规范                              | 目标仓库代码与文档                         | PB Workspace 配置 |
| Agent 消费流程                            | V2 Consumer Skill / 使用指南               | Core 隐式 prompt  |

同一个 PB Workspace 中，PBWork、CLI 和 producer MCP 通过同一个 Core / JobHost 写入同一个 Store。目标工程不拥有 Store，也不直接读取 Store 文件；MCP 是 Store 对 Agent 的读取边界。

### 4.3 核心对象与代码边界

| 对象      | 含义                                                    |
| --------- | ------------------------------------------------------- |
| Prototype | 一组有关联的 Screen、Variant、Flow 和共享 Contract      |
| Screen    | 稳定页面身份和业务结构                                  |
| Variant   | Screen 内可直接复现的稳定业务状态                       |
| Scenario  | 从稳定初态执行的显式动作序列                            |
| Case      | Screen × Variant × Theme × Device × Scenario Checkpoint 的稳定身份 |
| Case Evidence Revision | 一次成功采集产生的不可变 Case 证据版本                    |
| Fragment  | Case 中以稳定语义节点为根的局部证据                     |
| Bundle    | 一个 Prototype 的长期证据集合                           |
| Run       | 一次不可变 CaptureSelection 的执行记录                  |
| Bundle Snapshot | 一次事务提交后的 Bundle 当前证据快照                     |
| Case Attempt | 某个 Run 对一个 Case 的 captured / failed / skipped 等执行结果 |
| Staleness Report | Snapshot 相对于一次当前输入探测的不可变 stale 评估       |
| Blob      | 截图、Trace、压缩 Snapshot 等内容寻址大对象             |

包布局：

```text
packages/
├── core/             # Contract、Selection、Capture、Evidence、Store interface
├── local-service/    # HTTP、Job、Events、并发和安全边界
├── cli/              # 命令入口
├── mcp-server/       # Evidence 与可选 target tools
└── target-flutter/   # 独立 Flutter 查询与验证 adapter

apps/
└── pbwork/           # Prototype、Runtime Protocol、Capture Console
```

## 5. 已确认决策

1. PB 与 PBWork 近期是本地、单用户工具。
2. PBWork 是原型生产和采集控制面；计划固定 Capture 路由、入口和返回行为，不规定侧边导航的最终视觉结构。
3. `data-pb-*` 和 Runtime Contract 是 instrumented runtime 的语义权威。
4. ARIA、semantic HTML、Source、Runtime 和 Screenshot 只证明各自有权证明的事实。
5. class、tag、geometry 只用于 generic runtime 降级，不能自动升级成业务语义。
6. Capture 使用完整 Case 身份，Theme / Device / Scenario 不会覆盖同一 Variant。
7. Bundle、Snapshot、Run、Case Attempt、Case Evidence Revision 和 Blob 分离；历史对象不可变，Bundle 只以事务方式切换 `activeSnapshotId`。
8. 所有 Agent-facing 关键事实具有 provenance、confidence 和 refs。
9. Target Flutter 扫描从 Capture 主链移除，作为独立 adapter 按需查询。
10. V2 完成前不切换正式入口；完成后一次性删除 V1，不发布用户可见双轨或过渡产品。
11. 目标工程不提交 Store 或 Target 配置；MCP 在目标工程之外连接 PB Workspace。
12. Consumer Skill 在 V2 契约定稿前只作为实施文档中的草案，不创建正式 skill 文件。
13. 历史 Run、Bundle Snapshot、Case Evidence revision 和 Handoff 均不可变。
14. Bundle 聚合 Coverage 以 Snapshot 为单位；Run Coverage 只描述本次 attempt，不替代 Snapshot Coverage。
15. latest attempt 与 active successful evidence 分开保存；失败重试不覆盖上一次成功证据。
16. Runtime Contract 的成功响应不得使用 `unknown`；每个 request kind 都有唯一响应 Schema。
17. PBWork、CLI 和 producer MCP 只有携带有效 Preflight revision、Matrix digest 和 warning acceptance 才能创建 Job。
18. Input Blob 先绑定 upload session，创建 Job 时原子认领，不能在 Job 创建前声称已绑定 Job。
19. Case stale digest 只包含该 Case 的依赖闭包，不使用无差别的全仓 Source revision 使全部 Case 失效。

## 6. W0 阻断与缺口登记

以下编号是实施、Contract、测试和验收共同使用的追踪 ID。后续工作不得在代码中自行解释这些项目。

### 6.1 实施阻断

| ID  | 阻断项 | 冻结决策 |
| --- | --- | --- |
| B01 | 固定 Case 路径覆盖历史 Evidence | 稳定 `caseId` 与不可变 `caseEvidenceRevisionId` 分离 |
| B02 | Run 的 Case / Catalog 引用会随 Bundle 更新漂移 | Run 固定引用具体 Case、Screen Contract 和 Catalog revision |
| B03 | Handoff 未固定证据快照 | Handoff 必须绑定 `bundleSnapshotId` 和 Evidence revision |
| B04 | 增量 Run 无法独立表达 Bundle 当前态 | Run attempt、active snapshot、latest attempt 分层 |
| B05 | Runtime 成功响应使用 `data: unknown` | 每个 request kind 具有唯一响应 Schema |
| B06 | Core 与 Runtime 都声称负责 canonical URL 导航 | Core 导航，Runtime 准备并验证当前页面状态 |
| B07 | Scenario 未进入 Selection | Selection 显式支持 Scenario policy 和 refs |
| B08 | 中间 Checkpoint 与跨 Screen Scenario 无执行模型 | Scenario 逐 Step 执行，Core 在 Checkpoint 建立 Case |
| B09 | Preflight revision 与 Job 请求无绑定 | CreateJob 必须携带 revision、Selection digest、Matrix digest 和 warning acceptance |
| B10 | Screenshot input Blob 在 Job 创建前无法归属 Job | Upload session 暂存，CreateJob 原子认领 |
| B11 | MCP 不能完整读取 Catalog / Asset / Issue | 补齐 tool kind、resource、索引和 Snapshot 参数 |
| B12 | Evidence 冲突无法表示 candidates 与 effective value | 统一使用 `EvidenceFact<T>` |

### 6.2 重要缺口

| ID  | 缺口 | 冻结决策 |
| --- | --- | --- |
| G01 | 自定义范围的逐 Screen Variant 策略无法映射 Contract | Screen selection 内保存各自 Variant policy |
| G02 | 读取 Store 无法知道相对当前 Source / Runtime 是否 stale | Producer 显式生成 `StalenessReport` |
| G03 | 全局 Source / Manifest revision 导致无关 Case stale | 使用 Case dependency closure digest |
| G04 | skipped / cancelled / interrupted 的 partial 口径不一致 | 使用统一状态与 Handoff 汇总表 |
| G05 | 多 Device Run 无法使用单一 CaptureEnvironment | Run 保存公共环境；Case revision 保存实际 device / viewport |
| G06 | Bundle fork、archive 和清理生命周期未定义 | 提供显式 fork / archive；clean 不隐式删除 active Bundle |
| G07 | PBWork 没有固定 Capture 路由和进入 / 返回行为 | 固定 `/workbench/capture` 与四类上下文入口 |
| G08 | Browser 无法安全获得 Service bearer token | 一次性 bootstrap nonce 换取 session token |
| G09 | 当前 Inspector 不返回 `pbKey` | V2 Bridge selection payload 增加 `pbKey` |
| G10 | 27 Screens / 89 Variants 无逐项迁移清单 | W9 建立逐 Screen / Variant / Action / Scenario 台账 |
| G11 | Coverage 与 V1/V2 收益不可计算 | 固定 fact 单位、分母、基准任务和通过阈值 |
| G12 | `0.2.0` 低于当前正式包 `0.4.0` | 正式切换版本固定为 `0.5.0` |

## 7. 质量原则

### 7.1 事实裁决

| 事实                                       | 权威来源                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Screen / Variant / Component / Action 身份 | Runtime Contract / Registry / `data-pb-*`                        |
| 业务逻辑、未渲染状态和 action 条件         | 显式 Contract / Source                                           |
| 当前可见状态、文本、bbox 和 computed style | Runtime observation                                              |
| 最终视觉                                   | Screenshot + runtime computed value                              |
| Accessibility                              | ARIA / semantic HTML                                             |
| Navigation                                 | declared、source、scenario、runtime observed 分别保留 provenance |

冲突不静默覆盖；保留双方 Evidence 并生成结构化 Issue。Screenshot 只裁决视觉，不裁决业务语义。

### 7.2 Instrumented PBWork 门槛

- required semantic contract 100% 有效；
- traceable fact rate 100%；
- heuristic fallback rate 不高于 5%；
- Action、Navigation 和 Component identity 为 0% heuristic；
- selected Case 全部 captured / reused，或明确标记 unsupported；
- 失败、跳过和 unsupported 分开统计。

### 7.3 Evidence Level

| Level                       | 可证明                                             |
| --------------------------- | -------------------------------------------------- |
| instrumented-source-runtime | Contract、Source 逻辑、Runtime、视觉、组件和 Token |
| instrumented-runtime        | Runtime Contract、显式语义、当前状态和视觉         |
| generic-runtime             | 可见 DOM、ARIA、控件、样式和 Screenshot            |
| screenshot-only             | 像素、文字和粗略布局                               |

低等级证据不能推断隐藏状态、完整业务动作或目标工程实现。

### 7.4 V1 / V2 对比口径

正式切换前使用固定任务集分别执行 V1 和 V2，任务集至少覆盖：

1. Ledger Planet 当前 Screen；
2. Ledger Planet Overlay / Scenario；
3. Ledger Planet 多 Screen Flow；
4. Field Service 当前 Screen；
5. Field Service 表单 validation / submit Scenario；
6. Project Fragment；
7. generic runtime；
8. screenshot-only。

每个任务使用相同目标仓库基线、相同任务说明和相同验收清单，记录：

- `manualEvidenceSupplements`：实现前后需要人工补充的原型事实数；
- `unsupportedAssumptions`：Agent 把 unknown / 缺失证据写成确定事实的数量；
- `evidenceCausedMisimplementations`：由 Evidence 缺失、冲突未暴露或引用漂移造成的误实现数；
- `reworkCycles`：为修复上述误实现产生的返工轮次；
- `taskCompleted`：任务是否通过目标仓库验收。

V2 正式切换门槛：

- `unsupportedAssumptions = 0`；
- taskCompleted 不低于 V1；
- manualEvidenceSupplements 总数相对 V1 至少减少 30%；
- evidenceCausedMisimplementations 总数相对 V1 至少减少 50%；
- reworkCycles 总数相对 V1 至少减少 30%；
- 原始记录和汇总作为 W10 发布证据保存，不能只给主观结论。

## 8. 产品范围

### 8.1 必做

- Prototype / Screen / Variant / Fragment Selection；
- Runtime Protocol discovery、prepare、stable、snapshot、scenario、reset；
- 稳定 ID、Action、Component、Slot、Token 和 Navigation Contract；
- Screen × Variant × Theme × Device 确定性采集；
- Browser 复用、Context 隔离、失败重试、取消和 Trace；
- Bundle / Snapshot / Run / Case Attempt / Case Evidence Revision / Blob 持久化；
- 增量采集、stale 判断、事务写入和崩溃恢复；
- PBWork Capture、Coverage、Issue、Evidence 和 Handoff；
- PBWork 当前页面、画布 Fragment、多页面和整 Prototype 四条完整采集路径；
- 完整 CLI；
- MCP 按需发现和读取证据；
- Agent Consumer 规范、Handoff 检查和无目标工程 PB 配置的消费闭环；
- 独立 Flutter target 查询和验证；
- 全部现有 PBWork Prototype / Screen / Variant 迁移；
- V1 Artifact、Planner、CLI 和 MCP 删除；
- 不可变 Case Evidence revision、Bundle Snapshot 和 Snapshot-pinned Handoff；
- 逐 Screen Variant policy、Scenario policy 和 Checkpoint Case；
- Preflight / Job 强绑定与可审计 warning acceptance；
- Bundle Snapshot Coverage、Run Coverage 和 Staleness Report；
- Bundle fork、archive 和安全 clean。

### 8.2 不做

- Vue / HTML / CSS 到 Dart 的自动翻译；
- 自动选择目标文件、路由、状态框架、组件或 Token；
- 无边界自动点击爬虫；
- PBWork 内 Agent Chat；
- 多人云平台、账号、角色权限、远程 Job 和审批；
- V1 Artifact 兼容读取或旧 output 自动迁移；
- Capture 阶段修改 Source 或 Target。

商业化后只有在出现多人远程 Workspace、共享 Store、并发 Job、审批审计或不同写权限时，才单独设计身份与 RBAC。

## 9. 阶段性工作包

| 工作包 | 阶段目标 | 主要交付 | 进入条件 |
| --- | --- | --- | --- |
| W0 Plan Freeze | 冻结目标与机器边界 | B/G 登记、Contract 决策、追踪矩阵、阶段闸门 | 本计划评审 |
| W1 Contract | 建立可执行唯一 Schema | 全部类型、Runtime mapping、Selection、Job、Snapshot、Handoff | G0 |
| W2 Store | 建立不可变证据与当前态 | revision、snapshot、attempt、coverage、stale、transaction | G1 |
| W3 Runtime / Scenario | 确定性准备和交互采集 | typed protocol、prepare、step、checkpoint、reset | G1 |
| W4 Capture / Preflight | 统一展开与执行 | per-screen policy、Matrix、digest、retry、cancel | W2、W3 |
| W5 Service | 持久 Job 与安全浏览器边界 | API、upload session、bootstrap、SSE、recovery | W2、W4 |
| W6 PBWork | 完整采集控制面 | 四入口、检查、重采、Handoff | W3、W5 |
| W7 CLI / MCP | 完整生产与证据读取入口 | CLI、Snapshot resources、Workspace 校验 | W2、W5 |
| W8 Target / Consumer | 解耦目标查询并完成消费闭环 | 独立 Flutter adapter、Consumer Skill、消费 E2E | W1、W7 |
| W9 Migration | 全量原型迁移 | 27 Screens / 89 Variants 台账与验收 | W1–W8 |
| W10 Release | 对比、删除与正式切换 | V1/V2 指标、V1 删除、`0.5.0`、安装 E2E | W1–W9 |

实施细节、测试组和代码落点见 [实施规格](./pb-v2-implementation.md)。

### 9.1 强制闸门

```text
G0 计划冻结
→ G1 Contract 可执行且所有持久对象可校验
→ G2 Store / Snapshot / Handoff 历史不漂移
→ G3 单 Screen + Scenario + Handoff + MCP 垂直闭环
→ G4 27 Screens / 89 Variants 全量迁移
→ G5 删除 V1 并发布
```

- 未通过上一闸门不得进入下一阶段；
- 代码实现发现需要改变不可变决策或 Contract 时，停止当前工作包，先更新对应 B/G/Requirement 并重新评审；
- 不允许先在代码中实现一种解释，再反向同步计划；
- 内部 vertical slice 只用于验证依赖，不成为用户可见双轨产品。

### 9.2 Requirement 追踪

| Requirement | Contract 权威章节 | 实施工作包 | 必过测试组 |
| --- | --- | --- | --- |
| B01–B04 | Contract §9 | W2 | Store、全量闭环 |
| B05–B06 | Contract §6 | W1、W3 | Contract、Runtime |
| B07–B08 | Contract §7、§13 | W1、W3、W4 | Runtime、Capture |
| B09–B10 | Contract §7.1 | W1、W4、W5 | Contract、Service |
| B11 | Contract §9–§14 | W7 | CLI / MCP、全量闭环 |
| B12 | Contract §5 | W1、W2 | Contract、Store |
| G01 | Contract §7 | W4、W6 | Capture、Service / PBWork |
| G02–G03 | Contract §9.5 | W2、W4、W6 | Store、全量闭环 |
| G04–G06 | Contract §7.1、§9、§14 | W2、W5、W6 | Store、Service / PBWork |
| G07–G09 | PBWork 体验 §3、§11 | W5、W6 | Service / PBWork |
| G10 | 实施规格 W9 | W9 | 全量闭环 |
| G11 | 本计划 §7.2、§7.4 | W1、W10 | Contract、V1/V2 对比 |
| G12 | 实施规格 W10、§14 | W10 | 安装包与发布验证 |

## 10. 发布纪律

```text
Plan Freeze
→ Contract
→ Store + Runtime / Scenario
→ Capture / Preflight
→ Service
→ PBWork
→ CLI / MCP / Target
→ Agent Consumer E2E
→ 全量 Prototype 验收
→ V1 一次性删除
→ 正式切换
```

- 内部工作包和 vertical slice 只用于验证依赖，不构成对外产品；
- V2 未达到完整 DoD 前，正式 V1 保持可用；
- 不提供 V1 到 V2 的伪兼容 adapter；
- 正式入口不会同时暴露 V1 和 V2；
- 切换提交同时更新 binary、config、MCP、文档和 package exports；
- 所有正式发布包统一升至 `0.5.0`。

## 11. Definition of Done

V2 完成必须同时满足：

1. PBWork 可选择并采集 Prototype、Screen、Variant 和 Fragment。
2. Runtime 可发现、准备、验证和重置完整 Case。
3. Case identity 覆盖 Theme、Device、Scenario 和 Checkpoint，不存在覆盖写入。
4. Playwright 具备确定性、隔离、取消、重试和 failure trace。
5. Bundle 持久化、增量更新且进程重启后可读。
6. Store 具备锁、事务、崩溃恢复、Blob 去重、容量和安全清理。
7. MCP 可按 Snapshot、Catalog、Screen Contract revision、Case Evidence revision、Fragment、Issue、Coverage、Staleness Report 和 Blob 读取证据。
8. Agent 默认读取小型索引和按需 refs，不加载整个 Prototype。
9. Target 查询与 Capture 完全解耦，target 事实不进入 Bundle。
10. instrumented PBWork 达到本计划 §7.2 的质量门槛。
11. Ledger Planet 18 Screens / 54 Variants 达到深度验收。
12. Field Service 7 Screens / 28 Variants 与 Project 2 Screens / 7 Variants 完成逐项迁移和验收。
13. 四种 Evidence Level 均有 CLI、Store、MCP 和故障路径 E2E。
14. PBWork、CLI、MCP 共享同一 Selection、Job 和 Store Contract。
15. Flutter target adapter 达到 V1 等价或更高查询和验证覆盖。
16. 旧四件套、Planner、pageId workflow、旧 CLI / MCP 和死代码全部删除。
17. README、AGENT、产品文档、PBWork 原型规范和 skills 与 V2 一致。
18. V1/V2 固定任务集达到 §7.4 的全部量化门槛。
19. PBWork 的当前页面、选中 Fragment、多页面和整 Prototype 四条用户路径均通过交互验收。
20. PBWork 在创建 Job 前显示 preflight 结果和 Case Matrix，不允许超限或无稳定身份的 Selection 静默进入 Capture。
21. Handoff 包含 `workspaceId`、`bundleSnapshotId` 和 `stalenessReportId`，引用可由 MCP 解析，并明确携带 captured、reused、partial、failed、skipped、unsupported、cancelled、interrupted、missing、stale、risk acceptance 和 unknown 摘要。
22. 目标工程没有 ProtoBridge 配置文件时，Agent 仍能通过外部 MCP 连接和 Handoff 完成 Evidence 消费。
23. MCP 连接错误 Workspace、Bundle / Snapshot 不存在或 object revision 引用失效时返回结构化错误，不允许 Agent 猜测 Store 路径。
24. 历史 Run、Snapshot、Case Evidence revision 和 Handoff 在后续重采后读取内容不变。
25. partial retry 只更新成功 Case；失败 attempt 不覆盖既有 active successful evidence。
26. Scenario policy 可从 PBWork、CLI 和 MCP 等价提交，中间 Checkpoint 和跨 Screen 结果具有确定身份。
27. Job 只能从未过期 Preflight 创建，所有 warning acceptance 可审计。
28. MCP 可读取 Prototype、Navigation、Component、Token、Asset、Screen、Case、Fragment、Issue、Coverage 和 Blob。
29. PBWork 通过一次性 bootstrap 建立 Service 会话，token 不进入 URL query、日志、Handoff 或 Bundle。
30. 全量迁移台账覆盖当前 Registry 的 27 Screens / 89 Variants，不以“其他不退化”替代逐项结果。

## 12. 阶段任务与收益

实施只按 W0–W10 和 G0–G5 推进。每一阶段以进入条件、交付物和验收结果判定完成，不以代码量判定。

V1 已经可用，因此 V2 的价值不是“从无到有”，而是：

- 将低质量推导移出主链；
- 覆盖完整 Prototype 和多状态证据；
- 让证据可复用、可追溯、可度量；
- 降低 Agent 实现前的信息缺失和实现后的人工返工；
- 阻止 PB 再次扩张成脆弱的目标工程 Planner。

若 PBWork 持续服务多页面、多 Variant 和多个实现任务，完整 V2 的长期价值高；是否正式发布，以 DoD 和 V1/V2 对比结果决定，而不是以代码完成量决定。
