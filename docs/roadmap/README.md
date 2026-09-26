# ProtoBridge 产品收口计划

> 状态：A.1–A.5 已交付；A.6 与 P1 体验工作尚未开始；核实日期：2026-09-26。本文是唯一在执行的产品 Roadmap，不代表现行 Contract。
>
> 里程碑：P0 可靠性与 P1 PBWork 体验同批交付。P2 只保留进入条件，不进入本次完成定义。

## 进度

| 步骤 | 状态 | 证据 / 剩余缺口 |
| --- | --- | --- |
| A.1 门禁修复与浏览器回归 | **已交付 2026-09-25** | Flutter analyze 0 诊断；Runtime E2E 5/5、Evidence vertical slice 1/1、新增 `finalization-regression.spec.ts` 2/2、PBWork 单测 193/193、文档 123 份与 DS→Target 32/32 组件、154/154 Token 均通过；完整 `pnpm verify` 通过。浏览器回归发现并修复任务中心刷新后漏显“部分失败”的缺陷 |
| A.2 止血 | **已交付 2026-09-25** | PBWork 单测 193、Core 264、CLI 17、Local Service 18 通过；并发轮询用例在原实现上复现两次 Handoff，修复后一次；用户已在 `pb:up` 手工确认失败原因可见、不再无限转圈。未覆盖：跨页签、关闭浏览器后收尾、Service 重启恢复（归 A.3–A.5） |
| A.3–A.5 持久生命周期与幂等 | **已交付 2026-09-26** | Core lifecycle contract + Workspace sidecar；Local Service 自动 reconciliation；Job/Handoff/Delivery operation key 与摘要幂等；Delivery 原子发布；旧 localStorage 固定引用迁移；Service 失败/重启、两页签/刷新、完整 PBWork→MCP vertical slice 均通过。验收修复：rollback 按 record 隔离异常并持久化失败原因；failedCases 优先从 Run attempts 还原并保留含 `::` 的 Case ID；Core 加严 finalizing/rollback 转移与 Snapshot 完整性断言；原子 JSON 写入增加文件及目录 fsync；PBWork 只发起回退并轮询 Service 结果，失败可重试。故障注入覆盖 Handoff/Delivery 已落盘但生命周期未更新、回滚中断后的重启收敛。正式定稿按 Prototype ID 隔离 warning/risk 输入；`pnpm verify`、`finalization-regression.spec.ts` 与 `lifecycle-persistence.spec.ts` 均通过 |
| A.6 恒动 10 项 authored 缺陷 | 未开始 | 可与 A.3–A.5 并行；遮挡项需按 PBWork 视觉评审 |
| B.7–B.11、C.12 | 未开始 | P1 结果分类/Review/窄屏/setup/profile 与旧 Capture 代码清理均未在本轮开始 |

## 当前基线与核实结果

- Core Store 持久化 Job、Run、Snapshot、revision、Blob、Handoff 和 PBWork lifecycle sidecar；生命周期位于配置的 Store root 下 `pbwork/<workspaceId>/lifecycle-v1.json`，Delivery 位于同级 `.proto-bridge/deliveries/`。PBWork localStorage 不再是 lifecycle 事实源；旧 `pbwork.prototype-lifecycle.v2` 仅按固定引用校验迁移。`.proto-bridge/` 不进 Git。
- 2026-09-25 本地恒动 Job 已 `completed`，Snapshot 覆盖 101 Case，其中 91 captured、10 failed；该 Snapshot 没有 Handoff。现行 `pollFinalization` 若执行会把不完整覆盖转为失败态。此记录证明 Store 与生命周期可能脱节，但本机浏览器生命周期状态未被持久化到 Workspace，无法仅凭 Store 证明当时 UI 的具体显示。
- Job 被接受后，Local Service worker 按 lifecycle sidecar 的固定 operation/Job/Bundle/Snapshot refs 推进状态；切页、刷新、关闭浏览器不再承担收尾职责。人工确认仍停在持久阶段，不由后台代确认。Service 重启从 Store Job/Handoff/Delivery 继续 reconciliation。
- 历史冷链 Snapshot 有两份 Handoff（`02:41:34.852Z`、`02:41:38.981Z`）和两份 Delivery，各相隔约 4 秒。原因为详情页与面板重复轮询、客户端可重复创建 Handoff/Delivery；A.2 先加同页轮询锁，A.3–A.5 再以 operation key + request digest、Store single-writer 与 Service reconciliation 收口。当前 Local Service 重启集成回归验证一个固定 operation 最终只有一份 Handoff 和 Delivery。普通 Capture UI 的 `activeJob`/`preflight` 仍是 UI 状态；正式定稿直接调用 Capture Service Contract，warning/risk 勾选按 Prototype ID 隔离。
- **A.2 已修复：** 原先原型列表与详情页的“定稿并采集”按钮在任何 `finalizing` phase（含等待人工确认）都禁用并转圈，收起面板后无法重开；重开面板会 `clearFailure` 抹掉失败原因；读取 Job 的错误被 `refreshActiveJob` 吞掉，未连接时静默返回；失败文案只取第一条英文原因；任务中心把含失败 Case 的 `completed` Job 显示为“采集完成”；Evidence Review 不含失败 Case，全失败时永久显示“加载中”。现行为：按钮改为“继续定稿/查看定稿进度”，失败 operation 保存全部失败 Case 并分组显示，断线显示后台可能仍在运行，任务中心显示“部分失败 · N 项”，Review 顶部显示结论与失败项。A.3–A.5 已把正式收尾与固定身份移到持久化服务文档；A.6 authored 缺陷仍未修。
- Bundle Schema 没有 CLI/Workbench 来源字段；只有部分 Delivery receipt 记录来源。现存未绑定 Bundle 不能可靠倒推出创建入口，也不能自动认领为正式产物。
- Workbench 画布有四种手机预设，Core Capture 的 `resolveCaptureDevice` 目前只注册 `iphone-14`。支持其它三种正式采集需要先扩展 Core 设备配置。默认 Case 上限是 200；例如 26 个 Case 同时采集两种 Theme × 四种设备会成为 208 项，必须在执行前提示超限。
- `pb:up` 已在交互终端缺配置时引导 `pb:init`，并在启动前运行 Doctor；`pb:install` 负责依赖和 Chromium。PB-105 的缺口是这些步骤和 MCP 客户端配置尚未收敛成可恢复的首次使用流程，不能写成现有启动完全没有引导。
- A.1 单跑结果（2026-09-25）：`cd apps/flutter_pb_app && flutter analyze` 0 诊断；`pnpm test:e2e:runtime` 5/5；`pnpm test:e2e:evidence-slice` 1/1；`pnpm --filter @proto-bridge/pbwork exec playwright test e2e/finalization-regression.spec.ts --reporter=line` 2/2；`pnpm --filter @proto-bridge/pbwork typecheck` 通过，`pnpm --filter @proto-bridge/pbwork test` 193/193；`pnpm docs:verify` 123 份文档通过；`pnpm ds:target-sync:verify` 32/32 组件、154/154 Token 通过。随后完整 `pnpm verify` 通过，含 Flutter 30 项测试、Core 264、Local Service 18、CLI 17、PBWork 193 项单测及 Runtime 5/5、Evidence vertical slice 1/1。旧失败快照没有 Dialog，是测试仍寻找已停用的 `LifecycleTransitionDialog` finalize 分支；现行 Sheet 在更新定位后的真实采集中出现并完成流程。新增失败 Case 回归先揭示任务中心在刷新后漏显“部分失败”，修复后通过。
- A.3–A.5 最新验收复核（2026-09-26）：Core 44 个测试文件、269/269；Local Service 4 个测试文件、24/24；CLI 17/17；PBWork typecheck/build 通过、29 个测试文件 191/191；Flutter analyze 0 诊断、Flutter 测试 30/30；文档 123 份；DS→Target 32/32 组件、154/154 Token；Runtime E2E 5/5；MCP E2E 与 Consumer E2E 通过；Evidence vertical slice 1/1（固定 Handoff/Snapshot 可经 MCP 查询）；`finalization-regression.spec.ts` 2/2；`lifecycle-persistence.spec.ts` 1/1；`pnpm verify` **通过**。生命周期浏览器回归首次遇到 Chromium 将自动端口 5060 判为不安全，已把自动选择移到浏览器可用范围，同时保留显式 `PBWORK_E2E_PORT` 优先；单跑及完整门禁均通过。`pnpm docs:verify` 在本次 README 更新前通过，更新后再次运行确认文档校验仍通过。
- 本轮 vertical slice 首次运行发现产品故障：当 Core 风险评估结果为空，Service 试图从 `capturing` 直接跳到 `building-prompt`，违反“生命周期 phase 一次前进一步”契约；reconciliation 外层还吞掉异常，导致 UI 保持 `capturing`。修复为每个完整 Job 先持久进入 `awaiting-risks`，再由 Service 评估无风险/已确认时推进 `building-prompt`；自动 reconciliation 异常转为可见的失败状态和原因。修复后同一 vertical slice 1/1 通过，完成用时 25.4 秒。
- 静态检查确认 `DeliverFlowSheet.vue` 没有生产 import；多个 Capture Store action 仅被它或旧测试调用；`LifecycleTransitionDialog.vue` 的 finalize 分支在两个调用页均不可达。删除范围仍需 production import graph 和完整调用关系复核。

## 问题台账

状态口径：**已证实**指代码、Store 或本次测试可复核；**观察/待验证**指体验判断或根因尚未由回归固定。进度以上方“进度”表为准；台账只记录各问题当前证据与缺口。

| ID | 优先级 | 问题与证据状态 | 完成结果 | 依赖 |
| --- | --- | --- | --- | --- |
| PB-001 | P0 | **已交付：** Local Service worker 以固定引用推进已接受 Job，等待人工确认时暂停；部分失败进入持久失败态；启动时恢复操作。Local Service 集成测试覆盖 Case 失败和 Service restart | 切页、关闭页面后状态仍由服务端推进；失败不生成 Handoff/Delivery，人工确认不被跳过 | PB-002/003 |
| PB-002 | P0 | **已交付：** Core Store sidecar 持久化 stage/operation/history/fixed refs 并校验 Workspace generation + CAS revision；旧 localStorage 仅一次迁移，Service 验证 Job/Run/Snapshot/Coverage/Handoff/Delivery Receipt/Prompt | 跨页签与刷新读取同一服务端文档；未验证的旧正式引用降为待确定并保留诊断，未绑定 Evidence 不可认领 | PB-001/003 |
| PB-003 | P0 | **已交付：** Job/Handoff/Delivery 同 operation key + 摘要复用，摘要不一致冲突；Delivery staging 后原子发布；服务重启回归确认单 Job、单 Handoff、单 Delivery。正式定稿直接调用 Capture Service Contract，warning/risk 输入按 Prototype ID 隔离，不使用全局 Capture Store 的可变字段 | 正式生命周期不从全局 Capture 缓存恢复；服务端固定引用隔离不同 Prototype operation，同页多原型确认状态有单测覆盖 | PB-001/002 |
| PB-004 | P0 | **已交付：** A.1 门禁与 A.2 浏览器回归已纳入 `pnpm verify`；A.3–A.5 增加 failure/restart、旧迁移拒绝、双页签/刷新、产物写入 crash-cut 收敛和 rollback retry 回归。2026-09-26 最新完整 `pnpm verify` 通过：Core 269/269、Local Service 24/24、CLI 17/17、PBWork 191/191、Flutter 30/30、Runtime 5/5、Evidence slice 1/1、定稿回归 2/2、生命周期回归 1/1 | 保持门禁为绿；每个正式 operation 在恢复和重试后仍引用同一组产物 | 无 |
| PB-005 | P0 | 恒动当前 101 Case 中 10 项失败；Store Attempt 可复核；A.2 后失败已在定稿面板与 Review 按原因可见，缺陷本身未修 | 修复原型语义/交互后重采 101/101，并以真实定稿产物验收 | PB-001/004 |
| PB-101 | P1 | 概览显示所有 active Snapshot，定稿页只显示生命周期绑定；已证实 | 正式、诊断、未绑定、运行中/失败状态清楚标识 | PB-002 |
| PB-102 | P1 | Evidence Viewer 先呈现导航和事实结构；体验判断待用户验证；A.2 已加顶部结论与失败分组，问题索引与下钻未做 | 先见交付结论、阻断与覆盖，再能追溯 Screenshot/Fact | PB-101 |
| PB-103 | P1 | Viewer 三栏只在 1100px 调宽，窄屏无模式切换；已证实实现缺口 | 390/768px 可查看结果、定位问题、返回上层 | PB-102 |
| PB-104 | P1 | 概览大卡片与多信号并列；体验判断待设计验证 | 首屏明确待处理、进行中、最近正式结果及异常 | PB-101 |
| PB-105 | P1 | 已有局部引导，但安装、初始化与 MCP 配置未形成可恢复的一条路径；已证实 | 一条清楚的首次设置路径，可恢复失败步骤 | 无 |
| PB-106 | P1 | 正式定稿仅 Prototype 默认 Theme + `iphone-14`，Core 也只识别该设备；已证实 | authored profile 可声明可比较的正式 Theme/Device 范围 | PB-001/003 |
| PB-107 | P1 | 未挂载旧 FlowSheet、旧 Store action 与不可达 Dialog 分支；静态初核 | 删除确认无生产调用的旧 UI，保留 CLI/Core/Service 公共能力 | PB-004 回归基线 |

## 修改前后对照

| 对应问题 | 修改前 | 计划修改 | 修改后及可验证提升 |
| --- | --- | --- | --- |
| PB-001 | Job 由 Service 跑完；生命周期收尾靠已挂载的 PBWork 页面轮询。离开页面后可能停在 `capturing`。 | 把自动收尾交给持久 operation 的 Service worker：按固定 Job ID 检查终态和 Coverage，生成风险预览；需人工 warning/risk 时持久停在等待态。PBWork 改为查询与提交确认。 | 关页或重启 Service 后仍能从记录继续；101 项中 10 项失败会进入可见失败态且不生成 Handoff。 |
| PB-002 | 阶段、操作与正式产物绑定仅在 localStorage；清缓存后磁盘 Evidence 仍在，PBWork 当作新原型。 | 在 Workspace 侧持久化轻量生命周期记录，绑定 generation 和准确的 Job/Bundle/Snapshot/Handoff/Delivery ID；提供迁移和引用校验，接入 reset、clean、trash。 | 换浏览器可恢复已知正式绑定；旧浏览器数据只有固定引用验证通过才迁移。没有记录的旧 Bundle 仍标为未绑定，不从 active/latest 猜正式身份。 |
| PB-003 | 全局 Capture Store 状态可能被多个原型/页签覆盖；Handoff 与 Delivery 是两个独立 POST，重试可能再次创建。 | 给每次正式操作稳定 ID 和状态版本；Local Service 对同一操作加单 writer/CAS，并让正式 Handoff、Delivery 用 operation key 做 get-or-create，冲突请求返回错误；正式定稿直接使用 Capture Service Contract，按 Prototype ID 隔离预检与人工确认输入。 | 同时点击、重试、崩溃后恢复仍返回同一组固定 ID；不同原型的 Job/风险不会串用。Service restart、跨页签与同页多原型状态隔离回归通过。 |
| PB-004 | Flutter analyze、Runtime E2E 和 Evidence vertical slice 为红；`pnpm verify` 在 analyze 后停住。 | 删除两条多余 import；Playwright 配置只选一次端口并让 worker 继承；按当前 Sheet 语义重写旧定位；新增 A.2 失败终态、刷新保留和继续定稿的浏览器回归；修复回归揭示的任务中心漏显状态。 | `pnpm verify` 通过；Flutter analyze 0 诊断、Runtime 5/5、Evidence vertical slice 1/1、新增回归 2/2。持久恢复与幂等仍归 A.3–A.5。 |
| PB-005 | 恒动 Job 已结束但仅 91/101 Case 成功，10 项失败；没有 Handoff。 | 先让错误可见并能定位，再修复 2 项缺少必需节点、5 项中心点遮挡、2 项缺语义 role、1 项非法 `pbKey`；复采整个原型。 | 用户能看到真实阻断与对应 Screen/Variant；修复后以新 Run 证明 101/101，才可生成正式 Handoff/Delivery。遮挡项先看页面层级和截图，不靠放宽门禁蒙混通过。 |
| PB-101 | 概览列出所有 active Snapshot，定稿页只认 localStorage 绑定；Bundle 本身无可靠创建来源。 | 建立共享结果分类投影：只有精确生命周期绑定才是“正式”；其它结果显示“未绑定/诊断”，已有 receipt 可显示已知来源，来源未知就明说未知；运行和失败 Job 单独呈现。 | 同一结果在概览、任务中心、定稿页身份一致；用户不会把 CLI 或旧 Bundle 误认成正式交付。 |
| PB-102/103/104 | Viewer 先展示 Case/Fact 三栏，概览并列展示多个信号；390px 仍挤三栏。 | 基于 Core Coverage/Issue/Handoff risk 建立结论与问题索引；默认先给可交付性、失败范围和动作，再下钻 Screenshot/Fact。桌面保留多栏，窄屏改为单栏“结论 → 问题 → Case/截图 → 事实”的逐层导航；概览用同一状态投影排序待处理任务。 | 100–200 Case 不逐条展开也能找到失败 Screen；390/768px 可查看和定位，原始 Fact、unknown/conflict 与固定引用仍可追溯。体验改善需用真实数据和人工检查确认。 |
| PB-105 | `pb:up` 有缺配置引导和 Doctor，但首次安装、构建、目标路径、MCP 配置仍跨多个入口。 | 增加可重入的首次 setup 入口，复用现有 install/init/doctor/build，不复制检查逻辑；按步骤报告完成与继续命令，生成 MCP 客户端配置供人确认，日常继续使用 `pb:up`。 | 新 Workspace 有单一首次路径，失败后重跑不会覆盖现有配置；日常启动不再重复首次设置说明。 |
| PB-106 | `beginPrototype` 对所有 Screen 硬编码默认 Theme + `iphone-14`，其它画布手机设备不能被 Core Capture 识别。 | Prototype Registry 增加可选 authored profile；Core 注册其余三种手机设备并校验 viewport；正式 Draft 从 profile 展开主组合全量 Variant/Scenario，次要组合按声明为全量或 default-only，Preflight 前预览 Case 数并执行 200 默认上限。 | 默认原型仍只采当前组合；声明了多组合的原型可稳定复采，default-only 组合在 Coverage/Handoff 中如实标注。超限明确阻断或由 Workspace 显式调整上限，不静默漏采。 |
| PB-107 | 无挂载 FlowSheet、旧 action 与重复 finalize Dialog 仍在源码和测试中。 | 在现行流程回归固定后按 import/call graph 删除死代码及只保护旧入口的测试，保留 CLI/Core/Service 公共 Selection、retry 和 Store 管理。 | PBWork 只暴露生命周期正式采集，代码与测试不再暗示旧手工 composer 可用，公共命令回归仍通过。 |

## 具体技术方案与用户可见差异（A.1–A.5 已交付；B/C 待实施）

### 1. 原型生命周期：固定身份、持久操作与恢复

阶段、操作、历史和正式产物引用现由 Local Service 保存在配置 Store root 下的 `pbwork/<workspaceId>/lifecycle-v1.json`。PBWork `prototypeLifecycle` Store 缓存该文档，直接调用 Capture Service Contract 发起 Preflight/Job 并提交人工确认；warning/risk 未提交勾选按 Prototype ID 隔离，正式引用只由服务端文档恢复：

```text
PBWork 发起/确认操作（携带 expectedRevision）
  → Local Service 持久化操作意图
  → Core 校验状态转移、Preflight/Job/Coverage/risk 和固定引用
  → Local Service 收到 Job 终态或重启后 reconciliation
  → 失败 / 等待逐项人工确认 / 创建 Handoff 和 Delivery / final
```

- **存放位置与格式：** 在配置解析后的 `store.root` 下设私有 `pbwork/<workspaceId>/lifecycle-v1.json`，默认是 `.proto-bridge/store/pbwork/pbwork-local/lifecycle-v1.json`。它是可变的操作索引，不是 Evidence、Catalog 或新的 MCP 读取面；不进入 Git。Core 定义版本化 Schema、状态转移与引用校验；Local Service 是唯一写入者，浏览器通过有 Workspace generation 和 `expectedRevision` 的 API 读写。这个位置随自定义 Store root 移动，Core 的在线/离线 `resetWorkspace` 都会清除它；`pb:clean` 删除默认 `.proto-bridge`。Reset 预览和文档要明确列出这份元数据。
- **记录内容：** `schemaVersion`、`workspaceId`、`generationId`、全局 `revision`，按 `prototypeId` 索引的阶段、稳定 `operationKey`、phase、固定 Job/Bundle/Snapshot/Handoff/Delivery ID、请求摘要、逐项确认绑定的 Preflight/Snapshot 摘要、结构化失败代码与关联 Case、有限历史。只存引用和决定，不复制截图、Fact、提示词或风险事实。`final` 必须同时验证固定 Handoff、Delivery receipt 和提示词文件可达；不能只看 Job `completed`。
- **写入与并发：** 复用 Store 单 writer 所有权，Service 内串行化同一 Workspace 转移；`expectedRevision` 不符返回冲突及新状态，两个页签刷新后再决定。每次写先写同目录临时文件、同步落盘并原子替换。操作意图先落盘，再启动可能产生副作用的步骤；每步完成再记录固定 ID。进程重启时按操作键核对 Job、Coverage、Handoff、Delivery 和文件完整性，继续可自动完成的步骤；Preflight 过期或输入摘要改变时重跑并要求重新确认，绝不沿用旧 warning/risk 接受。
- **幂等边界：** 当前 Handoff 使用随机 ID，Delivery 使用时间命名目录并逐文件写入；因此仅有 JSON sidecar 无法保证“崩溃后恰好一份”。需要把稳定 `operationKey` 和请求摘要贯穿 Job、Handoff 与 Delivery 的 Core/Service 创建路径：同 key 同摘要返回已存在固定对象，不同摘要报冲突。Delivery 写到临时目录，完整 receipt 作为提交标记后原子发布；重启先检查已发布对象。若在对象写入和 sidecar 更新之间崩溃，按 key 找回，不能盲目再 POST。用故障注入覆盖每一个间隙。
- **旧数据和删除：** 首次读取时只在目标 sidecar 为空、Workspace/generation 匹配且所有固定引用可验证时迁移一次当前浏览器 localStorage；冲突或缺件保留诊断并报错。没有这份绑定的历史 Bundle 即使 Coverage 完整也仍是“未绑定/仅诊断”，不允许人工认领。Bundle trash/rollback 先标记操作，再清关联并可重试；外部删除则显示“引用失效”，不伪称仍已定稿。Service 停止时显示连接失败，重启后恢复。

这条方案跨 Core Schema/Store、Service API/任务恢复和 PBWork 调用；属于本里程碑的主要工程投入。选文件 sidecar 是因为本地已有文件型 Store、状态量很小，且 SQLite 也不能把现有 Evidence 和 Delivery 文件自动变成一个事务；正确性依赖上述操作键、原子发布和恢复测试。

### 2. 恒动：先修状态表达，再修 10 个真实失败

本地 Job 的 `completed` 仅表示执行并写入 Run/Snapshot；其 Coverage 是 91 captured、10 failed，历时约 94 秒、Bundle 约 56 MiB。`capture/presentation.ts` 目前先把任何 `completed` Job 显示为“采集完成”，而失败明细只挂到“需处理/已解决”状态。定稿页虽有 Coverage 检查，但轮询受页面挂载约束；按钮在等待人工确认的 phase 也永久 `loading` 且禁用，重开面板又会清除失败原因。这些共同解释用户所见的“转圈且没说原因”。本机没有当时浏览器 localStorage，具体那一次转圈的 phase 仍需复现，不能把推断当成已证明根因。

先改任务/概览投影：Job 终结时从对应 Run/Snapshot 的 Coverage 算“执行完成 101/101、有效 91/101、失败 10”，失败 Case 不得映射为成功；无法读到对应 Snapshot 时显示“结果读取失败”，不能借用其它 active Snapshot。再让 Service 操作终态驱动定稿 Sheet，关闭页面、换路由或重启后的状态一致。失败摘要示例：**“恒动定稿未完成：91/101 项有效，10 项失败，尚未生成 Handoff/提示词。”** 下方按原因分组：遮挡 5、缺必需节点 2、缺语义角色 2、非法标识 1；每项连接到 Screen、Variant、Case 和原始 Attempt。失败 Case 没有截图时明确说明，不放一张旧截图冒充本次结果。

随后修复恒动原型真实缺陷并重采。当前缺失节点分别在活动历史撤销后的记录和进度自定义范围；缺 role 在进度日期节点；非法 `pbKey` 是筛选项的中文显示词进入稳定标识；五项遮挡分布在活动历史、进度、今日和运动完成页。遮挡先核对页面层级与 required Fragment 的实际交互点，再修 authored UI/Contract；不删除必需边界规避失败。验收须有新的 101/101 Run、对应 Handoff 与 Delivery。若旧浏览器绑定已丢失，旧失败 Bundle 只显示诊断，不自动成为此次正式操作。

### 3. Review 与概览：先回答“能不能交、为什么、下一步”

现行 `buildEvidenceReadModel` 只遍历 `activeSlots`，失败 Case 在读模型中不存在；它已计算的 `deliveryStatus`、`messages` 与 unknown/conflict 计数在 PBWork 中没有任何渲染。Snapshot 的 `latestAttempts` 与 Run Attempt 已含全部 Case 及失败原因，因此失败 Case 投影在 Core 读模型中补齐，PBWork 只负责按原因分组的中文说明与修复方向，原文保留在技术详情。

统一由固定绑定、Core Coverage/Issue 和 risk 生成只读结果投影；状态用“已正式定稿 / 待逐项确认 / 定稿未完成 / 仅诊断”，不根据 active/latest 或文件名猜身份。面向恒动的目标文案和信息顺序如下：

| 页面 | 当前阅读负担 | 调整后的首屏与下一层 |
| --- | --- | --- |
| Evidence Review | 先看到 Case 导航、截图和 Fact 技术结构；完成/部分完成不足以说明可交付性。 | 首屏“恒动 · 定稿未完成｜91/101 有效｜10 项失败｜无 Handoff”；先给 4 类问题和受影响 Screen，再按 Screen→Variant→Case 看截图/Attempt/修复方向；Fact、provenance、unknown/conflict、固定引用可展开追溯。完整但未绑定的历史结果标“仅诊断”，不能显示“可交付”。 |
| Workbench 概览 | 大幅原型视觉卡、多个任务/结果信号并列；失败的 completed Job 容易沉入“已完成”。 | 首屏先排“需处理：恒动定稿失败 10 项”，其次是进行中的 Job、待确认、最近正式交付；每张卡只写结果、原因数和一个明确入口。无待办时再突出“继续制作原型”和最近正式结果，视觉内容退到辅助位置。 |

桌面可保留多栏细节；390px 与 768px 改为单列“结论→问题组→Case/截图→原始事实”的逐层导航，支持返回和位置保持。窄屏只查看和定位；需要逐项确认 warning/risk 或正式定稿时指引回桌面。验收用恒动 101 Case 和 200 Case 边界数据做任务走查：无需读原始 JSON 就能指出是否正式、为何失败、落在哪个 Screen/Case、下一步动作；逐项检查链接、焦点、滚动、明暗主题，而非只验组件渲染。

### 4. 旧路径、首次使用与投入风险

| 范围 | 动作和实际风险 | 移除/交付门槛 |
| --- | --- | --- |
| `DeliverFlowSheet.vue`、不可达的 Dialog finalize 分支 | 静态初核没有生产入口；移除风险较低，但旧测试或动态 import 仍可能引用。 | 先固定现行定稿 E2E，再做生产 import graph；只删确认无入口的分支和仅保护它的测试。不会把“删源码”宣称为明显运行时性能收益。 |
| Capture Store 的旧 action/state | 与仍在使用的全局 `activeJob`、details 等混在一起；直接整体删除风险中等。 | 先让正式 operation 不依赖它，再按实际调用拆除；保留任务/证据的只读状态。通过类型检查、Unit、E2E 与任务列表回归后再删。 |
| Core Selection/retry、CLI、Local Service 公开能力 | 仍有独立消费方，删除风险高。 | 本次保留公共能力，仅清 PBWork 无入口的旧手工流程；不改变 CLI 非正式采集身份。 |

首次使用沿用已有 `pb:install`、`pb:init`、`pb:doctor`、`pb:up`，新增可重入的 `pnpm pb:setup`：依赖与 Chromium → 所需包构建 → 配置存在/初始化 → Doctor → 输出 Codex/Cursor MCP 配置片段供用户确认。每步检查现有成果，重跑只继续缺的步骤，错误给出失败步骤与恢复命令，不覆盖现有 `proto-bridge.json` 或用户 MCP 文件；日常仍用 `pnpm pb:up`。`pb:up` 发现 setup 未完成时只提示继续 `pnpm pb:setup` 及上次停止的步骤，不代跑。目标是从新克隆到可启动只需“setup、up”两条清楚命令；下载本身不会更快，首次耗时及重跑成功率要在干净环境实测。Workbench 只显示 Service/Runtime 可确认的连接状态，不猜 MCP 客户端是否已接入。

### 5. 多 Theme/手机设备：显式范围与成本预览

Registry 给 Prototype 可选 authored profile：默认仍是默认 Theme × `iphone-14`；作者可选 Theme 集合和现有四种手机预设的设备集合，Core 校验设备 viewport/scale/touch。profile 区分**主组合**与**次要组合**：主组合展开全部 authored Variant/Scenario；次要组合由作者显式声明范围，首批只允许“全量”或“每个 Screen 的 default Variant”两种。Core 把组合与其范围写入稳定 Case Matrix、Coverage 与 Handoff；次要组合只覆盖 default 时，Coverage 与 Agent 提示词写明“该 Theme/Device 只覆盖默认状态”，不得称为全范围覆盖，也不得把未采集的 Variant 推断为已验证。正式采集不在临时弹窗里随意改范围，不做隐形抽样。每次 Preflight 前给出组合与范围、Case 数、预计时间/磁盘占用和 `capture.maxCases` 上限；超限明确阻断，只有评估后显式提高 Workspace 上限。Capture 仍逐 Case 隔离执行，首批不引入并发，以免把资源竞争带进证据可复现性。

| 恒动按现有 101 Case（10 Screen）外推 | Case 数 | 基于本地单组合 94 秒/56 MiB 的粗估 | 默认 200 上限 |
| --- | ---: | --- | --- |
| 1 组合 | 101 | 约 1.6 分钟 / 56 MiB | 可运行 |
| 主组合全量 + 7 个次要组合只采 default | 171 | 约 2.7 分钟 / 95 MiB | 可运行 |
| 2 组合全量 | 202 | 约 3.1 分钟 / 112 MiB | 超 2 项，先阻断 |
| 4 组合全量 | 404 | 约 6.3 分钟 / 224 MiB | 阻断 |
| 2 Theme × 4 手机全量 | 808 | 约 12.5 分钟 / 448 MiB | 阻断 |

次要组合只采 default 的价值在于暴露配色与窄屏布局溢出，不重复验证每个 Scenario；若某次要组合出现独有缺陷，作者可把它升级为全量。现行 Playwright driver 每个 Case 启动一次 Chromium；“共享浏览器、每 Case 新建 context”不是并发，可作为试点，但须先用冷链 26 Case 对比截图与 Fact 完全一致才采用，不列入承诺。这是线性外推，设备布局与 Theme 可能让实际耗时、失败率和压缩后的体积不同；没有历史记录时 UI 应写“暂无可靠估算”，不能给假精度。先用冷链 26 Case 做 2–4 组合试点（现有单组合约 26 秒、11 MiB；8 组合是 208 Case，亦超默认上限），记录每个新增组合发现的独有问题、总耗时、磁盘增量和 Review 负担。只有新增缺陷价值足以覆盖成本，才建议某原型选择更多组合；支持四种手机并不意味着每次定稿都强制跑满四种。初期不承诺性能提升，只承诺范围可预见、结果可比较。

## P2 进入条件，不参与本次交付

| ID | 议题 | 重新排期条件 |
| --- | --- | --- |
| PB-201 | 第二道计划批准的可审计性 | 用一次真实 Handoff 绘出计划版本、批准、范围变更与实施时序，再评审独立 Consumer Session/receipt；批准事实不写回 Source Evidence。当前 Prompt 纪律不宣称机器可证明。 |
| PB-202 | Target 五维人机复查面 | 先用真实 Handoff 做 provider-neutral 的人工 Review 试评，区分 obligation、依据、未验证和 Target revision；Target 事实保持在独立 sidecar。 |
| PB-203 | npm 分发、多 Target、性能与导航收口 | P0/P1 稳定且有外部采用需求后分别立项；npm 先决定许可证与 Local Service 随 CLI 的方式，不把 PBWork 发布成 CLI 包。 |
| PB-204 | 官方 Flutter MCP Runtime Review | 满足 [ADR 0010](../decisions/0010-flutter-mcp-remains-experimental.md) 的实验边界，并通过[历史实验记录](../history/flutter-mcp-experiment-2026-08.md)中的真实 Handoff go/no-go 条件后，才讨论注册默认 Tool。 |

PB-203 重新立项时再拆分：分发涉及许可证、Local Service 随 CLI 的打包、MCP 原生读取绑定配置、`proto-bridge doctor` 与默认 help 隐藏实验 Review 命令；性能涉及当前约 601 kB 主 chunk 和混合静态/动态 import；导航涉及原型缩略图与特定草稿的硬编码入口。这些是候选投入，当前不对外承诺发布时间。

## 同一里程碑的实施顺序

### A. 固定基线与可靠性方案

1. **已交付 2026-09-25。** 删除 Flutter 两条多余 import；Playwright 配置将选定的端口写入 worker 继承的环境变量；Evidence vertical slice 改按现行 `LifecycleFinalizationSheet` 定位并在访问底层列表前关闭 Sheet。`apps/pbwork/e2e/finalization-regression.spec.ts` 覆盖失败 Case 可见终态与分组原因、任务中心和 Evidence Review、刷新后失败保留与重新预检、等待确认时收起后“继续定稿”。失败快照无 Dialog 的原因是旧测试定位不可达分支；回归还发现任务中心刷新后漏显“部分失败”，已修复。以上单跑及完整 `pnpm verify` 均通过；跨页签、离页/关浏览器后收尾、Service 重启恢复与幂等留待 A.3–A.5。
2. **已交付 2026-09-25。止血（持久化前先交付）：** 等待人工确认的 phase 不再让按钮禁用和转圈，按钮改为“继续定稿”重开面板；重开面板保留失败原因，只在用户点“重新检查”时清除；失败 operation 记录全部失败 Case 并按原因分组显示中文说明、修复方向与原文；`pollFinalization` 对同一原型共享 in-flight 锁，异步返回后重新校验 phase，读取 Job 失败显式报错，未连接时显示“任务可能仍在后台运行”；任务中心与概览按对应 Snapshot Coverage 显示“部分失败”；Core 读模型补失败 Case，Evidence Review 顶部显示交付结论与失败列表。这些改动在持久化落地后保留呈现部分，轮询锁随轮询一起删除。
3. **已交付 2026-09-26。** Core 新增生命周期 document/record/operation Schema、合法阶段转移、固定 Job/Bundle/Snapshot/Handoff/Delivery refs、operation key + SHA-256 request digest、revision conflict 与 idempotency conflict Contract。Coverage、warning、risk 和 Handoff 判定仍只由 Core 提供；最终用户 warning/risk 确认前保存在明确的 `awaiting-confirmation` / `awaiting-risks` phase。
4. **已交付 2026-09-26。** Core Store 在配置 root 下原子持久化 `pbwork/<workspaceId>/lifecycle-v1.json`；Local Service 增加 protocol v5 读取、CAS 更新、受限迁移和自动 reconciliation。已验 Service 重启恢复、失败 Case 持久 failed、人工确认不被跳过；reset 删除 sidecar，clean 保留固定 lifecycle refs，trash/delete 会拒绝有效正式绑定。PBWork 生命周期 Store 自动构造整原型 Draft，直接通过 Capture Service Contract 发起预检和经确认后的 Job；warning/risk UI 输入按 Prototype ID 隔离。Job 被接受后 Service 接手自动收尾。
5. **已交付 2026-09-26。** Job/Handoff/Delivery 对相同 operation key + request digest 复用固定产物，对不同摘要报告冲突；Delivery 使用 staging directory 完成后 rename 发布。旧 localStorage 只在空 sidecar 和 Workspace/generation 匹配时请求单次迁移，Service 逐项验证 Job/Run/Snapshot 完整 Coverage/Handoff/Receipt/Prompt；不匹配的旧 final/archived 降为待确定并写入诊断失败原因，不提供未绑定 Evidence 认领。`pb:reset`、`pb:clean`、trash/delete 的保护与清理路径纳入回归。既有 Capture UI/公开能力仍保留；旧入口清理留在 C.12。
6. 修恒动 10 项 authored 缺陷并全量重采；只有新 Run 达到 101/101、风险经过逐项确认且正式产物齐全时才算定稿成功。

### B. PBWork 使用体验设计与交付

7. 统一结果分类事实：正式产物由生命周期固定绑定判定；其它结果统一显示为未绑定/诊断。仅在已有 receipt 提供可信来源时显示 CLI/GUI 来源，旧 Bundle 来源未知就标未知，不补写猜测。概览、任务中心和定稿页共用分类与状态表达。
8. 以真实 100–200 Case 数据设计 Evidence Review：默认先展示定稿结论、Block/Warning/mandatory risk、覆盖缺口和受影响 Screen；从任何问题可进入 Case、Screenshot、Fact、provenance 和固定引用。unknown/conflict 保持可见。概览以“下一步该做什么”为主，并用真实原型内容验证层级。视觉方案按 `pbwork` 与 `frontend-design` 工作流评审。
9. 窄屏只要求查看结果、定位问题与返回，不要求手机上完成定稿或风险确认。在 390px、768px 和桌面宽度验证导航、Screenshot、问题定位、滚动、焦点；需要桌面完成的动作给出清楚说明。
10. 增加可重入的首次 setup 入口，复用现有 install/init/doctor/build，失败时显示已完成步骤和继续方法；生成 MCP 客户端配置供用户确认写入。日常启动继续使用 `pb:up`，不把首次设置操作塞入日常流程。
11. 为 Prototype 设计 authored capture profile。零配置保持当前默认；Core Capture 先补齐其余三种手机设备配置，复杂原型再声明主组合与次要组合，次要组合范围为全量或 default-only，并在 Coverage/Handoff 中如实标注。开始前显示 Case Matrix、基于历史的粗估耗时/体积，并按 Workspace 默认 200 Case 上限预检。主组合 Scenario 默认全量，不恢复临时手工 composer；平板/桌面、per-Screen 差异与 Scenario 子集只有真实案例证明需要时才扩展。同步 Runtime/Capture Schema、Registry、Authoring Contract、Skill、测试和 Target drift 状态。

### C. 删除旧 PBWork Capture 路径

12. 在回归保护就位后生成 production import graph，逐一核对 `DeliverFlowSheet.vue`、Capture Store 旧 action/state、专用 sessionStorage draft、Dialog finalize 分支和旧测试。删除确认无生产调用的部分，并检查文案、E2E selector、navigation 和 bundle。CLI/Core/Local Service 的非正式采集、Selection、retry、Bundle 管理和 fixed-ref 查看保持其公开边界。

## 同一里程碑退出标准

- 正常、失败、需人工 warning/risk 的定稿在关闭面板、离开路由、刷新、关闭浏览器、Service 重启和多页签下均有确定状态；失败不无限显示 spinner，人工确认不被后台跳过。
- 清浏览器状态后仍能从 Workspace 元数据恢复正式产物绑定；不同原型互不覆盖；重复请求或恢复不产生第二份正式 Handoff/Delivery。以真实失败注入和 E2E 证明。
- 恒动现有 10 项失败在任务、概览和 Review 可按 Screen/Variant 定位；修复原型后的新 Run 达 101/101，生成一份有固定绑定的 Handoff 和 Delivery，旧失败记录保留作诊断。
- 用户不用 Bundle ID 推断结果是否正式；Evidence Review 在 100–200 Case 中能先判断交付状态，并从阻断项追溯到固定事实；窄屏完成查看与定位。
- 首次 setup 可按单一路径完成或明确恢复；正式 capture profile 预览范围并阻断超限，默认简单原型无需额外配置；旧 PBWork 手工 Capture 入口和死代码清除。
- `pnpm docs:verify`、`pnpm ds:target-sync:verify`、`pnpm verify`、Runtime E2E、Evidence vertical slice 全绿；相关当前行为文档、Schema、Skill 和测试与实现同步。视觉与交互按 PBWork Experience Check 人工复查。

## 范围缩减与待决策

- 本次 P0 和 P1 同一里程碑。P1 信息架构和视觉设计可与 P0 实施并行，但依赖正式产物身份的功能待 PB-002 落地后集成。若出现交付压力，先缩减概览装饰、缩略图和 setup 自动化深度；P0、结果身份、Review 结论、窄屏查看和 Prototype 级多 Theme/现有手机 profile 不缩减。P2 整体不作为本次完成条件。
- **本次已决定：** 窄屏先支持查看与定位；未绑定的完整历史 Evidence 只作诊断，不提供人工认领；profile 首批限现有四种手机预设和多 Theme，按 Prototype 声明主组合与次要组合，主组合 Scenario 默认全量，次要组合可显式声明 default-only 并如实标注；止血项先于持久化交付；首次 setup 生成 MCP 客户端配置，由用户确认写入。
- **本方案给出的实施选择：** sidecar 放配置的 Store root 内；Core 管语义、Service 管持久执行、PBWork 管呈现和人工确认；同 key 同摘要复用 Job/Handoff/Delivery，Delivery 原子发布；profile 默认单组合，作者显式声明组合及其范围，超 200 Case 时阻断。设备覆盖面与每个原型实际选择的组合不同，首批试点据耗时和独有问题再决定哪些原型应提高上限或把次要组合升级为全量。
- **仍需产品确认的取舍：** 所有正式原型默认强制采满多 Theme × 四手机，或把 default-only 次要组合称为全范围覆盖，均不采用。恒动 10 项 authored 缺陷纳入同一里程碑，修复中的视觉选择需看具体 Screen 再评审。
- **以后再决策：** npm 许可证/发布对象、第二道批准的持久对象、Target Review 产品位置和 Flutter MCP 是否恢复；都不阻断本里程碑。

## 记录维护

每项实施后更新上方证据状态、依赖和退出证据；落地能力同步 Product、Architecture、Reference、PBWork 手册/Skill、Schema 和测试。现行行为只以这些权威文档和代码为准。已交付的[原型生命周期设计记录](../history/pbwork-prototype-lifecycle-2026-08.md)和已延后的[Flutter MCP 实验记录](../history/flutter-mcp-experiment-2026-08.md)保留在 `docs/history/`；分发取舍由 [ADR 0011](../decisions/0011-producer-git-and-npm-tooling.md) 记录。`docs/roadmap/` 只保留本计划。
