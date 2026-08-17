# Roadmap：PBWork 原型生命周期与 Release 管理

状态：Planned

全局优先级：P2

日期：2026-08-17

目标投入：待单独排期

## Roadmap 定位

本 Roadmap 建设 PBWork 的原型资产管理能力，不建设 PB Evidence 核心闭环。当前 PB/PBWork 已经可以完成 Selection、Preflight、Capture、Store、Handoff、MCP 消费和 Target Review；生命周期与 Release 不作为这些能力的完成条件。

当前 `active/review/final/archived` 是 PBWork localStorage 中的可逆 Workbench 状态，不改变 Registry、Runtime、Store、Snapshot 或 Handoff。未来若产品需要正式的“定稿版本”和“归档原型”，应把管理语义与 Core 不可变引用连接起来，但不能复制 Core 的 Capture、状态和引用算法。

该路线在 [官方 Flutter MCP 与 Target 验收增强](./flutter-mcp-target-review.md)完成或进入稳定阶段后再单独排期。

## 产品目标

- 一个业务原型只有一个稳定 Prototype identity；
- 同一 Prototype 在详情内拥有 `v1`、`v2` 等不可变 Release；
- 进入“确认定稿”后自动准备整个 Prototype 的采集范围；
- 用户确认实际 Case Matrix、warning 和风险后执行 Finalization；
- Finalization 成功后固定 source revision、Capture profile、Snapshot、Handoff 和 Release；
- 已定稿 Release 永远不能原地修改；继续工作创建下一版 Working Draft；
- Archive 作用于稳定 Prototype lineage，历史 Release、Snapshot、Handoff 和 Review 保持可读；
- 日常 Screen、Fragment 和自定义 Selection 继续服务局部采集，不被 Release 流程取代。

## 非目标

- 不把生命周期提升为 PB 核心 Evidence 闭环的前置条件；
- 不把组件、Screen 或版本后缀注册成新的顶层 Prototype；
- 不把 `_v1`、`_v2` 写进 Screen、Variant、Case 或 semantic identity；
- 不让 PBWork 自行分配 Release number 或重算 active refs；
- 不让 PB 自动修改或提交用户 Git 工作树；
- 不在本路线建设 Target device provider、OCR 或 Flutter MCP 集成；
- 不改变 Capture Protocol v2 或 Playwright 的 Case 执行责任。

## 当前状态

- Prototype lifecycle override 保存于 `pbwork.prototype-lifecycle.v1` localStorage；
- 当前状态允许 `final -> review` 和 `archived -> active`，属于 Workbench 管理偏好；
- Registry 中的 lifecycle 是原型元数据，不是 Store 事实；
- “整个 Prototype”已经是现有 Selection 入口，会展开为显式 Screen/Variant/Scenario 集合；
- Run、revision、Snapshot、Catalog 和 Handoff 已经不可变；
- 当前缺少把“正式定稿”绑定到 source revision、全原型 Capture 和固定 Release receipt 的对象。

## 产品模型

```text
Prototype identity: hengdong
└─ one long-lived management lineage
   ├─ Working Draft
   ├─ Release v1
   │  ├─ pinned source revision
   │  ├─ release capture profile
   │  ├─ Run + Snapshot + Catalog refs
   │  ├─ Handoff
   │  └─ receipt
   ├─ Working Draft derived from v1
   ├─ Release v2
   └─ archived lineage
```

## 稳定 Identity

Prototype identity 继续来自 PBWork Registry 的稳定 `prototypeId`。Release number 只属于 Prototype Release，不进入以下 identity：

- Screen；
- Variant；
- Fragment/Region；
- Action/Scenario/Checkpoint；
- Case；
- Component/Token mapping。

这样同一 Screen 才能跨 Release 比较 staleness，Target mapping 和业务文档也不需要重复注册。

## Prototype Release

建议由 Core 拥有不可变 `PrototypeRelease` Schema，最终字段以实现期 Schema 评审为准：

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
createdAt
```

Release 只在 Finalization 全部成功后一次性创建。失败的 Preflight、Job、Run 或 Attempt 不创建半成品 Release。

Release number 由 Core/Store 在单 writer 边界内按 Prototype/Bundle 原子分配。PBWork、CLI、MCP 和 Local Service 不自行计算下一个版本。

## Working Draft

Working Draft 表示当前可编辑源码头，不是 Evidence Store 对象，也不复用 Release ID。它可以记录基于哪个 Release 继续编辑，但不能修改旧 Release 指向的任何固定对象。

用户从 v1 继续工作时，PBWork 应表达“基于 v1 创建下一版草稿”，而不是把 v1 退回 review。

## 生命周期

建议的管理流程：

```text
active -> review -> finalizing -> final
   ^         |          |
   |         v          v
   +------ active     blocked

final -> next working draft -> review -> next release
final -> archived
```

`finalizing` 和 `blocked` 是 Core Job/Preflight 派生的执行状态，不是 PBWork 可以自行写入 localStorage 的事实。

## Finalization

一次确认定稿按以下顺序执行：

1. 固定待发布 source revision；
2. 从该 revision 启动或连接确定性 PBWork Runtime；
3. 读取 manifest、input version、Catalog 输入和 authoring diagnostics；
4. Core 按 Release Capture Profile 展开整个 Prototype 的显式 Selection Draft；
5. 执行 Preflight，固定 warning、risk、Case Matrix 和有效期；
6. PBWork 展示实际 Screen、Variant、Scenario、Theme、Device、Fixture 和 Case 总数；
7. 用户确认启动，并逐项接受允许继续的 warning；
8. Core/Playwright 执行隔离 Capture Job；
9. Store 提交 Run、revision、Snapshot、Catalog、Issue、Coverage 和 Blob；
10. 运行 Staleness 与 Release completeness 检查；
11. 创建固定 Handoff；
12. Store 原子创建 PrototypeRelease 并分配 release number；
13. PBWork 展示 Release receipt。

任一步失败时不创建 Release、不宣称 final、不覆盖旧 Release，并保留 Job/Attempt/Issue 供恢复。

“自动采集”只表示自动展开全原型 Selection 和编排流程。用户仍必须看到 Case Matrix，并明确确认启动、warning 和 mandatory risk。

## Release Capture Profile

Finalization 使用 Core 定义、版本化的 profile，不使用任意临时 Selection。首期可以定义 `mobile-standard-v1`：

- 选择 Prototype 下所有未废弃 Screen；
- 选择 Registry 明确标记为 release-required 的 Variant 和 Scenario；
- 首期固定一个正式 Theme；
- 使用 Core canonical mobile device；
- Fixture 必须显式声明，不能从 Workbench 临时状态推断；
- 展开结果保存为显式 ID，不把字符串 `all` 写入 Run 或 Release；
- 超过 `capture.maxCases` 时阻止 Finalization，不静默抽样。

日常 Capture 入口保持不变：当前 Screen、稳定 Fragment、自定义范围和整个 Prototype 都继续产生普通 Selection Draft。

## 源码冻结

正式 Release 建议要求：

- `sourceRevision` 是可解析的 clean Git commit；
- PB 不自动执行 Git commit；
- Capture Runtime 从该 revision 的隔离 worktree 或等价只读产物启动；
- Preflight/Capture 前后校验 input version 与 source revision 未漂移；
- receipt 记录 commit、Runtime build digest 和 Capture toolchain fingerprint。

若未来允许 dirty worktree，必须先实现可恢复的 patch 和 untracked bytes artifact。只有 content digest 不足以恢复旧源码。

## Ownership

### PBWork

- 展示稳定 Prototype、Working Draft、latest/historical Release；
- 提供 Finalize Flow、Case Matrix、风险确认、进度和 receipt；
- 历史 Release 只读；
- “继续编辑”创建下一版草稿上下文；
- Archive 入口调用 Core，不写第二套状态。

### Core

- `PrototypeRelease` 和 `ReleaseCaptureProfile` Schema；
- Release ID、number、Finalization 状态和错误码；
- profile 到显式 Selection 的展开；
- source drift、completeness 和引用断言；
- archive 后允许/禁止的生产操作。

### Store

- append-only Release 保存；
- 原子 release number；
- Release 到 Run、Snapshot、Catalog 和 Handoff 的可达性；
- archive、fork、clean 与历史 Release 的规则。

### CLI 与 Local Service

- CLI 只负责参数、确认、Core 调用和输出；
- Local Service 提供浏览器到 Finalization JobHost 的受限入口；
- 两者都不复制 Release、Selection、risk 或 active-ref 算法。

### MCP

- 默认 Handoff 消费链路保持不变；
- 可选提供只读 Release index，供用户按 Prototype/version 浏览；
- Release 浏览不加入 Agent 默认实施上下文；
- 不从 active/latest 或 Store 路径推断 Release。

## PBWork UI

### Prototype 列表与详情

- 顶层列表每个 Prototype 只出现一次；
- 列表展示 Working Draft、latest Release 和 archive 状态摘要；
- Release 历史在 Prototype 详情内展开；
- Release 卡片展示版本、时间、source revision、Snapshot、Handoff、Coverage 和 risk；
- 历史 Release 不提供“退回待确认”操作。

### Finalize Flow

- 显示 source revision；
- 自动运行 authoring lint 和 Release Preflight；
- 展示 profile、完整 Case Matrix、Block、Warning、risk 和容量；
- 确认后展示 Capture、Store、Handoff 和 Release commit 进度；
- 失败时保留诊断与重试入口；
- 成功时展示 Release vN receipt。

### Archive

Archive 前必须确认：

- 没有 running Finalization/Capture Job；
- 用户看到停止新生产操作的影响；
- 历史 Release、Snapshot、Handoff 和 Review 保持可读；
- 是否允许从 archive 恢复必须由 Core Contract 明确，不能沿用当前 localStorage 行为。

## 实施顺序

本路线单独排期后按以下顺序实施：

1. 决策与现有 lifecycle 数据迁移策略；
2. Core Release/Profile Contract 与 Store；
3. Finalization Orchestrator 与 CLI；
4. PBWork Prototype/Release 投影和 Finalize Flow；
5. Archive、兼容读取和全链路 E2E；
6. 同步 Product、Architecture、Reference、PBWork 手册和包 README。

该顺序不与 Target provider Roadmap 共享里程碑。Target Review 可以继续直接基于固定 Handoff 工作，不等待 Prototype Release。

## 验证计划

- Release Schema strict parsing 和 round-trip；
- Bundle 内 release number 并发分配；
- Release 引用必须由同一 Workspace/Prototype lineage 到达；
- Finalization 失败、取消或重试不创建半成品 Release；
- Profile 在 PBWork 与 CLI 产生相同显式 Selection 和 Case IDs；
- whole Prototype 覆盖所有 release-required Screen/Variant/Scenario；
- source revision、Runtime input version 或 Case Matrix 漂移确定性失败；
- v1 历史只读，继续编辑后生成 v2；
- Archive 后历史可读，禁止的生产操作被拒绝；
- 旧 Bundle/Handoff 保持可读，但不补造 Release number。

## 风险与控制

- Case 数量爆炸：使用版本化 profile、显式 Matrix 和阻断上限；
- Git revision 增加操作成本：这是可复现 Release 的可信边界；
- 生命周期与 Evidence 状态混淆：管理状态只引用 Core 事实，不复制状态机；
- MCP 默认上下文膨胀：Release history 只按需读取；
- 旧 localStorage 数据误升级：只能作为迁移提示，不能成为 final/archive 事实。

## 决策检查点

1. 正式 Release 是否强制 clean Git commit；
2. 哪些 Variant/Scenario 标记为 release-required；
3. 首期是否只固定一个 Theme 和 canonical device；
4. Prototype lineage 与现有 Bundle 是一对一还是显式关联；
5. Archive 是否允许恢复，以及恢复后的生产规则；
6. `PrototypeRelease` 是独立 Store 对象还是 Bundle manifest 的 append-only entry；
7. 普通 `deliver` 是否允许引用 Release，还是 Release 只服务 Finalization；
8. 旧 lifecycle override 如何提示、清除或保留为非权威偏好。

## Roadmap 退出标准

- PB/PBWork 现有 Evidence 核心链路保持通过；
- 顶层按稳定 Prototype identity 展示，不复制 `_v1/_v2` 原型；
- PBWork 可从固定 source revision 创建不可变 v1/v2；
- Finalization 自动展开全原型 Selection，但保留 Case Matrix 和风险确认；
- 失败、取消和重试不产生半成品 Release；
- 历史 Release 只读，继续编辑只创建下一版 Working Draft；
- Archive 行为来自 Core，历史 Evidence 与 Handoff 保持可读；
- CLI、PBWork、MCP 和 Local Service 没有复制 Core Release 语义；
- Schema、实现、测试和已经落地的权威文档同步完成。

## 相关资料

- [产品总览](../product/overview.md)
- [产品工作流](../product/workflow.md)
- [Evidence 模型](../architecture/evidence-model.md)
- [采集链路](../architecture/capture-pipeline.md)
- [PBWork 架构](../architecture/pbwork.md)
- [PBWork 与 ProtoBridge 协作](../guides/pbwork-and-pb.md)
