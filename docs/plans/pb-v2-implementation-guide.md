# ProtoBridge V2 实施指南

> 状态：阶段六、阶段七按批准的收敛范围完成；V2-only，未发布
> 权威范围：当前仓库的实现落点、测试、存量隔离和 V1 退出纪律
> 上位目标：[V2 产品闭环与实施总览](./pb-v2-overview.md)
> 不可违背语义：[V2 核心规范](./pb-v2-spec.md)
> PBWork 行为：[PBWork 与 PB 的操作闭环](./pbwork-pb-v2-workflow.md)

本文件回答“从当前代码库怎样开始和推进 V2”，不宣称提前知道全部最终实现。模块边界、候选目录和库可以在实施中调整，但不得破坏核心规范、用户闭环或阶段完成条件。

实施不再继续扩写计划级 TypeScript 类型。进入每个阶段后，具体字段、错误码、API、目录、摘要、锁和认证方案通过代码中的可执行 Schema、测试及必要 ADR 决定。

## 当前代码基线

截至 2026-07-30：

| 当前能力                                                    | 真实位置                                                        | V2 处理或进度                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| V2 Contract、fixtures、scope/active resolver                | `packages/core/src/v2/contracts`、`fixtures`、`resolver`        | 阶段一门禁已通过                                                        |
| V2 本地文件 Store、Job journal、Run/Snapshot commit         | `packages/core/src/v2/store`                                    | 阶段二门禁已通过                                                        |
| Core Evidence workflow、capture 与 Store                    | `packages/core/src/v2`                                          | 作为唯一产品语义和执行能力                                               |
| V1 Artifact、Planner 与生成链                               | 已删除                                                          | 不再提供兼容入口                                                         |
| V2 Runtime Contract、Preflight、Matrix 与 Capture           | `packages/core/src/v2/runtime-contract`、`capture`              | 阶段三门禁已通过                                                        |
| 顶层 Evidence CLI                                           | `packages/cli`                                                  | 无 `v2` 前缀；V1 `generate` 已删除                                       |
| MCP Evidence Reader 与 Target 查询                          | `packages/mcp-server`                                           | V1 页面资源、PageStore、工具与 Prompt 已删除                             |
| PBWork Registry、Runtime、Capture Console                   | `apps/pbwork`                                                   | 三个账本星球页面严格迁移；其余存量页面显式 legacy 隔离；新增页面默认严格 |
| V2 Local Service                                            | `packages/local-service`                                        | 阶段四门禁已通过；只承载安全会话和 Core/Store/JobHost 适配              |
| Flutter Target 查询与验证                                   | `packages/core/src/target/flutter-app`                          | 已与 Capture 解耦；只读查询/验证保留，Planner 退出                       |

当前已实现：

- `@proto-bridge/core/v2` 与 `@proto-bridge/core/v2/store` 公共边界；
- Case、Capture Scope、Evidence revision、Attempt、Run、Snapshot、Staleness Report 和 Handoff 的首版可执行 Schema；
- `scopeKey` 规范化、primary/scoped active 解析、防降级和 relevant Attempt 选择；
- queued/discovering/capturing/writing/terminal Job 状态与合法单向迁移；
- Workspace/Bundle/Prototype/Run/revision/Snapshot/Staleness/Handoff 的通用引用与归属断言；
- 单 Workspace 本地文件 Store、不可变 Run/revision/Snapshot、active Snapshot 原子切换；
- 持久 Job journal、启动时 orphan 终结、单 writer 锁和跨进程读取基础；
- 新 Bundle 与首 Snapshot 原子创建，Store 写入边界执行通用引用与归属断言；
- Catalog revision、受控 Blob、依赖摘要、等价 Scope 复用和 Staleness Report 生成；
- Bundle fork/archive、容量门禁、retention 与 clean plan/apply；
- 写入失败保持旧 active Snapshot、幂等重试和 clean 执行前引用重检；
- 浏览器安全的 V2 Capture Protocol Schema，以及 describe、prepare、readiness、semantic snapshot、reset、Action 和 Checkpoint；
- Core 唯一的 Selection normalization、Preflight、warning acceptance、Case Matrix 和 Device profile；
- 隔离 Browser/Context、固定 viewport/DPR/locale/timezone/clock/theme/motion/network 的 Playwright Case Capture；
- Capture Orchestrator 的等价复用、失败/取消隔离、Run/Coverage/Blob 和 Snapshot 提交；
- `ledger-planet.task-list` 的稳定 Marker、critical Variant、Action、Scenario、Checkpoint 与重复实例 `pbId + pbKey`；
- Variant `requiredFragments` 完整性契约、缺少契约时的 semantic-coverage unknown，以及 Action/Scenario Contract 事实；
- instrumented、generic-runtime、screenshot-only 三种输入和固定三页浏览器基准；
- `ledger-planet.task-list` 正反 fixtures 及 Contract/Store 测试。
- `@proto-bridge/core/v2/service-contract`、隔离 Runtime Preflight、durable `CaptureJobHost` 与固定 Snapshot Handoff；
- 仅本机监听、Origin/session/payload 受控的 Local Service，以及重启 orphan Job 的诚实终结；
- PBWork 四类 Capture 入口、Draft/Preflight/Matrix、后台 Job、Coverage/Issue/Screenshot/stale、retry/fork/archive 和 Handoff；
- 页面关闭后的 Job 恢复、仅重采 stale、逐项 warning/risk 确认和失败 Case 原因展示。
- 原型列表、原型概要、画布和 Inspector 的就地 Capture 入口，以及工作台底部确认 Sheet；
- 全局后台 Job Center、成功/失败通知和固定 Snapshot 的截图优先 Evidence Viewer；
- PBWork 与 MCP 共用的 Screen/Case Evidence Read Model；
- MCP 对 Workspace、历史、Run、Snapshot、revision、Fragment、Catalog、Issue、Staleness、Handoff 和受引用约束 Blob 的只读消费；
- V2 CLI Workspace 配置、Preflight/Capture、Job、Bundle、stale 和 Handoff 命令族，以及 JSON/错误退出约定；
- CLI 与 PBWork 共用 Core Selection/Preflight/Case Matrix，未知 warning/risk 不能被笼统强制绕过；
- Flutter Target 只读查询/验证边界，Capture 主链不依赖 Target，目标工程不要求 ProtoBridge 配置；
- Agent Handoff Consumer 指南、MCP resource/prompt 和真实 Target 消费 E2E。

当前明确不作为完成条件：

- Source Adapter 和 `instrumented-source-runtime` 级别提升；
- 25 Screen / 82 Variant 全量迁移；
- V1 / V2 定量对照；
- npm 发布与版本统一。

## 当前实施进度评估

| 阶段                    | 判断   | 已有证据                                                                                                                                 | 进入下一门禁前的主要缺口                               |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 一：核心产品语义        | 已完成 | Workspace 与核心对象 Schema、统一状态枚举、正反 fixtures、scope resolver、防降级、固定 Handoff、通用引用断言和门禁测试通过               | 无                                                     |
| 二：证据模型与存储      | 已完成 | 原子 Bundle 首 Snapshot、immutable Store、Job 恢复、Catalog/Blob、依赖级 stale/复用、fork/archive、容量与 safe clean 的 Store tests 通过 | 无                                                     |
| 三：Runtime 与捕获      | 已完成 | Capture Protocol、稳定 Matrix、Scenario runner、三种输入、Playwright Orchestrator 与真实 Store 浏览器闭环通过                            | 无                                                     |
| 四：PBWork 操作闭环     | 已完成 | Local Service、四类 Draft、Preflight/Matrix、后台 Job/恢复、Evidence/stale、Bundle 管理和固定 Handoff 的 unit/service/E2E 通过           | 无                                                     |
| 五：CLI、MCP 与消费链路 | 已完成 | V2 CLI Producer、完整 MCP Evidence Reader、Handoff Consumer、Target 独立边界及真实目标工程 E2E 均通过                                  | 无                                                     |
| 六：代表性闭环验证      | 已完成 | 新页面严格门禁、存量 legacy allowlist、账本星球三页 Runtime/截图/Store 回归                                                             | 无                                                     |
| 七：V1 退出与仓库收口   | 已完成 | V1 产品链、旧 CLI/MCP 入口、旧导出与依赖已删除；默认入口仅保留 Evidence 产品                                                            | 无；发布不在本阶段范围                                 |

当前统一验证入口为 `pnpm verify`，覆盖冻结锁文件安装、构建、类型检查、Core/Service/CLI/PBWork 单测、PBWork 真实浏览器回归、MCP、Consumer 和 Evidence 垂直切片。2026-07-30 的最终结果为 Core 169、Local Service 6、CLI 5、PBWork 72 个测试，以及 Runtime 4 个浏览器用例全部通过；MCP、Consumer 和垂直切片也通过。整个 Prototype 仍可展开 Matrix，但浏览器回归固定在三个账本星球代表页面，不启动存量页面全量采集。

## 阶段五前证据质量与 PBWork 可用性门禁（已通过）

此门禁暂停阶段五，不是新增实施阶段，也不提前执行阶段六迁移。除证据质量外，PBWork 必须达到可由用户自行理解任务、发起采集、检查结果和定位问题的可用性基线。当前随机点击产生的稀疏 Store 数据不作为采集能力上限，也不要求为通过门禁而重做 `analytics`、`ledger-list`、`create-work-order` 或其他原型。

PBWork 可用性基线包括：

1. 一级导航保持纯图标并提供可访问名称；采集区二级导航明确区分任务与采集结果。
2. Prototype、Screen、Fragment 三类入口使用一致的工作壳控件和清楚的动作语义。
3. 采集 Sheet 自动检查范围，Prototype 级策略默认一次设置，逐 Screen 只处理例外。
4. 任务中心优先展示需要处理和运行中的任务；完成任务进入独立 Evidence Review。
5. Evidence Review 按 Screen、Case 和语义区域形成可读映射，同时保留原始事实顺序与引用。

判断顺序：

1. 以充分仪表化的 `ledger-planet.task-list` 为黄金样本，直接调用 Core Capture，不依赖 Capture Console 页面交互；
2. 验证 default、critical、Fragment、Scenario Checkpoint、重复输入复用和 Screenshot owner ref；
3. 逐项核对稳定身份、可见文本、role、tag、bbox、Action/Scenario Contract、provenance、unknown/conflict/heuristic 和 Store revision；
4. 对未声明 `requiredFragments` 的稀疏页面只保存实际观测事实，并生成 `semantic-coverage-contract-missing` unknown；不得推断未观测节点或业务状态；
5. Handoff 必须暴露 required unknown；请求 Screenshot 却没有持久 Blob 时必须为 partial；
6. 黄金路径不合格才修复采集主链；黄金路径合格则不扩大原型改造，只保留诚实降级并进入阶段五。

当前实现采用的最小完整性契约是 Variant `requiredFragments`。Fragment-only Selection 的所选 Fragment 是该 scoped revision 的覆盖边界；完整 Selection 没有 authored boundary 时，“捕获成功”只表示已诚实保存观测结果，不表示页面语义已经完整。

门禁结论（2026-07-29）：通过。

- `task-list` default、claimable、Scenario Checkpoint 均产生完整 resolved Evidence，稳定行 `t1/t2/t3` 的文本、role、tag、bbox 与可见性和 Runtime 一致；
- Action 与 Scenario Contract 已作为带 `runtime-contract` provenance 的事实持久化，Screenshot Blob 均正确归属 revision；
- `t2` Fragment-only Capture 只包含所选重复实例，等价输入命中同一 revision reuse；
- 黄金路径没有 heuristic、unknown 或 conflict；`analytics` 未声明完整性边界时仍保存实际 Marker，但额外产生一个 required unknown，Handoff 明确暴露该风险；
- Core 173 tests、PBWork 68 unit tests、Local Service 6 tests、PBWork Runtime/Console 6 browser E2E、仓库 typecheck 与 PBWork build 通过。

可用性补充验收（2026-07-29）：

- `task-list` 从画布就地发起，在底部 Sheet 二次确认，后台完成后通过全局通知进入 Evidence Viewer；
- Viewer 与 MCP 对同一 `bundleId/snapshotId` 均判断执行覆盖 `complete`、语义覆盖 `declared`，并读取到真实 Screenshot 与带 provenance 的 Facts；
- `analytics` 在缺少 authored 完整性边界时显示 `limited`，保留实际 Screenshot/Facts，不使用占位图、不补造缺失事实；
- 可复现入口为 `pnpm test:e2e:evidence-slice` 和 `pnpm test:e2e:mcp`。

## 当前实施顺序

七个阶段均已关闭门禁。阶段六与阶段七按用户批准的收敛范围联合完成：先建立未来原型门禁与三页证据闭环，再删除 V1 并复跑全链路；没有执行发布。

### 阶段一完成记录：核心产品语义

| 门禁要求                                                            | 可执行证据                                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 唯一 V2 Schema 与稳定身份                                           | `contracts/workspace.ts`、`ids.ts`、`case.ts`、`scope.ts` 及 `ids-and-vocabulary.test.ts`、`case-identity.test.ts`、`scope.test.ts` |
| 核心对象、状态与错误分类                                            | `contracts/*`、八态 `JOB_STATUSES`、Job 单向迁移及 `job.test.ts`                                                                    |
| primary/scoped active 与防降级                                      | `resolver/active-ref-resolver.ts`、`activation.ts` 及对应 resolver/activation tests                                                 |
| 跨对象引用和归属                                                    | `resolver/references.ts` 与 `references.test.ts`                                                                                    |
| 成功、unknown、conflict、partial、stale、failed retry、固定 Handoff | `fixtures/ledger-planet-task-list` 与 valid/invalid/Handoff tests                                                                   |
| Schema compatibility                                                | 所有阶段一持久对象拒绝未知 major，见 `schema-version.test.ts`                                                                       |
| 历史不可变                                                          | `immutability.test.ts` 及 immutable Store tests                                                                                     |
| V1 隔离                                                             | V2 只从 `@proto-bridge/core/v2`、`@proto-bridge/core/v2/store` 导出，V1 根导出未改变                                                |

完成条件：

- 阶段一完成条件逐项有 Schema、断言、fixture 或可执行测试；
- PBWork、CLI、MCP 和 Store 后续可以复用同一套状态与引用断言；
- 当前 Core build、typecheck 和 V2 tests 通过。

### 阶段二完成记录：证据模型与存储

| 门禁要求                         | 可执行证据                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 新 Bundle 与首 Snapshot 原子创建 | `V2Store.createBundle`、staging directory rename 及 atomic Bundle tests                                                        |
| Store 引用和归属断言             | `assertRunReferences`、`assertSnapshotReferences`、`assertStalenessReportReferences`、`assertHandoffReferences` 在写入边界执行 |
| Catalog revision 与受控 Blob     | `contracts/catalog.ts`、`blob.ts`、digest/大小/媒体类型/owner ref 校验及持久化测试                                             |
| 依赖摘要、复用与 stale           | `dependencyDigests`、`findReusableEvidence`、`createStalenessReport` 及无关依赖不扩散测试                                      |
| Bundle 生命周期与安全清理        | `archiveBundle`、`forkBundle`、`planClean/applyClean`、容量门禁和传递引用保护测试                                              |
| 并发、失败恢复和幂等             | 单 writer 锁、orphan Job 终结、旧 active Snapshot 保持、active pointer 重试及 clean 二次校验测试                               |
| Store 验收矩阵                   | `local-file-store.test.ts`、`phase-two-store.test.ts`、`snapshot-builder.test.ts`                                              |

完成条件：

- 满足总览阶段二全部完成条件；
- 不存在可消费的空 Bundle；
- 错误 Workspace、Bundle、Prototype、Snapshot、Attempt 或 revision 引用均确定性失败；
- Store 重启后所有固定 refs 可读；
- clean 不会破坏 active Snapshot、未归档 Bundle 或 Handoff；
- CLI/MCP/PBWork 未提前接入第二套业务逻辑。

### 阶段三完成记录：Runtime 与捕获

`ledger-planet.task-list` 已完成：

1. 最小 V2 instrumented markers、critical Variant、Action、Scenario 和 Checkpoint；
2. Capture Protocol 的 describe、prepare、readiness、semantic snapshot 和 reset；
3. Core Selection normalization、Preflight、稳定 Case Matrix；
4. 单 Case、Fragment 和一个 Scenario Checkpoint 的 Playwright Capture；
5. Capture 结果提交至真实 V2 Store，并验证失败隔离和 failed retry 保留 active Evidence。

完成条件：

- 从 Selection 到 Snapshot 的真实垂直切片通过；
- default/critical、Fragment、Scenario Checkpoint 和 reset 均由同一协议执行；
- 同输入重复 semantic snapshot 稳定，等价输入命中 Store reuse；
- 单 Case 失败、取消和 unsupported 不阻断已成功结果提交；
- failed retry 保留旧 active Evidence；
- generic-runtime 与 screenshot-only 使用同一对象关系并保持诚实 Evidence Level；
- 阶段三专用 E2E 只回归 `task-list`、`ledger-list`、`create-work-order` 三页。

| 门禁要求                           | 可执行证据                                                          |
| ---------------------------------- | ------------------------------------------------------------------- |
| 唯一 Runtime Contract              | `v2/runtime-contract/protocol.ts` 与 `runtime-contract.test.ts`     |
| Selection、Preflight 与稳定 Matrix | `capture/selection.ts`、`preflight.ts` 与 `preflight.test.ts`       |
| instrumented fixture               | PBWork Registry、`TaskList.vue`、`TaskDetail.vue` 及 Registry tests |
| Playwright Case 隔离与固定环境     | `capture/playwright-driver.ts`                                      |
| Store transaction 与故障路径       | `capture/orchestrator.ts`、`orchestrator.test.ts`                   |
| 真实浏览器闭环与三页基准           | `apps/pbwork/e2e/runtime-capture-v2.spec.ts`                        |

### 阶段四完成记录：PBWork 操作闭环

已完成：

1. `packages/local-service` 建立 PBWork 与 Core/Playwright/Store 的本地边界，浏览器不直接访问 Node 能力或文件路径；
2. 当前 Screen、稳定 Fragment、自定义范围和整个 Prototype 四类入口生成同一 `SelectionDraft`；
3. Preflight 固定 Runtime 输入、Manifest 摘要和 Case Matrix，warning 未逐项确认、身份缺失、过期或超限时拒绝 Job；
4. Job 接受前持久化，页面关闭后继续执行并可恢复，Service 重启时把孤儿 Job 终结为 `interrupted`；
5. Console 展示 Coverage、Issue、unknown、Screenshot、失败原因和 stale，并支持 cancel、retry、仅重采 stale、fork 与 archive；
6. Handoff 在 Core 中解析 active Evidence，逐项确认 partial/stale/policy risk，并固定到创建时 Snapshot。

完成条件：

- 四类入口共用 Core Preflight、JobHost、Capture Orchestrator 和 V2 Store；
- Local Service token 不进入 URL、日志或持久对象，旧 Service session 在重启后失效；
- 后台 Job、恢复、失败/取消、过期 Preflight 和受控 Blob 均有 service/Core 测试；
- `task-list` 验证当前 Screen、Fragment、warning 和 Handoff，`ledger-list` 验证页面关闭恢复，`create-work-order` 保留为三页回归基准；
- 整个 `ledger-planet` 只验证 55 项 Matrix 与前 50 项展示，不执行全量浏览器 Capture；
- 新 Snapshot 不改变旧 Handoff 的 Snapshot/revision 引用。

| 门禁要求                   | 可执行证据                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Service 安全与恢复         | `packages/local-service/src/service.ts`、`packages/local-service/test/service.test.ts` |
| Core Job/Handoff 边界      | `capture/job-host.ts`、`runtime-preflight.ts`、`handoff.ts` 及 Core tests              |
| 四类 Draft 与交互          | `apps/pbwork/src/app/stores/capture.ts`、`CaptureConsole.vue`、PBWork unit tests       |
| 页面关闭恢复与固定 Handoff | `apps/pbwork/e2e/capture-console-v2.spec.ts`                                           |
| 三页固定基准               | `runtime-capture-v2.spec.ts` 与 `capture-console-v2.spec.ts`                           |

### 阶段五完成记录：CLI、MCP 与消费链路

已完成：

1. `packages/cli` 建立 Workspace 配置和命令族，覆盖 Preflight、Capture、Job、Bundle、stale、Handoff 与 Service 生命周期；
2. CLI 和 PBWork 使用同一个 Core Selection/Preflight/Matrix，逐项接受 warning/risk，拒绝无边界 `--force`；
3. MCP 的 Store Reader 按固定 Workspace、Snapshot 和 revision 读取历史对象，覆盖 Run、Fragment、Catalog、Issue、Staleness、Handoff 与受引用约束的 Blob；
4. MCP 对 Workspace 不匹配、对象缺失和不可达 revision 返回稳定的结构化错误，不猜测 Store 路径；
5. Capture 不 import Flutter Target；Target 查询和变更验证通过独立导出及 MCP tool 暴露，不向 Evidence 写回目标事实；
6. Agent Consumer 按 Handoff → Snapshot → revision 的固定顺序读取 Evidence，完整报告 required unknown 等 risks，再读取、修改并验证无 ProtoBridge 配置的目标工程。

| 门禁要求                              | 可执行证据                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PBWork/CLI Matrix 完全一致            | `packages/cli/test/v2-cli.test.ts`                                                                            |
| CLI Producer 与生命周期              | `packages/cli/src/v2`、`packages/cli/test/v2-cli.test.ts`                                                     |
| MCP 历史对象和固定引用读取            | `packages/mcp-server/src/services/evidence-store-reader.ts`、`scripts/test-mcp-evidence.mjs`                 |
| Consumer 风险、真实实现与验证         | `docs/agent-handoff-consumer.md`、`scripts/test-consumer.mjs`                                                 |
| Capture/Target 单向边界               | `packages/core/src/target/flutter-app/query.ts`、`packages/core/test/v2/target-boundary.test.ts`             |
| PBWork → Store → MCP 同证据垂直切片   | `apps/pbwork/e2e/evidence-usability-v2.spec.ts`、`scripts/test-evidence-vertical-slice.mjs`                   |
| 仓库统一门禁                          | `scripts/verify-product.mjs`，执行 `pnpm verify`                                                              |

旧 `PageCanonical`、Artifact writer 和 Planner 已删除；Evidence revision 与 Snapshot 是唯一正式证据模型，Target 事实不会混入其中。

现有 PBWork Workbench Bridge 服务 iframe inspect、comment、highlight 和路由同步；Core 当前读取的 Playwright 页面 metadata 又是另一套机制。V2 Capture Protocol 是新增边界，不能假设已有协议直接满足。

## 总体实施策略

### 不做开工前的大重排

第一批 V2 代码先进入现有 `@proto-bridge/core` 的清晰 V2 命名空间。推荐起点：

```text
packages/core/src/v2/
  contracts/
  evidence/
  store/
  capture/
  runtime/
```

这是推荐落点，不是永久目录 Contract。只有当实际依赖和进程边界被垂直切片证明后，再决定是否提取独立 package。

### V1 退出结果

- V1 Artifact、Planner、配置、CLI `generate` 和 MCP 页面工作流均已删除；
- 不读取或自动迁移旧 output；
- Core 根导出直接指向 Evidence 产品，CLI 默认命令不再带 `v2`；
- 内部 `src/v2` 与 `/api/v2` 保留为 Schema/协议 major version，不是用户可见双轨产品。

### Core 是唯一产品逻辑来源

- Core 拥有 Schema、Selection normalization、Preflight、Matrix、Capture、Evidence merge、激活规则和 Store interface；
- CLI、PBWork Service 和 MCP 调用 Core，不复制这些规则；
- Local Service 只承载浏览器到 Node 的会话、Job、事件和安全边界；
- Runtime 只声明、准备和验证当前页面状态；
- MCP 只读持久 Evidence；
- Target Adapter 只读/验证目标工程。

### 先垂直切片，再扩全量对象

贯穿七阶段的第一条参考切片固定使用当前真实 Registry 中的：

```text
Prototype: ledger-planet
Screen: ledger-planet.task-list
Variant: default
Theme: light
Device: iphone-14 (390 × 844)
Scenario: none
```

切片最终目标：

```text
最小可执行 Schema
→ 单 Case Capture
→ 不可变 Evidence revision
→ Bundle Snapshot
→ CLI inspect
→ MCP 跨进程读取固定 Snapshot
→ 最小 Handoff 解析
```

这条切片按总览阶段顺序逐段完成，不允许为了提前接 CLI/MCP 而跳过 PBWork 阶段门槛。阶段一只建立最小 Contract；阶段二加入 Store；阶段三加入 Capture；阶段四接 PBWork；阶段五再接 CLI、MCP 和 Handoff Consumer。这样可以持续复用同一个真实 Case 验证边界，而不用同时设计全部页面和 API。

## 第一批可直接开工的任务

以下任务属于总览“核心产品语义”阶段，可以立即创建代码和测试：

1. 在 Core 建立 V2 public boundary，不改变 V1 export。
2. 为 Workspace、CaseKey、CaptureScope、EvidenceRef、Case Evidence header、Attempt、Run、Snapshot ref 和 Handoff ref 建立最小运行时 Schema。
3. 建立 `ledger-planet.task-list` 的 valid fixtures：
   - Base Case；
   - full Case primary active revision；
   - Fragment scoped active revision；
   - 同时引用 primary/scoped active 与 latest Attempt 的 Snapshot；
   - `coverageStatus=complete`、`freshnessStatus=fresh` 且无 required risk 的 Handoff。
4. 建立 invalid fixtures：
   - 缺失 Case 维度；
   - unknown major；
   - Handoff 引用未固定 revision；
   - Handoff 仅按 latest 选择了错误 scoped revision；
   - exact Fragment Attempt 失败时错误回退为 primary complete；
   - 多个 covering Scope 无唯一最小项却按时间选择；
   - failed Attempt 清空 active Evidence；
   - higher-level 但 Fragment-only 的 revision 试图替换 primary；
   - Fragment 使用 CSS selector；
   - Target facts 写入来源 Evidence。
5. 实现规范化 `scopeKey` 和唯一 active ref/relevant Attempt resolver，并用上述正反 fixtures 固定选择结果。
6. 为交叉引用、不可变更新、状态词汇和 Schema compatibility 建立测试。
7. 从 Core 导出 V2 Schema 和推导类型，验证 CLI/MCP 可引用同一来源。
8. 记录实施中发现但不影响产品语义的字段选择，不再回填完整类型到计划 Markdown。

第一批任务完成的提交应只建立可执行语义，不创建 PBWork UI、不删除 V1，也不预建全部远期 API。

## 可执行 Contract 的组织原则

- 按对象边界拆 Schema，不创建一个无边界的巨型文件；
- Schema 负责输入验证、持久对象验证和 Reader compatibility；
- 业务不变量通过独立 assertion 验证，不把所有规则塞进字段定义；
- fixtures 同时服务 unit test、Store test、CLI/MCP contract test；
- 每个持久对象可以独立解码并说明自身版本；
- 引用完整性在 Store/Reader 层验证；
- 枚举和错误分类从 Core 导出；
- PBWork 可以生成 JSON Schema 或轻量 client type，但不复制源定义；
- 只有外部可观察语义需要兼容，内部 helper 不进入公共 Contract。

需要 ADR 的情况：

- 改变 [V2 核心规范](./pb-v2-spec.md) 的 MUST 规则；
- 改变持久身份或引用模型；
- 允许自动合并不同输入的 Evidence；
- 改变 Handoff freshness 或风险规则；
- 改变 MCP 只读边界；
- 引入远程、多用户或共享 Store。

普通字段命名、目录调整、Schema 库选择和内部算法不需要修改产品总览，只需测试覆盖。

## Evidence Store 落地

### 初始边界

先在 Core 定义 Store interface，再实现本地文件 Store。CLI、MCP 和 Service 只依赖 interface，不直接拼路径。

Store 最低能力：

- 写入和读取独立持久对象；
- 持久 Job record、Run identity 和 execution journal；
- 以逻辑 ID 和 revision 解析引用；
- 原子提交新的 Bundle Snapshot；
- 保留 Run、Attempt、Evidence revision 和历史 Snapshot；
- 查询 active Snapshot、active Evidence 和 latest Attempt；
- 生成/读取 Coverage、Issue、Staleness Report 和 Handoff；
- 管理 Blob；
- fork、archive 和安全 clean；
- 校验引用、容量和并发写入。

### 实施顺序

先实现：

- 单 Workspace、单进程 writer、多进程 reader；
- Case revision、Attempt、Run、Snapshot；
- active successful Evidence 与 latest Attempt 分离；
- Job 接受后持久化、orphan detection 和 restart finalization；
- 事务失败保持旧 active Snapshot；
- MCP 进程重启后固定引用可读。

再实现：

- 并发 writer 保护；
- Blob 去重和大对象策略；
- Case dependency digest 与复用；
- Staleness Report；
- fork、archive、retention 和 clean；
- interrupted transaction recovery。

不在计划中固定目录、SHA 算法、锁租约或 rename 细节。候选实现必须通过以下性质测试：

- 任一可见 Snapshot 的全部传递引用存在；
- Service 重启后非终态 Job 可以确定性终结为 Run、Coverage 和 Snapshot；
- 写入中断后 Reader 仍读取旧完整 Snapshot；
- 历史对象内容摘要不变；
- 两个 writer 不能互相覆盖；
- clean 计划与 apply 之间重新校验引用；
- Handoff 引用对象永不被 retention 清理。

### Evidence 激活

Store 的 Snapshot builder 必须实现核心规范中的防降级规则。第一版可以采用保守策略：

- 相同 Case、相同输入和等价 Capture Scope 先进入 dominance 比较；完全等价时复用；
- primary promotion 要求完整 Case Scope，且相对现有 primary 不缩小 Scope、不降低 Level 或 required fact/provenance quality；
- 相同输入且没有质量改善时复用现有 revision，不创建“更新但等价”的 primary；
- Fragment-only 或其他窄 Scope 成功结果只能成为对应 scoped active，并在该 Scope 内应用同样的无降级比较；
- 输入变化后的完整 Case Scope 重采可以整体成为 primary active，但必须满足当前 primary profile 的最低要求，不能用旧 revision 补齐缺失部分；
- 其他情况保存 revision、生成 Issue，不自动替换；
- 不自动合并不同 input digest 的 revision。

Snapshot builder 和所有入口必须复用 Core 的 `scopeKey`/active resolver。不得在 PBWork、CLI 或 MCP 中分别实现 exact、primary、covering Scope 和 relevant Attempt 的选择。

后续如需更智能的质量比较，应增加显式测试和 ADR，而不是在 UI 中临时选择“最新”。

## Runtime 与 Capture 落地

### 复用现有能力

- 使用 PBWork 已有 `/prototype/:prototypeId/:screenSlug` canonical Runtime；
- 复用 Registry 对 Prototype、Screen、Variant 和 Theme 的校验；
- 复用现有 Playwright capture 和 DOM/screenshot extractor 中仍符合 V2 provenance 的部分；
- 复用 Workbench Bridge 提供的当前 Runtime context 和临时选中节点；现有 payload 没有 `pbKey`，V2 必须扩展并验证正式 Fragment identity，禁止持久化现有 handle/selector fallback；
- 不复用 V1 Target planning 进入 Evidence merge 的路径。

### 新增 Capture Protocol

Capture Protocol 与 Workbench Bridge 分离。最小能力按以下顺序实现：

```text
describe
→ prototype/screen/variant manifest
→ prepare base case
→ report readiness
→ semantic snapshot
→ reset
→ scenario manifest
→ execute scenario step/checkpoint
```

每个 request kind 的成功响应必须有可执行 Schema。协议不需要一次实现全部 Catalog；先满足 `ledger-planet.task-list` Base Case，再扩展 Component、Token、Navigation 和 Scenario。

Core/Playwright 负责 canonical URL 导航。Runtime prepare 只应用 fixture、Variant、Theme 和业务状态，并返回实际维度。维度不匹配、未知输入或未稳定时明确失败。

Device 是 Core/Playwright 的环境维度：Core 将稳定 Device identity 解析为 viewport、DPR 和相关环境设置，并验证实际浏览器上下文。Runtime 只报告可观测 viewport，并验证 Screen、Variant、Theme 和 fixture；不要求 Runtime 解释 Workbench 的 logical Device ID。

在阶段三开始完整 Capture 前，先把 `ledger-planet.task-list` 迁移为最小 V2 instrumented fixture：

- Screen 根和目标 Fragment 具有稳定 `data-pb-id` / `data-pb-role`；
- 重复行使用模板 `pbId + pbKey`，不再把实例键拼进模板身份；
- Registry/Manifest 声明至少一个 critical Variant；
- 声明一个 Action、一个 Scenario 和一个 Checkpoint；
- template lint、Preflight 和单 Case fixtures 通过。

后续新增 Registry Screen 默认必须声明完整性边界；未迁移的既有 Screen 只允许通过显式 legacy allowlist 保持诚实降级，不能成为新页面绕过门禁的先例。

### Preflight 和 Matrix

Core 中建立唯一 Selection resolver：

- 从 Registry/Manifest 解析 default、critical、all 和 explicit；
- 补全完整 Case 维度；
- 展开 Scenario Checkpoint；
- 规范化 Fragment 和 Capture Scope；
- 判断复用、stale 和防降级风险；
- 生成稳定排序的 Matrix；
- 校验上限和 warning acceptance。

PBWork 和 CLI 对同一 Selection 的 Matrix 必须 byte-equivalent 或经过规范化后语义等价。

### Capture Orchestrator

初始切片可以每 Job 启动一个 Browser；性能数据证明需要后再实现 Browser 复用。无论实现方式如何都必须：

- 每个独立 Case 使用隔离上下文或等价隔离；
- 固定 viewport、locale、timezone、clock、theme、motion、font 和 network policy；
- 不只依赖 `networkidle` 判断稳定；
- 单 Case 失败不终止其他 Case；
- 保存失败所需的 console、page error、request 和 Trace 信息；
- cancel 不启动新 Case，已成功结果可进入 partial Snapshot；
- Scenario 从稳定初态开始，Checkpoint 先验证身份再 Capture；
- Capture 完成后通过 Store transaction 终结 Run/Snapshot。

### 三种 Evidence 输入

| 输入            | 首要实现重点                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------ |
| instrumented    | 完整 Contract、确定 Case、Scenario 与 Runtime provenance；Source adapter 后续提升 Evidence Level |
| generic runtime | 可见 DOM、ARIA、computed style 和 Screenshot；不生成隐藏业务事实                                 |
| screenshot-only | 受控 Blob、可见视觉和文字；完整 Case 维度由 Preflight 归一                                       |

generic 和 screenshot-only 可以在 instrumented 垂直切片稳定后实现，但 Store、Coverage、Handoff 和 Consumer 使用同一对象关系。

## Local Service 与 PBWork 接入

PBWork 是浏览器应用，不能直接依赖 Node、Playwright 或 Store，因此通过私有包 `packages/local-service` 建立本地进程边界。该包调用 Core 的公开 Capture/Store 能力，不复制产品逻辑，也不作为阶段五 CLI 的替代入口。

Service 只负责：

- 本地监听和会话建立；
- 调用 Core Preflight/JobHost/Store；
- Job 查询、取消和事件传递；
- durable Job journal、orphan detection 和 restart finalization；
- 上传受控 Screenshot Blob；
- Origin、URL、路径、payload、并发和日志安全；
- Service 重启后的 interrupted Job 终结。

Service 不负责：

- 自行展开 Matrix；
- 维护第二套状态枚举；
- 直接修改 Snapshot；
- 解释 Evidence 冲突；
- 接收浏览器提交的 Store/Source/output 任意路径。

PBWork 接入顺序：

1. 在现有 Router 增加 Capture Console；
2. 新建独立 capture store，不把持久 Job/Evidence 混入现有临时 inspect selection store；
3. 从当前 Runtime 和 Registry 创建当前 Screen Draft；
4. 接入 Preflight 和 Matrix；
5. 接入 Job progress、结果和恢复；
6. 接入 Fragment Draft；
7. 接入自定义范围和整个 Prototype；
8. 接入 stale、retry、fork/archive 和 Handoff；
9. 完成 Accessibility、容量和大列表处理。

Service 使用短期 session token 和 `Authorization` header；token 不进入 URL，PBWork 通过同源代理访问，所有状态变更请求校验明确 Origin。最低安全测试包括：

- 仅允许本地和明确 Origin；
- token/credential 不进入 URL query、Handoff、Bundle 或日志；
- Service 重启后旧会话失效；
- 未授权浏览器不能读 Store 或创建 Job；
- path traversal、symlink escape 和任意 URL 重定向被阻止；
- 上传 Blob 有大小、类型、归属和生命周期约束。

## CLI

V2 CLI 需要覆盖以下能力族，具体命令和 flag 在实现时由 CLI help 和 contract tests 固定：

- workspace 初始化和诊断；
- Preflight 和 Matrix 展示；
- Capture Job 执行、查询、取消和 retry；
- Bundle/Snapshot/Run/Case inspect；
- Staleness check；
- Bundle fork/archive/clean；
- Handoff create/show/export；
- Local Service 启动。

规则：

- CLI flags 是 Core Selection 的投影，复杂输入使用 Schema 校验的 Selection 文件；
- 交互终端可以逐项确认 warning；
- 非交互模式必须显式提供接受的 warning identities，禁止 `--force` 绕过全部风险；
- screenshot 本地路径由 CLI 校验并转换为受控 Blob，Core/Store 不接受任意客户端路径；
- CLI 无 Service 时可以嵌入同一个 JobHost，但不能复制 Capture 逻辑；
- CLI 创建 Handoff 必须能访问 Producer 输入并生成新的 Staleness Report；
- archived Bundle 不允许 Capture，必须显式 fork；
- partial、cancelled、interrupted、stale 和 blocked 使用可区分的进程结果。

顶层 CLI 直接使用 Evidence 命令；V1 `generate` 与 `v2` 前缀均已移除。

## MCP 与 Consumer

V2 MCP 是 Store-backed Reader 和独立 Target tool 宿主，不是 Capture producer。

Evidence Reader 至少支持发现和读取：

- Workspace 与 Bundle；
- Bundle Snapshot；
- Run 和 Run Coverage；
- Snapshot Coverage；
- Prototype、Navigation、Screen、Component、Token、Asset 和 Scenario Catalog revision；
- Case Evidence revision 和 Fragment；
- Issue、unknown 和 Staleness Report；
- Screenshot、Blob 和受限 Debug Evidence；
- Agent Handoff。

规则：

- MCP 进程连接一个明确 Workspace Store；
- tool/resource 输入使用逻辑 ID 和 revision，不接受任意 Store path；
- 默认返回小型摘要和 refs；
- Handoff 消费始终使用固定 Snapshot/revision；
- 错误 Workspace、缺失对象或不支持 Schema 时结构化失败；
- 禁止自动替换为 active/latest；
- MCP 重启不影响读取；
- raw Source、DOM 和 Trace 只在明确 debug 请求下返回；
- Target tools 不写 Evidence。

Consumer 指南在工具和 Handoff 稳定后落为正式 skill/使用指南。它必须要求 Agent：

1. 校验 Handoff 和 Workspace；
2. 读取固定 Snapshot、Coverage 和 Staleness Report；
3. 按 selection/refs 读取必要 Evidence；
4. 报告 Handoff 中全部 risks，包括 partial、stale、required unknown、unresolved conflict、Evidence Level 限制和人工 promotion；
5. 阅读目标仓库规范和已有实现；
6. 自行决定文件、组件、状态、路由和 Token；
7. 实现、测试并使用 Target validation；
8. 报告结果和剩余风险。

## Target Flutter 边界

当前 Flutter 代码同时包含查询、规划和实现建议。V2 只保留可复用的目标查询与验证：

- 读取目标工程文档和结构；
- 识别 routing、state、i18n、theme 和 component 约定；
- 按 symbol/pattern 查找真实示例；
- 验证 Agent 的目标变更；
- 返回文件和行号。

必须移除或隔离：

- Capture 时扫描 Target；
- 将 Target facts 写入 Evidence；
- 生成 Widget Tree、文件树或强制 mapping；
- 根据 Source 名称自动选择组件、路由或 Token；
- 因 Target unknown 阻塞 Evidence 生产。

阶段五可以将能力提取为独立 package，也可以先以依赖边界和独立 export 实现；最终要求 Core Capture 不 import Target。

## 配置所有权

PB Workspace 配置拥有：

- Workspace identity；
- Runtime 和允许的 Origin；
- 可选 Source Adapter（不是当前完成前提）；
- Evidence Store；
- Capture defaults、limits 和 retention；
- Local Service 安全配置。

配置禁止保存：

- 某次 Agent 任务的 target root；
- 目标工程组件映射；
- Handoff 的物理路径；
- 用户或 IDE 的 MCP 安装配置。

MCP 连接配置属于用户、IDE 或 Agent 环境。Target root 来自单次 tool 参数或 Agent 当前工作目录。目标仓库不需要 `proto-bridge.config` 才能消费 Evidence。

Workspace 配置与 Core Contract 一起校验；默认文件为 `proto-bridge.json`，不再兼容解释 V1 字段。

## 测试策略

### Contract

- valid/invalid Schema 和 unknown major；
- 稳定 ID、词表、duplicate `pbId/pbKey`；
- Case 与 Capture Scope 分离；
- Scenario owner/checkpoint identity；
- cross-reference 和历史不可变；
- Evidence conflict、unknown、provenance 和 Level；
- Handoff fixed refs 和风险状态。

### Store

- revision、Run、Snapshot 和 Handoff 不可变；
- Run/Snapshot Coverage 及其 latest Attempt refs 不可变，后续 Run 不改变旧 Snapshot/Handoff 状态；
- failed retry 保留 active successful Evidence；
- primary/scoped active refs 和防止 Fragment-only/低 Level revision 降级 primary；
- atomic commit、crash recovery 和 concurrent writer；
- Blob integrity、capacity、retention、fork/archive/clean；
- Store 重启后固定引用可读。

### Runtime 与 Capture

- version/capability negotiation；
- prepare dimension match 和显式失败；
- fixed environment、font、animation 和 stability；
- Fragment、Screenshot 和三种 Evidence input；
- Scenario step/navigation/checkpoint/reset；
- cancel、retry、partial、interrupted 和 failure debug；
- 同输入重复采集稳定性。

### Service 与 PBWork

- Session、Origin、URL/path/payload 安全；
- Draft、Preflight、Matrix 和 warning acceptance；
- 当前 Screen、Fragment、自定义范围和整个 Prototype；
- Job 进度、页面关闭和 Service restart；
- Snapshot/Run Coverage、Issue、unknown 和 stale；
- Evidence 降级提示；
- retry、fork/archive、Handoff 和 Accessibility。

### CLI、MCP 与 Consumer

- CLI/PBWork Matrix 等价；
- 交互和非交互 warning acceptance；
- CLI Handoff 和进程结果；
- Store-backed MCP 跨进程读取；
- Snapshot、Catalog、Case、Fragment、Issue、Staleness 和 Blob；
- primary/scoped active resolver、ambiguity hard failure 和按 revision/Scope 读取 stale；
- Workspace/Snapshot/revision 硬失败；
- 无目标工程 PB 配置的 Consumer E2E；
- Target query 与 Capture 解耦。

### 全链路

- 当前 Screen → Snapshot → Handoff → MCP → 目标实现；
- Fragment → Snapshot → Handoff → 局部实现；
- 多 Screen/Prototype → 增量 Bundle → 按需读取；
- Scenario Checkpoint → Case → Handoff；
- partial/stale → 修复 → 新 Run/Snapshot/Handoff；
- 旧 Handoff 在新 Snapshot 后仍读取原 Evidence；
- cancelled/interrupted → 恢复历史 → retry；
- instrumented runtime、generic runtime、screenshot-only。

重复执行的真实浏览器回归固定使用三个账本星球页面：

1. `ledger-planet.task-list`：列表、重复实例、Fragment、Action 和 Scenario；
2. `ledger-planet.task-detail`：详情层级、进度和步骤片段；
3. `ledger-planet.ledger-list`：汇总、搜索、筛选和记录列表。

三个页面的 default 与关键 Variant 都必须声明 `requiredFragments`，对应 Runtime 节点必须有稳定 marker、可见 bbox 和真实截图。整个 Prototype 仍可校验 Selection/Matrix，但不对 legacy 页面逐页启动浏览器 Capture。

## 未来原型门禁与存量隔离

`apps/pbwork/src/prototypes/evidence-policy.ts` 是当前迁移边界：

- 已存在但暂不迁移的 Screen 必须逐项列入 `LEGACY_EVIDENCE_SCREEN_IDS`；
- 不在列表中的 Screen 自动进入严格模式，不能默认降级；
- 严格 Screen 的默认态和关键 Variant 必须拥有非空 `requiredFragments`；
- 每个 required Fragment 必须归属于对应 Screen，并在 Runtime 中可观测；
- 已不存在或已经严格迁移的 Screen 不得继续留在 allowlist。

这保证以后新做的原型默认符合 PB Evidence 规范，同时允许当前不满意的旧原型暂时保留。Source Adapter 不是门禁；没有 Source 时按 instrumented runtime 或更低 Evidence Level 诚实记录。

## 阶段六、七完成记录

阶段六按收敛范围完成：

- 建立未来 Screen 默认严格、存量 Screen 显式 legacy 的注册表门禁；
- `task-list`、`task-detail`、`ledger-list` 完成稳定片段边界和真实浏览器回归；
- Runtime snapshot、真实 Screenshot、Store revision、Handoff 和消费端链路保持一致；
- 不执行 PBWork 全量迁移、Source Adapter 强制验收或 V1/V2 定量对比。

阶段七按收敛范围完成：

- 删除旧 Artifact writer、Planner、page workflow、Target planning 和 Vue source adapter；
- 删除 CLI `generate`、`v2` 前缀、旧配置与旧环境变量；
- 删除 MCP page resources、PageStore、旧 Prompt 和页面重建工具；
- 清理 package exports、依赖、README、AGENT、docs 和 skills；
- 以 `pnpm verify` 统一验证冻结安装、构建、类型检查、单测和端到端闭环；
- 未统一版本号、未打包发布、未执行 npm 发布。

## 实施中的停止条件

遇到以下情况时停止当前实现并先裁决：

- 需要改变总览中的产品职责或七阶段完成条件；
- 需要违反核心规范的历史不可变、固定引用或防降级规则；
- PBWork、CLI 和 Core 对同一 Selection 产生不同 Matrix；
- Service 或 MCP 需要复制 Core 产品逻辑；
- Target 事实必须写回 Bundle 才能继续；
- Handoff 只能通过物理路径或 latest fallback 才能解析；
- 为了实现远程、多用户或共享 Store 而扩大 V2 范围。

普通代码结构、性能策略和内部库选择不构成停止条件，应通过实现、测量和测试决定。
