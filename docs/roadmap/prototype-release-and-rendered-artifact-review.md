# Roadmap：原型 Release、定稿采集与渲染产物验收

状态：Planned

日期：2026-08-17

目标投入：约两周，一个聚焦实施流

## Roadmap 定位

PB/PBWork 核心 Evidence 工作链路已经完成验收，并继续作为当前产品基线。本 Roadmap 记录基线之上的可选演进，不把现有产品重新定义为未完成，也不建立新的现行 Block。只有某项能力完成 Schema、实现、测试和权威文档同步后，它才成为正式 Contract。

两周是当前的规划估算，不是对所有探索项的完成承诺。Release、Finalization 和双轨 Review 基础是主线交付；OCR、真机和 Dart/Flutter MCP 集成先以可行性验证和稳定 provider 边界为目标，未达到门槛时进入后续 Roadmap，不影响当前基线或主线完成。

本计划解决四个相互关联的问题：

- PBWork 的原型生命周期目前只是本地工作台状态，没有与 Core Capture、Store、Handoff 或不可变版本绑定；
- 日常局部采集与正式定稿采集共用入口，但缺少“定稿即固定全原型 Release”的产品语义；
- 五维 Reconstruction Acceptance 已正式存在，渲染截图也进入 Review，但两者尚未被清晰建模为独立且共同呈现的验收轨道；
- Flutter Target Review 当前只接受 iOS Simulator，缺少 Android、真机、视觉文字核验和可替换运行 provider。

## 当前基线

本 Roadmap 建立在以下已验收的现行事实之上：

- 一个 Bundle 表示一个 Prototype 的长期 Evidence lineage；Run、revision、Snapshot、Catalog 和 Handoff 均不可变；
- Capture Scope 允许 Screen 或稳定 Fragment 集合，整个 Prototype 入口最终也会展开为显式 Selection；
- Core/Playwright 使用 Runtime Capture Protocol v2 固定 Case 并采集 Semantic Snapshot 与 Screenshot；
- Handoff 固定 Workspace、Bundle、Snapshot、revision、风险和实现范围；
- MCP 使用固定渐进投影，禁止在 Handoff 消费时回退 active/latest；
- Reconstruction Acceptance 具有 `structure`、`components`、`tokens`、`states`、`interactions` 五个维度；
- Authoritative Review 已要求 Screenshot viewed、Target render、Scenario replay 和逐项 obligation assessment；
- PBWork 的 `active/review/final/archived` lifecycle override 当前只写 localStorage，可逆且不改变 Registry、Store 或 Runtime；
- Flutter Review machine contract 当前固定为 `ios-simulator`，Target render 由目标仓库声明的 launcher command 产生。

## 目标

### 产品目标

- 一个业务原型在 PBWork 中始终只有一个稳定 Prototype identity；
- 同一 Prototype 可以产生 `v1`、`v2` 等多个不可变 Release，而不是复制成多个顶层 Prototype；
- “确认定稿”成为一次受控 Finalization，而不是单纯修改列表状态；
- Finalization 自动准备整个 Prototype 的采集范围，在用户确认实际 Case Matrix 和风险后完成 Capture、Handoff 与 Release 提交；
- 已创建 Release 永远不能原地修改；后续变更进入新的 Working Draft，并产生下一个 Release；
- Archive 作用于稳定 Prototype/Bundle lineage，停止新的生产操作，但保留全部 Release、Snapshot、Handoff 和 Review 可读。

### 可信目标

- Release 同时固定源码版本、Runtime input version、Capture profile、Snapshot、Catalog 和 Handoff；
- 五维语义核验与渲染产物核验分别给出结果，任一轨道不能替代另一轨道；
- 真机或模拟器产生的 Target artifact 必须固定设备环境、目标源码状态和执行工具版本；
- OCR 只验证实际渲染文字，不替代 Source semantic text、Target semantics 或人工视觉判断；
- Flutter 官方 MCP 可以作为运行能力 provider，但不能成为 ProtoBridge 产品语义或持久 Contract 的所有者。

### 非目标

- 不删除 Screen、Fragment 或自定义 Selection；它们继续服务日常检查、局部重采、故障定位和容量控制；
- 不把 Component 变成独立 Capture lineage；组件与 Token 仍通过 Catalog 和页面语义节点进入 Evidence；
- 不让 PB 自动修改或提交用户 Git 工作树；
- 不把 OCR、像素差异或模型视觉判断变成综合分数；
- 不把 Target 扫描事实写回 Source Evidence；
- 不让 MCP 代理或复制 Dart/Flutter MCP 的全部工具表面。

## 产品模型

```text
Prototype identity: hengdong
└─ Bundle: one long-lived Evidence lineage
   ├─ Working Draft
   ├─ Release v1
   │  ├─ pinned source revision
   │  ├─ release capture profile
   │  ├─ Snapshot + Catalog refs
   │  ├─ Handoff
   │  └─ acceptance contracts
   ├─ Working Draft derived from v1
   ├─ Release v2
   └─ archived lineage
```

### Prototype identity

Prototype identity 继续来自 PBWork Registry 中的稳定 `prototypeId`。Screen、Variant、Fragment、Action 和 Scenario identity 不包含 Release number，也不使用 `_v1`、`_v2` 后缀。

稳定 identity 允许：

- 同一 Screen 在 Release 间比较和判定 staleness；
- Case identity 在相同规范化维度下保持可复算；
- MCP、Target mapping 和业务文档不因版本号重复注册；
- PBWork 顶层列表只展示一个 Prototype，Release 在详情中按时间和版本展开。

### Prototype Release

新增 Core 所有的不可变 `PrototypeRelease` 对象。建议字段如下，最终以可执行 Schema 为准：

```text
releaseId
workspaceId
bundleId
prototypeId
releaseNumber
sourceRevision
runtimeInputVersion
captureProfileId
selectionDigest
runId
snapshotId
catalogRevisionIds
handoffId
acceptanceContractDigest
createdAt
```

不在 `PrototypeRelease` 上原地修改状态。Release 只在 Finalization 全部完成后一次性创建。失败的准备、Preflight 或 Capture 只留下相应 Job、Run、Attempt、Issue 和诊断，不创建半成品 Release。

Release number 由 Core/Store 在单 writer 边界内按 Bundle 原子分配。CLI、PBWork 和 MCP 不自行计算“下一个版本”。

### Working Draft

Working Draft 表示当前可编辑源码头，不是 Store Evidence 对象，也不复用 Release ID。它可以记录“基于哪个 Release 继续编辑”，但不能修改被引用 Release 的任何固定对象。

当用户从已定稿版本继续修改时，PBWork 表达为“基于 v1 创建下一版草稿”，而不是把 v1 退回 `review`。

## 生命周期与 Finalization

建议的用户可见生命周期：

```text
active -> review -> finalizing -> final
   ^         |          |
   |         v          v
   +------ active     blocked

final -> next working draft -> review -> finalizing -> next release
final -> archived
```

`finalizing` 和 `blocked` 是执行状态，不是可由 PBWork 自行保存的本地标签。Core 是状态、风险和 Finalization 结果的唯一语义来源。

### Finalization 流程

一次“确认定稿”按以下顺序执行：

1. 解析并固定待发布源码 revision；
2. 从该 revision 启动或连接确定性的 PBWork Runtime；
3. 读取 Runtime manifest、input version、Catalog 输入与 authoring diagnostics；
4. Core 按 Release Capture Profile 展开整个 Prototype 的显式 Selection Draft；
5. 执行 Preflight，固定 warning、risk、Case Matrix 和有效期；
6. PBWork 展示实际 Screen、Variant、Scenario、Theme、Device、Fixture、Case 总数和所有 warning；
7. 用户明确确认启动，并逐项接受允许继续的 warning；Block 不可绕过；
8. Core/Playwright 执行隔离 Capture Job；
9. Store 提交 Run、revision、Snapshot、Catalog、Issue、Coverage 和 Blob；
10. 运行 Staleness 与 Release completeness 检查；
11. 创建固定 Handoff 和两类 Acceptance Contract；
12. Store 原子创建 `PrototypeRelease` 并分配 release number；
13. PBWork 切换到 `final`，展示 Release receipt、Snapshot、Handoff 和风险摘要。

任一步失败时：

- 不创建 Release；
- 不把 Prototype 宣称为 final；
- 不覆盖旧 Release 或旧 active Evidence；
- 保留失败 Attempt、Issue 和可恢复的 Job 信息；
- 允许用户修复源输入后重新 Finalize，但新的执行产生新的 Job/Run。

### 显式确认边界

“自动定稿采集”表示 Finalization 自动生成全原型 Selection、Preflight 并编排后续步骤，不表示无提示后台执行。用户仍需看到 Case Matrix，并对启动、warning 和 mandatory risk 做明确确认。

这保留了现有容量、风险和授权边界，同时把手动逐页选择从正式定稿主路径中移除。

## Release Capture Profile

Finalization 不直接使用任意临时 Selection，而使用 Core 定义并版本化的 `ReleaseCaptureProfile`。建议首个 profile 为 `mobile-standard-v1`。

建议规则：

- 选择 Prototype 下所有注册且未废弃的 Screen；
- 选择所有注册 Variant；
- 选择所有 required Scenario，并显式报告未纳入的非 required Scenario；
- 选择 profile 声明的 Theme 集合，首期默认一个正式主题；
- 选择 profile 声明的 Fixture 集合，禁止从 Workbench 临时状态推断；
- 使用 Core 注册的 canonical mobile device；首期保持逻辑尺寸 `390 x 844`、DPR `3`；
- Screen scope 使用 authored required boundary，必要时允许完整 Screen scope；
- 展开结果仍持久化为显式 ID 集合，不把字符串 `all` 写入 Draft、Run 或 Release；
- 超过 `capture.maxCases` 时阻止 Finalization，不静默抽样或拆分验收分母。

后续可以增加 `multi-theme-v1`、`release-critical-scenarios-v1` 等 profile，但 profile 必须由 Core Schema、版本和文档拥有，PBWork 只选择或展示它。

## 源码冻结与可复现性

Release 不仅要固定 Evidence，还要固定产生 Evidence 的源码。正式 Finalization 建议要求：

- `sourceRevision` 指向可解析的 Git commit；
- 正式 Finalization 不接受未提交源码作为可复现 Release 输入；
- PB 不自动执行 Git commit；用户或上层 Agent 负责先准备 revision；
- Capture Runtime 必须从该 revision 的隔离 worktree 或等价只读构建产物启动；
- Preflight 和 Capture 前后都校验 Runtime input version 与 source revision 未漂移；
- Release receipt 记录 commit、Runtime build digest、input version 和 Capture toolchain fingerprint。

如产品决定允许 dirty worktree，必须另行选择并实现一种可恢复机制，例如保存完整 patch 与 untracked bytes 的不可变 source artifact。仅记录 content digest 不足以恢复旧源码，因此不能单独满足“旧版本不可修改且可复现”。

## 双轨验收模型

最终交付采用两个独立结果，不创建综合分数：

```text
Semantic Reconstruction Track
  structure / components / tokens / states / interactions

Rendered Artifact Track
  source viewed / target rendered / environment / visual compare /
  visual text / clipping and occlusion / scenario artifact
```

### Semantic Reconstruction Track

现有五维 Reconstruction Acceptance Contract 保持权威，不加入 `visual` 或 `ocr` 第六维。

- `structure` 继续验证 topology、顺序、scroll owner、positioning 和 shell contract；
- `components` 继续验证目标工程精确 occurrence；
- `tokens` 继续验证 accessor、owner 和 named slot；
- `states` 继续验证 typed shell、visible Regions、keyed collections 和 values；
- `interactions` 继续验证实际 action、input、pre/post state、checkpoint 和 visible result。

### Rendered Artifact Track

新增独立 `RenderedArtifactAcceptanceContract`，由固定 Handoff 和 Release Capture Profile 确定性派生。建议每个 selected Case 包含：

- Source Screenshot digest 与尺寸；
- 目标运行环境要求；
- Target render requirement；
- 可比性要求与允许的 normalization；
- visual text requirements；
- required Scenario artifact；
- 支持的 verifier authority；
- 未支持时必须返回的 `unverified` 原因。

Rendered Artifact obligation 使用独立 status：`matched`、`deviation`、`unverified`、`not-applicable`。`not-applicable` 仍只允许 operator/human 基于明确 Target 依据确认。

Authoritative Review 完成时必须同时满足：

- 所有五维 semantic obligations 有合法 assessment；
- 所有 required rendered artifact obligations 有合法 assessment；
- 所有 Source Screenshot 已通过 MCP ImageContent 查看；
- 所有 required Target Case 已在固定 Target revision 和声明设备环境下渲染；
- 所有 required Scenario 已回放；
- 不存在 open Critical/Major finding；
- 不存在 `deviation`、`unverified` 或缺失 receipt；
- operator/human 提交最终确认事件。

## OCR 与视觉文字核验

OCR 是 Rendered Artifact Track 的 verifier，不是 Source Evidence 的补全器，也不是第五维以外的新语义维度。

### Expected 来源

视觉文字的 expected 必须来自固定 Source semantic Evidence：

- Runtime semantic node 的实际 text；
- authored state/fixture 中的稳定业务 key；
- required Fragment 与 bbox；
- 对应 Case、Variant 或 Checkpoint。

不得以 Source Screenshot OCR 结果覆盖 Runtime 已知文字。Source OCR 只可用于诊断像素中的裁切、漏字或字体渲染问题。

### Target 观测顺序

Target visual text verification 按以下优先级组合证据：

1. Flutter semantics/widget inspector 的结构化文字与可见性；
2. Target Screenshot OCR 的实际 glyph text 与 bbox；
3. Screenshot clipping、occlusion 和边界关系；
4. 必要时的人工视觉 assessment。

Semantics 能证明节点声明的文字，OCR 能证明文字实际进入像素，两者不能互相替代。例如 semantics 中存在但被裁切的文字必须形成 deviation，而不是 matched。

### OCR receipt

建议 `VisualTextReceipt` 至少记录：

```text
engineId
engineVersion
languageSet
normalizationVersion
caseId
targetArtifactDigest
regionId
expectedText
observedText
observedBoxes
confidence
clipped
occluded
status
unknownReason
```

文字 normalization 必须版本化并限制在 Unicode normalization、换行、空白和明确标点策略。不得使用模糊语义相似度把错字、漏字或业务数字差异判为 matched。

OCR 首期只覆盖 required text-like Evidence Regions。低 confidence、未知语言、复杂自定义字体、图标字体或无法稳定定位时返回 `unverified`，不能猜测通过。

### OCR 引擎选择门禁

在 OCR 变成完成门禁前，必须用仓库固定 fixture 建立至少以下基准：

- 简体中文、英文、数字和混排；
- 正常、截断、换行、缩放和遮挡；
- 浅色/深色主题；
- iOS Simulator、Android Emulator 和至少一种物理设备；
- confidence calibration、假阳性和假阴性报告；
- 引擎版本升级后的可重复性。

基准未达到可接受阈值时，OCR receipt 只产生诊断，不得阻止完成；但缺少视觉文字 authority 必须保持可见。

## Target 平台与设备模型

将 Flutter Review contract 的单一 `ios-simulator` 扩展为 provider-neutral platform：

```text
ios-simulator
ios-device
android-emulator
android-device
```

每次 Target render receipt 至少固定：

- platform 与 provider version；
- device profile、运行时/OS、逻辑尺寸、像素尺寸和 DPR；
- orientation、locale、theme、text scale、safe area 和字体环境；
- app build digest；
- Target commit 与 tracked diff/untracked content digest；
- settle policy、截图命令 digest 和退出状态；
- 是否包含 system chrome；
- 经过脱敏或哈希的物理 device identity。

物理设备不得直接把敏感 UDID、序列号或用户设备名称写入 Handoff、Delivery 或普通 MCP projection。

Source 与 Target 尺寸不一致时默认不可直接 pixel compare。允许的 resize、safe-area crop 或 color-space normalization 必须由版本化 comparator profile 声明，不能由 Agent 临时决定。

## Flutter 官方 MCP 的复用边界

Dart and Flutter MCP server 当前提供 DTD 连接、设备发现、运行 App、Flutter Driver command、Widget Inspector、截图、点击、输入、滚动和 hot reload。它可以成为 Target runtime provider，但保持以下边界：

- ProtoBridge MCP 继续暴露稳定的产品工具，如 `render_target_case`、`replay_target_scenario` 和 verifier；
- Agent 不需要知道某次 render 由 target launcher、Flutter CLI、DTD 还是 Dart/Flutter MCP 完成；
- provider 必须把外部结果转换成 ProtoBridge 的固定 receipt，并绑定 Review、Case、Target revision 和 device environment；
- 外部 MCP 的实验性 tool name、响应形状和连接状态不进入 Evidence Schema；
- Dart/Flutter MCP 的 Widget Inspector 结果属于 Target observation，不写回 Source Evidence；
- provider 不得用 Flutter Widget 类型猜测 Source semantic parent、Region identity 或 expected state；
- provider 不可用时返回 typed `unsupported` 或 `unverified`，不得回退到无环境证明的随意截图。

首期保留当前 target-defined launcher command 作为稳定 provider，并将官方 Flutter MCP 集成放在 provider interface 稳定之后。

## MCP 演进计划

### 保持不变

- 标准 MCP JSON-RPC/stdio、Tools、Resources 和 Prompt 边界保持不变；
- Handoff 继续是默认消费入口；
- MCP 启动时继续固定 Workspace 与 generation；
- Evidence 继续只通过固定 Snapshot/revision/blob 可达性读取；
- Target query/validation 继续与 Capture Evidence 隔离；
- MCP 不创建 Capture Job，也不替 Agent 决定实现文件和框架。

### 现有工具扩展

- `inspect_evidence_workspace`：声明 Release、Rendered Artifact、OCR 和多平台 provider capability/version；
- `read_handoff_index`：返回可选 `releaseRef`、`captureProfileId` 和两类 Acceptance Contract 摘要；
- `read_screen_packet`：保持面向实施的紧凑投影，不注入完整 rendered obligations；
- `inspect_target_readiness`：增加 platform/provider、设备、visual text authority 和 rendered blockers；
- `render_target_case`：改为 provider-neutral，receipt 返回规范化 Target environment；
- `compare_target_artifacts`：绑定 comparator profile，并明确 comparable/unverified 原因；
- `read_target_review`：分别汇总 semantic coverage 与 rendered artifact coverage；
- `finalize_target_review`：Reducer 同时重算两条轨道的完成门禁。

### 建议新增工具

- `read_rendered_artifact_obligations`：按 Screen、Case、kind 和 assessment 状态分页读取渲染义务；
- `verify_target_visual_text`：运行 Target semantics + OCR verifier，返回固定 `VisualTextReceipt`；
- `read_release_index`：仅在用户需要按 Prototype/Release 浏览历史时使用，不加入默认 Handoff 实施路径。

新增工具前必须验证无法通过现有稳定查询边界表达，避免重新形成整包读取或工具爆炸。

## PBWork 演进计划

### Prototype 列表与详情

- 顶层列表按稳定 Prototype identity 展示一次；
- lifecycle 不再由 localStorage override 作为正式事实；
- Prototype 详情展示 Working Draft、latest Release、历史 Releases、active Evidence 和 archive 状态；
- Release 卡片只展示版本、创建时间、source revision、Snapshot、Handoff、Coverage、risk 和 Review 状态；
- 历史 Release 只读，不提供“退回待确认”操作；
- “继续编辑”创建下一版 Working Draft 上下文，不修改旧 Release。

### Finalize Flow

PBWork 新增专门的 Finalize FlowSheet：

1. 显示待发布 source revision；
2. 自动运行 authoring lint 和 Release Preflight；
3. 展示 Release Capture Profile 与完整 Case Matrix；
4. 展示 Block、Warning、mandatory risk 和容量；
5. 接受用户确认后启动 Finalization Job；
6. 在 Sheet 内展示 Capture、Store、Handoff 和 Release commit 进度；
7. 失败时保留恢复和诊断入口；
8. 成功时展示 `Release vN` receipt。

日常“交付到 Agent”继续存在，可针对单 Screen 或自定义范围创建普通 Handoff；它不自动产生 Prototype Release。

### Archive

Archive 调用 Core Bundle lifecycle，不再仅改变 PBWork 筛选标签。Archive 前必须检查：

- 没有 running Finalization/Capture Job；
- 没有未导出的必需 Review 状态；
- 用户看到将停止新生产操作的影响；
- 历史 Release、Snapshot、Handoff 和 Review 保持可读。

## CLI 演进计划

建议增加以下命令，精确名称在实现阶段由 CLI 参考文档固定：

```text
prototype release preflight --prototype <id> --source-revision <commit>
prototype release create --prototype <id> --source-revision <commit>
prototype release list --prototype <id>
prototype release show --release <id>
prototype archive --prototype <id>
```

CLI 只负责参数、确认、Core 调用和输出。Release number、Selection expansion、风险、状态和引用算法全部来自 Core。

现有 `deliver` 继续用于普通交付；是否提供 `deliver --release <id>` 仅作为读取已固定 Release Handoff 的便利入口，不重新采集或生成新 Evidence。

## Core、Store 与 Local Service 责任

### Core

Core 新增并唯一拥有：

- `PrototypeRelease` Schema 与 ID；
- `ReleaseCaptureProfile` Schema、版本和 Selection expansion；
- Finalization Preflight、状态、风险和错误码；
- Release completeness 与 source revision drift 判断；
- `RenderedArtifactAcceptanceContract`；
- provider-neutral Target environment 与 render receipt；
- visual text obligation 和 receipt；
- 双轨 Review completion gates。

### Store

Store 提供：

- append-only Release 保存；
- Bundle 内 release number 原子分配；
- Release 到 Run、Snapshot、Catalog、Handoff 和 contract digest 的引用断言；
- Release 创建与 active pointer 互不混淆；
- archive 后阻止 Finalization 和普通生产写入；
- clean/fork 对 Release 可达对象的明确规则；
- 不暴露物理目录布局。

### Local Service

Local Service 提供：

- 浏览器 PBWork 到 Finalization JobHost 的受限入口；
- source revision、Runtime session 和 Workspace generation 绑定；
- Review provider session、设备 lease 和 artifact 写入；
- append-only Review event log；
- 在 Release 创建和 Review 完成时独立重算固定合同，拒绝客户端缩小范围；
- 一次性人工确认 token。

## 协议、责任与工具盘点

实施开始时建立一份可由源码和测试核对的 capability inventory，完成时随已落地能力同步到各包 README。清单至少包含：

| 边界 | 协议或合同 | 责任 | 典型工具/入口 | 禁止越界 |
| --- | --- | --- | --- | --- |
| PBWork Runtime -> Core Capture | Capture Protocol v2、Runtime manifest、显式 Selection | Runtime 声明并准备状态；Core/Playwright 固定 Case 并采集 | Runtime prepare/settle、Playwright screenshot/semantic capture | PBWork 不自行生成 Store 事实或 Release number |
| Core -> Store | Evidence/Release Schema、append-only refs | 提交 Run、revision、Snapshot、Catalog、Handoff、Release 和固定引用 | Core Store APIs | 入口层不猜目录、不改历史对象 |
| Coding Agent -> ProtoBridge MCP | MCP JSON-RPC/stdio、固定 Workspace/Snapshot/revision | 按 Handoff 渐进读取 Evidence，查询 Target Review | `read_handoff_index`、`read_screen_packet`、Review tools | 不回退 active/latest，不一次注入完整 Evidence |
| Local Service -> Target provider | provider-neutral render/scenario/receipt contract | 绑定 Target revision、设备环境、artifact 和 Review event | target launcher、后续 Dart/Flutter MCP adapter | provider 工具名和响应形状不进入 PB 公共 Schema |
| Flutter provider -> device/runtime | Flutter CLI、DTD、Driver/Inspector 或官方 MCP 的实际能力 | 设备发现、运行、交互、截图和 Target observation | screenshot、tap、input、scroll、Widget Inspector | Target observation 不写回 Source Evidence |
| Rendered verifier -> Review | comparator profile、VisualTextReceipt、人工 authority | 比较截图、OCR/semantics、裁切遮挡并提交 assessment | compare、OCR engine、operator confirmation | OCR 不补写 Source，不用综合分数掩盖 unknown |

每个 inventory 条目记录 owner、capability/version、输入固定引用、输出 receipt、失败类型、敏感信息策略和对应测试。外部工具不可用时必须显式报告 `unsupported` 或 `unverified`，不得改变产品语义或静默换用无法证明环境的路径。

## 两周实施计划

### 估算前提

本计划按一个聚焦实施流、约十个工作日估算。它依赖以下前提：

- 当前 PB/PBWork Capture、Store、Handoff、MCP 渐进消费和五维验收基线保持稳定；
- 首期只支持一个 canonical mobile profile、一个正式 Theme 和现有 iOS Simulator provider；
- 正式 Release 使用 clean Git commit，不在本期实现 dirty source artifact；
- 不在本期重写 Playwright Capture，也不改变 Capture Protocol v2；
- OCR、真机和 Dart/Flutter MCP 只占用有上限的 spike 时间，不挤占 Release 主线；
- 若公共 Contract 或 Store 迁移发现破坏性问题，应缩减探索项，而不是降低不可变性和固定引用要求。

### 优先级

| 级别 | 本期范围 | 完成含义 |
| --- | --- | --- |
| P0 主线 | Release Contract、Store、Finalization、CLI、PBWork Finalize、双轨 Review 基础、现有 iOS Simulator 迁移、MCP 紧凑投影 | 两周 Roadmap 的承诺交付 |
| P1 探索 | Android Emulator adapter、Dart/Flutter MCP provider spike、OCR diagnostic benchmark、至少一种真机截图链路验证 | 形成 receipt、报告和继续/停止决策，不承诺生产门禁 |
| P2 后续 | 多真机稳定租约、OCR 正式 gate、多平台矩阵、复杂 comparator、dirty source artifact | 进入后续 Roadmap，不影响本期或当前基线完成状态 |

### Week 1：Release 与 Finalization 主链路

#### Day 1：决策冻结与回归基线

- 固定首期 source revision、Capture Profile、Theme、canonical device 和 Archive 选择；
- 为现有 Capture -> Store -> Handoff -> MCP 消费链路补足行为基线测试；
- 固定 Schema migration、兼容读取和 feature capability 策略；
- 建立协议、责任、工具与 receipt capability inventory；
- 确认 P1 spike 的时间盒与设备可用条件。

退出标准：主线没有未决 ownership 问题；现有已验收链路具有可回归基线。

#### Day 2-3：Core Release Contract 与 Store

- 实现 `PrototypeRelease`、`ReleaseCaptureProfile`、ID、错误码和引用 Schema；
- 实现 Store append/read/list、Bundle 内原子 release number 和引用断言；
- 实现 source revision、固定对象可达性、archive、fork 和 clean 规则；
- 提供只读 Release projection，不让 PBWork、CLI 或 MCP 复制版本算法。

退出标准：同一 Bundle 可安全创建 v1/v2；失败或并发不会产生重复版本、半成品或悬空引用。

#### Day 4-5：Finalization Orchestrator 与 CLI

- 实现 Finalization Preflight、profile 到显式 Selection 的确定性展开；
- 绑定 pinned revision Runtime，并在 Preflight/Capture 前后检查漂移；
- 编排 Capture、Staleness、Handoff、Acceptance Contract 和 Release 原子提交；
- 实现 CLI preflight/create/list/show 和失败、取消、重试语义。

Week 1 里程碑：CLI 能从固定 revision 生成 Release v1/v2；任何中间失败都不宣称 final，也不创建半成品 Release。

### Week 2：PBWork、双轨 Review 与收敛

#### Day 6-7：PBWork 生命周期与 Finalize Flow

- 顶层列表按稳定 Prototype identity 展示，Release 在详情内展开；
- 接入 Working Draft、Release、Archive 和 Finalization Job 的 Core 投影；
- 实现 Case Matrix、Block/Warning、风险确认、进度、失败恢复和 Release receipt；
- 将 localStorage lifecycle 降为非权威偏好或一次性迁移提示；
- 保证历史 Release 只读，“继续编辑”只创建下一版 Working Draft 上下文。

退出标准：PBWork 可完成 `review -> finalizing -> Release v1`，继续编辑后生成 v2，旧版本不被原地修改。

#### Day 8：Rendered Artifact Contract 与 provider-neutral Review

- 实现独立 Rendered Artifact obligations、platform/device/environment contract；
- 抽象 `render_target_case` provider，并迁移现有 iOS Simulator launcher；
- 分别呈现 semantic 五维 coverage 与 rendered artifact coverage；
- 扩展 MCP capability、Handoff/Review 摘要和按需分页读取，不扩大默认上下文。

退出标准：现有 iOS Simulator Review 在新 provider 合同下通过，两条验收轨道分别可见，任何一条都不能替代另一条。

#### Day 9：有上限的能力探索

- Android Emulator：验证设备发现、启动、截图和规范化 Target receipt；
- Dart/Flutter MCP：验证 DTD、截图、Widget Inspector 与交互能力能否适配 provider interface；
- OCR：用中英文、数字、换行、截断和遮挡 fixture 建立 diagnostic benchmark；
- 真机：在设备可用时验证 iOS 或 Android 的发现、截图、环境 receipt 和敏感 identity 脱敏。

这些探索不改变主线完成标准。每项只输出 prototype adapter、fixture/report、已知限制和 go/no-go 建议；不成熟时必须返回 `unsupported` 或 `unverified`。

#### Day 10：E2E、兼容与文档

- 完成 CLI、PBWork、MCP、Local Service 和 Target Review 的主线 E2E；
- 验证旧 Bundle/Handoff 的只读兼容和 capability 区分；
- 删除本期引入且已无用的临时 projection，不提前删除仍需兼容的旧入口；
- 同步已经落地的产品、架构、参考、包 README、Skill reference 和操作文档；
- 用源码、公共工具表面和测试复核 capability inventory；
- 输出 P1 spike 结论，并把未达到门槛的工作转入后续 Roadmap。

Week 2 里程碑：Release Finalization 与双轨 Review 主线可端到端使用；旧 Evidence 仍可读取；P1 能力有证据化决策，不伪装成已完成 Contract。

### 范围调整顺序

若两周内出现容量压力，按以下顺序缩减，不削弱 P0 的不可变性、固定引用和验收诚实性：

1. 延后真机 provider 生产化；
2. 延后 OCR 正式 gate，仅保留 benchmark 与 diagnostic receipt；
3. 延后 Android Emulator 的正式支持，仅保留 provider spike；
4. 延后 Dart/Flutter MCP adapter，仅保留边界验证报告；
5. 保留 Release、Finalization、PBWork 主路径、现有 iOS Simulator 迁移和双轨 Review 基础。

## 验证计划

### Contract 与 Store

- Schema round-trip、strict parsing 和未知字段拒绝；
- Release number 并发分配；
- Release 引用必须由同一 Workspace/Bundle 固定对象到达；
- Finalization 失败不创建 Release；
- archived Bundle 拒绝新 Finalization；
- fork/clean 不破坏历史 Release 可达性；
- source revision 或 Runtime input version 漂移确定性失败。

### Capture 与 Finalization

- Profile 在 PBWork 与 CLI 产生相同显式 Selection 和 Case ID；
- whole Prototype 覆盖所有声明 Screen/Variant/required Scenario；
- Case 超限、warning 未接受、required boundary 缺失和 Store 失败全部阻断；
- 重试产生新 Job/Run，但 Release 只在最终成功时创建一次；
- Capture 与 Screenshot 属于同一固定 Case。

### MCP 与 Review

- MCP 只读取 fixed Release/Handoff/Snapshot refs；
- capability 不支持时不回退旧读取链路；
- Release 摘要不把完整合同注入 Agent 上下文；
- Local Service 独立重算 semantic 与 rendered obligations；
- 客户端不能删减验收分母；
- Target receipt 绑定同一 Target content digest 和 device environment；
- 缺失 rendered 或 semantic assessment 都阻止最终完成。

### 平台与 OCR

- iOS Simulator、Android Emulator 的尺寸、DPR、safe area 和 locale fixture；
- 物理设备断连、锁屏、权限失败和环境漂移；
- system chrome 包含/排除策略；
- OCR 中英文、数字、换行、截断、遮挡、低 confidence 和 unsupported font；
- semantics 与 OCR 冲突时保留双方并产生 deviation/unverified；
- comparator/OCR 升级必须改变 tool fingerprint，并触发旧 receipt 不可复用。

### 产品 E2E

- PBWork `review -> finalizing -> Release v1`；
- v1 历史只读，继续编辑后生成 v2；
- Archive 后历史仍可查看，生产操作被拒绝；
- Release Handoff 经 MCP 被 Coding Agent 渐进消费；
- Target Review 同时完成五维和 rendered artifact gates。

## 文档同步计划

每项能力只在实现落地后同步对应当前行为文档：

| 变化 | 必须同步 |
| --- | --- |
| Release/Finalization 产品闭环 | `docs/product/overview.md`、`docs/product/workflow.md` |
| Release/Store Schema | `docs/architecture/evidence-model.md`、Core README、词汇表 |
| Release Capture Profile | `docs/architecture/capture-pipeline.md`、配置参考、CLI README |
| PBWork lifecycle/Finalize UI | `docs/architecture/pbwork.md`、PBWork 手册、pbwork skill reference |
| Rendered Artifact Contract | Evidence 模型、ADR 0007 关联说明、Agent 消费指南 |
| Target platform/provider | `docs/architecture/proto-bridge.md`、Target contract 文档、MCP README |
| MCP Tool/Resource/Prompt | MCP README、Agent 消费指南、生成 Prompt 与 e2e |
| OCR/visual text gate | Authoritative Review 文档、Target contract、检查单和测试 |
| 迁移与兼容 | `docs/history`、操作指南、release notes |

主体文档只描述已经实现的当前行为。本 Roadmap 是计划的唯一完整来源，不提前把提案复制进 Architecture、Reference 或 PBWork 强制规范。

## 迁移与兼容

- 现有 Bundle、Run、Snapshot、Handoff 和 Review 保持可读；
- 没有 `PrototypeRelease` 的旧 Handoff 显示 `releaseRef=legacy-unavailable`，不能推断版本号；
- 旧 PBWork lifecycle override 不迁移成 Core final/archive 事实；最多作为一次性 UI 提示；
- 旧 iOS Simulator Review 可以读取，但没有 Rendered Artifact Contract 时不能在新门禁下继续完成；
- MCP 通过 capability/version 明确区分旧 Store、旧 Review 与新 Release；
- 不通过 active/latest 或文件路径为旧对象补造 Release。

## 风险与控制

### Case 数量爆炸

全 Prototype、全 Variant、全 Scenario、全 Theme 的笛卡尔积可能超过容量。控制方式是版本化 Release Capture Profile、显式 Matrix 和阻断式上限，不采用静默抽样。

### Git revision 与交互成本

要求 clean commit 增加 Finalization 前置步骤，但这是实现“旧版本可复现”的最低可信边界。若希望支持 dirty source，必须先实现可恢复 source artifact，而不是放宽为只有 digest。

### 真机非确定性

物理设备受 OS、字体、通知、权限、锁屏和硬件状态影响。首期应把模拟器作为 canonical gate，真机作为额外 profile；只有环境控制和稳定性达到门槛后才升级为默认必需。

### OCR 假阳性与假阴性

OCR 不成熟时只能提供诊断。任何基于 confidence 的 gate 都必须有固定 benchmark、版本化 normalization 和保守的 unverified 结果。

### MCP 表面膨胀

优先扩展既有工具投影和 capability；只有稳定查询边界确实不同才新增工具。不得恢复完整 Snapshot/Catalog/Contract 一次性读取。

### 外部 Flutter MCP 漂移

官方 Dart/Flutter MCP 仍是实验能力。ProtoBridge 通过 provider adapter 和 receipt contract 隔离其工具名、响应形状和版本变化。

## 决策检查点

以下问题不要求在评审 Roadmap 时一次性全部确定，但必须在对应实现开始前关闭：

1. 正式 Release 是否强制要求 clean Git commit，还是投入实现可恢复的 dirty source artifact；
2. `mobile-standard-v1` 是否选择所有 Variant，还是只允许 Registry 显式标记 release-required Variant；
3. 首期 Release 是否只固定一个 Theme 和 canonical mobile device；
4. Archive 是只作用于整个 Prototype/Bundle，还是还需要独立的 Release visibility/archive 事件；
5. Authoritative Review 首期是否以模拟器为必需、真机为可选附加 profile；
6. Android Emulator 与 iOS Simulator 哪一个作为第二个正式 provider；
7. OCR 首选本地确定性引擎、平台原生 OCR，还是可替换多引擎接口；
8. OCR benchmark 达到什么阈值后才能从 diagnostic-only 升级为完成门禁；
9. `RenderedArtifactAcceptanceContract` 是独立持久对象，还是 Handoff Acceptance 的独立子合同；
10. 是否需要让普通 `deliver` 引用某个 Release，还是 Release 只服务正式 Finalization。

## Roadmap 退出标准

P0 主线达到以下条件后，本 Roadmap 可标记为 `Delivered`：

- 当前 PB/PBWork 已验收基线保持通过，没有因 Release 演进产生回归；
- Core、PBWork、CLI、MCP、Local Service 和 Target 的 ownership 没有语义重复；
- Release 与 Bundle/Snapshot/Handoff 的引用模型保持历史不可变；
- Finalization 失败、取消、重试和 archive 行为有确定性定义；
- PBWork 可以生成只读 v1/v2 Release，并保持一个稳定 Prototype identity；
- 五维 semantic obligations 与 rendered artifact obligations 分别呈现且不能互相替代；
- 现有 iOS Simulator Review 已迁移到 provider-neutral receipt；
- MCP 仍按固定引用渐进供给证据，没有恢复整包 Evidence 注入；
- P0 的 Schema、实现、测试和权威文档已同步，范围内验证通过；
- P1 探索项均有报告和明确去向；未成熟项保留为后续 Roadmap，不阻止本期完成。

## 相关资料

- [Evidence 模型](../architecture/evidence-model.md)
- [采集链路](../architecture/capture-pipeline.md)
- [ProtoBridge 实现](../architecture/proto-bridge.md)
- [PBWork 架构](../architecture/pbwork.md)
- [PBWork 与 ProtoBridge 协作](../guides/pbwork-and-pb.md)
- [ADR 0007：高保真重建使用独立 Acceptance Contract](../decisions/0007-reconstruction-acceptance-contract.md)
- [Dart and Flutter MCP server](https://docs.flutter.dev/ai/mcp-server)
