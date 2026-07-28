# ProtoBridge V2 实施指南

> 状态：可进入实施；本指南允许随代码验证更新
> 权威范围：当前仓库的推荐落点、实施顺序、测试、迁移和发布纪律
> 上位目标：[V2 产品闭环与实施总览](./pb-v2-overview.md)
> 不可违背语义：[V2 核心规范](./pb-v2-spec.md)
> PBWork 行为：[PBWork 与 PB 的操作闭环](./pbwork-pb-v2-workflow.md)

本文件回答“从当前代码库怎样开始和推进 V2”，不宣称提前知道全部最终实现。模块边界、候选目录和库可以在实施中调整，但不得破坏核心规范、用户闭环或阶段完成条件。

实施不再继续扩写计划级 TypeScript 类型。进入每个阶段后，具体字段、错误码、API、目录、摘要、锁和认证方案通过代码中的可执行 Schema、测试及必要 ADR 决定。

## 当前代码基线

截至 2026-07-28：

| 当前能力                                                    | 真实位置                                                        | V2 处理                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Core workflow、capabilities、capture、source/target adapter | `packages/core`                                                 | 作为 V2 业务语义和执行能力的初始承载                       |
| V1 固定文件 Artifact writer                                 | `packages/core/src/artifacts`、`packages/core/src/capabilities` | 阶段二建立 Store 边界，阶段七删除                          |
| Playwright 单 URL Capture                                   | `packages/core/src/snapshot/browser-capture`                    | 逐步演进为 Case/Matrix Orchestrator                        |
| CLI `init/generate`                                         | `packages/cli`                                                  | 保持 V1 可用，新增 V2 命令族，阶段七删除旧 generate        |
| MCP page resources 和内存 PageStore                         | `packages/mcp-server`                                           | 阶段五改为持久 Store Reader                                |
| PBWork Registry、Runtime、Workbench Bridge                  | `apps/pbwork`                                                   | 复用 Registry/画布上下文，新增 Capture Protocol 和 Console |
| Flutter Target 分析和 Planner                               | `packages/core/src/target/flutter-app`                          | 查询/验证能力保留，Planner 退出；阶段五建立独立边界        |

当前不存在：

- 持久 Evidence Store；
- Bundle、Snapshot、Case revision 或 Handoff；
- Local Service；
- Case Matrix、JobHost 或 Scenario runner；
- PBWork Capture Console；
- Store-backed MCP resources。

现有 `PageCanonical` 是一次页面重建结果，包含 Source、Runtime、Screenshot 和 Target 信息，不等同于 V2 Evidence revision 或 Snapshot。V2 可以编写迁移/对照 fixture，但不能只把 V1 对象改名后继续混存 Target 事实。

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

### V1 与 V2 的关系

- V1 在阶段七前保持正式入口可用；
- V2 使用独立 Schema、Store 和入口，不写入 V1 output；
- 可以在开发分支内部同时存在 V1/V2 代码，但不发布用户可见双轨产品；
- V2 不读取或自动迁移旧 Artifact；
- 阶段七一次性删除 V1，而不是长期维护 adapter。

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

阶段六再迁移其余 Registry；首切片不能依赖尚未存在的 markers、critical 或 Scenario 声明。

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

| 输入            | 首要实现重点                                                     |
| --------------- | ---------------------------------------------------------------- |
| instrumented    | 完整 Contract、确定 Case、Scenario、Source/Runtime provenance    |
| generic runtime | 可见 DOM、ARIA、computed style 和 Screenshot；不生成隐藏业务事实 |
| screenshot-only | 受控 Blob、可见视觉和文字；完整 Case 维度由 Preflight 归一       |

generic 和 screenshot-only 可以在 instrumented 垂直切片稳定后实现，但 Store、Coverage、Handoff 和 Consumer 使用同一对象关系。

## Local Service 与 PBWork 接入

PBWork 是浏览器应用，不能直接依赖 Node、Playwright 或 Store，因此需要本地进程边界。可以新增 `packages/local-service`，也可以先由 CLI 的 `serve` 入口承载；在 PBWork 垂直切片验证前不冻结包形态。

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

认证、事件传输和 token 保存方式在 Service 实现时决定。最低安全测试包括：

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

阶段七前保留 V1 `generate`；V2 使用独立命令入口，避免行为含义混淆。

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
- 可选 Source Adapter；
- Evidence Store；
- Capture defaults、limits 和 retention；
- Local Service 安全配置。

配置禁止保存：

- 某次 Agent 任务的 target root；
- 目标工程组件映射；
- Handoff 的物理路径；
- 用户或 IDE 的 MCP 安装配置。

MCP 连接配置属于用户、IDE 或 Agent 环境。Target root 来自单次 tool 参数或 Agent 当前工作目录。目标仓库不需要 `proto-bridge.config` 才能消费 Evidence。

V2 配置 Schema 在实现时与 Core Contract 一起落地。阶段七前 V1/V2 配置可以并存，但必须通过明确版本区分，禁止把 V1 字段静默解释为 V2。

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
- instrumented、generic runtime、screenshot-only；
- V1/V2 固定任务对比。

根级 build/test 当前没有完整覆盖 PBWork。阶段六前必须建立一个仓库级验证入口，至少运行 Core、CLI、MCP 和 PBWork 的 build、typecheck、unit 和关键 E2E。

## 迁移台账

阶段六开始时从当前 Registry 自动生成并提交受版本控制的迁移基线。当前期望是 2 个 Prototype、25 个 Screen、82 个 Variant；最终验收还必须确认基线与当前 Registry diff 为零，不能只检查硬编码数量。

执行 V2 对比任务前先冻结：

- V1 基线提交和目标仓库基线；
- 固定任务集、输入 Evidence 和任务说明；
- `manualEvidenceSupplements`、`unsupportedAssumptions`、`evidenceCausedMisimplementations`、`reworkCycles` 和 `taskCompleted` 的计数口径；
- 评分 rubric、评分责任人和争议复核方式；
- 每次任务的原始记录格式。

固定任务集至少包含：

1. Ledger Planet 当前 Screen；
2. Ledger Planet Overlay / Scenario；
3. Ledger Planet 多 Screen Flow；
4. Ledger Planet Fragment；
5. Field Service 当前 Screen；
6. Field Service 表单 validation / submit Scenario；
7. generic runtime；
8. screenshot-only。

冻结后 V1/V2 使用相同输入和验收清单，不能在看到 V2 结果后修改分母或评分规则。

每个 Screen 至少记录：

- Prototype、Screen、default Variant 和全部 Variant；
- critical Variant；
- required semantic nodes；
- 重复实例及 `pbKey` 来源；
- Action 和 Overlay；
- Component、Slot 和 Token；
- Scenario、owner 和 Checkpoint；
- Theme 和 Device；
- Preflight、Capture、Coverage 和 open Issue；
- instrumented/source 能力；
- 迁移结果和验收证据。

每项必须是明确值、`none`、`not-applicable` 或带 Issue 的 `unsupported`，不能留空或用“其他不退化”替代。

迁移顺序：

```text
ledger-planet.task-list 垂直切片
→ Ledger Planet 全量
→ Field Service
→ generic runtime / screenshot-only fixtures
→ 固定 V1/V2 目标实现任务
```

## V1 退出与发布

只有总览阶段七完成条件满足后才能删除：

- `page-canonical.json`、`ui-build-plan.json`、`ui-build-review.md` writer；
- V1 PageCanonical/Planner 和 Target planning 主链；
- CLI `generate`；
- MCP page-centric resources、prompts 和内存 PageStore；
- V1 fixtures、兼容配置和死代码。

删除后执行：

- 全库搜索旧 artifact、page URI、命令和 prompt；
- 检查 package exports、binary、README、AGENT、docs 和 skills；
- 从干净安装构建并启动 CLI、MCP、PBWork 和 Local Service；
- 复跑真实 PBWork → Handoff → MCP → Target 实现；
- 检查发布包版本一致。

当前正式发布包基线为 `0.4.0`，V2 目标为 `0.5.0`。根包和 PBWork 当前版本不同，阶段七必须明确哪些包正式发布、哪些保持 private，并建立统一发布检查，不能只修改一个 `package.json`。

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
