# PBWork 与 ProtoBridge V2 操作闭环

> 状态：规范已固定；实施中
> 权威范围：PBWork 中 Evidence 的选择、预检、采集、检查、恢复、重采和 Agent Handoff
> 上位目标：[V2 产品闭环与实施总览](./pb-v2-overview.md)
> 语义约束：[V2 核心规范](./pb-v2-spec.md)
> 当前代码落点：[V2 实施指南](./pb-v2-implementation-guide.md)

本文件定义 PBWork 如何成为 ProtoBridge V2 的证据采集控制面。它固定用户任务、状态反馈、失败恢复和验收行为，不固定页面视觉、HTTP 路径、鉴权机制或 Store 文件布局。

当前正式 V1 行为仍以 `docs/design.md` 和代码为准。V2 在阶段七正式切换前不得提前替换 V1 对外入口。

当前 PBWork 可用性闸门采用“普通用户无需理解内部对象”的展示原则：

- 任务中心默认只展示新建采集、运行进度、可处理失败和历史结果，不直接展示 Snapshot、Bundle fork/archive、stale 或 Handoff 管理；
- 历史失败若被后续成功 Job 以相同或覆盖范围解决，保留审计记录但标记为“已由后续采集解决”，不再计入待处理；
- 结果页先展示截图、页面状态和交互路径，再展示人类可读内容；Evidence Level、revision、Fact ID、provenance 和原始 JSON 收进技术详情；
- Handoff 与实现意图仍是 V2 核心能力，但在阶段五 Agent 消费流程重新设计前不进入 PBWork 默认操作面。

## 产品边界

PBWork Capture 负责：

- 从当前 Runtime、画布选择或 Prototype Registry 建立 Selection Draft；
- 在创建 Job 前执行 Preflight 并展示完整 Case Matrix；
- 让用户确认范围、容量和 warning；
- 启动、观察、取消和恢复后台 Capture Job；
- 展示 Snapshot Coverage、Run Coverage、Issue、unknown、Screenshot 和 stale；
- 从失败、interrupted 或 stale 范围创建新的重采 Draft；
- 管理 Bundle 的明确选择、fork 和 archive；
- 对固定 Snapshot 生成 Agent Handoff。

PBWork 的四类 Capture 入口面向 instrumented PBWork Prototype。generic runtime 和 screenshot-only 由 CLI 使用同一个 Core 生产；它们产生的 Bundle 可以在 PBWork 结果视图中检查，但不要求为它们新增第五、第六种画布入口。

PBWork Capture 不负责：

- 把原型翻译为 Flutter 或其他目标代码；
- 选择目标文件、组件、路由、状态框架或 Token；
- 在浏览器端直接运行 Playwright、访问文件系统或解析 Store；
- 手工编辑 Evidence、修改 Coverage 或把 warning 改成成功；
- 在 Handoff 中复制整个 Bundle、Store 路径或目标实现计划；
- 提供 Agent Chat、账号、角色、审批或多人协作。

用户界面统一使用“采集证据”“检查证据”“重采”“交给 Agent”等表达，不使用“翻译代码”描述 Capture。

## PBWork 如何连接 PB

逻辑连接如下：

```text
PBWork 浏览器 UI
  → Local Service：会话、Job、事件和进程边界
  → PB Core：Selection、Preflight、Capture 和 Evidence 规则
  → Runtime / Source / Playwright：证据生产
  → Evidence Store：持久化 Snapshot 和历史对象

Coding Agent
  → MCP Reader
  → 同一个 Workspace Evidence Store
```

必须保持以下边界：

- 浏览器端 PBWork 只提交逻辑 ID、选择和用户确认，不提交任意文件系统路径；
- Local Service 不复制 Selection、Evidence 或 Store 的产品逻辑；
- PB Core 是 Preflight、Matrix 展开、Capture 编排和 Evidence 激活规则的唯一实现；
- Runtime Bridge 的画布 inspect/comment 能力与 Capture Protocol 是不同边界，可以共享上下文但不能混用消息语义；
- MCP 在 V2 中是 Evidence 读取与 Target 查询入口，不创建 Capture Job；
- CLI 和 PBWork 是正式 Evidence 生产入口，两者必须复用同一个 Core/JobHost；
- 关闭 PBWork 页面不会停止 Local Service 或自动取消后台 Job。

具体进程组织和模块落点可在实施中调整，只要上述边界不变。

## 单一操作闭环

所有入口最终进入同一流程：

```text
选择采集范围
→ Preflight
→ 确认 Case Matrix 与 warning
→ 创建 Capture Job
→ 查看执行进度
→ 检查 Snapshot / Coverage / Issue / Evidence
→ 修复、重试或重采 stale
→ 创建固定 Snapshot 的 Agent Handoff
```

当前 Screen、Fragment、自定义范围和整个 Prototype 只负责创建不同的 Draft。它们不能拥有不同的 Capture、Store 或 Handoff 实现。

四类入口默认在当前工作位置打开同一个 Workbench Capture Composer，不强制离开原型上下文。Composer 以底部 Sheet 展示页面、Variant、Scenario、Fragment、Screenshot、预计 Matrix 和 warning，用户二次确认后才创建 Job。`/workbench/capture` 保留为高级任务中心与历史恢复入口，不再是每次采集必须跳转的中间页。

## 四类入口

### 当前 Screen

用户正在查看一个完成 Runtime 握手的 Screen 或 Variant 时，可以执行“采集当前页面”：

- Prototype、Screen、当前 Variant 和 Theme 来自 Runtime 上下文；
- Device 来自当前画布或 Workspace 默认值；
- Variant 默认只选择当前 Variant，用户可以改为 default、critical、all 或显式集合；
- Scenario 默认选择 Registry 显式标记的 critical 项，用户可以改为 none、all 或显式选择；
- 点击后进入 Draft，不直接创建 Job。

工作台 URL、过期 Bridge 消息或本地缓存不能覆盖当前 Runtime 报告的身份。

### 选中 Fragment

Fragment Capture 复用 PBWork 现有 inspect 选择能力：

- 用户在画布选择节点；
- Inspector 展示当前 Screen、稳定 `data-pb-id`、可选 `data-pb-key`、role 和 component；
- 用户执行“加入采集范围”；
- PBWork 将稳定身份加入 Draft，再选择 Variant、Theme、Device 和 Scenario。

以下情况禁止提交 instrumented Fragment：

- 没有稳定 `data-pb-id`；
- 重复实例没有稳定 `data-pb-key`；
- 只有 Runtime handle、DOM path、数组下标、随机 class 或 CSS selector；
- 节点属于已卸载或已经切换的 Runtime；
- 切换 Variant、Theme 或 Screen 后 selector 未重新验证。

阻止时必须说明缺少的稳定身份和所属 Screen，并允许用户重新定位。调试定位可以继续使用临时 handle 或 selector，但不能写入正式 Fragment Evidence 或 Handoff。

Fragment 是 Case Evidence 内的选择范围，不是独立 Case 维度。一次 Fragment Capture 产生带明确 capture scope 的新 Evidence revision；成功结果可以成为该 Fragment Scope 的 scoped active revision，但不得静默替换完整 Case 的 primary active revision。

### 自定义范围

自定义 Draft 支持：

- 一个 Prototype 内多选 Screen；
- 每个 Screen 独立选择 default、critical、all 或显式 Variant；
- 全局默认或逐 Screen 选择 Scenario/Checkpoint；
- 一个或多个 Theme、Device 和 Fragment；
- Screenshot 和 Debug 策略。

一个 instrumented Selection 只属于一个 Prototype。跨 Prototype 任务拆成多个 Draft 和 Job，避免 Bundle、Catalog 和 Coverage 混杂。

### 整个 Prototype

“采集整个原型”选择当前 Prototype 的全部 Screen，并要求用户明确 Variant 和 Scenario 策略：

- Variant：default、critical 或 all；
- Scenario：none、critical 或 all；
- Theme 和 Device：显示默认值并允许调整。

`all` 不能作为无提示默认值。提交前必须分别显示 Base Case、Scenario Checkpoint Case、预计 Screenshot 数和容量；超出配置上限时引导用户拆分任务。

## Selection Draft

Draft 是 PBWork 会话中的可编辑状态，不是 Run，也不写入 Evidence Store。

Draft 至少展示：

- Workspace、Prototype 和目标 Bundle；
- Screen 和每个 Screen 的 Variant policy；
- Scenario 和 Checkpoint policy；
- Fragment 数量及稳定身份；
- Theme、Device、Source 和 Screenshot 策略；
- Source 是否可用；
- 预计 Case 数；
- 返回工作台的位置。

规则：

- 默认值来自当前 Runtime、Registry 和 Workspace 配置；
- 进入 CaptureRequest 的字段变化会使旧 Preflight 失效；
- 只影响 UI 返回位置的字段不影响 Preflight；
- Draft 可以在当前 PBWork 会话内保留，刷新后恢复不是 V2 硬要求；
- Draft 不接受 Store root、Source root、target root 或目标工程信息；
- 导入的 Selection 也必须经过同一 Schema 和 Preflight；
- 选择已有 Bundle 时必须显式显示其 Prototype、lifecycle 和 active Snapshot；
- archived Bundle 不能追加 Run，必须先从明确 Snapshot fork。

同一 Prototype 可以存在多个未归档 Bundle；PBWork 最近使用记录只用于 UI 默认选择，不构成全局“唯一当前 Bundle”。所有 Capture 和 Handoff 都携带明确 `bundleId`。

## Preflight

Preflight 在创建 Job 前执行，不创建 Run，不改变 Bundle。

它至少检查：

- Workspace、Runtime Protocol 和版本；
- Prototype、Screen、Variant、Theme、Device 和 Scenario 是否存在；
- `data-pb-*`、Component、Slot、Action、Checkpoint 和 Fragment 引用；
- 重复 `pbId` / `pbKey`；
- Runtime 是否能准备所选 Base Case；
- Scenario Step 和导航是否属于当前支持范围；
- Matrix 是否为空或超过上限；
- Source、Runtime、Registry 和 capture config 是否在检查期间发生变化；
- 预计 Screenshot、Debug Evidence、容量和 Evidence Level；
- 对已有 active Evidence 的复用、stale 和潜在降级影响。
- 使用 Core 的统一 Scope resolver 验证 exact/primary/covering active ref 是否唯一；歧义时生成阻塞 Issue。

结果只有三类：

| 结果    | 含义                                          | 可用操作                 |
| ------- | --------------------------------------------- | ------------------------ |
| ready   | 没有阻塞问题                                  | 查看 Matrix 并创建 Job   |
| warning | 可以执行，但 Evidence、容量或覆盖存在明确风险 | 查看影响，接受后创建 Job |
| blocked | 身份、引用、协议、安全或上限检查失败          | 定位并修复，不能创建 Job |

每个 Issue 必须说明：

- 严重级别和原因；
- 受影响的 Prototype、Screen、Variant、Scenario 或节点；
- 对 Matrix、Evidence Level 或 Coverage 的影响；
- 建议的下一步；
- 可定位时提供“在画布中查看”。

Job 只能从仍然有效的 Preflight 创建。PBWork 创建 Job 时必须同时提交规范化 Selection、Matrix identity 和用户接受的 warning；Core 必须重新验证它们仍然匹配。任何输入变化或 warning 接受不完整都必须返回到 Preflight，不能静默使用旧 Matrix。

Preflight 可以在隔离环境中验证 Runtime 是否可准备，但不能改变当前画布、创建 Run 或提交 Evidence。Scenario Preflight 验证声明、引用和能力；实际 Step 可达性由 Capture Attempt 证明。

## Case Matrix 确认

Matrix 是用户创建 Job 前的最终确认，不是执行结果。

每个 Case 至少展示：

- Screen、Variant、Theme 和 Device；
- Scenario owner、Scenario 和 Checkpoint；
- Fragment/capture scope 和 Screenshot scope；
- 预计 Evidence Level；
- new、reusable、stale 或可能降低 active Evidence 的提示。
- Core 解析出的 scopeKey、匹配 active slot 和 relevant latest Attempt 摘要。

交互规则：

- 默认按 Screen 分组；
- 支持只看 warning、stale、reusable、新增或降级风险；
- 用户确认规范化 Selection，不直接修改派生 Case identity；
- 需要改变 Matrix 时返回 Draft 修改；
- Matrix 为空或超过上限时不能创建 Job；
- 将产生更窄或更低等级 Evidence 时必须明确提示，默认不得替换更完整的 active revision。

## Job、Run 与 Coverage

Job 是持久的后台执行和恢复对象；Run 是一次已终结 Selection 的不可变执行记录；Coverage 描述结果完整度。三者不能共用一个状态字段。Service 接受 Job 前必须先保存可恢复的 Job record；执行开始后同时保留 Run identity 和 journal。

### Job 执行状态

| 状态        | 含义                                          |
| ----------- | --------------------------------------------- |
| queued      | 已接受，尚未开始                              |
| discovering | 正在解析输入和 Runtime                        |
| capturing   | 正在执行 Case                                 |
| writing     | 正在终结 Run 和提交 Snapshot                  |
| completed   | 正常执行结束                                  |
| cancelled   | 用户要求停止，未执行 Case 不再启动            |
| interrupted | Service 或进程中断，必须恢复为终态记录        |
| failed      | Job 或持久化故障导致无法形成可信 Run/Snapshot |

`cancelled` 和 `interrupted` 表示终止原因，不表示 Evidence 完整度。对应 Run 的 Coverage 可以同时为 partial，并且在存在成功 Case 时产生新 Snapshot。

### Case Attempt 结果

| 结果        | 含义                                         |
| ----------- | -------------------------------------------- |
| captured    | 本次成功产生新 Evidence revision             |
| reused      | 输入和所需 capture scope 可复用已有 revision |
| failed      | 已执行但采集失败                             |
| skipped     | 因前序 Scenario 失败或执行策略未到达         |
| unsupported | 当前 Evidence Level 或 Runtime 不支持        |
| cancelled   | Job 取消前尚未完成                           |
| interrupted | 进程中断时尚未完成                           |

`missing` 是 Coverage 对 Selection 的比较结果：选中的 Case 在目标 Snapshot 中既没有 active Evidence，也没有可解释的 Attempt。它不是 Attempt 状态，但必须在 Coverage 和 Handoff 中表达。

### 终结规则

- Job 一旦开始执行，最终必须形成不可变 Run，包含终止原因和全部已知 Attempt；首个 Attempt 前的致命失败用 missing Coverage 表达；
- Case Evidence 和 Attempt 可以先作为不可变对象写入，但只有最终 Snapshot 事务提交后 Bundle 当前态才改变；
- 正常结束且全部 Case captured/reused 时，Run Coverage 为 complete；
- 正常结束但存在 failed/skipped/unsupported/missing 时，Run Coverage 为 partial；
- cancelled/interrupted 单独保留终止原因，Coverage 按实际结果计算；
- 每个可信 Run 都提交新 Snapshot；零成功时 carry forward 旧 active Evidence，并固定新的 latest Attempt 和 Coverage；
- Store 提交失败时 Job 为 failed，旧 active Snapshot 保持不变；
- retry 从明确范围创建新 Draft，重新 Preflight，并产生新 Job 和新 Run；
- failed、skipped、unsupported、cancelled 或 interrupted 只更新对应 Case/Capture Scope 的 latest Attempt，不能清除旧 active successful Evidence。

运行中 PBWork 至少展示 Job、当前阶段、已完成和剩余 Case、当前 Screen/Variant、最近 Issue、耗时和取消进度。

关闭页面不取消 Job。重新进入后通过持久 Job 状态和事件恢复。Service 重启后根据 Job journal 将运行中任务标记 interrupted，并终结 Run、Coverage 和 Snapshot；不能假装从内存位置继续。

## Evidence 检查

结果页按以下层级组织：

```text
Bundle / Active Snapshot
├── Snapshot Coverage
├── Issue / unknown / Staleness
├── Screen
│   └── Case
│       ├── primary / scoped active Evidence revision
│       ├── 截至 Snapshot 的 scoped latest Attempt
│       ├── Screenshot / Fragment
│       └── provenance / refs
└── Run 历史
    └── Case Attempt
```

默认摘要必须回答：

- 这次选择和执行了什么；
- 哪些 Case captured、reused、failed、skipped、unsupported、cancelled、interrupted 或 missing；
- 当前 Selection/Capture Scope 匹配的 active successful Evidence 与 latest Attempt 是否一致；
- 是否存在 stale、冲突、unknown 或证据降级风险；
- 当前 Snapshot 是否适合生成 Handoff。

展示规则：

- Snapshot Coverage 与单次 Run Coverage 分开展示；
- 最近 Run 不能冒充 Bundle 当前态；
- 默认按 Screen / Case 组织，先展示 Screenshot 和质量结论，再展示人类可读 Facts；
- Screenshot 使用缩略图，原图和 Debug Evidence 按需读取；没有 Screenshot Blob 时明确显示原因，不使用占位图冒充；
- 执行覆盖与语义完整性分开判断；没有 authored 完整性边界时不能把 captured 显示为“语义完整”；
- revision、原始 fact ID、provenance 和 JSON 收在技术详情中，不作为默认阅读入口；
- Source、Runtime、ARIA 和 Screenshot 冲突并列展示 provenance；
- partial、stale 和各失败类别不能被单一百分比或颜色掩盖；
- Fragment-only 或较低 Evidence Level 的 revision 可以作为其明确 Scope 的 active Evidence，但不能替换更完整的 primary active revision；
- PBWork 不根据 Evidence 生成目标技术栈建议。

## stale、修复与重采

stale 不是 Job 状态。它是指定 Snapshot 相对于一次当前输入检查的结果。

进入结果页、创建 Handoff 或用户执行“刷新 stale”时，PBWork 请求 Producer 根据当前 Runtime、Source、Registry 和配置生成新的 Staleness Report：

- Report 明确绑定 Snapshot 和本次输入版本；
- 对 Snapshot 中被评估的具体 primary/scoped revision 和 Capture Scope 比较实际依赖闭包；
- 无关 Screen、Source、Component、Token 或 Asset 变化不能使当前 Case stale；
- Handoff 只汇总其选定 revision refs 对应的 stale 结果，不被同 Case 其他 Scope 污染；
- Store-only Reader 只能展示已有 Report，不能声称已经检查当前 Source。

用户可以从以下范围创建新 Draft：

- 全部 stale Case；
- 选中 Screen 或 Case；
- failed、interrupted 与 stale 的组合；
- 需要补充更高 Evidence Level 或更完整 capture scope 的 Case。

重采始终创建新 Run 和新 Snapshot。旧 Run、Snapshot、Evidence revision、Staleness Report 和 Handoff 保持可读。

## Bundle 生命周期

- 创建首个 Capture 时可以创建 Bundle，也可以显式选择现有 writable Bundle；
- 同一 Prototype 可以有多个 Bundle，每个 Bundle 只有一个 active Snapshot；
- 普通新 Bundle 与首个可信 Snapshot 原子创建；
- fork 必须指定源 Snapshot 和新 Bundle identity，并为新 Bundle 建立带 origin 的初始 Snapshot；源 Bundle 不被隐式归档或删除；
- archive 后 Bundle 只读，不能追加 Run；
- 从 archived Bundle 继续工作必须显式 fork；
- archived Bundle 的历史 Snapshot 仍可生成新的 Staleness Report 和 Handoff，因为它们是 Workspace 级对象，不修改 Bundle；
- PBWork 不提供直接删除 active Snapshot 或单条 Evidence 的操作；
- clean 只能执行 Core 生成的安全计划，并保护所有 active Snapshot、未归档 Bundle、Handoff 及其传递引用。

## Agent Handoff

Handoff 是 Evidence 生产生命周期与目标实现生命周期之间的固定索引。

创建前 PBWork 必须：

- 选择明确的 Bundle Snapshot 和实现范围；
- 读取该 Snapshot 的 Coverage；
- 在当前 Producer 可访问该 Evidence Level 所需当前输入时，为该 Snapshot 生成新的 Staleness Report；
- 分开展示 Coverage 的 complete/partial、freshness 的 fresh/stale，以及 unknown、conflict、Evidence Level 限制和其他风险；
- 收集用户的实现意图；
- 对 partial、stale 或策略要求确认的 risk 进行显式风险确认。

如果当前 Producer 无法检查该 Evidence Level 所需的当前输入，PBWork 可以查看或导出现有 Handoff，但不能创建一个声称 freshness 已验证的新 Handoff。用户必须恢复 Producer 连接并生成新的 Staleness Report。

持久化 Handoff 前 Core 必须再次确认 Staleness Report 的输入版本仍是当前值；若 Report 生成后输入又变化，PBWork 返回 stale 检查步骤重新执行。

Handoff 必须固定：

- Workspace、Bundle 和 Snapshot；
- 所选 Screen、Case、Fragment 和具体 Evidence revision；
- Coverage、其中固定的 relevant Attempt refs 和 Staleness Report；
- 实现意图、unknown 和风险确认；
- MCP 可解析的逻辑资源引用。

Handoff 不包含：

- Store、Source 或 target 的绝对路径；
- Evidence 全文、截图或 Debug Blob；
- Flutter 文件、Widget Tree、路由、组件、状态框架或 Token 映射；
- 根据名称相似度生成的 Target 建议。

Coverage complete 要求所选 Case 和 Capture Scope 在固定 Snapshot 中均有匹配的 primary/scoped successful Evidence，且该 Snapshot 固定的相关 latest Attempt 为 captured/reused；否则 Coverage 为 partial。Freshness 单独为 fresh 或 stale。partial、stale、required unknown、unresolved conflict、Evidence Level 限制或人工 promotion 等风险只有在用户明确接受后才能生成 Handoff，Consumer 仍必须报告。全选范围没有任何可用 Evidence 时禁止生成 Handoff。

生成后用户可以复制或下载 Handoff，并查看推荐资源。PBWork 不在 V2 中自动把 Handoff 发送给某个 Agent。

## CLI 与 MCP 的一致性

虽然本文件以 PBWork 为中心，以下产品语义必须一致：

- CLI 同样先 Preflight、展示 Matrix，并要求显式接受 warning；
- 非交互 CLI 必须通过可审计输入明确列出接受的 warning，不能使用全局“忽略全部”；
- CLI 可以创建 Handoff，但必须满足与 PBWork 相同的 fresh Staleness Report 和风险确认规则；
- MCP Reader 只读取已经持久化的 Evidence 和 Handoff，不绕过 Preflight 创建 Capture；
- MCP 遇到错误 Workspace、缺失 Snapshot 或 revision 时明确失败，不回退到 active/latest；
- PBWork、CLI 和 MCP 展示的状态名称与 [V2 核心规范](./pb-v2-spec.md) 一致。

## 错误与恢复

| 场景                            | PBWork 行为                                                 |
| ------------------------------- | ----------------------------------------------------------- |
| Local Service 未连接            | 显示诊断和启动指引，保留 Draft                              |
| Runtime 未就绪                  | 阻止 Preflight，允许刷新 Runtime                            |
| Contract 或稳定身份无效         | 展示节点、原因和修复建议                                    |
| Matrix 为空或超限               | 禁止创建 Job，引导调整 Selection                            |
| Preflight 已过期                | 保留 Draft，重新 Preflight                                  |
| warning 未完整接受              | 保留 Matrix，不创建 Job                                     |
| Job cancelled                   | 显示已提交结果和未执行范围，允许创建 retry Draft            |
| Job interrupted                 | 终结为 interrupted，恢复已落盘结果，允许重新 Preflight      |
| Store 提交失败                  | 不宣称 Snapshot 更新，旧 active Snapshot 不变               |
| Snapshot 或 revision 失效       | 禁止 Handoff，不回退到 active/latest                        |
| partial、stale 或 required risk | 展示 Coverage、freshness 和全部 risks，确认后才允许 Handoff |
| 新 Evidence 可能降级            | 默认不激活，展示差异并要求明确处理                          |

错误恢复不能通过修改 Evidence、手工拼 Store 路径、跳过 Preflight 或切换到“最新对象”完成。

## 可访问性与容量反馈

- Draft、Matrix、Job、Issue、Evidence 和 Handoff 可仅用键盘完成；
- Fragment 复用现有 inspect 键盘能力；
- Job 状态和错误通过可访问提示通知，高频进度需要节流；
- 大 Matrix、Evidence 和 Run 历史使用分页或虚拟化；
- Screenshot 使用缩略图，原图按需加载；
- 状态不能只用颜色表达；
- cancel、archive、fork、clean 或覆盖用户 Draft 前需要明确确认；
- PBWork 在创建 Job 前展示预计 Case、Screenshot、Debug Evidence 和容量影响。

## 交互验收

PBWork 操作闭环完成必须通过：

- 就地发起：原型列表、原型概要、画布和 Inspector 均可创建 Draft，打开 Composer 后 URL 与工作位置不变；
- 二次确认：Job 创建前明确展示 Screen、Variant、Scenario、Fragment、Screenshot、Matrix 和 warning；
- 后台反馈：创建 Job 后可以继续浏览工作台，全局 Job Center 持续显示状态，并对成功、部分成功和失败发送可操作通知；
- 结果可读：Evidence Viewer 默认展示截图、执行覆盖、语义完整性和按类别组织的 Facts，原始 JSON 仅作为详情；
- 诚实降级：未声明完整性边界时保留实际观测结果并说明限制，不补造节点、状态、交互或 Screenshot；
- 当前 Screen：从已握手 Runtime 建立 Draft，经 Preflight 和 Matrix 生成 Snapshot；
- Fragment：稳定 `pbId/pbKey` 可提交，临时 selector 被阻止并可定位修复；
- 自定义范围：逐 Screen Variant/Scenario 策略展开结果与 Core 一致；
- 整个 Prototype：all 策略、容量和超限行为明确；重复回归只验证 Selection/Matrix 和任务拆分，不逐页执行全部 Capture；
- warning：未确认或 Draft 变化时不能创建 Job；
- partial：成功 Evidence 保留，失败范围可生成新 Draft；
- cancel：停止新 Case，已完成结果可终结为 partial Snapshot；
- Service 重启：Job 显示 interrupted，历史结果恢复，不伪装继续；
- stale：只重采依赖变化的 Case，旧 Snapshot 和 Handoff 不漂移；
- Evidence 降级：Fragment-only 或低等级 revision 不静默覆盖更完整 active Evidence；
- Bundle fork/archive：源 Snapshot 稳定，archived Bundle 不可追加；
- Handoff：固定 Snapshot/revision，partial、stale 和 policy-required risks 可审计；
- 页面关闭：后台 Job 继续，重新进入恢复状态；
- Accessibility：完整流程可用键盘和读屏状态完成。
