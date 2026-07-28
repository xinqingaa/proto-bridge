# ProtoBridge / PBWork V2 重构计划

> 状态：方案闭环已补全，待实施
> 目标分支：`dev`
> 性质：破坏性重构；不兼容 V1 Artifact、CLI 和 MCP 页面工作流
> 更新时间：2026-07-28

本文件是 V2 的决策与交付入口，回答为什么重构、完整终态是什么、如何实施以及何时完成。

精确类型与协议见 [PB V2 Contract 规范](./pb-v2-contracts.md)。
代码落点、CLI / MCP、测试和切换步骤见 [PB V2 实施规格](./pb-v2-implementation.md)。
PBWork 的选择、预检、采集、检查、重采和交接见 [PBWork V2 Capture 体验规格](./pbwork-v2-capture-experience.md)。

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

## 3. 一次完整使用如何流转

以下流程同时适用于采集一个控件、一个页面、一组页面或整个 Prototype。

| 步骤          | 发生什么                                                                                | 主要输入                     | 产生什么                                |
| ------------- | --------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------- |
| 1. 原型声明   | PBWork Registry、DS Contract 和页面源码声明 Screen、Variant、Component、Token 和 Action | 原型源码                     | 可发现的 Prototype Contract             |
| 2. 选择范围   | 用户在 PBWork 或 CLI 选择 Prototype / Screen / Variant / Fragment、Theme 和 Device      | CaptureSelection             | Selection Draft                         |
| 3. 预检       | Runtime 与 Core 校验 Contract、稳定 ID、选择引用和采集上限                              | Selection + Manifest         | 可执行 Matrix 或阻塞 Issue              |
| 4. 展开任务   | PB Core 将通过预检的选择展开成完整 Case Matrix                                          | Selection + Manifest         | Screen × Variant × Theme × Device Cases |
| 5. 准备状态   | Pure Runtime 按 Case 设置路由、fixture、Variant 和 Theme，并报告是否稳定                | Case                         | 可验证的 Runtime 状态                   |
| 6. 采集证据   | Core 结合 Runtime、Source 和 Screenshot 采集语义、视觉、组件和动作证据                  | 稳定 Runtime + 可选 Source   | Case Evidence                           |
| 7. 持久化     | Store 以事务方式写入 Catalog、Run、Case 和 Blob                                         | Case Evidence                | Evidence Bundle                         |
| 8. 检查与交接 | PBWork 显示 Coverage、Issue、Screenshot 和 stale，并生成 Handoff                        | Bundle                       | workspaceId、bundleId、caseId 和 refs   |
| 9. Agent 消费 | Agent 按 Consumer 规范通过 MCP 读取 Manifest、Coverage、Screen、Case、Fragment 和图片   | Handoff + MCP                | 当前实现需要的 Evidence                 |
| 10. 目标实现  | Agent 读取目标仓库；必要时调用独立 Target Adapter 查找规范和示例                        | Evidence + Target Repository | 生产代码与验证结果                      |

原型发生变化时重新执行步骤 2–7。未变化的 Case 和 Blob 可复用；新的 Run 更新 Bundle 当前证据，但不覆盖历史 Run。

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
workspaceId + bundleId + selection + intent + coverageSummary + riskAcceptance + unknowns
```

Handoff 不内嵌整份 Evidence，不包含 Store 绝对路径、target root、目标组件映射或 Flutter 文件计划。PBWork 生成 Handoff 后，Agent 使用已连接对应 Workspace 的 MCP 读取 Evidence；MCP 连接错误或 Workspace 不匹配时必须显式失败，不能回退为路径猜测。

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
| Case      | Screen × Variant × Theme × Device × Scenario Checkpoint |
| Fragment  | Case 中以稳定语义节点为根的局部证据                     |
| Bundle    | 一个 Prototype 的长期证据集合                           |
| Run       | 一次不可变 CaptureSelection 的执行记录                  |
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
2. PBWork 是原型生产和采集控制面；具体导航信息架构不属于本计划。
3. `data-pb-*` 和 Runtime Contract 是 instrumented runtime 的语义权威。
4. ARIA、semantic HTML、Source、Runtime 和 Screenshot 只证明各自有权证明的事实。
5. class、tag、geometry 只用于 generic runtime 降级，不能自动升级成业务语义。
6. Capture 使用完整 Case 身份，Theme / Device / Scenario 不会覆盖同一 Variant。
7. Bundle、Run、Case、Blob 分离；Run 不可变，Bundle 以事务方式更新 active Case。
8. 所有 Agent-facing 关键事实具有 provenance、confidence 和 refs。
9. Target Flutter 扫描从 Capture 主链移除，作为独立 adapter 按需查询。
10. V2 完成前不切换正式入口；完成后一次性删除 V1，不发布用户可见双轨或过渡产品。
11. 目标工程不提交 Store 或 Target 配置；MCP 在目标工程之外连接 PB Workspace。
12. Consumer Skill 在 V2 契约定稿前只作为实施文档中的草案，不创建正式 skill 文件。

## 6. 质量原则

### 6.1 事实裁决

| 事实                                       | 权威来源                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Screen / Variant / Component / Action 身份 | Runtime Contract / Registry / `data-pb-*`                        |
| 业务逻辑、未渲染状态和 action 条件         | 显式 Contract / Source                                           |
| 当前可见状态、文本、bbox 和 computed style | Runtime observation                                              |
| 最终视觉                                   | Screenshot + runtime computed value                              |
| Accessibility                              | ARIA / semantic HTML                                             |
| Navigation                                 | declared、source、scenario、runtime observed 分别保留 provenance |

冲突不静默覆盖；保留双方 Evidence 并生成结构化 Issue。Screenshot 只裁决视觉，不裁决业务语义。

### 6.2 Instrumented PBWork 门槛

- required semantic contract 100% 有效；
- traceable fact rate 100%；
- heuristic fallback rate 不高于 5%；
- Action、Navigation 和 Component identity 为 0% heuristic；
- selected Case 全部 captured，或明确标记 unsupported；
- 失败、跳过和 unsupported 分开统计。

### 6.3 Evidence Level

| Level                       | 可证明                                             |
| --------------------------- | -------------------------------------------------- |
| instrumented-source-runtime | Contract、Source 逻辑、Runtime、视觉、组件和 Token |
| instrumented-runtime        | Runtime Contract、显式语义、当前状态和视觉         |
| generic-runtime             | 可见 DOM、ARIA、控件、样式和 Screenshot            |
| screenshot-only             | 像素、文字和粗略布局                               |

低等级证据不能推断隐藏状态、完整业务动作或目标工程实现。

## 7. 产品范围

### 7.1 必做

- Prototype / Screen / Variant / Fragment Selection；
- Runtime Protocol discovery、prepare、stable、snapshot、scenario、reset；
- 稳定 ID、Action、Component、Slot、Token 和 Navigation Contract；
- Screen × Variant × Theme × Device 确定性采集；
- Browser 复用、Context 隔离、失败重试、取消和 Trace；
- Bundle / Run / Case / Blob 持久化；
- 增量采集、stale 判断、事务写入和崩溃恢复；
- PBWork Capture、Coverage、Issue、Evidence 和 Handoff；
- PBWork 当前页面、画布 Fragment、多页面和整 Prototype 四条完整采集路径；
- 完整 CLI；
- MCP 按需发现和读取证据；
- Agent Consumer 规范、Handoff 检查和无目标工程 PB 配置的消费闭环；
- 独立 Flutter target 查询和验证；
- 全部现有 PBWork Prototype / Screen / Variant 迁移；
- V1 Artifact、Planner、CLI 和 MCP 删除。

### 7.2 不做

- Vue / HTML / CSS 到 Dart 的自动翻译；
- 自动选择目标文件、路由、状态框架、组件或 Token；
- 无边界自动点击爬虫；
- PBWork 内 Agent Chat；
- 多人云平台、账号、角色权限、远程 Job 和审批；
- V1 Artifact 兼容读取或旧 output 自动迁移；
- Capture 阶段修改 Source 或 Target。

商业化后只有在出现多人远程 Workspace、共享 Store、并发 Job、审批审计或不同写权限时，才单独设计身份与 RBAC。

## 8. 完整工作包

| 工作包            | 主要交付                                             | 依赖       |
| ----------------- | ---------------------------------------------------- | ---------- |
| W1 Contract       | ID、Schema、Evidence、Issue、Coverage                | 无         |
| W2 Runtime        | Protocol、prepare/reset、semantic preflight          | W1         |
| W3 Capture        | Selection、Case Matrix、Scenario、Playwright         | W1、W2     |
| W4 Store          | Bundle、Run、Case、Blob、事务和 retention            | W1、W3     |
| W5 Service        | Job、SSE、取消、恢复和安全                           | W3、W4     |
| W6 PBWork         | Capture Console、Evidence、Coverage、Handoff         | W2、W5     |
| W7 CLI / MCP      | 完整命令、resources、按配置暴露能力                  | W4、W5     |
| W8 Target         | Flutter adapter 独立迁移                             | W1         |
| W9 Agent Consumer | Handoff、MCP 连接说明、Consumer Skill 草案与消费 E2E | W4、W7、W8 |
| W10 Migration     | 全部原型修标、V1 删除、文档和发布                    | W1–W9      |

实施细节、测试组和代码落点见 [实施规格](./pb-v2-implementation.md)。

## 9. 发布纪律

```text
Contract
→ Runtime
→ Capture
→ Store
→ Service
→ PBWork
→ CLI / MCP / Target
→ 全量 Prototype 验收
→ V1 一次性删除
→ 正式切换
```

- 内部工作包和 vertical slice 只用于验证依赖，不构成对外产品；
- V2 未达到完整 DoD 前，正式 V1 保持可用；
- 不提供 V1 到 V2 的伪兼容 adapter；
- 正式入口不会同时暴露 V1 和 V2；
- 切换提交同时更新 binary、config、MCP、文档和 package exports；
- 所有发布包统一升至 `0.2.0`。

## 10. Definition of Done

V2 完成必须同时满足：

1. PBWork 可选择并采集 Prototype、Screen、Variant 和 Fragment。
2. Runtime 可发现、准备、验证和重置完整 Case。
3. Case identity 覆盖 Theme、Device、Scenario 和 Checkpoint，不存在覆盖写入。
4. Playwright 具备确定性、隔离、取消、重试和 failure trace。
5. Bundle 持久化、增量更新且进程重启后可读。
6. Store 具备锁、事务、崩溃恢复、Blob 去重、容量和安全清理。
7. MCP 可按 Bundle、Screen、Case、Fragment 和 Blob 读取证据。
8. Agent 默认读取小型索引和按需 refs，不加载整个 Prototype。
9. Target 查询与 Capture 完全解耦，target 事实不进入 Bundle。
10. instrumented PBWork 达到本计划 §6.2 的质量门槛。
11. Ledger Planet 18 Screens / 54 Variants 达到深度验收。
12. 当前 Registry 中其他既有 Prototype / Screen / Variant 不退化。
13. 四种 Evidence Level 均有 CLI、Store、MCP 和故障路径 E2E。
14. PBWork、CLI、MCP 共享同一 Selection、Job 和 Store Contract。
15. Flutter target adapter 达到 V1 等价或更高查询和验证覆盖。
16. 旧四件套、Planner、pageId workflow、旧 CLI / MCP 和死代码全部删除。
17. README、AGENT、产品文档、PBWork 原型规范和 skills 与 V2 一致。
18. 与 V1 同类任务相比，人工补充、误实现和返工显著减少。
19. PBWork 的当前页面、选中 Fragment、多页面和整 Prototype 四条用户路径均通过交互验收。
20. PBWork 在创建 Job 前显示 preflight 结果和 Case Matrix，不允许超限或无稳定身份的 Selection 静默进入 Capture。
21. Handoff 包含 `workspaceId`，引用可由 MCP 解析，并明确携带 partial、failed、skipped、unsupported、stale、risk acceptance 和 unknown 摘要。
22. 目标工程没有 ProtoBridge 配置文件时，Agent 仍能通过外部 MCP 连接和 Handoff 完成 Evidence 消费。
23. MCP 连接错误 Workspace、Bundle 不存在或引用失效时返回结构化错误，不允许 Agent 猜测 Store 路径。

## 11. 工作量与收益

| 工作包                    | 估算           |
| ------------------------- | -------------- |
| Contract                  | 2–3 天         |
| Runtime、标注和 lint      | 4–6 天         |
| Capture Orchestrator      | 4–6 天         |
| Store                     | 3–5 天         |
| Local Service             | 3–4 天         |
| PBWork                    | 4–6 天         |
| CLI、MCP、Target          | 3–5 天         |
| Agent Consumer 与交接闭环 | 1–2 天         |
| 全量迁移、删除和回归      | 3–5 天         |
| 合计                      | 27–42 个开发日 |

单人合理预期为 6–9 周。AI 能加速 Schema、类型、样板和测试编写，但不能消除浏览器稳定性、协议联调、全量修标和回归成本。

V1 已经可用，因此 V2 的价值不是“从无到有”，而是：

- 将低质量推导移出主链；
- 覆盖完整 Prototype 和多状态证据；
- 让证据可复用、可追溯、可度量；
- 降低 Agent 实现前的信息缺失和实现后的人工返工；
- 阻止 PB 再次扩张成脆弱的目标工程 Planner。

若 PBWork 持续服务多页面、多 Variant 和多个实现任务，完整 V2 的长期价值高；是否正式发布，以 DoD 和 V1/V2 对比结果决定，而不是以代码完成量决定。
