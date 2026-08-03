# 冷链原型高保真还原：现状诊断、边界与优化规划

记录日期：2026-08-03（Asia/Shanghai）

状态：Analysis Complete / Product Decisions Pending / Code Changes Paused

关联原型：`apps/pbwork/src/prototypes/cold-chain-ops`

目标工程：`apps/flutter_pb_app`

## 文档性质

本文是针对 2026-08-03 冷链原型还原实验的一次性现状审计和优化规划记录，目的是在继续修改代码之前保存完整问题背景、事实、边界、目标、假设、待决策项与验证方案。

本文：

- 不是当前产品规范，不声明尚未实现的 Tool、Contract、门禁或能力已经生效；
- 不替代 `docs/product`、`docs/architecture`、`docs/reference`、ADR、可执行 Schema 和测试；
- 不把冷链个案的视觉特点提升为 ProtoBridge 的通用规则；
- 不授权立即进入代码实现；只有本文列出的关键决策被确认后，才开始分阶段修改；
- 与当前权威文档冲突时，以当前权威文档和可执行 Contract 为准。

当前相关权威边界：

- [Evidence 模型](../architecture/evidence-model.md)
- [采集链路](../architecture/capture-pipeline.md)
- [ProtoBridge 实现](../architecture/proto-bridge.md)
- [Agent 消费指南](../guides/agent-consumption.md)
- [语义标记与证据门禁](../reference/semantic-authoring.md)
- [ADR 0004：Producer、Consumer 与 Target 单向分离](../decisions/0004-producer-consumer-target-boundaries.md)
- [ADR 0007：高保真重建使用独立 Acceptance Contract](../decisions/0007-reconstruction-acceptance-contract.md)

## 一、暂停点与核心结论

本轮暂停是必要的。当前不应继续通过增加采集字段、继续强化提示词、恢复验收打分或零散修复 Agent 纪律来追求更高还原度。

已确认的核心结论是：

1. 冷链原型的 Producer/Capture 大前提成立。现有固定 Evidence 已覆盖页面、主要状态、关键场景、Screenshot、语义节点、拓扑、组件和 Token 信息，没有发现足以单独解释“还原只有 6–7 分”的采集缺口。
2. 当前主要瓶颈在 Consumer 实施过程，而不是 Evidence 是否存在。具体集中在 Evidence 工作集过大、读取接口缺少投影、目标工程组件/Token 解析能力不足、Agent 执行顺序缺少产品级约束，以及实现后没有真实视觉反馈回路。
3. 当前系统可以证明“选中的 Evidence 已完整采集”，但不能证明“目标工程视觉已高保真实现”。Coverage、reconstruction readiness 与 target fidelity 必须继续保持为三个独立结果。
4. 提示词膨胀是架构问题的表象。只要首次读取和 Review Contract 仍然是数百 KB 到数 MB 的大对象，继续改写提示词不会让 Agent 稳定保留细节。
5. 目标工程并不缺少组件和 Token 规范。`apps/flutter_pb_app` 已经存在目标本地映射文档和 Common 组件，真正缺少的是 Agent 可以用 Evidence 语义主动查询目标候选的工具面。
6. 到达 8–9 分的关键不是增加一个综合评分公式，而是建立“固定 Evidence Screenshot → 目标同尺寸截图 → 可解释差异 → Agent 修正 → 再截图”的闭环。
7. `.proto-bridge` 不是普通缓存。它同时包含 Workspace 身份、不可变 Store、固定 Handoff 引用和 Delivery 索引；运行中直接删除与新 clone 后初始化不是同一个生命周期事件。

## 二、本次审计的固定基线

本次审计使用以下固定对象，不应在后续实验中偷偷替换为 active/latest：

- Workspace：`pbwork-local`
- Bundle：`bundle-2026-08-03t095053078-241d3a74`
- Run：`run-2026-08-03t095053079-14b6f18f`
- Snapshot：`snapshot-2026-08-03t095114638-511379f3`
- Handoff：`handoff-2026-08-03t100731725-9a0121d7`
- Delivery：`.proto-bridge/deliveries/2026-08-03T18-08-20+08-00`
- Target root：`apps/flutter_pb_app`

Delivery receipt 记录：

- `coverageStatus=complete`
- `freshnessStatus=fresh`
- `mandatoryRisks=[]`
- 24 个具有固定 Screenshot 引用的 Case
- 16 份不同 Screenshot 内容

后续基准实验必须保留这些 ID。若重新采集，应产生新 Run、Snapshot 和 Handoff，并把“旧基线实验”和“新 Evidence 实验”分开报告。

## 三、已确认事实

### 3.1 Producer 与 Evidence

冷链 Handoff 覆盖三个 Screen：

| Screen | 固定 Case 数量 |
| --- | ---: |
| `cold-chain-ops.exception-queue` | 6 |
| `cold-chain-ops.resolution-form` | 11 |
| `cold-chain-ops.shipment-detail` | 7 |
| 合计 | 24 |

24 个 Case 对应 16 份不同 Screenshot 内容，部分 Scenario checkpoint 与直接 Variant 的 Screenshot 字节完全一致，但 Case 引用仍然分别保留。

固定 Reconstruction Acceptance Contract 当前包含：

| 维度 | 原始 requirement 数量 |
| --- | ---: |
| structure | 566 |
| components | 270 |
| tokens | 2667 |
| states | 24 |
| interactions | 89 |
| 合计 | 3616 |

其中包含：

- 19 种不同 `componentId`；
- 57 种不同 Token ID；
- 474 个不同 Token subject；
- semantic parent、ancestor、document order、scroll owner、positioning 和 bbox；
- Variant、Scenario、Checkpoint 和 Interaction Facts；
- 页面默认态、空态、加载态、错误态、弹层态、提交态和关键业务状态截图。

已人工查看的代表性 Screenshot 包括：

- 异常队列默认态；
- 异常队列错误态；
- 处置表单默认态；
- 处置确认弹窗；
- 运输详情默认态；
- 持续超温态。

这些 Screenshot 能清晰表达页面构图、密度、主要视觉层级、卡片边界、字体层级、状态差异和弹层覆盖关系。当前没有证据表明必须先增强 Capture 才能开始 Consumer 优化。

### 3.2 Consumer 产物体积

最新 Delivery 的主要产物体积：

| 产物/读取 | 大小 |
| --- | ---: |
| `agent-prompt.md` | 623,024 bytes |
| `evidence-brief.md` | 615,768 bytes |
| `acceptance-contract.json` | 3,602,498 bytes |
| `read_evidence_snapshot` 等价完整 JSON | 约 11,927,536 bytes |
| 异常队列默认 Case | 约 676,772 bytes |
| 运输详情默认 Case | 约 466,171 bytes |
| 处置表单默认 Case | 约 424,725 bytes |

这说明当前“按需读取”没有在产品接口层真正成立：

- Prompt 在进入 MCP 读取之前已经内嵌约 616 KB Evidence Brief；
- `read_evidence_snapshot` 返回整个固定 Snapshot 的人类/Agent 投影；
- `read_acceptance_contract` 返回完整五维要求；
- Tool 没有 screen、dimension、summary/detail、fields、cursor、limit 或 continuation 参数；
- Case、revision、Fragment 和 Acceptance 之间存在重复内容注入；
- Consumer 纪律要求先读 Snapshot/Contract，再看 Screenshot，导致视觉信息进入上下文之前，大量语义事实已经占据工作集。

### 3.3 Target 工程现状

目标 Flutter 工程已经具备：

- `lib/common/widgets/` 公共组件集合；
- `TS.colors`、`TS.textStyle`、`TS.spacing`、`TS.sizing`、`TS.radius`、`TS.opacity`、`TS.motion`、`TS.elevation`；
- 命名路由和统一弹层边界；
- `docs/components.md`、`docs/theme.md`、`docs/routing.md`、`docs/testing.md`；
- `docs/proto-bridge.md` 中 Evidence 组件语义到目标组件的明确本地映射。

因此，“PB 不能固定所有目标映射”不等于“目标侧不应有映射”。正确边界是：

- PB Core 不维护跨项目通用的 `card → CommonCard` 映射；
- 目标工程可以拥有自己的 adapter contract、文档或机器可读索引；
- Target Tool 可以读取目标本地契约并返回带依据的候选；
- Agent 仍然负责最终选择和实现；
- Target 结果不能写回 Evidence，也不能覆盖 Source unknown/conflict。

当前 Flutter Target adapter 的不足：

- `FlutterComponentRole` 只覆盖 app-bar、button、image、empty、loading、sheet、toast、page-base、refresh、theme、i18n、route 和 unknown；
- 缺少 card、badge、chip、filter、search、data-list、select、form-section、radio、checkbox、switch、textarea 等大量 Evidence 语义；
- 无参数扫描只能稳定发现少量 Common 组件；
- 没有接受 `componentId[]` 并解析目标 symbol 的能力；
- 没有接受 `tokenId[]` 并解析目标 Token accessor 的能力；
- Example 查询会把目标仓库中已有的冷链实现版本排在前列，存在把前一个 Agent 产物当成后一个 Agent 依据的污染风险。

### 3.4 目标实现与验证现状

当前仓库中保存了多个冷链目标实现版本，包括：

- `cold_chain_v3`
- `cold_chain_v4_gpt`
- `cold_chain_ops`

这些版本在组件复用、局部自定义容器、Token 使用和状态测试覆盖上存在差异。它们证明 Agent 可以完成页面、路由、状态和主要交互，但不能证明已经达到高保真视觉。

当前验证结果：

- `flutter analyze` 通过；
- Flutter 全部 30 项测试通过；
- Core 187 项测试通过；
- CLI 9 项测试通过；
- Local Service 8 项测试通过；
- MCP Evidence E2E 通过；
- 文档校验通过。

但 Flutter Widget tests 主要验证：

- 文案是否出现；
- 页面能否导航；
- 筛选和提交等交互是否产生可见结果；
- 部分 Variant 是否可渲染。

当前没有：

- 目标页面 390×844 同尺寸截图基线；
- 16 份 Evidence Screenshot 对应的目标截图；
- Golden test 或其它像素结果对比；
- OCR 差异报告；
- 关键区域 bbox/间距差异报告；
- 颜色、字体、圆角、边框和阴影差异报告；
- 修正后的重复截图与收敛记录。

因此当前测试可以证明“代码可运行、主要行为存在”，不能证明“视觉达到 8–9 分”。

### 3.5 `.proto-bridge` 资源现状

本次审计时 `.proto-bridge` 约 42.8 MB。按完整文件内容 digest 统计：

- 不同内容约 22.9 MB；
- 完全重复字节约 19.9 MB；
- 完全重复约占 46%；
- Store 内完全重复约 9.5 MB；
- Deliveries 内完全重复约 7.3 MB。

最新 Bundle 已实现 Bundle 内 Screenshot 内容寻址：24 个 Screenshot 引用只保存 16 份二进制内容。这是有效改进。

仍存在：

- 跨 Bundle 相同 Screenshot 内容重复；
- 每次 Delivery 复制相同 Screenshot；
- 相同 Acceptance Contract、Evidence Brief 和 Review 资产随 Delivery 重复；
- 历史 legacy per-record blob 与新 content layout 并存；
- Delivery 的便携性和物理去重目标尚未明确取舍。

### 3.6 Workspace reset 现状

当前已经增加：

```bash
pnpm pb -- workspace reset
pnpm pb -- workspace reset --apply
```

设计意图是：

- 默认只预览；
- `--apply` 清除当前配置指向的 Store 与同级 deliveries；
- 保留 `proto-bridge.json`；
- 重新创建 Workspace manifest；
- Local Service 运行时通过 Service 取消任务并执行重置。

但当前还有一个已验证缺口：

- 如果整个 Store root 已经在 Service 运行期间被手工删除，`LocalFileStore.resetWorkspace()` 会先 `readdir(root)`；
- root 不存在时返回 `ENOENT`；
- 因此“受控 reset 一个存在的 Store”已支持，“从运行中手工删除整个 root 后恢复”尚未闭合。

新 clone 与运行中删除的差异：

| 场景 | 实际语义 |
| --- | --- |
| 新 clone | 没有本地 config/Store；先执行初始化，再启动 Service 和 PBWork |
| 停止服务后清空并初始化 | 新 writer 创建 root、lock 和 Workspace manifest，所有进程从一致状态启动 |
| Service/PBWork 运行中手工删除 | 进程仍持有旧 Workspace/session/object refs，但物理 Store 和 manifest 消失 |

后者不是普通缓存失效，而是绕过 Workspace 生命周期造成的外部破坏。

## 四、问题因果模型

高保真还原不是由单一 Evidence 数量决定。可以把当前闭环理解为以下串联系统：

```text
Evidence 是否存在
  → Agent 是否发现正确 Evidence
  → Agent 是否在正确时机加载最小必要 Evidence
  → Agent 是否识别目标工程已有组件和 Token
  → Agent 是否正确实现结构、状态和交互
  → 系统是否生成目标视觉结果
  → 系统是否发现差异并驱动修正
```

任一环节弱，最终保真度都会被该环节限制。

本次冷链实验中：

- Evidence 是否存在：强；
- Evidence 是否可固定引用：强；
- Evidence 是否可小粒度发现：弱；
- 工作集控制：弱；
- Target component/token 解析：弱到中等；
- Agent 一次性实现能力：中等；
- 状态与主要交互实现：中等到强；
- 目标视觉反馈和修正：缺失。

因此今天继续优化 Capture、增加评分维度或继续扩写 Prompt 没有显著提升最终结果，是因为优化点没有命中当前最弱环节。

## 五、必须保持的产品边界

以下边界在后续设计中不能为了冷链还原效果被破坏。

### 5.1 Evidence 与 Target 单向分离

- Producer 生成 Source Evidence；
- MCP 固定读取 Evidence；
- Target query 只读目标工程；
- Target 事实不能进入 Evidence revision；
- 目标已有实现不能覆盖 Source unknown、conflict 或 Screenshot；
- 目标适配结果可以指导实现，但必须标注来源为 Target。

### 5.2 固定引用与历史不可变

- Handoff 必须固定 Workspace、Bundle、Snapshot、Staleness 和 revision；
- Consumer 不得回退 active/latest；
- 重新采集产生新历史对象；
- 视觉验证结果可以引用 Handoff，但不能原地修改旧 Evidence。

### 5.3 PB 不成为跨项目组件映射表

- PB Core 不硬编码某个项目的 `componentId → target class`；
- Target adapter 可以理解具体技术栈；
- 目标工程可以维护自己的机器可读或文档适配契约；
- Agent 最终决定目标文件、组件、参数、路由和状态管理；
- Tool 返回候选、依据、置信度和 unresolved，而不是替 Agent 自动规划全部代码。

### 5.4 Screenshot 优先但不替代语义

- Screenshot 是最终可见结果的首要依据；
- Screenshot 不能单独证明隐藏状态、交互语义或不可见数据；
- topology、componentId、Token binding、Variant、Scenario 和 Checkpoint 用于解释 Screenshot 与约束实现；
- 不应把语义 Fact 全部展开成评分配额；
- 不应只看 Screenshot 而忽略状态和交互覆盖。

### 5.5 Required boundary 保持最小语义

- `requiredFragments` 继续表示作者声明的最小 Evidence 完整性边界；
- 不把完整页面树塞入 `requiredFragments`；
- Reconstruction topology 和 Review 继续使用独立合同；
- Consumer 工作集优化不能通过丢失 provenance、unknown、conflict 或固定可达性来实现。

### 5.6 不恢复综合还原打分

- 五个维度用于理解、实施和复查；
- 不使用加权总分掩盖某个严重视觉或交互偏差；
- 可以使用可解释的差异检测和严重度；
- 可以保留人工“6–7 / 8–9”作为体验描述，但不能把它作为唯一可执行 Contract。

## 六、目标与非目标

### 6.1 总目标

让 Coding Agent 在有限上下文内，基于固定 Evidence 和目标工程自身约定，高保真实现选中页面与状态，并通过真实目标视觉结果持续纠偏。

目标闭环应具备：

1. 轻量发现：首次读取只建立范围、风险、Screen/Case/Screenshot 地图；
2. 按需深入：Agent 按当前 Screen、状态和区域读取最小必要 Facts；
3. Target 解析：从 Evidence component/token 语义查询目标候选；
4. 分片实施：默认态和公共壳层优先，再实现状态差异与交互；
5. 真实渲染：在 Evidence viewport 获取目标截图；
6. 可解释对比：把差异定位到文案、结构、几何、样式、状态或交互；
7. 迭代收敛：Agent 修正后重新渲染，不在第一次能运行时结束；
8. 诚实报告：未验证、无法映射和目标原生差异必须保留。

### 6.2 冷链实验的期望结果

冷链下一轮受控实验不以“测试全部通过”作为完成条件，而应至少达到：

- 16 份不同 Evidence Screenshot 都有对应的目标截图或明确不适用理由；
- 三个 Screen 的默认构图、滚动边界和视觉层级经人工确认没有重大偏差；
- 关键空态、错误态、加载态、超温态、弹窗态和提交态没有未披露的重大差异；
- Evidence 中存在的关键组件语义优先命中目标 Common 组件，未命中项有依据；
- 关键 Token 有目标 accessor 或明确 fallback；
- 关键 Scenario 已重放；
- 静态检查、Widget test、目标视觉检查彼此区分；
- 人工主观评价稳定进入期望的 8–9 区间，同时没有通过隐藏状态/交互缺失换取视觉相似。

### 6.3 非目标

本阶段不追求：

- 让 PB 直接生成 Flutter/React/Swift 页面代码；
- 为所有技术栈一次性实现 Target adapter；
- 用单一像素阈值自动判定所有页面通过；
- 把目标工程组件映射写入 Source Evidence；
- 为冷链个案重做 PBWork Design System；
- 用更多 required Fragment 代替 Consumer 工作集设计；
- 为了减少磁盘占用破坏历史对象可达性；
- 在未定义 reset 语义前继续增加多个清理入口。

## 七、详细问题与期望能力

### 7.1 Consumer 首次工作集过大

问题：

- Prompt 内嵌完整 Evidence Brief；
- Snapshot 和 Acceptance Contract 是大对象；
- 相同 Facts 在多个读取中重复；
- Screenshot 进入上下文太晚；
- Agent 很容易在实施时只保留概括，不保留具体视觉关系。

期望：

- 首次响应只包含固定身份、风险、Screen 列表、Case 数量、Screenshot digest、Scenario 摘要和可继续读取的逻辑引用；
- 不内嵌完整 Token/structure 列表；
- 每个 Tool 响应具有明确体积预算和 continuation；
- Agent 可以按 Screen、Case、dimension、region 和 fact category 查询；
- 同一 Screenshot digest 只注入一次 ImageContent；
- Tool 明确返回“本次投影省略了什么”以及如何继续读取。

待决定：

- 首次索引目标体积；
- 单次 Tool 响应软/硬上限；
- 使用 cursor、continuation token 还是显式 subject 查询；
- Snapshot 是否保留 full 模式，还是拆分 summary/detail Tool；
- Delivery 是否继续生成 Evidence Brief，如果保留，应只承担什么职责。

### 7.2 Evidence 查询缺少任务导向投影

问题：

- 当前接口按持久对象读取，忠实但不适合 Agent 逐步实施；
- Agent 知道 Handoff ID，却无法先得到“默认态与状态差异”的轻量地图；
- Structure、components、tokens、states、interactions 的读取粒度不一致；
- Acceptance Contract 原始要求按 Case 重复，Brief 虽分组但仍重复大量 Case ID。

期望候选能力（名称仅为讨论占位，不是已批准 API）：

- `read_handoff_index`
  - 固定身份、风险、Screen/Case 数量、Screenshot digest、Scenario 摘要；
- `read_screen_evidence_summary`
  - 单 Screen 默认态、壳层、状态差异和关键 region；
- `list_screenshot_groups`
  - digest、blobId、覆盖 Case，不注入图片；
- `read_case_delta`
  - 指定 Case 相对默认/基准 Case 的可见变化；
- `query_evidence_regions`
  - 按 pbId、componentId、role 或 region group 查询；
- `query_acceptance_guidance`
  - 按 screen/dimension/cursor 返回 Review 指引；
- `read_fact_provenance`
  - 需要调查 unknown/conflict 时再展开来源。

这些能力必须继续遵守固定 Snapshot/revision 可达性，不能构造 active/latest 快捷路径。

### 7.3 组件命中缺少语义查询

问题：

- Agent 必须先知道目标 symbol，才能通过现有 `symbols` 参数查询；
- 但 Agent 真正拥有的是 Evidence `componentId` 和 role；
- 角色闭集覆盖不足；
- 目标文档有映射，Tool 只返回文档摘要而不返回可直接使用的适配结果；
- Agent 容易改用 `Container`、`Wrap`、普通 `ListView` 等视觉近似实现。

期望：

- 输入：`componentId[]`、role、目标 module、可选 layout/state hints；
- 输出：候选 symbol、import、构造参数提示、定义路径、使用示例、目标文档依据、置信度、冲突和 unresolved；
- 候选优先级由目标本地 Contract/文档/真实定义共同决定；
- Tool 不自动写文件，不把候选写回 Evidence；
- Agent 在计划中只列出影响实现选择的映射，不展开所有普通节点。

### 7.4 Token 命中缺少目标解析

问题：

- Evidence 有 57 个 Token ID 和大量 component slot；
- 目标工程存在 TS Token，但当前 Target Tool 只报告主题使用模式；
- 目标适配文档只列出少量示例映射；
- Agent 需要手工阅读 Token 定义、猜测命名转换并处理组件默认值；
- Token Facts 数量巨大，容易压过 Screenshot 中真正关键的视觉信息。

期望：

- 输入：当前 Screen/region 实际用到的 `tokenId[]`，而不是整个 Handoff 的全部 Token；
- 输出：目标 accessor 候选、定义路径、实际值或语义角色、Theme 变体、置信度和 unresolved；
- 区分“由目标公共组件内部已消费”与“业务页面必须显式传入”；
- 对布局敏感 Token 优先；
- 对无法可靠映射的 Token，回到 Screenshot 视觉结果并记录差异，不为了完成映射表而创建平行 Token。

### 7.5 页面结构与状态读取缺少实施顺序

问题：

- 当前 Agent 被要求一次理解全部 Case；
- 24 个 Case 同时进入计划，默认壳层与状态差异混合；
- 相同 Screenshot Case 和 Scenario Case 重复消耗注意力；
- 容易先写完整功能，再在最后一次性检查视觉。

期望顺序：

1. 先选择一个 Screen；
2. 读取默认/基准 Screenshot；
3. 理解壳层、滚动边界、主要区域顺序；
4. 解析当前 Screen 使用的目标组件和 Token；
5. 实现默认态；
6. 获取目标截图并修正；
7. 再读取同 Screen 的状态 Screenshot/delta；
8. 实现和验证状态差异；
9. 重放与该 Screen 相关的 Scenario；
10. 当前 Screen 收敛后再进入下一 Screen。

跨 Screen Scenario 可以在相关页面默认态都完成后统一重放，但不能因为分屏实施而遗漏。

### 7.6 视觉反馈回路缺失

问题：

- Screenshot 被声明为首要依据，但实现后没有自动或半自动视觉读取；
- Agent 可以在 `flutter analyze` 和 Widget tests 通过后结束；
- 当前完成摘要只能自报已查看/已处理；
- 没有产生可以让 Agent定位差异的目标 artifact。

期望视觉闭环：

```text
固定 Evidence Screenshot
  + 固定 viewport / theme / state
  → 目标工程渲染与截图
  → 可解释差异分析
  → Agent 修正
  → 目标重新渲染
  → 人工确认与剩余偏差记录
```

差异分析至少分为：

- 内容：OCR 文案、数字、标签、缺失/多余内容；
- 构图：区域顺序、父子关系、滚动归属、固定/流式定位；
- 几何：bbox、间距、对齐、尺寸、折行、可见范围；
- 外观：颜色、字体角色、字重、圆角、边框、阴影、图标；
- 状态：遮罩、弹层、加载、错误、空态、选中态；
- 交互：操作后的目标 Screen/Variant/Checkpoint。

不建议把这些差异重新压缩成一个加权总分。更适合使用：

- Critical：错误页面/状态、主要区域缺失、错误导航或交互；
- Major：构图、滚动边界、关键组件、显著颜色/字体/尺寸偏差；
- Minor：不影响主要层级的细节差异；
- Accepted target-native deviation：有目标规范依据的差异；
- Unverified：没有可执行环境或无法稳定比较。

“达到 8–9 分”的操作化表达应是：没有未披露的 Critical/Major 差异，Minor 差异数量和影响处于人工可接受范围，且状态/交互没有为了视觉相似被省略。

### 7.7 Target 示例污染与实验隔离

问题：

- 目标仓库同时保存多个冷链实现；
- `find_target_examples` 会按关键词和结构把这些页面返回；
- 第二个 Agent 可能复用第一个 Agent 的错误，而不是独立消费 Evidence；
- 两个 Agent 的实验因此不再可比较。

期望：

- 每个 Agent 使用相同 Git baseline 的独立 worktree/branch；
- Target 查询支持 `gitBase`、exclude paths 或 candidate output root；
- 当前实验的输出目录不进入 Example corpus；
- 可以允许读取目标公共组件和非实验业务页面；
- 如果读取旧冷链页面作为迁移参考，必须显式标记，不得当作 Source Evidence。

### 7.8 Prompt 职责过载

问题：

- Prompt 同时承担固定引用、风险、Evidence Brief、读取顺序、Target 纪律、实现纪律、验证和最终报告；
- Prompt 越长，规则越容易互相稀释；
- 真正应该由 Tool schema、输出结构和流程状态保证的事情，被转移给自然语言提醒。

期望：

- Prompt 只负责启动任务、固定 Handoff/target、声明当前阶段和停止条件；
- Evidence 范围由轻量索引返回；
- 按需读取由 Tool 设计支持；
- Target 映射由目标查询返回；
- 视觉验证由可执行工具产生 artifact；
- 最终报告从实际读取和验证记录派生，减少纯自报字段。

### 7.9 资源去重与 Delivery 便携性

问题：

- Store 历史不可变要求引用可达；
- Delivery 当前复制 Screenshot，便于人类查看和独立交付；
- 但重复 Delivery 和 Bundle 产生大量重复字节；
- 尚未定义 Delivery 是“完全便携包”还是“本机 Store 索引 + Review 视图”。

需要先决定：

1. Store blob 内容寻址范围是 Bundle、Workspace 还是全局；
2. Blob owner/reference metadata 与物理内容是否分离；
3. Delivery Screenshot 使用复制、硬链接、符号链接、内容寻址引用还是按需导出；
4. Delivery 离开当前机器后是否必须独立可读；
5. clean/reset 时如何计算引用和回收内容；
6. legacy blob 迁移是读时迁移、显式迁移还是保持兼容到版本边界；
7. 容量统计按逻辑对象还是物理字节。

任何去重方案都不能：

- 使旧 Snapshot/Handoff 的 Blob 不可达；
- 依赖 Consumer 直接猜 Store 路径；
- 在 owner 尚存在时回收物理内容；
- 静默修改历史 Blob metadata。

### 7.10 Reset 与恢复语义不完整

需要把以下操作明确区分：

- `workspace init`：创建本地配置和新 Workspace manifest；
- `workspace reset`：清空当前 Workspace 的全部 Evidence 和 Delivery，并保留配置；
- `bundle clean`：按历史与归档策略回收部分对象；
- `bundle archive`：阻止继续生产但保留固定历史；
- `delivery clean`：如果未来存在，清理 Review 副本但不破坏 Store；
- `doctor repair`：如果未来存在，只修复可安全重建的运行状态，不伪造 Evidence；
- 外部手工删除恢复：检测破坏后给出确定性恢复路径。

Reset 的期望性质：

- 精确目标；
- 默认 preview；
- 明确不可恢复；
- Service 运行时协调取消任务；
- 幂等；
- root 缺失时可以安全重建；
- 清除 PBWork/Service 的 stale preflight、job、selection 和详情引用；
- reset 完成后不需要重启才能进行新 Capture，或者明确要求并自动引导重启；
- 不把“旧 Handoff 无法恢复”包装成临时错误。

## 八、建议的 Consumer 实施流程

以下是待评审的流程目标，不是当前已实现行为。

### 阶段 A：Bootstrap

只读取：

- Consumer guide；
- Workspace identity；
- Handoff index；
- mandatory risks；
- Screen/Case/Screenshot/Scenario 数量；
- Target root 和目标规则入口。

阶段输出：

- 固定引用确认；
- 风险原样报告；
- 分 Screen 实施顺序；
- 尚未加载的大对象清单。

不得在此阶段加载所有 Token/structure requirements。

### 阶段 B：单 Screen 视觉理解

对当前 Screen：

- 读取默认/基准 Case；
- 查看基准 Screenshot ImageContent；
- 读取 shell/topology 摘要；
- 获取其它 Case 相对基准的状态差异；
- 查看每个不同 digest Screenshot；
- 记录滚动边界、主要区域、关键视觉层级和状态变化。

阶段输出应短小，避免重新复制全部 Facts。

### 阶段 C：目标工程解析

只针对当前 Screen 使用的语义：

- 查询目标组件候选；
- 查询目标 Token 候选；
- 阅读相关公共组件构造参数；
- 阅读相关目标页面示例；
- 检查路由、弹层和状态约定；
- 列出 unresolved 和选择依据。

### 阶段 D：默认态实施与视觉收敛

- 实现页面壳层和默认态；
- 运行目标原生静态检查；
- 在固定 viewport 渲染；
- 生成目标 Screenshot；
- 比较并修正 Critical/Major 差异；
- 默认态收敛后再进入状态扩展。

### 阶段 E：状态与交互扩展

- 按 Case delta 实现空态、加载态、错误态、业务状态和 Overlay；
- 对每个不同 Screenshot 内容生成目标截图；
- 重放 Scenario；
- 验证目标 Variant/Checkpoint；
- 记录相同视觉但不同业务语义的 Case。

### 阶段 F：跨 Screen 闭环

- 重放跨页面导航；
- 检查参数和状态传递；
- 运行完整目标 tests；
- 运行 Target validation；
- 汇总全部 Screenshot、Scenario、差异和未验证事项；
- 由人工进行最终视觉判断。

## 九、受控基准实验设计

在实现优化前，应先把现有 6–7 分现象变成可复现基线。

### 9.1 实验输入

- 固定使用本文第二节列出的 Handoff/Snapshot；
- 固定 iPhone 14 logical viewport `390×844`；
- 固定 light theme；
- 固定 16 份不同 Screenshot 内容；
- 固定目标工程 Git baseline；
- 每个 Agent 使用独立 worktree/branch；
- 排除其它冷链候选实现目录；
- 记录 Agent/模型版本、Prompt、Tool 列表和运行日期。

### 9.2 当前实现基线

对现有实现版本分别生成：

- 16 个目标 Screenshot；
- OCR/content 差异；
- 主要区域几何差异；
- 人工 Critical/Major/Minor 分类；
- 组件命中与自定义实现清单；
- Token 命中与 fallback 清单；
- Scenario/Case 覆盖；
- 总运行时间和验证时间。

如果某版本无法进入某个固定 Case，应记录为未实现，而不是跳过。

### 9.3 新流程对照实验

完成每个优化阶段后，用相同输入再次运行至少两个独立 Agent：

- 不使用旧实现代码；
- 不修改 Source Evidence；
- 不改变目标组件/Token 文档，除非该阶段明确研究目标契约；
- 保存 Tool 调用日志和每次响应的字节规模；
- 保存第一次实现截图和最终收敛截图；
- 对比“首次结果”和“迭代后结果”。

### 9.4 需要记录的指标

这些指标用于诊断，不合成为总分：

| 指标 | 目的 |
| --- | --- |
| Bootstrap 输入/输出字节 | 判断首次工作集是否受控 |
| 每 Screen Evidence 读取字节 | 判断按需加载是否成立 |
| 重复 Facts/图片注入次数 | 判断上下文浪费 |
| 不同 Screenshot 查看率 | 防止视觉状态遗漏 |
| Case/Scenario 实施率 | 防止只实现默认态 |
| componentId resolved/unresolved | 判断目标组件解析能力 |
| tokenId resolved/unresolved | 判断目标 Token 解析能力 |
| Target 自定义平行组件数量 | 判断是否绕过目标组件边界 |
| Critical/Major/Minor 视觉差异 | 判断真实视觉结果 |
| 视觉迭代次数 | 判断反馈是否有效 |
| 首次可运行时间 | 观察实施效率 |
| 收敛时间 | 观察总体耗时 |
| `.proto-bridge` 逻辑/物理增长 | 观察资源效率 |

## 十、分阶段优化计划

### Phase 0：冻结定义并建立基线

目标：在不改产品能力的情况下，确认问题分布。

工作：

- 确认本文的产品边界和非目标；
- 确认 target fidelity 的实际验收语言；
- 为现有两个主要 Agent 结果生成完整 16-state 目标截图；
- 完成可解释差异分类；
- 建立独立 worktree 实验方式；
- 记录当前 Prompt/Tool/context/time 基线。

退出标准：

- 能指出当前 6–7 分主要损失来自哪些具体类别；
- 能区分是 Agent 没读取、Target 没解析、组件参数不够、实现错误还是没有迭代；
- 后续 Phase 的优先级由基线事实支持，而不是直觉。

在 Phase 0 完成前，不修改 Capture Contract。

### Phase 1：轻量索引与按需 Evidence 查询

目标：让“按需加载”成为接口能力，而不是 Prompt 要求。

候选工作：

- 设计 Handoff lightweight index；
- 拆分 Snapshot summary 与 detail；
- 增加 Screen/Case/dimension/region 投影；
- 为大集合增加 cursor/continuation；
- 增加 Case delta 或等价状态差异投影；
- Prompt 移除完整 Evidence Brief 内嵌；
- 保留 provenance、unknown、conflict 和固定可达性；
- 添加真实冷链规模的响应体积回归测试。

退出标准：

- Bootstrap 不读取完整 Snapshot/Contract；
- Agent 可以在不加载其它 Screen Token/Facts 的情况下实现一个 Screen；
- 同一 Fact 和相同 Screenshot 不重复注入；
- 冷链规模下每步响应体积可预测且可继续读取；
- MCP E2E 验证固定引用没有弱化。

### Phase 2：Target component/token resolver

目标：让 Agent 从 Evidence 语义出发查询目标候选。

候选工作：

- 定义目标本地 adapter contract 的来源和优先级；
- 扩展或替代当前窄角色闭集；
- 增加 componentId/role → target candidates 查询；
- 增加 tokenId/slot → target accessor candidates 查询；
- 返回 definition/import/props/example/documentation/provenance/confidence；
- 支持 exclude paths/git baseline；
- 明确 unsupported adapter 行为；
- 使用非冷链页面验证不会过拟合。

退出标准：

- 冷链 19 种 componentId 都能返回目标候选或明确 unresolved；
- Agent 不需要预先猜到 `CommonCard` 等 symbol；
- 关键 Token 可解析到 TS accessor 或明确 unresolved；
- Target 结果不进入 Evidence；
- 目标候选实现目录不会污染 Example 查询。

### Phase 3：目标截图与视觉迭代闭环

目标：从“代码通过”升级为“可见结果经过检查和修正”。

候选工作：

- 定义 Target state/route 启动描述；
- 固定 viewport、theme、locale、font 和动画稳定条件；
- 生成目标 Screenshot artifact；
- 绑定到 Handoff Case/Screenshot digest；
- 提供 OCR、几何和视觉差异报告；
- 使用 Critical/Major/Minor/accepted/unverified 状态；
- 允许 Agent 修正后重跑；
- 最终 Review 引用实际目标 artifact，而不只接受自报数组。

退出标准：

- 16 个不同 Screenshot 状态都能得到目标结果或确定性 unsupported；
- Agent 能根据报告完成至少一次有效视觉修正；
- 完成报告区分首次结果和最终结果；
- 无未披露 Critical/Major 差异时才能宣称高保真范围已完成；
- 不恢复加权总分。

### Phase 4：资源寻址、Delivery 与 Workspace 生命周期

目标：减少重复并让清理/恢复语义确定。

候选工作：

- 决定 Workspace 级内容寻址方案；
- 分离 Blob owner metadata 与物理 content；
- 决定 Delivery 便携性与去重方式；
- 增加引用计数或可达性回收计划；
- 定义 legacy migration；
- 使 reset 对缺失 root 幂等；
- 清除 Service/PBWork stale 状态；
- 增加“运行中受控 reset”和“外部删除后恢复”测试；
- 在 PBWork 提供明确的清理/恢复入口和不可恢复警告。

退出标准：

- 相同内容在选定寻址范围内只有一份物理内容；
- 旧 Handoff Blob 始终可达；
- Delivery 行为符合已确认的便携性定义；
- root 已存在/缺失、Service 运行/停止四种组合都有确定结果；
- reset 后可以直接重新 Capture，或产品明确要求并引导重启；
- Doctor 能区分未初始化、已重置、外部破坏和 Workspace mismatch。

### Phase 5：Prompt 收敛与全链路回归

目标：让 Prompt 回归调度职责，并证明新流程可泛化。

候选工作：

- 精简 Agent Prompt；
- 将可执行规则迁移到 Tool schema、flow state 和验证结果；
- 更新 Agent 消费指南、MCP README、目标 Skill 和相关测试；
- 冷链使用两个独立 Agent 重跑；
- 账本星球或其它原型进行交叉验证；
- 比较上下文、耗时、组件命中、状态覆盖和视觉差异。

退出标准：

- Prompt 不再内嵌完整 Evidence；
- Agent 不依赖阅读 Store 文件或 current source 补造 Evidence；
- 冷链结果相对基线显著改善；
- 其它原型没有因为冷链优化回退；
- 文档、Schema、Tool、Prompt 和测试保持单一权威。

## 十一、编码前必须确认的决策

以下问题没有答案前，不应开始大规模修改。

### 11.1 Target fidelity 的完成定义

- “8–9 分”最终由谁判断：用户、人工 Reviewer、自动差异或组合？
- 哪些差异必须是 Critical/Major？
- 目标平台原生字体/控件差异如何接受？
- 是否要求全部 16 个状态视觉验证，还是默认态全量、其它状态按风险？
- 无 Simulator/Emulator 时能否宣称完成，还是只能 `unverified`？

### 11.2 Consumer 工作集预算

- Bootstrap 最大目标体积是多少？
- 单次 Tool 响应建议上限是多少？
- Agent 是否按一个 Screen 工作，还是允许多个 Screen 并行？
- Screenshot 应在结构 Facts 之前还是之后进入上下文？
- full Snapshot/Contract 是否继续对调试开放？

### 11.3 Target adapter contract

- 组件/Token 映射由机器可读 manifest、目标文档、源码扫描还是多来源合并？
- 冲突时谁优先？
- role/componentId 是开放字符串还是技术栈 adapter 闭集？
- unsupported 技术栈如何降级且不误报闭环完成？
- 如何排除实验输出和前一个 Agent 产物？

### 11.4 视觉比较能力边界

- 采用纯人工、像素 diff、感知 diff、OCR/几何或组合？
- 比较工具是 PB Core 能力、Target adapter 能力还是独立 Review 层？
- 目标 Screenshot 是否进入 Store，若进入属于 Evidence、Target artifact 还是 Review artifact？
- 如何处理动画、系统字体、抗锯齿和平台渲染差异？
- 差异严重度由规则、Agent还是人工决定？

### 11.5 Delivery 与去重

- Delivery 是否必须脱离 Store 独立携带 Screenshot？
- 是否允许硬链接；跨文件系统或复制后如何表现？
- 保留多少历史 Delivery？
- Store 内容寻址应限定 Workspace 还是跨 Workspace？
- reset 是否同时删除所有 Delivery，是否需要单独 export？

### 11.6 Reset 与外部破坏恢复

- 运行中发现 root 消失时 Service 自动重建、停止并报错，还是只允许显式 repair/reset？
- PBWork 本地状态如何清空？
- 外部删除后旧 Handoff 是否只报告永久不可恢复？
- reset 是否要求二次确认或 typed confirmation？
- 是否需要把 Workspace generation/epoch 暴露给 PBWork 以识别旧 session？

### 11.7 兼容与迁移

- 现有 Store/Handoff 是否需要原地兼容；
- 新投影是否只增加 Tool，还是替换现有 full reads；
- legacy blob 内容何时迁移；
- 旧 Delivery 是否保留、重建或不处理；
- Contract major 是否需要变化。

## 十二、主要风险与防护

### 12.1 过拟合冷链

风险：为冷链的三个页面和 Flutter Common 组件设计专用流程。

防护：

- 使用账本星球或其它原型交叉验证；
- Core 只接受通用 Evidence 语义；
- Flutter 细节留在 Target adapter；
- 不把冷链 componentId 写进公共枚举。

### 12.2 视觉 diff 变成脆弱门禁

风险：字体抗锯齿、平台差异或动画导致大量误报。

防护：

- 不直接以像素完全一致作为通用 Block；
- 使用内容、几何、感知和人工复核组合；
- 允许 target-native accepted deviation；
- 保存差异 artifact 和判断依据。

### 12.3 Tool 过细导致调用耗时上升

风险：解决上下文膨胀后产生大量碎片调用。

防护：

- 提供 Screen 级合理聚合；
- 使用批量 subject 查询；
- 支持 cursor 和响应预算；
- 基准同时记录上下文与时间，不能只优化其中一个。

### 12.4 Target resolver 变成自动 Planner

风险：PB 替 Agent 决定文件和架构，违反产品边界。

防护：

- 只返回候选、事实、依据和 unresolved；
- 不写目标工程；
- 不把 Target 结果写回 Evidence；
- 最终选择保留在 Agent 计划和报告中。

### 12.5 去重破坏不可变历史

风险：物理内容回收后旧 Handoff 无法读取 Screenshot。

防护：

- 先设计 owner reachability 和回收计划；
- metadata 保持不可变；
- 删除前验证全部引用；
- 对 legacy Store 进行迁移/兼容测试。

### 12.6 把自报 Review 当作真实验证

风险：Agent 填满 Case/Screenshot 数组，但没有生成正确目标结果。

防护：

- Review 引用真实目标截图和验证 artifact；
- Tool 记录实际 Screenshot 读取和目标渲染；
- 人工最终判断与自动报告分开。

## 十三、开始编码前的就绪检查单

只有以下项目被逐项确认，才进入 Phase 1 或其它代码阶段：

- [ ] 接受“Producer 暂时冻结，优先优化 Consumer/Target/Review”的判断；
- [ ] 确认本文第二节的固定 Handoff 为实验基线；
- [ ] 确认 target fidelity 的完成语言；
- [ ] 确认需要生成哪些目标 Screenshot；
- [ ] 确认 Consumer 首次/单次响应的工作集预算；
- [ ] 确认 Target component/token contract 的归属；
- [ ] 确认实验必须排除旧冷链实现污染；
- [ ] 确认视觉比较方法和人工复核角色；
- [ ] 确认 Delivery 便携性与去重目标；
- [ ] 确认 reset、repair、external deletion 的产品语义；
- [ ] 确认历史 Store/Delivery 的兼容策略；
- [ ] 完成现有 Agent 输出的 16-state 基线截图与差异分类；
- [ ] 根据基线重新确认 Phase 1–5 的优先级。

## 十四、建议的思考顺序

在下一次继续开发前，建议按以下顺序讨论，而不是直接讨论 Tool 名称或代码落点：

1. 用户口中的“8–9 分”具体意味着哪些可见结果；
2. 当前两个 Agent 分别在哪些页面、状态和视觉类别丢分；
3. 哪些丢分来自没读 Evidence，哪些来自目标组件/Token 没命中；
4. 哪些丢分即使 Evidence 和 Target 都正确，也需要视觉迭代才能修正；
5. 一次 Agent 工作应该以整个 Handoff、一个 Screen，还是一个视觉状态为工作单元；
6. 目标工程应该如何声明自身 component/token adapter contract；
7. 视觉结果由谁渲染、保存、比较和最终确认；
8. 最后才决定 MCP Tool、Schema、Prompt 和 Store 的具体改动。

## 十五、当前建议

在完成上述决策前：

- 不继续增强 cold-chain Capture；
- 不继续增加 Agent Prompt 规则；
- 不恢复加权验收评分；
- 不继续创建新的冷链实现版本；
- 不手工删除 `.proto-bridge`；
- 不把当前 Flutter tests 通过解释成高保真通过；
- 保留当前固定 Store、Delivery 和实现版本，作为后续对照基线；
- 下一项实际工作应是 Phase 0 的目标截图与差异基准，而不是修改 Core Contract。

本文在关键边界被确认后，后续正式设计应分别进入：

- 长期设计取舍：新增或更新 ADR；
- 当前产品行为：`docs/product` / `docs/architecture`；
- Tool 和消费规则：MCP README 与 Agent 消费指南；
- Workspace/reset：配置与操作指南；
- Target adapter：目标工程规范与对应 package 文档；
- 可执行要求：Schema、实现和测试。

