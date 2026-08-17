# Roadmap：官方 Flutter MCP 与 Target 验收增强

状态：Planned

全局优先级：P0

日期：2026-08-17

目标投入：约两周，一个聚焦实施流

## Roadmap 定位

PB/PBWork 核心 Evidence v1 链路已经完成验收，并继续作为当前产品基线：

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

本 Roadmap 不重建 Capture、Store、Handoff 或五维验收语义。它补强当前最薄弱的 Target 执行层：让 ProtoBridge 可以通过官方 Dart and Flutter MCP server 稳定连接模拟器或真机、驱动目标 App、采集渲染 artifact，并将外部工具结果转换成 PB 自己的固定 Review receipt。

PBWork 原型生命周期、v1/v2 Release 和 Archive 属于独立的原型管理路线，不是本 Roadmap 的依赖，也不是 PB 核心闭环完成条件。见 [PBWork 原型生命周期与 Release 管理](./prototype-lifecycle-and-release.md)。

## 当前基线与缺口

### 已成立能力

- Capture 完全由 Core/Playwright 执行，并遵守 Capture Protocol v2；
- 每个 Case 固定 viewport、DPR、Theme、Variant、Fixture、Scenario 和 Checkpoint；
- Store 保存不可变 Run、revision、Snapshot、Screenshot 和 provenance；
- Handoff 固定 Workspace、Bundle、Snapshot、revision、范围和 mandatory risk；
- MCP 按 Handoff -> Screen Packet -> Case Delta/Detail -> Obligations 渐进供给 Evidence；
- Reconstruction Acceptance 固定 `structure`、`components`、`tokens`、`states`、`interactions` 五个维度；
- Target Review 已有 start/read/render/replay/compare/verify/assessment/finalize 工具与 append-only event log；
- 当前 Flutter adapter 可以调用目标仓库声明的 launcher、Structure/State/Scenario command；
- Review reducer 会阻止缺失 Screenshot、Scenario、verifier receipt、assessment 或存在 deviation/unverified 的完成请求。

### 当前缺口

- Flutter Target 执行依赖目标仓库自行声明 launcher，设备发现、连接和运行能力没有统一 provider；
- 当前 machine contract 固定 `ios-simulator`，Android 与物理设备尚未形成稳定 receipt；
- 真实业务验收记录尚未归档全 Case authoritative Target Review receipt；
- Screenshot compare 已存在，但实际文字是否进入像素、是否被裁切或遮挡还缺少稳定 verifier；
- Agent 可能直接调用外部 Flutter 工具，但 PB 无法仅凭 Agent 描述确认 Case、Target revision 和设备环境；
- 官方 Dart/Flutter MCP 仍为 Experimental，工具名、响应和能力可能演进。

## 产品目标

- 将官方 Dart/Flutter MCP 作为 ProtoBridge 的首要 Flutter Target runtime provider；
- 支持发现设备、连接或运行 App、截图、点击、输入、滚动、热重载和可用的 Widget/Runtime observation；
- 将每次外部执行绑定到固定 `reviewRunId`、`caseId`、Target revision、设备环境和 artifact digest；
- 保持 ProtoBridge MCP 的稳定产品工具，不向 Agent 暴露 provider 差异；
- 保留现有 target-defined launcher 作为 fallback provider 和回归基线；
- 首期稳定 iOS Simulator，随后验证 Android Emulator 和至少一种物理设备；
- 在稳定 Screenshot provider 之后加入 OCR/visual text diagnostic；
- 用一次真实 Handoff 完成全 Case authoritative Target Review 并归档 receipt。

## 非目标

- 不让官方 Flutter MCP 拥有 PB Evidence、Acceptance 或 Review completion 语义；
- 不把外部 MCP 的实验性 tool name 或响应形状写进 Core 持久 Schema；
- 不让 Target observation 回写 Source Evidence；
- 不用 Widget 类型猜测 Source parent、Region、component 或 expected state；
- 不把 Screenshot、OCR 或像素 diff 变成五维之外的综合评分；
- 不要求本期完成多型号真机农场、远程设备共享或云端 Review；
- 不因 provider 不可用而回退到无法证明环境的随意截图。

## 目标架构

```text
Coding Agent
  -> ProtoBridge MCP
      -> fixed Evidence and Review tools
      -> Local Service authoritative Review boundary
          -> TargetProvider interface
              -> DartFlutterMcpProvider
                  -> official Dart and Flutter MCP server
                      -> DTD / Flutter Driver / Widget Inspector
                      -> iOS Simulator / Android Emulator / Device
              -> TargetLauncherProvider (existing fallback)
```

ProtoBridge MCP 继续向 Agent 暴露稳定工具：

- `inspect_target_readiness`；
- `render_target_case`；
- `replay_target_scenario`；
- `compare_target_artifacts`；
- `verify_target_claims`；
- `read_target_review`；
- `finalize_target_review`。

Local Service 或 Target adapter 可以作为 MCP client 连接官方 server，但不代理其完整工具表面。Provider 只实现 PB 所需的稳定能力，并把输出转换成 Core 定义的 receipt。

## Provider Contract

### Capability handshake

每次 provider session 必须记录：

```text
providerId
providerVersion
protocolVersion
serverCommandDigest
availableTools
availableDevices
dtdCapability
driverCapability
inspectorCapability
screenshotCapability
interactionCapability
unsupportedReasons
```

能力发现必须来自实际握手和工具列表，不由 Agent 或配置文件猜测。官方 MCP 版本或 capability 改变时，旧 session 不得静默复用。

### Target environment

每个 render/scenario receipt 至少固定：

```text
platform
deviceProfile
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
targetCommit
targetContentDigest
appBuildDigest
providerFingerprint
settlePolicy
systemChromePolicy
```

物理设备 identity 必须脱敏或哈希，不把 UDID、序列号和用户设备名称写入普通 MCP projection。

### Artifact receipt

Screenshot 或 Scenario receipt 必须绑定：

- `reviewRunId`；
- `caseId`、Screen、Scenario 和 Checkpoint；
- Target revision 与 app build；
- provider session 和设备环境；
- 实际调用能力、开始/结束时间和退出状态；
- Screenshot/blob digest、尺寸和 MIME；
- interaction command 与 typed pre/post observation；
- unknown、unsupported、timeout、disconnect 和 environment drift。

Agent 自述“已经截图/点击成功”不能代替 provider receipt。

## 官方 MCP 能力映射

| 官方能力 | PB 用途 | PB 输出 | 限制 |
| --- | --- | --- | --- |
| DTD discovery/connect | 发现并绑定运行 App | provider session receipt | 连接漂移必须使 session 失效 |
| device discovery/run | 选择模拟器或真机并运行 App | Target environment receipt | 不把敏感 device ID 暴露给 Agent |
| screenshot | `render_target_case` | fixed Target artifact | 必须绑定 Case、revision 和尺寸 |
| tap/input/scroll | `replay_target_scenario` | typed interaction receipt | 不接受只有 exit code 的成功 |
| Widget Inspector/runtime tree | Structure/State observation 辅助 | Target observation | 不写回 Source，不猜语义映射 |
| hot reload | 实施期加速 | diagnostic event | 不构成验收成功证明 |

官方 Flutter MCP 使用 Flutter Driver 时存在输入模式和平台限制。Provider 必须显式记录是否启用了 text-entry emulation；不支持的 Web finder/screenshot 能力返回 `unsupported`，不伪装成移动端能力。

## 双轨验收边界

### Semantic Reconstruction Track

现有五维义务保持权威：

- `structure`：topology、顺序、scroll owner、positioning、shell；
- `components`：目标代码中的精确 occurrence；
- `tokens`：accessor、owner 和 named slot；
- `states`：typed shell、visible Regions、keyed collections 和 values；
- `interactions`：action、target、input、pre/post state、checkpoint 和 visible result。

### Rendered Artifact Track

Provider 增强 Screenshot、Scenario 和环境 receipt，但不替代五维 assessment。Rendered track 至少回答：

- Source Screenshot 是否已查看；
- Target Case 是否在声明环境真实渲染；
- Source/Target 是否可比较；
- required Scenario 是否真实回放；
- 文字是否实际进入像素；
- 是否存在裁切、遮挡或系统 UI 干扰。

两条轨道分别显示结果；任何一条不能替另一条宣称完成。

## OCR 与视觉文字

OCR 排在稳定 Target Screenshot provider 之后，首期只作为 diagnostic verifier。

Expected text 必须来自固定 Source semantic Evidence，不以 Source Screenshot OCR 覆盖已知文字。Target 观测顺序为：

1. Widget/semantics 中的结构化文字；
2. Target Screenshot OCR 的 glyph text 与 bbox；
3. 裁切、遮挡和边界关系；
4. 必要时人工视觉 assessment。

首期 benchmark 覆盖简体中文、英文、数字、混排、换行、截断、遮挡、浅色/深色主题和低 confidence。结果不稳定时保持 `unverified`，不升级为完成门禁。

## 两周实施计划

### Week 1：官方 MCP Provider 主链路

#### Day 1：能力盘点与固定边界

- 固定官方 server 启动方式、最低 Dart/Flutter 版本和 capability inventory；
- 记录实际 Tools、DTD、Driver、Inspector、Screenshot 和 device 能力；
- 固定 TargetProvider interface、typed failure 和 receipt Schema；
- 为现有 launcher provider 建立行为回归基线。

#### Day 2-3：MCP client 与 session 管理

- 在 Local Service/Target adapter 建立受控 MCP client；
- 实现启动、握手、工具发现、超时、重连和关闭；
- 实现 device discovery、App connect/run 和 DTD session 绑定；
- provider version/capability 改变时使旧 session 明确失效。

#### Day 4：Target Screenshot

- 用官方 MCP 实现 `render_target_case`；
- 固定 Target revision、设备环境、settle policy 和 artifact digest；
- 验证尺寸、DPR、safe area、locale、theme 和 system chrome；
- 与现有 launcher provider 对同一 fixture 做对照。

#### Day 5：Scenario replay

- 映射 tap、input、scroll 到 required Scenario Action；
- 采集 typed pre/action/post/visible-result receipt；
- 覆盖 driver 未启用、输入模拟差异、元素找不到和 session 断连；
- 保证外部成功响应不能绕过 PB obligation verifier。

Week 1 里程碑：同一固定 Case 可通过官方 MCP 在 iOS Simulator 生成 PB 可验证的 Screenshot 和 Scenario receipt。

### Week 2：验收权威、设备扩展与 E2E

#### Day 6：Inspector 与五维 verifier 衔接

- 读取可用 Widget/runtime observation；
- 映射到 provider-neutral Target observation；
- 保持 Source expected 与 Target observed 分离；
- 缺少 authority 的 Structure/State 继续返回 `unverified`。

#### Day 7：Provider negotiation 与 fallback

- `inspect_target_readiness` 展示 provider、版本、设备和能力；
- 首选官方 MCP，保留 target launcher fallback；
- fallback 发生时写明原因和实际 provider；
- 禁止回退 active/latest、未固定 revision 或无 receipt 截图。

#### Day 8：Android Emulator 与环境矩阵

- 验证 Android Emulator discovery、run、screenshot 和 interaction；
- 对比 iOS/Android 的尺寸、DPR、safe area、字体和 system chrome；
- 无法达到固定环境时输出明确 blocker，不降低 iOS 主线完成标准。

#### Day 9：真机与 OCR diagnostic

- 在设备可用时验证至少一种 iOS 或 Android 真机；
- 固定脱敏 identity、OS、尺寸、DPR、locale 和 app build；
- 运行 OCR fixture benchmark，产出 diagnostic receipt；
- 真机或 OCR 不稳定时形成 go/no-go 报告，不阻止 P0 完成。

#### Day 10：真实 Handoff authoritative E2E

- 选择一个已固定 Handoff 和 Flutter Target revision；
- 完成全 Case Screenshot viewed、Target render、Scenario replay 和 compare；
- 分页读取并核验五维 obligations；
- 完成 `finalize_target_review`，归档完整 receipt；
- 更新 MCP、Local Service、Target adapter、Agent 消费和操作文档。

Week 2 里程碑：至少一个真实业务 Handoff 通过官方 MCP provider 完成可恢复、可复核的 authoritative Target Review。

## 优先级与范围缩减

| 级别 | 范围 | 完成含义 |
| --- | --- | --- |
| P0 | iOS Simulator、官方 MCP handshake、Screenshot/Scenario receipt、provider negotiation、真实 Handoff E2E | 本 Roadmap 的承诺交付 |
| P1 | Android Emulator、Widget observation 增强、真机 proof、OCR diagnostic | 有证据的支持或 go/no-go 结论 |
| P2 | 多真机矩阵、OCR 正式 gate、远程设备、Web provider | 后续 Roadmap |

若两周容量不足，依次延后多真机、OCR gate、Android 正式支持和高级 Inspector 映射；不得削弱 P0 receipt 固定性、五维义务或现有 launcher fallback。

## 验证计划

- MCP handshake、未知 Tool、版本变化、超时、重连和进程退出；
- 设备不存在、离线、锁屏、权限失败和运行时漂移；
- Target commit/build 在执行前后漂移时阻断；
- Screenshot 尺寸、DPR、safe area、locale、theme 和 digest；
- tap/input/scroll 与声明 Action、Scenario、Checkpoint 一致；
- Provider receipt 与同一 Review/Case/Target revision 的可达性；
- 官方 MCP 不可用时 fallback 可见且不改变验收分母；
- 两条验收轨道分别汇总，缺失任一 required receipt 都不能完成；
- 真实 Handoff authoritative Review 可从 event log 恢复并再次验证。

## 风险与控制

- 官方 MCP 快速演进：用 provider adapter、capability handshake 和 fingerprint 隔离；
- MCP server-to-server 生命周期复杂：由 Local Service 管理单一受控 client session，不让 Agent 拼接协议；
- Flutter Driver 输入差异：记录 driver 配置并为 text input 建立 fixture；
- 真机不确定性：首期以 Simulator 为 canonical gate，真机只做附加 profile；
- OCR 假阳性：先 diagnostic，低 confidence 保持 unverified；
- MCP 表面膨胀：PB 只暴露稳定 Review 工具，不代理外部完整工具表。

## Roadmap 退出标准

- 当前 PB/PBWork Evidence 基线保持通过；
- 官方 MCP provider 可稳定发现、连接并驱动 iOS Simulator App；
- Screenshot 和 Scenario receipt 固定 Review、Case、Target revision、provider 与设备环境；
- `render_target_case`、`replay_target_scenario` 和 readiness 对 Agent 保持 provider-neutral；
- 现有 launcher provider 继续可用并具有明确 fallback receipt；
- 五维 semantic obligations 没有被 Screenshot、OCR 或外部 MCP 替代；
- 至少一个真实 Handoff 完成全 Case authoritative Target Review 并归档；
- Android、真机和 OCR 均有明确支持状态或 go/no-go 报告；
- Schema、实现、测试、MCP README、Agent 消费指南和 Target 文档已同步。

## 相关资料

- [产品工作流](../product/workflow.md)
- [ProtoBridge 实现](../architecture/proto-bridge.md)
- [Agent 消费指南](../guides/agent-consumption.md)
- [ADR 0007：高保真重建使用独立 Acceptance Contract](../decisions/0007-reconstruction-acceptance-contract.md)
- [Dart and Flutter MCP server](https://docs.flutter.dev/ai/mcp-server)
