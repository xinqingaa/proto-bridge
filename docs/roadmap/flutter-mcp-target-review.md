# Roadmap：官方 Flutter MCP 与分级 Target 验收

状态：In Progress

方案评审：用户已确认；按阶段实现并逐阶段提交

当前执行约束：本轮只实现与执行静态/Fake Provider 回归，不由 Agent 连接真实设备或运行真实 App 验收；真实能力 Spike 与业务 E2E 等待用户另行启动。

全局优先级：P0

日期：2026-08-18

目标投入：约 2–3 周；先完成真实 App attach spike，再锁定后续 tranche

## 当前实施进度

截至 2026-08-18，代码阶段已完成：Core 分级与双轨 contract、Local Service attach-only provider、官方 MCP Screenshot/Scenario 编排、App/build/Target identity、typed Runtime observation、五维 verifier 回接、Flutter-only provider 规则、L1/L2/L3 完成语义、protocol v3 客户端迁移，以及旧 launcher Runtime 删除。

尚未执行：真实 DTD/App attach spike、真实设备 Screenshot/interaction、真实 Handoff 的 L1/L2/L3 对照、OCR/文字 bbox、Flutter/Runtime E2E 和完整 `pnpm verify`。这些项目不能由 Fake Provider 结果代替。

当前静态文档门禁仍有一项仓库既存 Target drift：Flutter target mapping 缺少已记录的 `screen-transition` component；它与本 Roadmap 的 Runtime provider 改造无关，未在本轮越界修改。

## Roadmap 定位

PB/PBWork 核心 Evidence 链路已经完成验收，并继续作为当前产品基线：

```text
PBWork Runtime
  -> Core/Playwright Capture
  -> immutable Store/Snapshot
  -> fixed Handoff
  -> MCP progressive Evidence consumption
  -> Agent implementation
  -> five-dimensional Reconstruction Obligations
  -> authoritative Target Review
```

本 Roadmap 不重建 Capture、Store、Handoff 或五维义务。它重构当前不可信的 Flutter Target Runtime 执行层，并为 Target Review 增加按风险分级的验收范围：

- 通用 Code/Semantic Track 继续复用固定 Handoff 和五维义务；
- Flutter Runtime/Visual Track 只通过官方 Dart and Flutter MCP server 附着到已经运行的真实 App；
- ProtoBridge 不选择、启动或维护固定 Simulator、Emulator 或物理设备；
- 不保留 target-defined launcher 作为 Runtime fallback；
- 官方 MCP 最多进行三次总尝试，仍失败时终止 Runtime Track，保留 code-only 结果并显式标记未验证；
- L1/L2/L3 由 Core 根据固定风险输入确定，Agent 不能自行缩小验收范围；
- 只有 L3 Full Target Audit 保留当前 `completed` 的全量完成含义。

PBWork 原型生命周期、v1/v2 Release 和 Archive 属于独立路线，不是本 Roadmap 的依赖。见 [PBWork 原型生命周期与 Release 管理](./prototype-lifecycle-and-release.md)。

## 当前基线与真实缺口

### 已成立能力

- Capture 由 Core/Playwright 执行，并固定 Case viewport、DPR、Theme、Variant、Fixture、Scenario 和 Checkpoint；
- Store 保存不可变 Run、revision、Snapshot、Screenshot 和 provenance；
- Handoff 固定 Workspace、Bundle、Snapshot、revision、范围和 mandatory risks；
- MCP 按 Handoff -> Screen Packet -> Case Delta/Detail -> Obligations 渐进供给 Evidence；
- Reconstruction Acceptance 固定 `structure`、`components`、`tokens`、`states`、`interactions` 五个维度；
- Target Review 已有 start/read/render/replay/compare/verify/assessment/finalize 工具和 append-only event log；
- component/token verifier 可以校验精确 Dart occurrence、owner 和 named-argument slot；
- Review reducer 会阻止缺失 receipt、assessment，或存在 deviation/unverified 的全量完成请求；
- Screenshot compare 可以生成 diff、overlay 和 normalized signature，但不输出综合分数。

### 当前实现不构成真实 Runtime 验收的部分

- Flutter Review Contract 固定 `ios-simulator`、UDID、runtime、尺寸、DPR、locale、theme、safe area 和 settle policy；这些字段来自配置，不是实际设备观测；
- `render_target_case` 执行目标仓库任意 `launcher.command` 并读取 PNG；命令可以复制已有图片，不能证明真实 App 已渲染；
- Structure/State/Scenario inspector 读取目标命令 stdout JSON；Schema 和 identity 校验成立，但不能证明 JSON 来自同一真实运行 App；
- render 只核对 Git HEAD，尚未把运行 App build 与 Target content digest 绑定；
- MCP Server 当前先执行目标命令，再向 Local Service 提交自述 receipt；Local Service 尚未拥有 Runtime provider session；
- provider 调用失败时直接抛错，不持久化失败尝试，也没有统一 retry budget；
- 当前 Review 只支持全 Case、全 Scenario、全部 obligations 的单一完成语义；
- 仓库真实 Flutter 示例工程尚未声明可运行的 Review contract，现有 Review 测试使用 synthetic command fixture；
- 代码中没有官方 Dart/Flutter MCP client、session handshake 或真实 App receipt。

### 五维义务与验证 authority

五维是固定验收分类，不等于五种都可由静态源码完全证明：

| 维度 | Code/Semantic Track 可证明 | 真实 Runtime 才能补充证明 |
| --- | --- | --- |
| `structure` | 路由、声明结构、静态层级候选和显式 mapping | 最终 Widget/render tree、真实滚动归属、遮挡与裁切 |
| `components` | symbol、import、owner、精确 occurrence | 当前 Case 中组件是否真实出现 |
| `tokens` | accessor、owner、named slot | 最终像素是否兑现视觉预期 |
| `states` | 状态定义、fixture、分支和绑定是否存在 | App 是否真实进入目标状态及可见结果 |
| `interactions` | handler、Action、导航和转换代码是否存在 | 点击、输入、滚动及前后状态是否真实发生 |

MCP 不可用时仍可完成五维 code review，但不得把无法由代码证明的结构、状态、交互写成 Runtime `matched`。

## 建议批准的最终产品决策

### 1. 官方 MCP 是 Flutter Runtime Review 的唯一 provider

- Target detection 识别为 Flutter 后，进入 Runtime/Visual Review 必须使用官方 Dart and Flutter MCP server；
- 不再保留 `TargetLauncherProvider`；
- 不允许 target-defined shell command、脚本 stdout 或任意图片作为等价 Runtime fallback；
- 官方 MCP 不可用不会阻止固定 Evidence 消费和 code-only review，但会使 Runtime/Visual Track 明确成为 `unverified`；
- 非 Flutter Target 不启动 Dart/Flutter MCP，等待未来独立 RuntimeProvider。

### 2. ProtoBridge 只 attach，不管理设备生命周期

- 不固定 iOS Simulator；
- 不建立 Android Emulator 或物理设备矩阵；
- 不由 PB 调用 device discovery、`launch_app`、`flutter run`、`simctl` 或其它设备启动命令；
- App 由用户、IDE 或目标工程既有工作流运行；
- Provider 使用 DTD 发现并连接已运行的 debug/profile App；
- 没有 App、App 不唯一且无法消歧、App 未启用所需 capability 时，按 typed failure 终止；
- receipt 中的 platform、runtime、尺寸和设备环境必须来自真实 session 观测，敏感 device identity 只保存脱敏摘要。

### 3. Local Service 拥有 provider 生命周期

- Core 定义 provider-neutral Contract、Review Profile、风险选择、状态和 reducer；
- Local Service 启动和关闭官方 MCP 子进程，完成 initialize、`tools/list`、DTD connect、调用超时、重试和 session 失效；
- Flutter adapter 负责把官方工具响应转换为 PB Target observation；
- ProtoBridge MCP 继续只暴露稳定的 PB Tools，不向 Agent 代理官方 MCP 完整工具表面；
- MCP Server 不再先执行 Runtime provider 再向 Local Service 自报 runner receipt；
- Target query/validation 保持只读，并与 Runtime provider 及 Source Evidence 分离。

### 4. Runtime proof 必须绑定真实 App build

仅连接到某个 Flutter App 不能证明它对应固定 Target revision。Flutter Target 必须提供 debug-only runtime identity：

```text
targetCommit
targetContentDigest
appBuildDigest
applicationIdentity
reviewHarnessVersion
```

identity 可以通过受控 build manifest、Dart define 或同一 App 上的 debug-only service extension 暴露，但不能由 Agent 参数自述。缺少 identity 或与 Review 固定 Target 不一致时返回 `unverified` 或 `environment-drift`，不得生成成功 Runtime receipt。

### 5. Target 只保留声明式 Case binding

官方 MCP 不理解 PB Case、Region 或 Scenario identity。Target 可以声明：

- Case 对应的 route、fixture、variant/state seed；
- prepare/reset 的受控 debug harness 入口；
- Region 对应的 ValueKey、Semantics label、text 或其它可验证 finder；
- Action 对应的 finder、输入和必要 wait policy；
- Runtime identity 与 harness version。

这些声明只能表达数据和绑定，不得包含任意 shell command，也不能作为第二个 Runtime provider。Provider 执行前先读取 Widget tree，不根据源码命名猜 finder。

### 6. OCR 是 PB 的可选后处理，不是官方 MCP 能力

- 官方 MCP 负责提供来自真实 App 的 Screenshot；
- pixel diff、overlay、OCR、文字 bbox、裁切和遮挡诊断由 PB 对固定 Screenshot artifact 执行；
- Expected text 来自固定 Source semantic Evidence，不使用 Source Screenshot OCR 覆盖已知文字；
- OCR 首期保持 diagnostic，不成为五维之外的综合评分；
- 低 confidence 或环境不可比较时保持 `unverified`。

## 目标架构

```text
Coding Agent
  -> ProtoBridge MCP
      -> fixed Evidence tools
      -> provider-neutral Review tools
          -> Local Service authoritative Review boundary
              -> Core Review Policy / Profile / Reducer
              -> Flutter RuntimeProvider
                  -> official Dart and Flutter MCP server
                      -> DTD attach to an already running App
                      -> Widget Inspector / runtime errors
                      -> Flutter Driver screenshot / tap / input / scroll
                  -> fixed provider/session/app/build receipts
              -> Code/Semantic verifier
                  -> Target adapter / Dart occurrence validation
              -> artifact compare / optional OCR diagnostic
```

架构中不存在固定设备 provider，也不存在 launcher fallback。

## 官方 MCP 当前能力基线

官方 server 仍为 Experimental，以下只作为 2026-08-18 的调研基线。实现必须以每次真实 initialize 和 `tools/list` 为 authority，不把工具名或响应形状写死进 Core 持久 Schema。

| 官方能力 | PB 用途 | 限制 |
| --- | --- | --- |
| `dtd`：list/connect/list apps/disconnect | 发现并绑定已经运行的 App | debug/profile App 必须注册到 DTD；多 App 必须消歧 |
| `vm_service` | 在已绑定 App isolate 上调用受控 identity/prepare/observe debug extension | extension 必须返回 observation contract v1，且不能由 Agent 参数自述 identity |
| `widget_inspector` | 读取真实 Widget tree 和 finder 候选 | 不能凭 Widget 类型猜 PB Region、parent 或 expected |
| `flutter_driver_command:screenshot` | 生成 Target Screenshot artifact | 移动/桌面 App 必须启用 Flutter Driver extension |
| `tap` / `enter_text` / `scroll` / `scrollIntoView` | 回放 Scenario Action | finder 必须来自真实 tree 与声明式 binding |
| `waitFor*` / `get_text` / `get_offset` / diagnostics tree | settle 与局部 observation | 结果仍需映射到 PB typed observation |
| `get_runtime_errors` | Runtime error gate | 必须绑定同一 App session 和执行窗口 |
| `hot_reload` / `hot_restart` | 实施期 diagnostic | 不构成验收成功证明 |

Flutter Driver text-entry emulation 会影响真实键盘输入；关闭 emulation 后 Agent `enter_text` 不可用。Provider 必须记录实际模式。Web 不使用本 Flutter RuntimeProvider，未来由独立 Web/browser provider 处理。

## 双轨验收

### Track A：Code/Semantic Review

该轨道与目标 Runtime 技术解耦，复用固定 Handoff、五维 obligations 和公共 Target 门面：

- 检查目标规范、mapping、源码 occurrence、owner 和 slot；
- 检查声明的 route、fixture、state、Action 和 Case binding；
- 保留 `resolved/candidate/stale/conflict/unresolved/unsupported`；
- 只对具有相应 code authority 的结论记录 code-level matched；
- 对无法从代码证明的 Runtime 结果记录 `runtime-unverified`，不伪造成功 receipt。

### Track B：Flutter Runtime/Visual Review

该轨道只接受同一官方 MCP session、同一运行 App 和同一 build identity 的观测：

- App attach 与 capability handshake；
- Case prepare/reset；
- Widget tree 和 runtime error；
- Target Screenshot；
- tap、input、scroll、wait；
- pre/post observation 和 visible result；
- artifact compare；
- 按风险启用 OCR、文字 bbox、裁切和遮挡诊断。

两条轨道分别报告结果。Code Review 不能替代 Runtime/Visual 成功，Screenshot 或 OCR 也不能替代五维 code/semantic obligations。

## 分级 Target Review

Review Profile 由 Core 根据固定 Handoff、目标变更范围、mandatory risks、Case/Scenario 形状和既有 Review 结果确定。Agent 可以请求升级，不能自行降级或删减 Core 选中的范围。

### L1 Quick Target Check

默认用于局部、低风险实现：

- 对当前变更范围执行五维 Code/Semantic Review；
- 每个变更 Screen 至少运行 baseline Case；
- 查看一份真实 Target Screenshot、Widget tree 和 runtime errors；
- 按最大风险最多增加一个主题、窄屏、Overlay、关键状态或主要 Scenario；
- 默认不机械执行完整 Case 矩阵；
- Runtime 成功结果记录为 `quick-checked`；
- 发现实质问题、Runtime error 或无法解释的 diff 时升级到 L2，不无限修正。

### L2 Focused Target Gate

以下情况至少进入 L2：用户不满意、L1 发现问题、共享 DS/Theme/导航、核心旅程、复杂 Overlay、键盘输入、滚动、数据可视化、多 Screen 或关键状态转换。

- Core 按实际风险选择三至五个 Case；
- 覆盖相关默认/关键状态、Scenario、主题或窄屏，而不是穷举笛卡尔积；
- 运行相关 Screenshot、交互、pre/post observation、runtime errors 和 artifact compare；
- 文字风险存在时执行 OCR/文字 bbox diagnostic；
- 实质缺陷未关闭时不得记录 `focused-accepted`。

### L3 Full Target Audit

只在用户明确要求、最终批次、发布验收或产品风险要求时执行：

- 全部 Handoff Case；
- 全部不同 Screenshot digest；
- 全部 required Scenario；
- 全部五维 obligations；
- 声明范围内全部 Runtime/Visual receipts；
- 必要的 OCR/文字完整性 diagnostic；
- 只有 L3 可以进入现有 `completed`，并同时记录 `fully-audited`。

### Profile 升级规则

- 用户明确要求 Full、最终批次或发布验收：L3；
- shared DS、Theme、导航、核心旅程、多 Screen：至少 L2；
- 输入、键盘、复杂 Overlay、滚动或关键状态转换：至少 L2；
- L1 出现 runtime error、明显 diff、裁切、遮挡、不确定 observation 或重复失败：L2 或 `needs-human`；
- 局部组件/Token 修改且 baseline Runtime 无异常：L1；
- MCP 不可用不是升级理由，而是结束 Runtime Track 并报告未验证。

## Provider session 与 receipt

### Capability handshake

每次 session 至少固定：

```text
providerId
providerVersion
protocolVersion
serverCommandDigest
availableTools
dtdCapability
vmServiceCapability
driverCapability
inspectorCapability
screenshotCapability
interactionCapability
runtimeErrorCapability
unsupportedReasons
sessionStartedAt
```

官方 server 版本、protocol 或 tool inventory 改变时，旧 session 必须显式失效。

### App/environment receipt

来自真实 App 和实际观测的字段包括：

```text
applicationIdentity
targetCommit
targetContentDigest
appBuildDigest
platform
runtimeOrOsVersion
logicalSize
pixelSize
dpr
orientation
locale
theme
textScale
safeArea
fontEnvironment
providerFingerprint
sessionIdentityDigest
textEntryEmulation
settlePolicy
systemChromePolicy
```

无法可靠观测的字段保留 `unknown`，不得从目标配置伪造。UDID、序列号、设备名称和 DTD/VM service URI 不进入普通 MCP projection。

### Operation receipt

每个 render/scenario operation 至少绑定：

- `reviewRunId`；
- Review Profile 和固定 selection；
- `caseId`、Screen、Scenario、Action 和 Checkpoint；
- Target revision、content digest 和 app build；
- provider/session/application identity；
- 实际调用的 capability；
- started/finished time、attempt ordinal、timeout 和退出状态；
- Screenshot/blob digest、尺寸和 MIME；
- interaction command 与 typed pre/post observation；
- runtime errors；
- unknown、unsupported、disconnect 和 environment drift。

Agent 自述“已经连接、截图或点击成功”不能代替 receipt。

## 有界重试与终止

Provider operation 使用最多三次总尝试，初次调用计为第一次。Provider retry 与现有视觉修正 round 是两个独立概念，不能共用计数。

### 可重试错误

- MCP request timeout；
- 官方 MCP 子进程在调用期间异常退出；
- 已建立的 DTD/App session 短暂断连；
- App 正在启动且尚未完成 DTD 注册；
- 明确标记为 transient 的 Driver command failure。

### 不可重试错误

- 没有运行中的 App，经过一次有界 rediscovery 仍为空；
- 多个 App 且声明式 identity 无法唯一选择；
- Flutter Driver extension 未启用；
- 必需 Tool/capability 缺失；
- App build、Target revision 或 content digest 不一致；
- protocol/Schema 不兼容；
- 平台不受支持；
- 用户取消或 Review 已失效。

### 失败事件与最终状态

每次失败必须先写入 append-only event：

```text
provider-call-failed
operationId
attemptOrdinal
errorCode
retryable
providerFingerprint
sessionIdentityDigest
startedAt
finishedAt
detailDigest
```

第三次仍失败或遇到不可重试错误时：

- 写入 terminal failure receipt；
- 停止当前 Runtime operation，不由 Agent 从第一次重新开始外层循环；
- Review Runtime Track 进入 `runtime-unverified`、`provider-unavailable` 或 `needs-human`；
- 保留并报告 Code/Semantic Track；
- 禁止产生 `quick-checked`、`focused-accepted` 或 `fully-audited`；
- 不回退 target-defined launcher、随意截图、Web/桌面替代或其它设备。

## Review 状态与完成语义

目标状态需要区分轨道与覆盖级别：

```text
codeReviewStatus:
  pending | reviewed | deviation | unverified

runtimeReviewStatus:
  not-applicable | pending | verified | unavailable | unverified | needs-human

coverageProfile:
  l1-quick | l2-focused | l3-full

reviewOutcome:
  code-reviewed
  quick-checked
  focused-accepted
  fully-audited
  needs-focused-review
  runtime-unverified
  invalidated
```

现有 `completed` 只允许：

```text
coverageProfile = l3-full
codeReviewStatus = reviewed
runtimeReviewStatus = verified
reviewOutcome = fully-audited
```

L1/L2 的结果必须保留固定选择范围、排除项和升级理由，不能描述成全 Case authoritative completion。

## 对外 Tool 边界

ProtoBridge MCP 保留 provider-neutral 名称，并在返回中加入 Profile、双轨状态和失败信息：

- `inspect_target_readiness`：同时返回 Code authority、Flutter Runtime provider readiness 和推荐 Profile；
- `start_target_review`：固定 Core 选择的 Profile 与分母；
- `read_target_review`：分别投影 code/runtime/visual 状态；
- `render_target_case`：只通过 Local Service 的官方 MCP provider；
- `replay_target_scenario`：只通过同一 App/session 执行；
- `compare_target_artifacts`：继续 provider-neutral；
- `verify_target_claims`：区分 code receipt 与 runtime receipt authority；
- `read_review_obligations`：按 Profile、Screen、维度和 assessment 状态读取；
- `record_review_assessments` / `record_review_findings`；
- `finalize_target_review`：只对 L3 Full 保留完整完成语义。

不向 Agent 暴露官方 MCP 的 DTD URI、VM service URI、设备敏感 ID 或原始完整工具表面。

## 实施 Tranche

### Tranche 0：真实能力 Spike 与 Contract 冻结

- 使用仓库真实 Flutter App 验证 DTD attach、Widget tree、Screenshot、tap/input/scroll 和 runtime errors；
- 验证真机或用户当前实际运行设备，不建立 canonical Simulator；
- 验证 Flutter Driver extension、text-entry emulation 和 debug-only build identity；
- 记录真实 initialize、`tools/list` 和响应差异；
- 固定 provider-neutral capability、typed failure、session 和 operation receipt Schema；
- 给出 go/no-go 报告；官方 MCP 无法产生可信 Screenshot/interaction 时不进入后续实现。

### Tranche 1：Local Service attach-only Provider

- 在 Local Service 实现受控 MCP stdio client；
- 实现 initialize、tool discovery、DTD discovery/connect、App identity selection、session invalidation 和关闭；
- 不启用或调用 device lifecycle tools；
- 实现最多三次总尝试、typed failure、timeout 和 terminal receipt；
- provider version、capability 或 App identity 改变时使旧 session 失效。

### Tranche 2：真实 Screenshot 与 Scenario

- 将 `render_target_case` 切换为官方 MCP Screenshot；
- 实现声明式 Case prepare/reset 和 finder binding；
- 将 tap、input、scroll、wait 映射到 required Scenario Action；
- 采集 Widget tree、runtime errors、pre/post observation 和 visible result；
- 固定 Target revision/content digest/app build/provider/session/artifact；
- 删除 `ios-simulator`、device UDID、launcher command 和 Runtime stdout JSON fallback。

### Tranche 3：分级 Review 与双轨状态

- 在 Core 实现 L1/L2/L3 Profile selector 和升级原因；
- Review seed 固定 Profile、selected Cases/Scenarios/obligations 和排除原因；
- reducer 分别维护 Code/Semantic 与 Runtime/Visual 状态；
- L1/L2 不能进入现有 completed；
- MCP 最终失败保留 code-only outcome 并阻止 Runtime success；
- 更新 progressive Review projection，避免默认注入全量 obligations。

### Tranche 4：Visual diagnostic 与真实 E2E

- 在可信 Target Screenshot 基础上保留 diff/overlay；
- 按风险加入 OCR、文字 bbox、裁切和遮挡 diagnostic；
- 覆盖中文、英文、数字、混排、换行、截断、遮挡、浅色/深色和低 confidence；
- 完成一个真实 Handoff 的 L1、L2 和 L3 对照验收；
- L3 通过后归档完整可恢复 receipt；
- 同步 MCP、Local Service、Target、Agent 消费和目标工程操作文档。

## 验证计划

### Provider 与 session

- initialize、`tools/list`、未知/缺失 Tool、版本变化和 protocol 不兼容；
- 没有 DTD、没有 App、多个 App、App identity 不匹配；
- Flutter Driver 未启用、text-entry mode 不一致；
- timeout、disconnect、MCP 进程退出和 session 漂移；
- 第一次成功、重试后成功、第三次失败和不可重试立即退出；
- Local Service 重启后的 session invalidation 和 event log 恢复。

### Target 与 artifact

- Target HEAD、tracked/untracked content digest 和 app build 一致；
- 执行期间 Target/App build 漂移时阻断；
- Screenshot digest、MIME、尺寸、DPR、orientation 和环境 unknown；
- 同一 Case 不能混用不同 App/session/build artifact；
- tap/input/scroll 与 Action、Scenario、Checkpoint 一致；
- runtime error 时间窗口与 operation 绑定；
- OCR 低 confidence、文字裁切、遮挡和不可比较环境保持 diagnostic/unverified。

### Profile 与 reducer

- Core 对相同输入稳定选择相同 L1/L2/L3 范围；
- Agent 不能删除选中 Case、Scenario 或 obligation；
- L1 发现风险后稳定升级 L2；
- 用户明确 Full 时固定 L3；
- L1/L2 不能完成为 `completed`；
- Runtime 失败保留 code-only 结果但阻止 visual success；
- L3 缺失任一 required code/runtime receipt 时不能完成。

### 迁移与回归

- 旧 Review event log 保持可读；
- 旧 `ios-simulator` / launcher contract 不用于创建新 Runtime Review；
- component/token occurrence verifier、Evidence projection、Store 和 Handoff 行为不回归；
- 无 Flutter adapter 时不启动官方 MCP，固定 Evidence 仍可消费；
- 不提交设备 ID、DTD URI、VM service URI 或 `.proto-bridge/store/`。

## 优先级与范围缩减

| 级别 | 范围 | 完成含义 |
| --- | --- | --- |
| P0 | 真实 App spike、attach-only 官方 MCP provider、App/build identity、有界重试、真实 Screenshot/Scenario receipt、L1/L2/L3 Contract | 新 Runtime Review 主链路成立 |
| P1 | Widget/runtime observation 增强、OCR/文字 bbox diagnostic、一个真实 Handoff 的 L3 E2E | 有证据的视觉增强与完整验收 |
| P2 | Web、Kotlin、Swift、React Native 等独立 RuntimeProvider | 后续 Roadmap |

若容量不足，依次延后 OCR benchmark、Widget tree 高级映射和 L3 真实业务归档。不得延后或削弱：

- 移除 launcher fallback；
- 移除固定 Simulator/UDID；
- App/build identity；
- 最多三次总尝试和 terminal failure；
- Local Service provider authority；
- L1/L2 不冒充 L3；
- MCP 失败时 Runtime 明确未验证。

## 风险与控制

- 官方 MCP 快速演进：每次 session 真实握手，以 provider adapter 和 fingerprint 隔离；
- 运行 App 与源码 revision 不一致：debug-only build identity 是成功 receipt 的硬前置；
- Flutter Driver extension 改变输入行为：记录 text-entry mode，并把键盘相关场景至少提升至 L2；
- Widget tree 不能直接表达 PB 语义：使用声明式 Case/Region/Action binding，不猜 Region 或 expected；
- 真机环境不完全可控：保留 unknown/environment drift，不用固定 Simulator 掩盖差异；
- MCP 不可用：有界失败后保留 code-only review，不回退不可信 Runtime provider；
- OCR 假阳性：只做 diagnostic，低 confidence 保持 unverified；
- 分级验收被滥用降级：Profile 和选择算法只存在于 Core，Agent 只能请求升级。

## Roadmap 退出标准

- 当前 PB/PBWork Evidence、Store、Handoff 和五维 obligation 基线保持通过；
- 新 Flutter Runtime Review 不再读取 `ios-simulator`、UDID 或 target-defined launcher；
- 官方 MCP provider 仅在 Flutter Target Review 时懒启动；
- Provider 可附着到已经运行的真实 Flutter App，并核对 App/build/Target identity；
- Screenshot、Scenario 和 runtime-error receipt 固定 Review、Profile、Case、Target、App、provider 和 session；
- timeout、disconnect、无 App 和 capability 缺失均有 typed failure、最多三次总尝试和 terminal receipt；
- MCP 最终失败后没有 fallback 或死循环，Review 明确输出 code-only + runtime-unverified；
- Core 可以确定性生成 L1/L2/L3 范围，且 L1/L2 不能冒充 L3 completed；
- 至少一个真实 Flutter Handoff 完成 L1/L2/L3 对照，L3 可恢复并完成全部门禁；
- OCR 保持可选 diagnostic，不替代五维义务或真实 Runtime receipt；
- 旧 Review 可读，新 Review 不接受旧 launcher contract；
- Schema、实现、测试、MCP README、Agent 消费指南、架构文档和 Target 文档已同步；
- `pnpm docs:verify`、`pnpm ds:target-sync:verify` 和 `pnpm verify` 通过。

## 相关资料

- [产品工作流](../product/workflow.md)
- [ProtoBridge 实现](../architecture/proto-bridge.md)
- [Flutter 官方：Dart and Flutter MCP server](https://docs.flutter.dev/ai/mcp-server)
- [Dart 官方实现：dart_mcp_server README](https://github.com/dart-lang/ai/tree/main/pkgs/dart_mcp_server)
- [Agent 消费指南](../guides/agent-consumption.md)
- [ADR 0007：高保真重建使用独立 Acceptance Contract](../decisions/0007-reconstruction-acceptance-contract.md)
- [Dart and Flutter MCP server](https://docs.flutter.dev/ai/mcp-server)
