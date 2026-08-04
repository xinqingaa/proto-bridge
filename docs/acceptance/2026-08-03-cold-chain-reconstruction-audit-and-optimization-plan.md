# 冷链原型高保真还原：现状诊断、边界与优化规划

记录日期：2026-08-03（Asia/Shanghai）

修订：2026-08-04 — 完成二次审查收敛：删除历史目标实现叙述；拍板 Target adapter 职责、Consumer 投影、Review Session、有界视觉修正、MCP 能力握手与 Workspace reset/generation 语义；合并 Phase 0/0.5。

状态：Plan Converged / Phase 0 Execution Pending / Code Changes Gated by Phase 0

关联原型：`apps/pbwork/src/prototypes/cold-chain-ops`

目标工程：`apps/flutter_pb_app`

## 文档性质

本文是针对 2026-08-03 冷链原型还原实验的一次性现状审计和优化规划记录，目的是在继续修改代码之前保存完整问题背景、事实、边界、目标、已拍板默认决策、剩余待决策项与验证方案。

本文：

- 不是当前产品规范，不声明尚未实现的 Tool、Contract、门禁或能力已经生效；
- 不替代 `docs/product`、`docs/architecture`、`docs/reference`、ADR、可执行 Schema 和测试；
- 不把冷链个案的视觉特点提升为 ProtoBridge 的通用规则；
- 不要求等齐全部历史开放问题才开工；**按 Phase 最小决策包**满足后即可进入对应阶段（见第十一、十三节）；
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
6. 到达 8–9 分的关键不是增加一个综合评分公式，而是建立“固定 Evidence Screenshot → 目标同尺寸截图 → 可解释差异 → Agent 修正 → 再截图”的闭环。可执行完成条件使用 Critical/Major/Minor 框架；「8–9」只作人工体验标签，不作唯一门禁。
7. `.proto-bridge` 不是普通缓存。它同时包含 Workspace 身份、不可变 Store、固定 Handoff 引用和 Delivery 索引；运行中直接删除与新 clone 后初始化不是同一个生命周期事件。
8. MCP Consumer 跑的是 `packages/*/dist`，且客户端挂载的是长驻 stdio 进程。改 `src` 后必须先 `pnpm build`，再在 Cursor/Codex 侧 Reload/重启 MCP；长期方案应通过 build/capability fingerprint 自动识别过期进程，而不是依赖固定 Tool 数量或文件 mtime 猜测。
9. Target baseline 不包含冷链实现。正式实验从固定的空冷链 Target commit 开始，期望视觉只使用固定 Evidence Screenshot；实验输出必须与 Target example corpus 隔离。

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

运维注意：该 Bundle 使用 `blobs/content/{digest}.bin` 内容寻址布局。实验前必须确认当前 MCP 进程已加载支持该布局的 dist，并能调用 `read_evidence_screenshot` / `read_acceptance_contract` / `summarize_reconstruction_review`（完整工具集约 19 个）。过期 MCP 仍按 legacy `{blobId}.bin` 读取时会出现假阴性 ENOENT。

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

因此，“PB 不固定跨项目映射”不等于“目标侧不应有映射”。四层职责应明确分开：

1. Source Evidence 决定源页面事实；
2. 目标工程自己的 Contract/文档决定目标组件、Token、路由和架构规范；
3. `packages/core/src/target/flutter-app` 负责 Flutter 技术栈识别、受控扫描、文档/Contract 解析、真实 symbol 校验、示例查询和目标变更验证；
4. Agent 根据 Tool 返回的候选、依据、冲突和 unresolved 做最终实现选择。

`packages/core/src/target/flutter-app` 应保留，但它不是目标项目映射权威，也不应把项目 componentId 扩充成 PB Core 的通用闭集。现有 `FlutterComponentRole` 仅保留服务 legacy conventions/examples；新 resolver 直接接受开放的 `componentId[]` / `tokenId[]` 字符串。

当前 Flutter Target adapter 已经具备工程识别、文档扫描、架构启发式、route/component/example 扫描和变更验证；不足是：

- 目标文档只被摘要和提示，显式映射没有形成可调用结果；
- 没有接受 `componentId[]` 并解析目标 symbol 的能力；
- 没有接受 `tokenId[]` 并解析目标 Token accessor 的能力；
- 文档声明与真实 symbol/构造参数的有效性没有形成统一冲突结果；
- Example 查询缺少正式的 exclude paths / candidate output root 防污染输入。

### 3.4 Target baseline 与验证现状

当前 Target baseline 不包含冷链 feature、路由或 Hub 入口，等待新消费流程落地后从空目标开始实现。正式实验不读取任何冷链目标页面作为示例。

当前仍有一项清理残留：`apps/flutter_pb_app/test/widget_test.dart` 还包含已不存在的冷链入口断言，因此 `flutter analyze` 通过但 `flutter test` 有 3 个失败用例。Phase 0 必须先删除这些失效断言并重新固定 Target baseline commit；在此之前不能把当前 Target 称为可复现实验基线。

当前验证能力边界：

- 静态检查与 Widget/Core/MCP 测试只能证明代码可运行和主要行为存在；
- 当前没有目标页同尺寸 Screenshot、OCR/几何/样式差异报告和修正收敛记录；
- 因此测试通过不等于视觉达到高保真。

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
- 目标工程维护自己的机器可读 Target Contract 和人类规范；
- Target adapter 理解具体技术栈，负责发现、解析和校验，但不拥有项目映射；
- 映射声明优先级是「目标机器 Contract > 目标文档显式映射 > 源码启发式候选」，但任何声明都必须通过真实代码存在性与签名校验；
- Contract/文档指向不存在的 symbol 时返回 stale/conflict，不得静默降级到另一个组件；
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
- 人工主观评价可用「8–9」作为体验描述，但**可执行完成条件**是：无未披露 Critical/Major 差异，Minor 可接受，且状态/交互未被省略换取视觉相似。

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

待决定（2026-08-04 已拍板默认，细节见第十一节）：

- 首次索引目标体积：Bootstrap 文本目标约 **20–30KB** 量级（可调，但必须有预算）；
- 单次 Tool 响应：软上限 + continuation；超限必须可续读；
- 使用 cursor/continuation 与显式 subject 查询并行支持；
- Snapshot/Contract：**默认 Consumer 路径只用 summary/投影**；full 模式仅 debug；
- Delivery：**可保留人类可读 index/checklist**；Prompt **不得内嵌**完整 Evidence Brief / Acceptance Contract；全量 contract 文件若仍生成，也不得进入默认 Agent 上下文（索引交付 + 懒投影）。

### 7.2 Evidence 查询缺少任务导向投影

问题：

- 当前接口按持久对象读取，忠实但不适合 Agent 逐步实施；
- Agent 知道 Handoff ID，却无法先得到“默认态与状态差异”的轻量地图；
- Structure、components、tokens、states、interactions 的读取粒度不一致；
- Acceptance Contract 原始要求按 Case 重复，Brief 虽分组但仍重复大量 Case ID。

期望候选能力（名称仅为讨论占位，不是已批准 API）：

**Phase 1 最小集（先做，避免 Tool 爆炸）：**

- `read_handoff_index`（或等价瘦身现有 `read_agent_handoff`）
  - 固定身份、风险、Screen/Case 数量、Screenshot digest 地图、Scenario 摘要；
- `read_screen_evidence_packet`
  - 单 Screen：默认态摘要、壳层/滚动边界、状态列表、distinct screenshot refs；可选 detail；
- 已有 `read_evidence_screenshot`
  - 按 digest 去重注入 ImageContent；同一 digest 只读一次。

**第二波（Phase 2+，不阻塞 Phase 1）：**

- `list_screenshot_groups`
- `read_case_delta`（必须含 scenario/checkpoint 语义轴；同 digest ≠ Case 可合并）
- `query_evidence_regions`
- `query_acceptance_guidance`
- `read_fact_provenance`
- component/token resolver tools

这些能力必须继续遵守固定 Snapshot/revision 可达性，不能构造 active/latest 快捷路径。

**同图不同义硬规则：** 24 Case / 16 digest 时，图片内容按 digest 去重读取；Case 与 Scenario checkpoint 仍须分别覆盖、实施与披露，不得因像素相同而合并业务语义。

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

“达到 8–9 分”的操作化表达应是：没有未披露的 Critical/Major 差异，Minor 差异数量和影响处于人工可接受范围，且状态/交互没有为了视觉相似被省略。人工可用「8–9」描述体验，但门禁与报告必须以 Critical/Major 框架为准。

### 7.7 Target 示例污染与实验隔离

问题（审计当日）：

- 目标仓库曾同时保存多个冷链实现；
- `find_target_examples` 会按关键词和结构把这些页面返回；
- 第二个 Agent 可能复用第一个 Agent 的错误，而不是独立消费 Evidence。

现状（2026-08-04）：

- 主干冷链实现已清空，即时污染源消失；
- 仍需产品级防御，避免再次落入「多版本对照目录常驻主干」模式。

期望：

- 每个 Agent 使用相同 Git baseline 的独立 worktree/branch；
- Target 查询支持 `gitBase`、exclude paths 或 candidate output root；
- 防御性 exclude：`lib/features/cold_chain*`（及未来实验输出目录）；
- 可以允许读取目标公共组件和非实验业务页面；
- 若需历史对照，只在离线 worktree 导出截图，不得当作 Source Evidence，也不得合回 main。

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

需要先决定（Phase 4；不阻塞 Phase 1）：

1. Store blob 内容寻址范围：**默认先 Workspace 级**（跨 Workspace 延后）；
2. Blob owner/reference metadata 与物理内容是否分离；
3. Delivery Screenshot：**默认本机索引 + 可选导出包**；避免每次整包拷贝（硬链可用，跨卷再复制）；
4. Delivery 离开当前机器后是否必须独立可读（导出包路径才要求）；
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

不得在此阶段加载所有 Token/structure requirements。Bootstrap 后应尽快进入当前 Screen 的 distinct Screenshot，而不是先灌全量 Acceptance Contract。

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
- 固定目标工程 Git baseline（**不含**已删除的冷链实现目录）；
- 每个 Agent 使用独立 worktree/branch；
- Target examples 防御性 exclude `lib/features/cold_chain*` 及当前实验输出目录；
- 记录 Agent/模型版本、Prompt、Tool 列表、MCP dist 构建时间和运行日期。

### 9.2 期望基线（无主干历史实现）

不再以主干内多版本冷链代码为对照。Phase 0 基线改为：

- 16 份固定 Evidence Screenshot（及 Delivery review 副本）作为期望视觉；
- 当前 Prompt/Tool/上下文字节与调用耗时基线；
- （可选）旧 commit 离线 worktree 导出的历史目标截图笔记，仅用于回忆「6–7 分长什么样」，不进入实现语料；
- 空目标工程上的新流程实验作为唯一正式对照路径。

若某次实验无法进入某个固定 Case，应记录为未实现，而不是跳过。

### 9.3 新流程对照实验

完成每个优化阶段后，用相同输入再次运行至少两个独立 Agent：

- 不使用、不恢复主干内旧冷链实现；
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
| MCP tool 列表与 dist mtime | 防止过期进程造成假阴性 |

## 十、分阶段优化计划

### Phase 0：冻结定义并建立基线

目标：在不改产品能力的情况下，对齐期望与测量方式（**不依赖主干历史实现**）。

工作：

- 确认本文产品边界、非目标与第十一节已拍板默认决策；
- 盘点 Delivery/Store 中 16 份 Evidence Screenshot 作为期望视觉基准；
- （可选）独立 worktree 检出删除前 commit，仅离线导出历史目标截图作笔记；
- 建立独立 worktree 实验方式；
- 记录当前 Prompt/Tool/context/time 基线（在 Phase 0.5 卫生通过后测量）；
- 用 Critical/Major/Minor 语言描述「6–7 → 8–9」期望，不恢复加权总分。

退出标准：

- 期望视觉基准（16 digest）可引用且可读；
- 完成语言与门禁层级已对齐（见 11.1）；
- 后续 Phase 的优先级由「消费链路弱点」支持，而不是直觉；
- **不要求**恢复或保留主干冷链实现。

在 Phase 0 完成前，不修改 Capture Contract。

### Phase 0.5：MCP / Store 运行态卫生（Phase 1 硬前置）

目标：消除「源码已改、客户端仍跑旧 dist/旧进程」导致的假阴性。

工作：

- 修改 `packages/core` 或 `packages/mcp-server` 后执行 `pnpm build`（或至少构建这两个包）；
- Cursor：Settings → MCP → Reload；Codex：重启 MCP 挂载/会话（仅新开对话不够）；
- 确认工具列表约 19 个，且含 `read_evidence_screenshot`、`read_acceptance_contract`、`summarize_reconstruction_review`；
- 确认第二节基线 Bundle 的 Screenshot blob 可读（content-addressed layout）；
- 禁止手工删除 `.proto-bridge`；清理只用 `pnpm pb -- workspace reset`（先 preview 再 `--apply`）；
- 记录 MCP 启动时间与 dist mtime。

退出标准：

- 基线 Handoff 相关读取在当前客户端会话中成功；
- 工具集与当前源码意图一致；
- 实验日志能区分「产品缺陷」与「过期 MCP」。

说明：`scripts/pb-mcp.mjs` 的 `requireBuilt` 只检查 dist **是否存在**，不比较新旧；改 src 后必须显式 build + 重启进程。

### Phase 1：轻量索引与按需 Evidence 查询

目标：让“按需加载”成为接口能力，而不是 Prompt 要求。

**最小交付（先做）：**

- Handoff lightweight index；
- Screen packet（summary + screenshot refs + 状态列表；可选 detail）；
- 复用并强调 `read_evidence_screenshot` 按 digest 去重；
- Prompt 移除完整 Evidence Brief / Contract 内嵌；
- 默认可路径禁止整包 Snapshot/Contract；full 仅 debug；
- 同步更新 Agent 消费指南（与 Tool 同变更集），避免旧纪律强迫先读大 Snapshot；
- 保留 provenance、unknown、conflict 和固定可达性；
- 冷链规模响应体积回归测试。

**可同阶段或紧随：** Case delta（含 scenario 语义轴）、acceptance guidance cursor、region query。

退出标准：

- Bootstrap 不读取完整 Snapshot/Contract；
- Agent 可以在不加载其它 Screen Token/Facts 的情况下理解并规划一个 Screen；
- 同一 Fact 和相同 Screenshot digest 不重复注入；
- 冷链规模下每步响应体积可预测且可继续读取；
- MCP E2E 验证固定引用没有弱化。

### Phase 2：Target component/token resolver

目标：让 Agent 从 Evidence 语义出发查询目标候选。

候选工作：

- 目标本地 adapter 来源优先级（见 11.3 默认）；
- 扩展或替代当前窄角色闭集；
- componentId/role → target candidates；
- tokenId/slot → target accessor candidates；
- 返回 definition/import/props/example/documentation/provenance/confidence；
- 支持 exclude paths / gitBase；
- 明确 unsupported adapter 行为；
- 使用非冷链页面验证不过拟合。

退出标准：

- 冷链 19 种 componentId 都能返回目标候选或明确 unresolved；
- Agent 不需要预先猜到 `CommonCard` 等 symbol；
- 关键 Token 可解析到 TS accessor 或明确 unresolved；
- Target 结果不进入 Evidence；
- 实验输出目录不会污染 Example 查询。

### Phase 3：目标截图与视觉迭代闭环

目标：从“代码通过”升级为“可见结果经过检查和修正”。

候选工作：

- 定义 Target state/route 启动描述；
- 固定 viewport、theme、locale、font 和动画稳定条件；
- 生成目标 Screenshot **Review/Target artifact**（不写回 Evidence；见 11.4）；
- 绑定到 Handoff Case/Screenshot digest；
- 提供 OCR、几何和视觉差异报告；
- 使用 Critical/Major/Minor/accepted/unverified；
- 允许 Agent 修正后重跑；
- 最终 Review 引用实际目标 artifact，而不只接受自报数组。

退出标准：

- 16 个不同 Screenshot 状态都能得到目标结果或确定性 unsupported；
- Agent 能根据报告完成至少一次有效视觉修正；
- 完成报告区分首次结果和最终结果；
- 无未披露 Critical/Major 差异时才能宣称高保真范围已完成；
- 不恢复加权总分。

### Phase 4：资源寻址、Delivery 与 Workspace 生命周期

目标：减少重复并让清理/恢复语义确定。可晚于 Phase 1–2；其中「reset 对缺失 root 幂等」可提前以最小补丁进入 0.5。

候选工作：

- Workspace 级内容寻址（默认范围，见 11.5）；
- 分离 Blob owner metadata 与物理 content；
- Delivery：本机索引 + 可选导出包；避免默认整包拷贝；
- 引用计数或可达性回收计划；
- legacy migration；
- reset 对缺失 root 幂等；清除 Service/PBWork stale 状态；
- 「运行中受控 reset」与「外部删除后恢复」测试；
- PBWork 明确清理/恢复入口与不可恢复警告。

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
- 冷链使用两个独立 Agent 在空目标上重跑；
- 账本星球或其它原型交叉验证；
- 比较上下文、耗时、组件命中、状态覆盖和视觉差异。

退出标准：

- Prompt 不再内嵌完整 Evidence；
- Agent 不依赖阅读 Store 文件或 current source 补造 Evidence；
- 冷链结果相对 Phase 0 期望基准显著改善；
- 其它原型没有因为冷链优化回退；
- 文档、Schema、Tool、Prompt 和测试保持单一权威。

## 十一、决策状态（默认已拍板 / 仍开放）

**不要**等齐全部历史开放问题才写代码。按 Phase 最小决策包推进。

### 11.0 按 Phase 的最小决策包

| 阶段 | 必须已拍板 | 可延后 |
| --- | --- | --- |
| Phase 0 | 基线定义（无历史实现）、完成语言层级 | Delivery 去重细节 |
| Phase 0.5 | build + Reload 纪律、基线 blob 可读 | 完整 doctor/repair |
| Phase 1 | 11.1 门禁层级、11.2 工作集、Contract/Brief 消费方式、11.7 兼容默认 | 11.5 去重、11.6 全量 reset |
| Phase 2 | 11.3 Target contract 优先级与 exclude | Workspace 级 blob |
| Phase 3 | 11.4 artifact 归属与严重度框架 | diff 算法最终选型细节 |
| Phase 4 | 11.5、11.6 | — |

### 11.1 Target fidelity 的完成定义 — 已拍板

| 项 | 默认 |
| --- | --- |
| 可执行门禁 | 无未披露 Critical/Major + Case/Scenario/Screenshot 覆盖声明 |
| 「8–9 分」 | 仅人工体验标签，不作唯一 Contract / 加权总分 |
| Critical | 错误页面/状态、主要区域缺失、错误导航或交互 |
| Major | 构图/滚动边界/关键组件/显著颜色字体尺寸偏差 |
| Minor | 不影响主要层级的细节 |
| Accepted | 有目标规范依据的平台原生差异 |
| Unverified | 无 Simulator/Emulator 或无法稳定比较时不得宣称视觉完成 |
| 16 digest | 默认要求全部有目标图或明确 unsupported；实施顺序仍是单 Screen、默认态先收敛 |

### 11.2 Consumer 工作集预算 — 已拍板

| 项 | 默认 |
| --- | --- |
| 工作单元 | **单 Screen**；跨屏 Scenario 在相关默认态完成后统一重放 |
| Bootstrap | 身份/风险/Screen·Case·digest 地图；文本目标约 **20–30KB** 量级 |
| Screenshot 时机 | 索引后，该屏 distinct digest **优先于**全量 structure/token |
| 单次 Tool | 软上限 + continuation；超限必须可续读 |
| full Snapshot/Contract | **debug-only**；默认 Consumer 路径禁用整包 |
| Prompt | 只留固定 ID + 阶段/停止条件；**不内嵌** Brief/Contract |
| Delivery 物化 | 索引交付 + 懒投影；人类 checklist/index 可保留；全量 contract 若生成也不得默认进 Agent 上下文 |

### 11.3 Target adapter contract — 已拍板（Phase 2）

| 项 | 默认 |
| --- | --- |
| 来源优先级 | 目标机器可读 adapter（若有）> docs 显式表 > 源码启发式 |
| 冲突 | unresolved，不静默挑选 |
| 输入 | 从 Evidence `componentId[]` / `tokenId[]` 出发 |
| 输出 | 候选 + 依据 + confidence + unresolved；不写文件、不写回 Evidence |
| 污染防护 | exclude 实验输出与 `lib/features/cold_chain*`；支持 gitBase |
| unsupported 栈 | 明确降级，不得误报 Target 闭环完成 |

### 11.4 视觉比较能力边界 — 已拍板核心 / 细节可迭代

| 项 | 默认 |
| --- | --- |
| Artifact 归属 | **Review/Delivery 或 Target 工作区产物**；**不写回 Evidence**；只引用 Handoff |
| 比较方法 | OCR/内容 + 几何 +（可选）感知 diff + 人工复核；不以像素全等作通用 Block |
| 严重度 | 规则初分 + 人工确认；Agent 可提议，不可单独定门禁 |
| 平台差异 | 走 accepted / unverified，不假装 Source Evidence |

仍可在 Phase 3 细化：具体工具落在 Core 辅助库还是 Target adapter 包装（只要 artifact 不进 Evidence）。

### 11.5 Delivery 与去重 — 仍开放（Phase 4）

已有方向性默认，实现前再确认细节：

- 寻址范围先 **Workspace 级**；
- Delivery 默认 **本机索引 + 可选导出包**，避免每次整包拷贝；
- reset 是否删光 Delivery、保留份数、硬链跨卷行为 —— Phase 4 开工前确认。

### 11.6 Reset 与外部破坏恢复 — 部分开放

- 禁止手删；产品入口走 preview/`--apply`；
- 缺失 root 应可安全重建（可提前最小修复）；
- 外部删除后旧 Handoff：**永久不可恢复**（除非有备份），不得包装成临时错误；
- 运行中自动重建 vs 显式 repair、typed confirmation、epoch —— Phase 4 确认。

### 11.7 兼容与迁移 — 已拍板默认

| 项 | 默认 |
| --- | --- |
| 现有 Store/Handoff | 原地兼容；新投影优先 **增加** Tool，不立即删除旧 full read |
| 默认路径 | 引导走 index/packet；full 保留 debug |
| legacy blob | 读时迁移或双读兼容直至版本边界；不静默丢内容 |
| 旧 Delivery | 保留作历史；不要求重建 |
| Contract major | Phase 1 投影变更尽量不升 major；若破坏旧客户端再评估 |

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

- Phase 1 先落地最小 Tool 集（index + screen packet + screenshot）；
- Screen 级聚合与批量 subject 查询；
- cursor 与响应预算；
- 基准同时记录上下文与时间。

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

### 12.7 过期 MCP / 未 rebuild

风险：改 src 后客户端仍跑旧 dist，表现为缺工具或 content-layout ENOENT。

防护：

- Phase 0.5 门禁；实验日志记录 dist mtime 与 tool 列表；
- 文档与 operator 指南强调：`pnpm build` → Reload MCP → 再开对话。

## 十三、就绪检查单（按阶段）

### 进入 Phase 0.5 / Phase 1 前

- [x] 接受「Producer 暂时冻结，优先优化 Consumer/Target/Review」；
- [x] 确认第二节固定 Handoff 为实验基线；
- [x] 确认不恢复主干历史冷链实现；期望视觉用 Evidence/Delivery 截图；
- [x] 确认 target fidelity 门禁语言（Critical/Major；8–9 仅标签）；
- [x] 确认 Consumer 工作集与 Prompt 不内嵌 Brief/Contract；
- [x] 确认 Phase 1 最小 Tool 集与同图不同义规则；
- [ ] 完成 Phase 0.5：`pnpm build` + Reload MCP + 基线 blob/工具集验证；
- [ ] 记录 Prompt/Tool/context 字节基线。

### 进入 Phase 2 前

- [ ] Phase 1 退出标准满足；
- [x] Target contract 来源优先级与 exclude 默认已接受。

### 进入 Phase 3 前

- [ ] Phase 2 退出标准满足（或明确并行范围）；
- [x] 视觉 artifact 不进 Evidence 的归属已接受；
- [ ] 确认本机是否具备同尺寸渲染环境（否则视觉完成只能 unverified）。

### 进入 Phase 4 前

- [ ] 确认 Delivery 便携性与去重细节；
- [ ] 确认 reset / repair / external deletion 完整语义。

## 十四、建议的执行顺序

1. Phase 0.5：build + Reload MCP，确认基线可读；
2. Phase 0：对齐 16 digest 期望基准与测量指标（无需回滚实现）；
3. Phase 1：轻量索引 + Prompt 去内嵌 + 消费指南同步；
4. Phase 2：component/token resolver；
5. Phase 3：目标截图与视觉迭代；
6. Phase 4：去重与 Workspace 生命周期；
7. Phase 5：Prompt 收敛与跨原型回归。

讨论代码落点前，优先确认当前所处 Phase 的最小决策包是否已勾选。

## 十五、当前建议

立即执行：

- 不继续增强 cold-chain Capture；
- 不继续增加 Agent Prompt 规则堆叠；
- 不恢复加权验收评分；
- **不**把已删冷链实现回滚进主干；
- 不手工删除 `.proto-bridge`；
- 不把 Flutter tests 通过解释成高保真通过；
- 保留当前固定 Store 与 Delivery（含 review 截图）作为 Evidence/期望基线；
- 改 MCP/Core 后：`pnpm build` → 客户端 Reload MCP → 再实验；
- 下一项工程工作：完成 Phase 0.5，然后进入 Phase 1（轻量索引与 Prompt 去内嵌），而不是修改 Capture Contract。

本文中的默认决策在进入正式实现时，应分别沉淀到：

- 长期设计取舍：新增或更新 ADR；
- 当前产品行为：`docs/product` / `docs/architecture`；
- Tool 和消费规则：MCP README 与 Agent 消费指南；
- Workspace/reset：配置与操作指南；
- Target adapter：目标工程规范与对应 package 文档；
- 可执行要求：Schema、实现和测试。
