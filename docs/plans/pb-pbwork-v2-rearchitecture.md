# ProtoBridge / PBWork V2 重构计划

> 状态：Review 完成，待实施
> 目标分支：`dev`
> 性质：破坏性重构；不兼容 V1 Artifact、CLI 和 MCP 页面工作流
> 更新时间：2026-07-27

本文件是 V2 的决策与交付入口，回答为什么重构、完整终态是什么、如何实施以及何时完成。

精确类型与协议见 [PB V2 Contract 规范](./pb-v2-contracts.md)。
代码落点、CLI / MCP、测试和切换步骤见 [PB V2 实施规格](./pb-v2-implementation.md)。

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

## 3. 一次完整使用如何流转

以下流程同时适用于采集一个控件、一个页面、一组页面或整个 Prototype。

| 步骤 | 发生什么 | 主要输入 | 产生什么 |
| --- | --- | --- | --- |
| 1. 原型声明 | PBWork Registry、DS Contract 和页面源码声明 Screen、Variant、Component、Token 和 Action | 原型源码 | 可发现的 Prototype Contract |
| 2. 选择范围 | 用户在 PBWork 或 CLI 选择 Prototype / Screen / Variant / Fragment、Theme 和 Device | CaptureSelection | 确定的采集范围 |
| 3. 展开任务 | PB Core 将选择展开成完整 Case Matrix | Selection + Manifest | Screen × Variant × Theme × Device Cases |
| 4. 准备状态 | Pure Runtime 按 Case 设置路由、fixture、Variant 和 Theme，并报告是否稳定 | Case | 可验证的 Runtime 状态 |
| 5. 采集证据 | Core 结合 Runtime、Source 和 Screenshot 采集语义、视觉、组件和动作证据 | 稳定 Runtime + 可选 Source | Case Evidence |
| 6. 持久化 | Store 以事务方式写入 Catalog、Run、Case 和 Blob | Case Evidence | Evidence Bundle |
| 7. 检查与交接 | PBWork 显示 Coverage、Issue 和 Screenshot，并生成 Handoff | Bundle | bundleId、caseId 和 refs |
| 8. Agent 消费 | MCP 按任务读取 Manifest、Screen Contract、Case、Fragment 和图片 | Handoff + Store | 当前实现需要的证据 |
| 9. 目标实现 | Agent 读取 Flutter 仓库；必要时调用独立 Target Adapter 查找规范和示例 | Evidence + Target Repository | 生产代码与验证结果 |

原型发生变化时重新执行步骤 2–7。未变化的 Case 和 Blob 可复用；新的 Run 更新 Bundle 当前证据，但不覆盖历史 Run。

### 3.1 两个生命周期

**证据生产生命周期**

```text
原型声明 →选择范围 →准备状态 →采集 →检查 →持久化
```

它发生在 PBWork / CLI 和 PB 本地服务一侧，结果可以被多个任务复用。

**目标实现生命周期**

```text
发现 Bundle →按需读取 Screen / Case / Fragment →读取目标仓库 →实现 →验证
```

它发生在目标工程和 Coding Agent 一侧。Target 查询只辅助这次实现，不反向污染原型 Evidence。

## 4. 目标架构

目标架构按四层划分，不依赖图也可以理解：

| 层 | 组件 | 职责 | 不进入下一层的内容 |
| --- | --- | --- | --- |
| 原型声明层 | PBWork Registry、Component/Token Contract、Prototype Source、Pure Runtime | 声明原型有哪些页面、状态、组件、动作和可复现输入 | 目标 Flutter 决策 |
| 证据生产层 | PBWork Capture、CLI、Local Service、PB Core、Source Adapter、Playwright | 选择范围、准备 Runtime、采集并校验证据 | 未证明的业务结论 |
| 证据存储层 | Evidence Store | 保存 Bundle、Catalog、Run、Case、Screenshot 和 Debug Blob | 目标工程扫描结果 |
| 实现消费层 | MCP、Coding Agent、Target Flutter Adapter | 按需读取证据、理解目标仓库、实现和验证 | 不写回原型事实 |

### 4.1 组件之间如何连接

1. PBWork Capture 和 CLI 都把同一个 `CaptureRequest` 交给 Local Service / JobHost。
2. Local Service 只管理 Job、进度、并发和本地安全，不实现第二套采集逻辑。
3. PB Core 根据 Selection 调用 Pure Runtime Protocol、Source Adapter 和 Playwright。
4. PB Core 将结果写入 Evidence Store。
5. PBWork 从 Service 读取 Job、Coverage、Issue 和 Screenshot。
6. MCP 直接从持久化 Store 读取证据，不依赖 Capture 进程仍然存活。
7. Coding Agent 同时读取 MCP Evidence 和目标仓库。
8. Target Flutter Adapter 只查询和验证目标工程，不参与 Capture，也不写 Bundle。

### 4.2 核心对象与代码边界

| 对象 | 含义 |
| --- | --- |
| Prototype | 一组有关联的 Screen、Variant、Flow 和共享 Contract |
| Screen | 稳定页面身份和业务结构 |
| Variant | Screen 内可直接复现的稳定业务状态 |
| Scenario | 从稳定初态执行的显式动作序列 |
| Case | Screen × Variant × Theme × Device × Scenario Checkpoint |
| Fragment | Case 中以稳定语义节点为根的局部证据 |
| Bundle | 一个 Prototype 的长期证据集合 |
| Run | 一次不可变 CaptureSelection 的执行记录 |
| Blob | 截图、Trace、压缩 Snapshot 等内容寻址大对象 |

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

## 6. 质量原则

### 6.1 事实裁决

| 事实 | 权威来源 |
| --- | --- |
| Screen / Variant / Component / Action 身份 | Runtime Contract / Registry / `data-pb-*` |
| 业务逻辑、未渲染状态和 action 条件 | 显式 Contract / Source |
| 当前可见状态、文本、bbox 和 computed style | Runtime observation |
| 最终视觉 | Screenshot + runtime computed value |
| Accessibility | ARIA / semantic HTML |
| Navigation | declared、source、scenario、runtime observed 分别保留 provenance |

冲突不静默覆盖；保留双方 Evidence 并生成结构化 Issue。Screenshot 只裁决视觉，不裁决业务语义。

### 6.2 Instrumented PBWork 门槛

- required semantic contract 100% 有效；
- traceable fact rate 100%；
- heuristic fallback rate 不高于 5%；
- Action、Navigation 和 Component identity 为 0% heuristic；
- selected Case 全部 captured，或明确标记 unsupported；
- 失败、跳过和 unsupported 分开统计。

### 6.3 Evidence Level

| Level | 可证明 |
| --- | --- |
| instrumented-source-runtime | Contract、Source 逻辑、Runtime、视觉、组件和 Token |
| instrumented-runtime | Runtime Contract、显式语义、当前状态和视觉 |
| generic-runtime | 可见 DOM、ARIA、控件、样式和 Screenshot |
| screenshot-only | 像素、文字和粗略布局 |

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
- 完整 CLI；
- MCP 按需发现和读取证据；
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

| 工作包 | 主要交付 | 依赖 |
| --- | --- | --- |
| W1 Contract | ID、Schema、Evidence、Issue、Coverage | 无 |
| W2 Runtime | Protocol、prepare/reset、semantic preflight | W1 |
| W3 Capture | Selection、Case Matrix、Scenario、Playwright | W1、W2 |
| W4 Store | Bundle、Run、Case、Blob、事务和 retention | W1、W3 |
| W5 Service | Job、SSE、取消、恢复和安全 | W3、W4 |
| W6 PBWork | Capture Console、Evidence、Coverage、Handoff | W2、W5 |
| W7 CLI / MCP | 完整命令、resources、按配置暴露能力 | W4、W5 |
| W8 Target | Flutter adapter 独立迁移 | W1 |
| W9 Migration | 全部原型修标、V1 删除、文档和发布 | W1–W8 |

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

## 11. 工作量与收益

| 工作包 | 估算 |
| --- | --- |
| Contract | 2–3 天 |
| Runtime、标注和 lint | 4–6 天 |
| Capture Orchestrator | 4–6 天 |
| Store | 3–5 天 |
| Local Service | 3–4 天 |
| PBWork | 4–6 天 |
| CLI、MCP、Target | 3–5 天 |
| 全量迁移、删除和回归 | 3–5 天 |
| 合计 | 26–40 个开发日 |

单人合理预期为 5–8 周。AI 能加速 Schema、类型、样板和测试编写，但不能消除浏览器稳定性、协议联调、全量修标和回归成本。

V1 已经可用，因此 V2 的价值不是“从无到有”，而是：

- 将低质量推导移出主链；
- 覆盖完整 Prototype 和多状态证据；
- 让证据可复用、可追溯、可度量；
- 降低 Agent 实现前的信息缺失和实现后的人工返工；
- 阻止 PB 再次扩张成脆弱的目标工程 Planner。

若 PBWork 持续服务多页面、多 Variant 和多个实现任务，完整 V2 的长期价值高；是否正式发布，以 DoD 和 V1/V2 对比结果决定，而不是以代码完成量决定。
