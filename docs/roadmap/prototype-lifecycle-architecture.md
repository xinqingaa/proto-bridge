# PBWork 原型生命周期架构设计

状态：Proposed（待用户确认）

日期：2026-08-19

本文定义计划中的 Core、Store、Local Service、PBWork 与 MCP 架构，不代表当前实现。产品行为以[原型生命周期产品设计](./prototype-lifecycle-product-design.md)为准。

## 架构目标

- 一个稳定 `prototypeId` 对应一个长期、线性的 Prototype lineage；
- 一个 lifecycle-managed Prototype 使用一个稳定 managed Bundle；
- `active -> review` 自动生产 whole-Prototype Evidence、Handoff 和唯一 Prompt；
- `review -> final` 原子创建不可变 vN Release；
- 所有历史对象使用固定逻辑 ID，不通过 active/latest 替代；
- source、Runtime、Selection、Catalog、Design System 和 Prompt 都有内容指纹；
- 当前源码变化只产生 Staleness，不修改旧对象；
- archived lineage 的生产操作由状态门禁拒绝，不引入 RBAC。

## 核心不变量

1. Core 是 lifecycle、profile、fingerprint、staleness、Release 和 archive 语义的唯一来源；
2. PBWork 只提交 lifecycle intent 和读取 projection；
3. 同一 Prototype 至多一个未终结 Lifecycle Transition Attempt；
4. 同一 Prototype 至多一个 current Review Package；
5. 一个 Review Package 恰好固定一个 Snapshot、一个 Handoff 和一个 Prompt Artifact；
6. 一个 Release 恰好引用一个 Review Package；
7. Release number 只在成功事务内分配；
8. Prompt Artifact 不存在 update、overwrite 或 regenerate；
9. Release、Review Package、Prompt、Handoff、Snapshot 和 Catalog 都不可变；
10. archived managed Bundle 不接受任何新的 Producer object；
11. Component/Token 是 Release dependency，不是独立 lifecycle entity；
12. MCP 只消费固定 Release/Handoff，不创建生命周期或 Capture 对象。

## 对象关系

```text
Workspace
├─ Managed Prototype Index
│  └─ prototypeId -> managed bundleId
└─ Bundle (one Prototype lifecycle lineage)
   ├─ Lifecycle Events
   ├─ Lifecycle Head                    # 唯一可变控制投影
   ├─ Lifecycle Transition Attempts
   ├─ Catalog revisions
   ├─ Runs / Attempts / Evidence revisions / Issues / Blobs
   ├─ Snapshots
   ├─ Staleness Reports
   ├─ Review Packages
   │  ├─ fixed Snapshot
   │  ├─ fixed Handoff
   │  └─ fixed Prompt Artifact
   ├─ Finalization Decision Receipts
   ├─ Releases v1..vN
   └─ Archive Receipt
```

### Managed Bundle

当前 Bundle 已定义为“一个 Prototype 的长期 Evidence 容器”。生命周期设计沿用这个边界，不再增加平行的 Evidence lineage 对象。

- Workspace 增加 `prototypeId -> managedBundleId` 唯一索引；
- lifecycle-managed Capture 始终追加到该 Bundle；
- 普通 CLI diagnostic Capture 可以继续使用非 managed legacy Bundle，但不能改变 Prototype lifecycle；
- 同一 `prototypeId` 只能有一个 managed Bundle；
- managed Bundle archived 后永久停止生产写入。

旧 Store 中同一 Prototype 可能已有多个 Bundle。迁移不猜哪一个是 lifecycle lineage；首次正式进入确认时创建 managed Bundle，旧 Bundle 保持 legacy read-only history。

## Lifecycle Head 与事件

### PrototypeLifecycleHead

Lifecycle Head 是 Store 中唯一允许原子更新的管理投影：

```text
schemaVersion
workspaceId
bundleId
prototypeId
stage: active | review | final | archived
baseReleaseId?
currentReviewPackageId?
latestReleaseId?
pendingTransitionAttemptId?
eventHeadDigest
updatedAt
```

Lifecycle Head 不是历史事实本身。每次变化先追加不可变 Lifecycle Event 和关联对象，再原子更新 Head；Head 丢失时必须能从事件和对象重建。

### PrototypeLifecycleEvent

```text
lifecycleEventId
workspaceId
bundleId
prototypeId
kind
fromStage
toStage
transitionAttemptId?
reviewPackageId?
releaseId?
previousEventDigest?
eventDigest
createdAt
```

事件形成 digest chain，防止生命周期历史被局部替换。事件只记录发生的事实，不保存 PBWork 临时 UI 状态。

### LifecycleTransitionAttempt

```text
transitionAttemptId
workspaceId
bundleId
prototypeId
kind: enter-review | return-active | finalize | next-draft | archive
requestedFrom
requestedTo
status: queued | running | failed | completed | cancelled | interrupted
producerInputFingerprint?
captureJobId?
reviewPackageId?
releaseId?
failureCode?
journal
createdAt / startedAt / endedAt
```

Attempt 提供幂等、恢复和错误历史，但不是第五个 lifecycle stage。

幂等键至少包含：

```text
workspaceId + prototypeId + kind + expected lifecycle head digest
```

同一个 Head 上的重复请求返回同一未终结 Attempt。Head 已变化后旧请求确定性失败。

## Review Package

Review Package 是“进入确认”成功的不可变产物，也是 Release 的唯一候选输入。

```text
reviewPackageId
workspaceId
bundleId
prototypeId
transitionAttemptId
producerInputFingerprint
captureProfileId
captureProfileDigest
selectionDigest
runId
snapshotId
snapshotFingerprint
stalenessReportId
handoffId
handoffFingerprint
promptArtifactId
promptFingerprint
packageFingerprint
warningIds
riskKinds
createdAt
```

Review Package 只有在 Snapshot、fresh Staleness Report、Handoff 和 Prompt 全部存在后才能创建。Lifecycle Head 只有在 Review Package 成功写入后才从 active 原子推进到 review。

失败的 Capture 可以留下 Run/Attempt/Issue 供诊断，但不能形成 Review Package，也不能推进生命周期。

## Agent Handoff 与风险确认拆分

现行 Handoff Schema 把风险确认作为创建 Handoff 的前置条件，这与“进入确认时自动生成 Handoff 和 Prompt”冲突。目标 Contract 拆分为：

- Handoff 固定 Evidence 范围、freshness、Coverage 和全部 mandatory risks；
- Handoff 可以在存在风险时自动创建，不把风险隐藏或视为接受；
- 风险处理结果写入独立 `FinalizationDecisionReceipt`；
- Decision Receipt 只决定能否 Finalize，不修改 Handoff、Evidence 或 Prompt。

```text
finalizationDecisionId
workspaceId
bundleId
prototypeId
reviewPackageId
acceptedWarningIds
acknowledgedRiskKinds
decision: approve | reject
recordedAt
```

不记录用户角色或权限。`decision` 表示本机工作流中的显式产品动作，不建立审批人身份模型。

## Prompt Artifact

### 对象

```text
promptArtifactId
workspaceId
bundleId
prototypeId
reviewPackageSeedFingerprint
handoffId
reviewDiagnosticsFingerprint
promptTemplateVersion
consumerProjectionVersion
promptInputFingerprint
contentDigest
blobId
createdAt
```

Prompt bytes 作为 Store Blob 保存，Prompt Artifact 只保存固定引用与 digest。`promptArtifactId` 可以由内容寻址生成，也可以使用稳定 ID 加唯一约束；无论采用哪种 ID，内容不可替换。

### Target-neutral Prompt

Prompt 只包含：

- 固定 Workspace、Bundle、Snapshot 和 Handoff；
- Review warnings 和 mandatory risks；
- MCP 渐进消费纪律；
- 指示 Agent 使用接收 Prompt 时的当前目标工作区。

Prompt 不包含：

- `targetRoot`；
- 临时 implementation intent；
- 当前 Target 扫描结果；
- active/latest 引用；
- 可被后续 UI 改写的确认状态。

### 唯一性与幂等

Store 建立唯一约束：

```text
reviewPackageSeedFingerprint -> one promptArtifactId
```

内部 `ensurePromptArtifact` 只有两种结果：

1. Artifact 已存在：返回原对象和原 bytes；
2. Artifact 不存在：按固定 input fingerprint 生成一次并原子写入。

不存在以下能力：

- `overwriteDeliveryId`；
- regenerate Prompt；
- 编辑 Prompt bytes；
- 为不同 targetRoot 生成多个 Prompt；
- “新建交付版本”。

导出到文件系统只是 Store Artifact 的可丢弃副本。文件删除后可以重新导出相同 bytes，但不能重新运行 Prompt renderer 产生新内容。

Prompt template 升级只改变未来 `promptTemplateVersion`。历史 Prompt 永不迁移。

## Prototype Release

```text
releaseId
workspaceId
bundleId
prototypeId
releaseNumber
reviewPackageId
sourceRevision
sourceTreeDigest
designSystemFingerprint
packageFingerprint
releaseFingerprint
finalizationDecisionId
createdAt
```

Release 不重复保存 Snapshot/Handoff/Prompt 的可变副本；它通过 Review Package 固定到这些对象。

### Release 原子事务

`review -> final` 在 Store 单 writer 边界内执行：

1. 读取并锁定 expected Lifecycle Head；
2. 验证 current Review Package 仍为 fresh；
3. 验证 complete Coverage、required boundary、Catalog 可达性和 Decision Receipt；
4. 验证 clean Git revision 的 tree digest 与 Review Package source digest 相同；
5. 若 package fingerprint 与 latest Release 相同，返回已有 Release，不分配新版本；
6. 计算下一个 release number；
7. 写入不可变 Release 和 Lifecycle Event；
8. 原子更新 Lifecycle Head 为 final；
9. 事务成功后才对调用方返回 vN。

任何失败都保持原 Head 和 next release number 不变。

### 版本比较

Release comparison 是固定 read model：

```text
compare(releaseIdA, releaseIdB)
```

只使用两个 Release 可达的固定 source、package、Snapshot、Catalog、Handoff 和 Prompt refs。不得用 latest 补齐任一端。

比较至少分为：

- Source/Registry；
- Screen/Variant/Scenario Matrix；
- Component Contract；
- Token/Theme；
- Evidence Facts、Screenshot 和 Coverage；
- Warning/risk；
- Prompt template/content digest。

结果可以即时计算或按两端 release fingerprints 内容寻址缓存，但缓存不能成为新的事实源。

## Fingerprint 体系

所有 fingerprint 使用带版本号的 canonical JSON 和 SHA-256：

```text
sha256(canonical-json({ fingerprintVersion, ...semanticInputs }))
```

Canonical input 不包含 `createdAt`、随机 ID、文件系统绝对路径或数组偶然顺序。

### Prototype Source Fingerprint

覆盖 Prototype 自有源码和 Registry slice：

```text
prototypeSourceFingerprint = hash({
  prototypeId,
  prototypeFileTreeDigest,
  prototypeRegistrySliceDigest,
  designBaselineDigest,
  fixtureDigest
})
```

### Design System Fingerprint

首期采用完整、保守的 DS fingerprint：

```text
designSystemFingerprint = hash({
  componentContractCatalogDigest,
  componentRegistryDigest,
  tokenCatalogDigest,
  themeCatalogDigest,
  bindPoolDigest,
  semanticVocabularyDigest
})
```

Component 实现代码的变化同时进入 Runtime build/source fingerprint。首期不尝试证明“某个 DS 变化与某个 Prototype 无关”；任何 DS Contract/Token/Theme 变化都会使 current Review Package stale。历史 Release 不受影响。

### Producer Input Fingerprint

```text
producerInputFingerprint = hash({
  prototypeSourceFingerprint,
  designSystemFingerprint,
  runtimeManifestDigest,
  runtimeInputVersion,
  runtimeBuildDigest,
  captureProtocolVersion,
  captureToolchainFingerprint,
  captureProfileDigest,
  fixtureDigest
})
```

### Selection 与 Snapshot Fingerprint

```text
selectionDigest = hash(normalized explicit Case/Scope matrix)

snapshotFingerprint = hash({
  snapshot semantic content,
  reachable revision content digests,
  coverage,
  catalog kind + input digests,
  referenced blob digests
})
```

### Handoff、Prompt、Package 与 Release

```text
handoffFingerprint = hash(canonical Handoff semantic content)

promptInputFingerprint = hash({
  handoffFingerprint,
  reviewDiagnosticsFingerprint,
  promptTemplateVersion,
  consumerProjectionVersion
})

promptFingerprint = hash(exact UTF-8 prompt bytes)

packageFingerprint = hash({
  producerInputFingerprint,
  selectionDigest,
  snapshotFingerprint,
  handoffFingerprint,
  promptFingerprint
})

releaseFingerprint = hash({
  prototypeId,
  releaseNumber,
  sourceRevision,
  packageFingerprint
})
```

## Staleness 与“过期”

### Review Package

Core 使用相同 fingerprint version 重新计算当前 Producer Input，并创建不可变 Staleness Report：

- exact match：`fresh`；
- 任一语义输入不同：`stale`；
- 无法读取当前输入：`unknown`，同样阻止 Finalization。

Staleness reason 使用稳定维度，而不是一段不可解析的自由文本：

```text
source | registry | runtime | profile | selection | fixture |
component-contract | token | theme | vocabulary | toolchain
```

Staleness Report 不写回 Review Package、Snapshot、Handoff 或 Prompt。

### Prompt

Prompt 自身没有可变 status。UI 根据它所属 Review Package 与当前 input 的 Staleness Report 投影：

- `current`：可作为当前实现入口；
- `stale-for-current-head`：历史可读，但默认禁止复制为当前任务；
- `historical-release`：对固定 Release 有效，只作为版本历史使用。

### Release

Release 对自己的 source revision 永远有效，不标记为“坏掉”或“被覆盖”。相对当前 Working Draft 可以投影：

- `matching-current-head`；
- `base-of-working-draft`；
- `superseded-by-vN`；
- `source-drift-detected`。

这些都是 read model，不修改 Release。

## 自动进入 Review 的事务

```text
request active -> review
  -> create/reuse Transition Attempt
  -> compute Producer Input Fingerprint
  -> expand Core whole-Prototype profile
  -> Preflight
  -> automatic Capture Job
  -> commit Run + Snapshot + Catalogs
  -> create fresh Staleness Report
  -> create risk-preserving Handoff
  -> ensure unique target-neutral Prompt Artifact
  -> create Review Package
  -> append Lifecycle Event
  -> atomically flip Lifecycle Head to review
```

### Warning gate 变化

现行 Preflight 要求逐项接受 Warning 才能开始 Capture。目标设计调整为：

- Block 阻止 Capture；
- Warning 固定到任务、Review Package 和 Prompt，但不阻止事实采集；
- Warning 的接受只发生在 Finalization Decision Receipt；
- 普通 diagnostic CLI Capture 是否保持旧 gate 由入口 profile 决定，但 PBWork lifecycle profile 必须使用新分层。

### 崩溃与重试

- Capture Job 使用现有 durable Job/Run/Attempt 语义；
- Service 重启终结或恢复 Transition Attempt 与关联 Job；
- Head 未推进时，UI 仍显示 active；
- 已提交 Snapshot 可以在 fingerprint 完全匹配时复用，继续补 Handoff/Prompt/Review Package；
- 已存在 Prompt 只能返回；
- fingerprint 变化后旧 Attempt 失败，必须从新的 active -> review intent 创建新 Attempt。

## Archive 设计

### ArchiveReceipt

```text
archiveReceiptId
workspaceId
bundleId
prototypeId
latestReleaseId
latestReleaseFingerprint
sourceRevision
prototypeSourceFingerprint
registrySliceDigest
lifecycleEventHeadDigest
archiveFingerprint
archivedAt
```

Archive 事务要求 Head 为 final、无 pending Attempt、无 Working Draft、latest Release 可达。事务写入 Archive Receipt 和 Lifecycle Event，然后原子更新 Head 与 Bundle status 为 archived。

### 非 RBAC 的不可修改门禁

不建立 user/role/permission 表。不可修改由三层保证：

1. **规范层**：产品设计声明 archived lineage 永久只读；
2. **Core/Store 层**：拒绝 archived managed Bundle 的 Job、Run、Snapshot、Handoff、Prompt、Review Package、Release 和 lifecycle transition 写入；
3. **仓库验证层**：`lifecycle verify` 对比 Prototype 自有文件与 Registry slice 的 Archive Receipt fingerprint，漂移时阻止 `pnpm verify`。

共享 DS 文件不属于某个 Prototype 的独占 archive source scope；它们由 Release 的 Git revision 和 Design System Fingerprint 固定。当前分支 DS 演进不能改写 archived Release。

首期不提供 unarchive/restore。Store 的 legacy Bundle restore 能力不得用于 managed archived lineage。继续工作只能 fork 新 `prototypeId`，且新 lineage 不复用旧 Release number。

## Component 与 Token 架构边界

Component、Token 和 Theme 不增加 `active/review/final/archived` 状态，也不创建自己的 Release number。

它们通过三条路径进入 Prototype Release：

1. Runtime Manifest 提供完整 Component、Token/Theme Catalog inputs；
2. Semantic Snapshot 保存 evidence-bearing node 的 `componentId`、props、role 和 Token binding provenance；
3. Review Package/Release 固定 Design System Fingerprint 和 Catalog refs。

Store 对相同 Catalog content digest 复用不可变 Catalog revision/blob，避免每个 Release 复制相同 bytes；Release 仍保存自己的固定 Catalog refs。

Target 的 Component/Token mapping 与 sync 状态不进入 Source Release fingerprint。它们属于独立 Target validation 边界。

## Local Service Contract

PBWork 主路径需要的概念接口：

```text
GET  /prototypes/:prototypeId/lifecycle
POST /prototypes/:prototypeId/transitions   { to, expectedHeadDigest }
GET  /lifecycle-attempts/:attemptId
GET  /review-packages/:reviewPackageId
GET  /review-packages/:reviewPackageId/prompt
GET  /prototypes/:prototypeId/releases
GET  /releases/:releaseId
GET  /releases/compare?left=&right=
```

不存在 PBWork Prompt create/regenerate/overwrite endpoint。PBWork 也不再调用低层 Preflight/Job endpoint 创建正式 Capture；这些 endpoint 只保留给 CLI diagnostic、测试和内部 orchestrator。

Lifecycle Service response 必须直接使用 Core Contract 和 error code。PBWork 不根据 HTTP status 自行推导生命周期。

## PBWork 投影

PBWork 不保存 lifecycle override。Pinia store 只缓存：

- Lifecycle Head；
- current Transition Attempt；
- current Review Package；
- Release index；
- 当前 Staleness projection；
- Prompt bytes 的只读结果。

刷新、重连或换浏览器后全部从 Local Service 恢复。localStorage 只保留画布缩放、Inspector 和其它非产品事实。

## MCP 与 Prompt 消费

- MCP 仍以 Handoff 为正式 Evidence 入口；
- Prompt 固定 Handoff ID，不嵌入完整 Evidence；
- Agent 通过 Handoff progressive projection 按需读取 Screen/Case/Fragment/Component/Token；
- MCP 不暴露 Prompt regenerate；
- Release index 可返回固定 `releaseId -> reviewPackageId -> handoffId`；
- 默认实现入口必须由用户选择的 Review Package/Release 提供，不回退 active/latest；
- stale Prompt 不改变 MCP 中历史 Handoff 的可读性，但 PBWork 不把它作为当前默认入口。

## 数据迁移

### PBWork localStorage

- `pbwork.prototype-lifecycle.v1` 不升级为 Core final/archive；
- 旧状态只显示一次迁移提示，然后停止写入并清理；
- 所有 Prototype 默认以 active 建立 lifecycle Head；
- Registry lifecycle 只作为展示 metadata，不覆盖 Store Head。

### 旧 Bundle 与 Delivery

- 旧 Bundle、Snapshot、Handoff 和 `.proto-bridge/deliveries` 保持只读兼容；
- 不把旧 delivery 推断为唯一 Prompt Artifact；
- 不补造 v0/v1；
- 已存在的 overwritten delivery 目录按原 bytes 保持只读；`overwriteDeliveryId` 写入参数从生命周期主路径删除，并在兼容窗口后废弃；
- 首次进入确认创建 managed Bundle 和第一份 Review Package。

## 验证不变量

实现必须用测试证明：

- 同一 Head 的重复 transition 只产生一个 Attempt；
- Review stage 不可能缺 Snapshot/Handoff/Prompt；
- 同一 Review Package 不可能出现两个 Prompt；
- Prompt bytes、digest 和 template version round-trip 一致；
- Prompt export 后删除再导出仍是相同 bytes；
- input fingerprint 改变后 Review Package/Prompt 投影 stale；
- stale/unknown Package 不能 Finalize；
- Release number 只在成功事务中递增；
- 相同 package fingerprint 不产生 no-op 新版本；
- v1/v2 comparison 只读取固定 refs；
- final 不能直接写 Producer object，next-draft 后才恢复生产；
- archived managed Bundle 拒绝所有生产写入和 restore；
- Archive Receipt source drift 阻止 repository verification；
- Component/Token/Theme 变化使 current Review Package stale；
- 历史 Release、Evidence、Handoff 和 Prompt 永不被 staleness 或新 Release 改写。

## 实现边界

用户确认本设计后，实施顺序由依赖关系决定：

```text
Core contracts/fingerprints
  -> Store objects and atomic transitions
  -> lifecycle orchestrator and automatic Prompt
  -> Local Service contract
  -> PBWork lifecycle projection and manual-button cleanup
  -> MCP Release read model
  -> migration, repository gates, product E2E, current documentation sync
```

这不是工期承诺。实现完成前，现行行为仍以当前 Product、Architecture、Reference 和可执行 Schema 为准。
