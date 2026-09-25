# ProtoBridge 产品收口计划

> 状态：待实施；核实日期：2026-09-25。本文是唯一在执行的产品 Roadmap，不代表现行 Contract。
>
> 里程碑：P0 可靠性与 P1 PBWork 体验同批交付。P2 只保留进入条件，不进入本次完成定义。

## 当前基线与核实结果

- Core Store 持久化 Job、Run、Snapshot、revision、Blob 和 Handoff；Delivery 位于 `.proto-bridge/deliveries/`。PBWork 生命周期阶段、operation、正式产物 ID 目前只在浏览器 `pbwork.prototype-lifecycle.v2` localStorage。`.proto-bridge/` 不进 Git。
- 2026-09-25 本地恒动 Job 已 `completed`，Snapshot 覆盖 101 Case，其中 91 captured、10 failed；该 Snapshot 没有 Handoff。现行 `pollFinalization` 若执行会把不完整覆盖转为失败态。此记录证明 Store 与生命周期可能脱节，但本机浏览器生命周期状态未被持久化到 Workspace，无法仅凭 Store 证明当时 UI 的具体显示。
- 定稿面板打开时轮询；原型详情页和原型列表页在挂载期间也轮询。离开这些页面或关闭浏览器后，Local Service 可完成 Job，但没有持久化的定稿收尾 owner。Job Center 只刷新 Job，不推进生命周期。关闭面板本身不必然中断收尾。
- 同一冷链 Snapshot 有两份 Handoff，创建时间相隔约四分钟。Capture Store 只有全局 `activeJob`、`details`、`preflight` 等查看与操作状态。重复产物原因尚未复现，不能把它写成已证实的并发竞态。
- Bundle Schema 没有 CLI/Workbench 来源字段；只有部分 Delivery receipt 记录来源。现存未绑定 Bundle 不能可靠倒推出创建入口，也不能自动认领为正式产物。
- Workbench 画布有四种手机预设，Core Capture 的 `resolveCaptureDevice` 目前只注册 `iphone-14`。支持其它三种正式采集需要先扩展 Core 设备配置。默认 Case 上限是 200；例如 26 个 Case 同时采集两种 Theme × 四种设备会成为 208 项，必须在执行前提示超限。
- `pb:up` 已在交互终端缺配置时引导 `pb:init`，并在启动前运行 Doctor；`pb:install` 负责依赖和 Chromium。PB-105 的缺口是这些步骤和 MCP 客户端配置尚未收敛成可恢复的首次使用流程，不能写成现有启动完全没有引导。
- 本次 `pnpm verify`：文档、构建、DS 同步、Core/Service/CLI/PBWork 单测通过；Flutter analyze 因两条 `unnecessary_import` 退出 1，后续步骤未执行。单独执行 Runtime E2E，5/5 因 Playwright 配置以各进程 PID 派生不同端口而 `ERR_CONNECTION_REFUSED`。单独执行 Evidence vertical slice，旧断言寻找已移除的“预检完成，等待定稿确认”文案，1/1 失败；更新断言后仍须确认有无产品故障。
- 静态检查确认 `DeliverFlowSheet.vue` 没有生产 import；多个 Capture Store action 仅被它或旧测试调用；`LifecycleTransitionDialog.vue` 的 finalize 分支在两个调用页均不可达。删除范围仍需 production import graph 和完整调用关系复核。

## 问题台账

状态口径：**已证实**指代码、Store 或本次测试可复核；**观察/待验证**指体验判断或根因尚未由回归固定。下列事项的实施与验收均尚未开始。

| ID | 优先级 | 问题与证据状态 | 完成结果 | 依赖 |
| --- | --- | --- | --- | --- |
| PB-001 | P0 | 定稿自动收尾依赖已挂载页面；已证实架构缺口 | Job 终结后可靠进入失败、待人工确认或正式完成 | PB-002/003 |
| PB-002 | P0 | 生命周期与正式产物关联仅在 localStorage；已证实 | 清浏览器状态、换浏览器、Service 重启后可恢复固定绑定 | PB-001/003 |
| PB-003 | P0 | 全局临时状态与缺少业务幂等；已证实风险，重复写入根因待复现 | 同一 operation 不产生重复正式产物，不同原型互不污染 | PB-001/002 |
| PB-004 | P0 | 产品级门禁为红；已复现三类失败 | `pnpm verify` 及相关单跑全部通过，并覆盖恢复/幂等 | 无 |
| PB-101 | P1 | 概览显示所有 active Snapshot，定稿页只显示生命周期绑定；已证实 | 正式、诊断、未绑定、运行中/失败状态清楚标识 | PB-002 |
| PB-102 | P1 | Evidence Viewer 先呈现导航和事实结构；体验判断待用户验证 | 先见交付结论、阻断与覆盖，再能追溯 Screenshot/Fact | PB-101 |
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
| PB-003 | 全局 Capture Store 状态可能被多个原型/页签覆盖；Handoff 与 Delivery 是两个独立 POST，重试可能再次创建。 | 给每次正式操作稳定 ID 和状态版本；Local Service 对同一操作加单 writer/CAS，并让正式 Handoff、Delivery 用 operation key 做 get-or-create，冲突请求返回错误；PBWork 的全局 Store 只承载查看态。 | 同时点击、重试、崩溃后恢复仍返回同一组固定 ID；不同原型的 Job/风险不会串用。需用断点故障注入证明，重复 Handoff 的既有记录只作为风险线索。 |
| PB-004 | Flutter analyze、Runtime E2E 和 Evidence vertical slice 为红；`pnpm verify` 在 analyze 后停住。 | 删除两条多余 import；由测试包装进程一次注入 E2E 端口；按当前 Sheet 语义重写旧定位，并检查失败画面为何无对话框；补收尾、恢复、幂等的浏览器回归。 | 全链路门禁真实通过，失败会定位到产品阶段；不再把 5 个端口错误或旧文案超时当作 Capture 缺陷。 |
| PB-101 | 概览列出所有 active Snapshot，定稿页只认 localStorage 绑定；Bundle 本身无可靠创建来源。 | 建立共享结果分类投影：只有精确生命周期绑定才是“正式”；其它结果显示“未绑定/诊断”，已有 receipt 可显示已知来源，来源未知就明说未知；运行和失败 Job 单独呈现。 | 同一结果在概览、任务中心、定稿页身份一致；用户不会把 CLI 或旧 Bundle 误认成正式交付。 |
| PB-102/103/104 | Viewer 先展示 Case/Fact 三栏，概览并列展示多个信号；390px 仍挤三栏。 | 基于 Core Coverage/Issue/Handoff risk 建立结论与问题索引；默认先给可交付性、失败范围和动作，再下钻 Screenshot/Fact。桌面保留多栏，窄屏改为单栏“结论 → 问题 → Case/截图 → 事实”的逐层导航；概览用同一状态投影排序待处理任务。 | 100–200 Case 不逐条展开也能找到失败 Screen；390/768px 可查看和定位，原始 Fact、unknown/conflict 与固定引用仍可追溯。体验改善需用真实数据和人工检查确认。 |
| PB-105 | `pb:up` 有缺配置引导和 Doctor，但首次安装、构建、目标路径、MCP 配置仍跨多个入口。 | 增加可重入的首次 setup 入口，复用现有 install/init/doctor/build，不复制检查逻辑；按步骤报告完成与继续命令，生成 MCP 客户端配置供人确认，日常继续使用 `pb:up`。 | 新 Workspace 有单一首次路径，失败后重跑不会覆盖现有配置；日常启动不再重复首次设置说明。 |
| PB-106 | `beginPrototype` 对所有 Screen 硬编码默认 Theme + `iphone-14`，其它画布手机设备不能被 Core Capture 识别。 | Prototype Registry 增加可选 authored profile；Core 注册其余三种手机设备并校验 viewport；正式 Draft 从 profile 展开 Theme × Device × 全量 Variant/Scenario，Preflight 前预览 Case 数并执行 200 默认上限。 | 默认原型仍只采当前组合；声明了多组合的原型可稳定复采。超限明确阻断或由 Workspace 显式调整上限，不静默漏采。 |
| PB-107 | 无挂载 FlowSheet、旧 action 与重复 finalize Dialog 仍在源码和测试中。 | 在现行流程回归固定后按 import/call graph 删除死代码及只保护旧入口的测试，保留 CLI/Core/Service 公共 Selection、retry 和 Store 管理。 | PBWork 只暴露生命周期正式采集，代码与测试不再暗示旧手工 composer 可用，公共命令回归仍通过。 |

### P2 进入条件，不参与本次交付

| ID | 议题 | 重新排期条件 |
| --- | --- | --- |
| PB-201 | 第二道计划批准的可审计性 | 用一次真实 Handoff 绘出计划版本、批准、范围变更与实施时序，再评审独立 Consumer Session/receipt；批准事实不写回 Source Evidence。当前 Prompt 纪律不宣称机器可证明。 |
| PB-202 | Target 五维人机复查面 | 先用真实 Handoff 做 provider-neutral 的人工 Review 试评，区分 obligation、依据、未验证和 Target revision；Target 事实保持在独立 sidecar。 |
| PB-203 | npm 分发、多 Target、性能与导航收口 | P0/P1 稳定且有外部采用需求后分别立项；npm 先决定许可证与 Local Service 随 CLI 的方式，不把 PBWork 发布成 CLI 包。 |
| PB-204 | 官方 Flutter MCP Runtime Review | 满足 [ADR 0010](../decisions/0010-flutter-mcp-remains-experimental.md) 的实验边界，并通过[历史实验记录](../history/flutter-mcp-experiment-2026-08.md)中的真实 Handoff go/no-go 条件后，才讨论注册默认 Tool。 |

PB-203 重新立项时再拆分：分发涉及许可证、Local Service 随 CLI 的打包、MCP 原生读取绑定配置、`proto-bridge doctor` 与默认 help 隐藏实验 Review 命令；性能涉及当前约 601 kB 主 chunk 和混合静态/动态 import；导航涉及原型缩略图与特定草稿的硬编码入口。这些是候选投入，当前不对外承诺发布时间。

## 同一里程碑的实施顺序

### A. 固定基线与可靠性方案

1. 修复 Flutter 两条 import 诊断、Playwright 端口注入及 Evidence vertical slice 的旧定位；调查失败快照中 Sheet 未出现的原因，逐项单跑后再跑完整 `pnpm verify`。新增失败 Case 进入可见终态、离开原型路由后完成、刷新恢复与重复请求的回归。不得用更新测试文案掩盖产品故障。
2. 在 Core 定义持久 operation Schema、状态转移、固定引用与冲突规则；保留 Core 对 Coverage、warning、risk、Handoff 的唯一语义权威。每个原型有稳定 finalization operation ID、Job/Bundle/Snapshot 引用与终态。人工 warning/risk 确认前持久停在等待态，不自动代人接受。
3. 在 Workspace 侧增加轻量元数据 sidecar，由 Local Service 持久化并执行自动阶段及启动 reconciliation；PBWork 只提交人的确认和显示状态。sidecar 只保存生命周期事实和稳定引用，不复制 Evidence/图片，不猜 active/latest，不进 Git。以原子写、generation 校验和 compare-and-set/单 writer 证明跨页签行为。具体路径和 API 在实施设计评审后固定。
4. 先实施可恢复的单 operation 收尾，再给正式 Handoff/Delivery 增加按 operation key 的幂等创建与冲突检查，最后把 PBWork 全局 Capture Store 缩为查看态。迁移 localStorage 时校验 Workspace generation 与产物存在性；冲突、缺失或清理过的引用显示明确错误，不静默提升为正式定稿。没有可验证绑定的旧 Evidence 保持未绑定。`pb:reset`、`pb:clean`、Bundle trash 与 sidecar 同步定义。

### B. PBWork 使用体验设计与交付

5. 统一结果分类事实：正式产物由生命周期固定绑定判定；其它结果统一显示为未绑定/诊断。仅在已有 receipt 提供可信来源时显示 CLI/GUI 来源，旧 Bundle 来源未知就标未知，不补写猜测。概览、任务中心和定稿页共用分类与状态表达。
6. 以真实 100–200 Case 数据设计 Evidence Review：默认先展示可交付结论、Block/Warning/mandatory risk、覆盖缺口和受影响 Screen；从任何问题可进入 Case、Screenshot、Fact、provenance 和固定引用。unknown/conflict 保持可见。概览以“下一步该做什么”为主，并用真实原型内容验证层级。视觉方案按 `pbwork` 与 `frontend-design` 工作流评审。
7. 窄屏只要求查看结果、定位问题与返回，不要求手机上完成定稿或风险确认。在 390px、768px 和桌面宽度验证导航、Screenshot、问题定位、滚动、焦点；需要桌面完成的动作给出清楚说明。
8. 增加可重入的首次 setup 入口，复用现有 install/init/doctor/build，失败时显示已完成步骤和继续方法；生成 MCP 客户端配置供用户确认写入。日常启动继续使用 `pb:up`，不把首次设置操作塞入日常流程。
9. 为 Prototype 设计 authored capture profile。零配置保持当前默认；Core Capture 先补齐其余三种手机设备配置，复杂原型再声明所需 Theme 与手机预设的组合。开始前显示 Case Matrix 并按 Workspace 默认 200 Case 上限预检。Scenario 默认全量，不恢复临时手工 composer；平板/桌面、per-Screen 差异与 Scenario 子集只有真实案例证明需要时才扩展。同步 Runtime/Capture Schema、Registry、Authoring Contract、Skill、测试和 Target drift 状态。

### C. 删除旧 PBWork Capture 路径

10. 在回归保护就位后生成 production import graph，逐一核对 `DeliverFlowSheet.vue`、Capture Store 旧 action/state、专用 sessionStorage draft、Dialog finalize 分支和旧测试。删除确认无生产调用的部分，并检查文案、E2E selector、navigation 和 bundle。CLI/Core/Local Service 的非正式采集、Selection、retry、Bundle 管理和 fixed-ref 查看保持其公开边界。

## 同一里程碑退出标准

- 正常、失败、需人工 warning/risk 的定稿在关闭面板、离开路由、刷新、关闭浏览器、Service 重启和多页签下均有确定状态；失败不无限显示 spinner，人工确认不被后台跳过。
- 清浏览器状态后仍能从 Workspace 元数据恢复正式产物绑定；不同原型互不覆盖；重复请求或恢复不产生第二份正式 Handoff/Delivery。以真实失败注入和 E2E 证明。
- 用户不用 Bundle ID 推断结果是否正式；Evidence Review 在 100–200 Case 中能先判断交付状态，并从阻断项追溯到固定事实；窄屏完成查看与定位。
- 首次 setup 可按单一路径完成或明确恢复；正式 capture profile 预览范围并阻断超限，默认简单原型无需额外配置；旧 PBWork 手工 Capture 入口和死代码清除。
- `pnpm docs:verify`、`pnpm ds:target-sync:verify`、`pnpm verify`、Runtime E2E、Evidence vertical slice 全绿；相关当前行为文档、Schema、Skill 和测试与实现同步。视觉与交互按 PBWork Experience Check 人工复查。

## 范围缩减与待决策

- 本次 P0 和 P1 同一里程碑。P1 信息架构和视觉设计可与 P0 实施并行，但依赖正式产物身份的功能待 PB-002 落地后集成。若出现交付压力，先缩减概览装饰、缩略图和 setup 自动化深度；P0、结果身份、Review 结论、窄屏查看和 Prototype 级多 Theme/现有手机 profile 不缩减。P2 整体不作为本次完成条件。
- **本次已决定：** 窄屏先支持查看与定位；未绑定的完整历史 Evidence 只作诊断，不提供人工认领；profile 首批限现有四种手机预设和多 Theme，按 Prototype 声明、Scenario 默认全量；首次 setup 生成 MCP 客户端配置，由用户确认写入。
- **实施设计评审：** 技术团队根据可复现回归确定 sidecar 路径、CAS/单 writer 形式和 Service API；按真实原型确认需要纳入首批 profile 的 Theme 与手机组合，以及 Case 数量上限。此处不改变已定的产品边界。
- **以后再决策：** npm 许可证/发布对象、第二道批准的持久对象、Target Review 产品位置和 Flutter MCP 是否恢复；都不阻断本里程碑。

## 记录维护

每项实施后更新上方证据状态、依赖和退出证据；落地能力同步 Product、Architecture、Reference、PBWork 手册/Skill、Schema 和测试。现行行为只以这些权威文档和代码为准。已交付的[原型生命周期设计记录](../history/pbwork-prototype-lifecycle-2026-08.md)和已延后的[Flutter MCP 实验记录](../history/flutter-mcp-experiment-2026-08.md)保留在 `docs/history/`；分发取舍由 [ADR 0011](../decisions/0011-producer-git-and-npm-tooling.md) 记录。`docs/roadmap/` 只保留本计划。
