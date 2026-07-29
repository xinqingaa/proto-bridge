# ProtoBridge V2 核心规范

> 状态：规范已固定；实施中
> 权威范围：跨 Core、PBWork、Runtime、Store、CLI、MCP、Target Adapter 和 Agent 必须一致的 V2 语义
> 上位目标：[V2 产品闭环与实施总览](./pb-v2-overview.md)
> 用户行为：[PBWork 与 PB 的操作闭环](./pbwork-pb-v2-workflow.md)
> 实施落点：[V2 实施指南](./pb-v2-implementation-guide.md)

本文只规定无论采用何种代码结构、Schema 库、存储格式和通信方式都必须成立的规则。完整 TypeScript 类型、API 路径、错误码、目录、摘要算法和容量阈值应在对应阶段通过可执行 Schema、测试和必要的 ADR 固定，不在本计划中预写。

本文使用以下规范词：

- **必须**：实现不可违反；
- **禁止**：违反会破坏 V2 产品语义；
- **应该**：默认遵守，偏离时需要测试和理由；
- **可以**：实现选择，不构成跨组件 Contract。

## 规范与可执行 Schema

- V2 的机器契约必须在 `@proto-bridge/core` 的 V2 边界中有唯一可执行来源；
- TypeScript 类型必须由运行时 Schema 推导或与其双向校验；
- PBWork、CLI、MCP、Service、Store 和 Adapter 禁止维护私有核心枚举；
- Reader 必须拒绝不支持的主版本，不能尽力猜测未知字段语义；
- 同一主版本可以增加可忽略字段，但不能静默改变已有字段含义；
- 历史持久对象禁止原地迁移；语义变化通过新 revision 或新主版本表达；
- 每个持久对象必须能够说明自己的 Schema 版本，不能借用当前 Bundle 的版本解释历史对象；
- 计划文档描述语义，代码中的 Schema、fixtures 和 tests 决定具体字段。

阶段一开始时，先为代表性垂直切片建立最小 Schema，不要求一次定义全部远期字段。后续对象必须沿用本规范的身份、引用和不可变规则。

## 核心对象与关系

| 对象                   | 语义                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Workspace              | 一组 Runtime、Source、Store 和 Capture 配置的本地工作空间                                |
| Prototype              | 一组相关 Screen、Variant、Scenario、Component、Token 和 Navigation Contract              |
| Screen                 | 稳定页面身份和业务结构                                                                   |
| Variant                | Screen 内可直接准备的稳定业务状态                                                        |
| Scenario               | 从稳定初态开始的显式动作序列                                                             |
| Checkpoint             | Scenario 中可以验证并采集 Evidence 的稳定位置                                            |
| Case                   | Screen、Variant、Theme、Device，以及可选 Scenario Checkpoint 的稳定组合                  |
| Capture Scope          | 一次采集要求的 Fragment、Screenshot、Source 和 Debug 范围，不属于 Case 身份              |
| Case Evidence Revision | 在明确输入和 Capture Scope 下产生的一次不可变 Case 证据                                  |
| Catalog Revision       | Prototype、Screen、Navigation、Component、Token、Asset 或 Scenario Contract 的不可变版本 |
| Capture Job            | 已接受任务的持久执行控制记录，可恢复并最终进入终态                                       |
| Case Attempt           | 某个 Run 对一个 Case 的执行结果                                                          |
| Run                    | 一次规范化 Selection 的不可变执行记录                                                    |
| Bundle                 | 一个 Prototype 的长期证据集合                                                            |
| Bundle Snapshot        | 某次事务提交后 Bundle 当前投影的不可变快照                                               |
| Coverage               | Selection 或 Snapshot 与 Evidence/Attempt 的对比结果                                     |
| Staleness Report       | 指定 Snapshot 相对于一次明确当前输入的不可变检查                                         |
| Agent Handoff          | 固定 Snapshot 和 Evidence revision 的实现任务索引                                        |
| Blob                   | Screenshot、Trace 或大体积调试证据                                                       |

核心关系：

```text
Workspace
├── Capture Job → Run / target Bundle identity
├── Staleness Report → Bundle Snapshot
├── Agent Handoff → Bundle Snapshot + object revisions
└── Prototype
    └── Bundle
        ├── Run
        │   └── Case Attempt → Case Evidence Revision
        ├── Catalog Revision
        ├── Bundle Snapshot
        │   └── active Evidence / Catalog / latest Attempt / Coverage refs
```

必须遵守：

- Run 只表示一次执行，不能充当 Bundle 当前态；
- Bundle Snapshot 才是一次提交后可消费的当前 Evidence 投影；
- Snapshot 对一个 Case 可以同时引用一个 primary active revision 和按明确 Capture Scope 区分的 scoped active revisions；
- Snapshot 必须固定提交时的 latest Attempt refs 和 Snapshot Coverage，后续 Run 不能改变旧 Snapshot 的状态解释；
- `caseId` 表示业务维度稳定身份，`caseEvidenceRevisionId` 表示一次具体采集结果；
- Capture Scope、Evidence Level 或 Screenshot policy 变化产生新 revision，不改变 Case 身份；
- Handoff 必须引用 Snapshot 和具体 revision，不能只引用 Bundle 的“当前值”；
- Staleness Report 必须绑定它检查的 Snapshot，不能成为 Bundle 上可变的 stale 布尔值。

## 稳定身份

稳定身份必须：

- 在声明作用域内唯一；
- 使用小写、可读、可长期维护的业务标识；
- 不依赖时间戳、数组下标、DOM 顺序、随机 class 或运行时递增序号；
- 不直接作为文件路径；
- 重命名视为旧身份退出和新身份建立，不能按名称相似度自动关联；
- 需要迁移关系时由 Registry 显式声明。

最低身份作用域：

| 身份                      | 作用域                                           |
| ------------------------- | ------------------------------------------------ |
| workspace                 | 全局配置                                         |
| prototype                 | Workspace                                        |
| screen                    | Workspace，应该包含 Prototype 前缀               |
| variant                   | Screen                                           |
| action                    | Screen                                           |
| scenario                  | owner Screen                                     |
| checkpoint                | Scenario                                         |
| component / token / asset | Prototype 或 Workspace Registry 明确声明的作用域 |
| pbId                      | Screen Contract                                  |
| pbKey                     | 同一语义父节点和 pbId                            |

Scenario 可以跨 Screen，但必须保留 `ownerScreenId`。Case 身份中的 Scenario 引用必须包含 owner Screen、scenario 和 checkpoint，避免不同 Screen 内同名 Scenario 冲突。

所有输入模式在 Preflight 后都必须得到完整 Case 维度。generic runtime 或 screenshot-only 中缺失的 Variant、Theme、Device 必须归一为显式、稳定的保留身份，持久化 Case 不能使用空维度或临时值。

## `data-pb-*` Authoring Contract

| 属性                | 使用条件                     | 含义                 |
| ------------------- | ---------------------------- | -------------------- |
| `data-pb-id`        | 关键语义节点必须             | Screen 内稳定节点    |
| `data-pb-key`       | 进入 Evidence 的重复实例必须 | 稳定、非敏感的实例键 |
| `data-pb-role`      | 关键语义节点必须             | 跨技术栈语义角色     |
| `data-pb-shell`     | Overlay 根必须               | Overlay 容器类型     |
| `data-pb-component` | 已注册设计系统组件根必须     | Component Contract   |
| `data-pb-slot`      | 声明的组件 part 必须         | Component slot       |
| `data-pb-action`    | 业务动作触发点必须           | Action Contract      |

关键节点至少包括 Screen 根、业务 region、Action trigger、Overlay 根、需要交接的 Fragment 根和进入 Evidence 的重复实例根。

规则：

- 非重复节点在当前 Screen 可见语义树中 `pbId` 唯一；
- 重复实例可以共享模板 `pbId`，但 `{pbId, pbKey}` 必须唯一；
- `pbKey` 使用 fixture 或业务稳定键，禁止数组下标；
- 敏感主键必须先映射为稳定非敏感键；
- unknown role、shell、component、slot 或 action 在 instrumented runtime 中是 Contract 错误；
- Action 的 kind、target、precondition 和 outcome 来自显式 Contract，不能从 ID 文本或 DOM click 猜测；
- 设计系统组件应该自动输出 component、role 和 slot，页面只补业务 region、Action 和重复实例 key；
- Registry validation、template lint 和 Runtime Preflight 共同验证；
- instrumented capture 遇到缺失关键标记时必须失败，不能静默降级为 generic 语义。

Fragment 的正式身份是当前 Prototype/Screen 上下文加 `pbId` 和可选 `pbKey`。Runtime handle、DOM path、CSS selector 和随机 class 只能用于临时 UI 定位或 debug，不得进入正式 Fragment ref、Case identity 或 Handoff。

## 语义词表

`data-pb-role` 是产品语义闭集，不等同于 ARIA role。V2 初始词表：

```text
page, app-bar, bottom-bar, navigation,
section, summary, card, list, scroll-list, list-item,
filter, search, form, field,
tab-bar, tab, tab-panel, tab-viewport,
chart, empty-state, loading-state, error-state,
sheet, dialog, drawer, toast,
button, icon, image, text, unknown
```

Overlay shell 初始词表：

```text
sheet, dialog, modal, drawer, popover, toast
```

新增词必须同步可执行 Schema、文档、lint、Runtime snapshot 和 Core normalizer。业务页面不能用自由字符串绕过词表。

`unknown` 是词表中的显式未决标记，不代表任意字符串都合法。instrumented required semantic node 使用 `unknown` 时必须产生 Issue，并且不能通过完整语义 Coverage 门槛。

## 事实、来源与冲突

| 事实类别                                          | 权威来源                                        |
| ------------------------------------------------- | ----------------------------------------------- |
| Screen、Variant、Component、Action 和语义节点身份 | Registry、Runtime Contract、`data-pb-*`         |
| 业务逻辑、未渲染状态和 Action 条件                | 显式 Contract、Source                           |
| 当前可见状态、文本、位置和 computed style         | Runtime observation                             |
| 最终视觉                                          | Screenshot 与对应 Runtime computed value        |
| Accessibility                                     | ARIA 与 semantic HTML                           |
| Navigation                                        | declared、Source、Scenario 和 observed 分别保留 |
| 目标文件、组件、路由和代码规范                    | Target repository，只属于实现生命周期           |

每个 Agent-facing 事实必须具有：

- 稳定的事实身份；
- 一个或多个候选值；
- 候选的来源、可信度和 refs；
- 明确的裁决结果或 unresolved conflict；
- 无法证明时的 unknown 及所需补充证据。

规则：

- 冲突必须保留双方候选和 refs，不能按写入顺序覆盖；
- 只有权威规则足以裁决时才能选择 effective value；
- 无法裁决时生成 Issue，effective 保持未确定；
- Screenshot 只能裁决视觉，不能覆盖业务语义；
- heuristic 不能升级为显式身份、业务 Action 或 Navigation 事实；
- Target 扫描结果和实现建议禁止写入来源 Evidence Bundle；
- unknown 必须随 Snapshot/Handoff 保留，不能由 Agent 或 UI 自动补齐。

## Evidence Level

| Level                       | 可以证明                                                      |
| --------------------------- | ------------------------------------------------------------- |
| instrumented-source-runtime | Contract、Source 逻辑、Runtime 状态、视觉、Component 和 Token |
| instrumented-runtime        | Runtime Contract、显式语义、当前状态和视觉                    |
| generic-runtime             | 可见 DOM、ARIA、控件、样式和 Screenshot                       |
| screenshot-only             | 像素、可见文字和粗略布局                                      |

规则：

- 自动激活比较中的等级顺序为 instrumented-source-runtime、instrumented-runtime、generic-runtime、screenshot-only；等级高低不替代逐事实 provenance 判断；
- 低等级 Evidence 禁止推断隐藏状态、完整业务动作或目标工程实现；
- Evidence Level 按 Case revision 和具体事实记录，不用最低等级 Case 降级整个 Bundle；
- 同一 Bundle 可以保存不同 Level 的 revision；
- Handoff 必须展示所选范围的 Level 分布和受限能力；
- 较低 Level 的新 revision 不得静默替换同一 Case 更高 Level 的 active Evidence。

## Selection、Preflight 与 Case

PBWork 和 CLI 必须将输入归一为同一种 Capture Selection 语义。MCP V2 不创建 Capture Job。

Selection 必须能表达：

- 一个 Prototype；
- 一个或多个 Screen；
- 每个 Screen 的 Variant policy；
- Scenario/Checkpoint policy；
- 可选 Fragment；
- Theme 和 Device；
- instrumented、generic runtime 或 screenshot-only 输入；
- Screenshot、Source 和 Debug capture scope；
- 明确的目标 Bundle 或创建新 Bundle。

`critical` 只能来自 Registry/Manifest 的显式标记，不能按 Variant 或 Scenario 名称猜测。Base Case 始终按 Screen、Variant、Theme 和 Device 展开；Scenario 只为选中的 Checkpoint 增加 Case。

Preflight 必须：

- 规范化全部默认值和完整 Case 维度；
- 验证交叉引用、稳定身份、Runtime 能力、安全边界和上限；
- 生成确定的 Case Matrix；
- 标识 new、reusable、stale 和 Evidence 降级风险；
- 返回 ready、warning 或 blocked；
- 在 Job 创建时再次验证 Selection、Matrix、输入版本和 warning acceptance 仍一致。

零 Case、交叉引用失效、稳定身份缺失或超过配置上限的 Selection 必须 blocked。warning 未被逐项接受时不能创建 Job。

Case identity 至少包含 Screen、Variant、Theme 和 Device；Scenario Case 还必须包含 owner Screen、Scenario 和 Checkpoint。Fragment、Screenshot policy、Source policy、Evidence Level 和 Debug policy 属于 Capture Scope，记录在 revision 中而不进入 Case identity。

## Runtime 与 Scenario

Workbench Bridge 服务画布 inspect、comment、highlight 和导航同步；Capture Protocol 服务 Core/Playwright 的确定性证据生产。两者必须使用不同的 capability 和消息边界。

Core/Playwright 负责导航到 canonical Runtime URL。Runtime 必须：

- 描述自身版本和能力；
- 返回 Prototype、Screen、Variant、Component、Token、Navigation 和 Scenario Contract；
- 在当前页面准备明确 Case；
- 验证实际 Screen、Variant、Theme 和 fixture；
- 报告可观测 viewport；
- 报告 readiness 和不稳定原因；
- 返回可验证的 semantic snapshot；
- 执行受约束的 Scenario Step；
- 重置为可验证的初态。

Runtime 禁止：

- 在 prepare 中负责会卸载当前 document 的页面级导航；
- 遇到未知 Variant、Theme 或 fixture 时回退默认值并声称成功；
- 让 local/session 状态覆盖明确 Case 输入；
- 返回无法按 request kind 验证的成功 payload；
- 把截断数据伪装成完整 Evidence。

Device identity 属于 Core/Playwright 环境。Core 必须把稳定 Device identity 解析为 viewport、DPR 和其他环境设置，并验证浏览器上下文；Runtime 不负责解释 Workbench 的 logical Device ID。

Scenario 必须从隔离或经验证的初态开始。每个 Step 引用 Action Contract 或稳定语义节点，具有前置条件、超时和失败策略。CSS selector 不能成为正式 Action 身份。

Checkpoint 到达后，Core 验证实际 Screen/Variant，再建立独立 Case。Step 失败后未到达的 Checkpoint 为 skipped；已成功持久化的 Checkpoint Evidence 不回滚。

V2 instrumented Scenario 只支持 Runtime 能保持协议连续性的导航。会卸载当前 document 且无法安全恢复协议上下文的导航标记 unsupported，不得假装成功。后续可以通过新的协议版本扩展。

## Run、Attempt、Revision 与 Snapshot

- Job 被接受前必须先持久化执行控制记录；返回成功后即使 Service 重启也能恢复其终态；
- Job 开始执行时必须保留 Run identity 和执行 journal，最终产生不可变 Run；零 Attempt 的致命失败也必须在 Run/Coverage 中表达为 missing；
- Run 保存规范化 Selection、输入版本、终止原因和 Case Attempt；
- Case Attempt 保存其规范化 Capture Scope，结果为 captured、reused、failed、skipped、unsupported、cancelled 或 interrupted；
- missing 是 Coverage 相对 Selection 发现没有 active Evidence 和可解释 Attempt，不是 Attempt 状态；
- captured 产生新 Evidence revision，reused 固定引用已有 revision；
- latest Attempt 按 Case 和 Capture Scope 解释；failed、skipped、unsupported、cancelled 和 interrupted 只更新对应 Scope 的 latest Attempt；
- 失败 Attempt 禁止删除或清空 active successful Evidence；
- Case Evidence revision、Catalog revision、Run、Snapshot 和 Handoff 写入后不可修改；
- Run Coverage 和 Snapshot Coverage 必须随父对象内嵌或作为独立 revision 保持不可变；
- Bundle 只有在完整 Snapshot 事务提交后才能切换 active Snapshot；
- 写入失败时旧 active Snapshot 保持不变；
- 每个形成可信 Run 的终结都必须提交新 Snapshot：即使零成功，也要 carry forward 旧 active Evidence，并固定本 Run 的 latest Attempt 和 Coverage；
- Store 故障导致 Run/Snapshot 无法可信提交时，Job 进入 failed、一致性 Issue 被保留，旧 active Snapshot 保持不变；
- 新 Bundle 与它的首个可信 Snapshot 原子创建，不存在可供消费但没有 Snapshot 的空 Bundle。

### Evidence 激活与防降级

Case revision 必须记录 Capture Scope、Evidence Level、输入摘要和 Coverage。Store 在建立新 Snapshot 时必须比较新旧 revision：

- 相同输入和等价 Scope 可以安全复用；
- 同一 active slot 的自动 promotion 必须满足 Scope 不缩小、Evidence Level 不降低、required fact/provenance quality 不降低，并且至少一项质量改善；完全等价时复用现有 revision；
- 新 revision 覆盖完整 Case Scope，且满足上述 dominance 规则时，可以成为新的 primary active revision；
- 输入已经变化但新 revision 完整满足完整 Case Scope 时，仍必须满足 primary profile 对 Evidence Level、required fact 和 provenance 的最低要求，才能整体成为新的 primary active revision；否则只能进入匹配的 scoped slot 或等待明确的人工 promotion；
- Fragment-only、Screenshot 更少或显式低 Level 的成功 revision 可以成为其明确 Capture Scope 的 scoped active revision，但不得替换更完整的 primary active revision；
- 新旧输入不同且新 revision 不完整，或 Coverage 不可比较时，不得自动拼接不同时间的事实形成伪完整 revision；
- 不能判断 revision 是否满足其声明 Scope 时，只保存历史 revision 并生成 Issue，不得进入 Snapshot 的 active refs；
- Handoff 必须根据自己的 Selection/Capture Scope 解析匹配的 primary 或 scoped active revision，不能仅按时间选择“最新”；
- 人工 promotion 必须留下可审计原因并生成新 Snapshot；Handoff 只能引用固定 Snapshot 可达的 active revision；
- 任何人工选择都不能改写旧 Snapshot。

### Capture Scope 与 active ref 解析

Core 必须为 Capture Scope 建立唯一规范化表示和稳定 `scopeKey`。规范化至少覆盖 Fragment 集合、Screenshot 集合、Source/Debug policy、Evidence 输入模式和所需最低 Evidence profile；集合排序、默认值和重复项不能产生不同 key。

Snapshot 中的 active slot 由 `{caseId, scopeKey}` 唯一标识；完整 Case Scope 使用保留的 primary slot。PBWork、CLI、MCP 和 Handoff 必须调用同一个 Core resolver，按以下顺序解析一个 Selection：

1. 使用 Selection 的规范化 `scopeKey` 查找 exact scoped active；
2. exact 不存在或不满足最低 profile 时，使用能够覆盖该 Scope 且满足 profile 的 primary active；
3. primary 不能满足时，从其他 scoped active 中选择严格覆盖请求且额外 Scope 最少的候选；
4. 多个候选无法按集合包含关系得到唯一最小项时返回 ambiguity Issue，不能按时间、文件顺序或“最新”猜测；
5. relevant latest Attempt 优先使用请求 `scopeKey` 的 Attempt；没有该 Scope 的 Attempt 时，才使用最终解析 active slot 的 Attempt。

因此，失败的 Fragment retry 会使该 Fragment Handoff 为 partial，但不会清除 full Case primary；多个 Screenshot policy 也不会让不同入口选择不同 revision。上述反例必须进入阶段一 fixtures。

## Coverage、Issue 与 stale

Run Coverage 描述本次 Selection 的 Attempt；Snapshot Coverage 描述 Snapshot 对某个选择或整个 Prototype 的 active Evidence。二者必须分开。

Coverage 至少区分：

- selected、captured、reused；
- failed、skipped、unsupported、cancelled、interrupted；
- missing、stale；
- Evidence Level 和 traceable/heuristic/unknown/conflict。

Coverage 分母是明确 Selection 或 Snapshot 范围。分母为零时必须报告不可计算，不能用 100% 代替。汇总必须可下钻到 Case 和 refs。

Staleness Report：

- 绑定一个 Snapshot 和一次明确输入版本集合；
- 按 Snapshot 中被评估的具体 primary/scoped active revision、Capture Scope 和实际依赖闭包判断，并固定每个 revision ref 的结果；
- 无关依赖变化不能使 Case stale；
- 生成后不可修改；
- 不回写 Snapshot、Run 或 Evidence revision；
- Store-only Reader 只能读取已有 Report，不能猜测相对当前 Source 的 freshness；
- Handoff freshness 只汇总它最终解析到的 revision refs 对应 stale 结果，不使用同 Case 其他 Scope 的结果；
- stale 影响 Handoff freshness，但不把历史 Evidence 标记为错误。

Issue 必须包含严重级别、影响范围、原因、Evidence refs 和可执行 next action。warning acceptance 只能接受已知风险，不能把 blocked Contract 错误变成可执行。

## Bundle 生命周期

- 一个 Workspace/Prototype 可以有多个 Bundle；
- 每个 Bundle 只有一个 active Snapshot；
- 普通新 Bundle 与首个可信 Snapshot 原子创建；在此之前只有 Job 中的待创建 identity；
- writable Bundle 可以追加 Run，archived Bundle 只读；
- fork 必须指定源 Snapshot，并为新 Bundle 创建带 origin 的初始 Snapshot；该 Snapshot 从源 Snapshot 派生 refs，之后独立演进；
- fork 引用的共享不可变对象必须受两个 Bundle 和全部 Handoff 的传递引用保护；
- Staleness Report 和 Handoff 是 Workspace 级不可变评估/任务对象，可以引用 archived Bundle 的历史 Snapshot；创建它们不修改 Bundle；
- archive 不删除 Evidence；
- 从 archived Bundle 继续采集必须显式 fork；
- UI 的“最近使用 Bundle”只是偏好，不是产品唯一性或隐式写入目标；
- clean 必须保护 active Snapshot、未归档 Bundle、所有 Handoff 固定 Snapshot 及其传递引用；
- 删除和容量回收必须先生成可检查的计划，再显式执行。

## Agent Handoff 与消费

Handoff 是任务索引，不是 Evidence 副本。

Handoff 必须固定：

- Workspace、Bundle 和 Snapshot；
- 所选 Screen、Case、Fragment 和具体 object revision；
- Coverage 和针对该 Snapshot 的新 Staleness Report；
- Evidence Level、unknown、partial/stale 状态和风险确认；
- 实现意图和 MCP 可解析的逻辑资源引用。

Handoff 使用三个正交维度表达状态：

- `coverageStatus`：complete 或 partial。全部 selected Case/Capture Scope 在 Snapshot 中都有匹配的 primary/scoped successful Evidence，且 Snapshot 固定的相关 latest Attempt 为 captured/reused 时才是 complete；
- `freshnessStatus`：fresh 或 stale，由 Handoff 固定的 Staleness Report 决定；
- `risks`：所选范围中的 required unknown、unresolved conflict、Evidence Level 限制、人工 promotion 和其他必须披露的风险。

failed、skipped、unsupported、cancelled、interrupted、missing 或无匹配 active Evidence 都使 `coverageStatus=partial`。Coverage 和其中的 latest Attempt refs 必须固定在 Handoff 中，状态计算不能读取后续 Bundle-global latest。

partial、stale 或需要确认的 risk 只有在用户明确接受对应风险后才能生成 Handoff。风险接受不会改变 Coverage、Issue、freshness 或 Evidence，也不能让 Consumer 隐去风险。全选范围没有任何可用 Evidence 时禁止生成 Handoff。

新 Handoff 必须由能够访问该 Evidence Level 所需当前输入的 Producer 生成新的 Staleness Report。提交 Handoff 前必须重新验证 Report 的输入版本仍是当前值；发生变化时重新检查，不能把过期 Report 固定为 fresh。Store-only 环境可以读取或导出现有 Handoff，但不能创建声称 freshness 已验证的新 Handoff。

Handoff 禁止包含 Store/Source/target 绝对路径、Evidence 全文、Debug Blob 和目标实现计划。

Consumer 顺序：

```text
验证 Handoff Schema
→ 验证 MCP Workspace
→ 读取固定 Bundle Snapshot
→ 读取 Coverage 与 Staleness Report
→ 读取所选 Screen / Case / Fragment revision
→ 按 refs 读取 Component / Token / Asset / Screenshot / Issue
→ 阅读目标仓库
→ 实现与验证
```

Workspace 不匹配、Bundle/Snapshot 不存在、revision 引用失效或 Schema 不支持时必须阻止消费。禁止回退到 active/latest、猜测 Store 路径或使用名称相似对象替代。

## 安全与配置边界

- Workspace 配置拥有 Runtime、Source、Store 和 Capture 能力；
- MCP 到 Workspace Store 的连接属于用户、IDE 或 Agent 运行环境；
- 目标工程不保存 PB Workspace、Store 或 Source 配置；
- target root 只属于当前 Agent 工作目录或单次 Target tool 调用；
- 浏览器端 PBWork 不直接访问文件系统、Store 或 Playwright；
- Browser/Agent 输入不能提交任意 Store root、Source root 或 output path；
- Local Service 必须限制监听范围、Origin、会话、URL、重定向、路径、payload、并发和敏感日志；
- Runtime、Source 和 Store 的路径必须防止越界和符号链接逃逸；
- Screenshot 输入必须先成为受大小、类型和归属约束的逻辑 Blob；
- 具体认证、锁、摘要和传输机制由实施阶段决定，但必须通过对应威胁和故障测试。

## 一致性验收

本规范完成实现必须证明：

- 所有入口共享同一核心 Schema 和状态词汇；
- 历史 Run、Snapshot、Evidence revision 和 Handoff 在后续重采后内容不变；
- 失败重试不清除最后成功 Evidence；
- Fragment-only 或低 Level Evidence 不静默降级 active Evidence；
- partial、stale、unknown 和冲突从 Producer 到 Consumer 全程可见；
- Store 重启和 MCP 重启后固定 refs 仍可解析；
- 错误 Workspace 或引用确定性失败；
- Target 事实不进入来源 Bundle；
- archived/fork/clean 不破坏 Handoff 引用；
- instrumented、generic runtime 和 screenshot-only 不越过各自可证明范围。
