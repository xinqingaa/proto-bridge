# MCP UI Reconstruction Research TODO

本文档不是零散问题清单，而是 ProtoBridge MCP UI Reconstruction 的调研、排查、评估与后续演进台账。

它服务三个目标：

- 记录当前已经确认的代码事实和 workflow 边界。
- 把零散视觉问题上升为可定位、可归因、可决策的流程问题和架构问题。
- 为后续是否调整 capture、evidence、planning、role、mapping、压缩策略提供统一输入。

---

## 1. 执行摘要

本轮调研的总体判断：

- 当前问题不应简单归因于 CLI / MCP 架构耦合。
- 从现有文档和代码结构看，CLI 与 MCP 的 workflow 边界已经基本清晰。
- 当前真正暴露的问题是 MCP 视觉还原链路的状态覆盖、证据保真、压缩策略和可观察性不足。
- 目前更像是“pipeline 已经成型，但 debug / trace / visual inspection 能力还不够”，而不是“项目整体不可维护”。
- 现阶段不建议因为这些问题直接重起新项目；更合理的方向是在当前项目中继续强化 MCP 这条主产品路径。

更准确的定位：

```text
当前不是“某几个样式没对上”的局部问题，
而是在评估 MCP workflow 是否具备高保真 UI 还原所需的基础能力。
```

---

## 2. 调研范围

本轮调研从几个局部问题出发：

- 页面整体背景不一致。
- 某些 tab 的背景和边框不一致。
- 某些组件自带背景，导致还原结果偏离原页面。
- 某些颜色没有被正确保留或映射。

随着排查推进，问题已经扩展为以下更高层主题：

- capture 是否覆盖了足够多的页面状态。
- evidence 是否足够保真、可追踪、可复核。
- planning 是否发生了过早压缩或粗粒度映射。
- role 设计是否过粗，导致 component mapping 和 planner 失真。
- Flutter 落地是否仍然依赖过多 agent 猜测。

---

## 3. 当前确认的事实

以下内容属于当前已能从代码或文档中确认的 `code fact`。

### 3.1 输入与 capture 边界

- MCP 当前主输入是 `URL`，不是“URL 或截图二选一”。
- `capture_page_evidence` 会用 Playwright 打开 URL，使用给定 viewport 或默认 viewport 进行 capture。
- 当前默认 viewport 为 `390 x 844`，这会直接影响截图、bbox、section 和样式判断。
- 页面截图 `screenshot.png` 是视觉基准证据，但当前 node tree 主要来自 rendered DOM，而不是来自截图本身。
- `ocr_screenshot` 当前主要补充 OCR 文字证据，不能替代 URL capture，也不能单独生成和 DOM 同等级的 node tree。

### 3.2 Evidence 生成边界

- `PageEvidence` 的基础数据来自 rendered DOM 抽取。
- `PageEvidence` 不是原始 DOM dump，而是经过可见性过滤、role 推断、token 抽取和 section 归纳后的证据模型。
- `PageEvidence` 还会叠加 runtime metadata、page list、tab traversal、asset extraction、OCR 等增强信息。
- evidence 抽取当前从 `document.body` 开始，不是从 `html` 开始。

### 3.3 Plan 与 Flutter 落地边界

- `ui-implementation-plan.json` 不是 node 到 Flutter 的确定性翻译结果。
- 它更像是基于 evidence 生成的 section、widget、component、theme、asset、interaction 计划。
- Flutter 落地阶段仍然依赖 agent 根据 evidence 和 plan 继续实现。
- 当前 component mapping 的输入主要是 evidence role，不是 HTML tag，也不是节点级严格语义树。

### 3.4 当前可确认的压缩点

- node 抽取有上限，复杂页面可能被截断。
- section 抽取和 plan 生成都存在数量截断和摘要压缩。
- 当前 chain 中至少存在 evidence 层压缩和 plan 层压缩这两段。

---

## 4. 两个关键流程说明

### 4.1 `ui-implementation-plan.json` 更像“实现说明书”，不是“确定性翻译结果”

不要把它理解成：

```text
HTML / node -> Flutter code
```

更准确的理解是：

```text
evidence -> implementation guidance -> agent judgment -> Flutter code
```

它会告诉 agent：

- 页面大致有哪些视觉区块。
- 哪些节点像 app-bar、button、list、image、modal。
- 哪些颜色和字体可能映射到哪些 theme token。
- 哪些区域建议拆成 widget。
- 哪些资源、交互、文本和 i18n 需要关注。

但它不会精确到：

- 这个 DOM 节点一定该翻成哪个 Flutter widget。
- 这个布局一定是 `Row` 还是 `Column`。
- 这个颜色候选里一定该选哪一个 target token。
- 这个 tab、sheet、card 一定该复用哪个 YouFi 组件。

### 4.2 Flutter 落地阶段仍然依赖 agent 做大量判断

当前 Flutter 落地不是“照抄 plan”，而是 agent 继续做实现判断，例如：

- 这里该用 `Row`、`Column`、`Stack` 还是自定义 widget。
- 这里是复用现有 YouFi 组件，还是本地新建 widget。
- theme token 该选 exact match 还是 family fallback。
- 目标组件默认背景、边框、圆角是否要覆盖。
- tab、选中态、展开态、弹框状态是否只做 UI 占位还是做更完整表达。

这意味着：

- 同一份 evidence 和 plan，两个 agent 可能都能产出“看起来合理”的 Flutter。
- 当前系统的还原精度不只取决于 evidence，也取决于 planner 的表达力和 agent 的实现判断。

---

## 5. 从局部问题到总体问题

当前暴露出来的不是单点 bug，而是一组系统性问题。

### 5.1 状态覆盖不足

单次 URL capture 更像“当前页面状态的一次采样”，不是“页面状态空间的完整采集”。

潜在风险：

- 长滚动页面底部内容未被真实表达。
- 虚拟列表、懒加载内容、滚动后才渲染的内容缺失。
- tab 切换后的内容没有进入 evidence。
- modal / sheet / dropdown / filter / popover 没有进入 evidence。
- 条件渲染、折叠态、展开态、选中态信息不完整。

### 5.2 Role 设计过粗

当前 role 同时承担了多种职责：

- 语义控件：`button`、`input`、`image`
- 页面区域：`app-bar`、`bottom-bar`、`modal`
- 结构容器：`section`、`list`、`card`
- 兜底类别：`text`、`unknown`

风险：

- role 粒度混杂，含义不稳定。
- role 一旦直接驱动 component mapping，就容易过早收敛。
- 某些复杂容器和特殊组件会被粗暴映射到过泛的 role。

### 5.3 Plan 不是确定性翻译

当前 plan 更偏“实现建议”，而不是严格约束。

风险：

- component mapping 是启发式建议，不一定能稳定保留原始视觉特征。
- target 组件自带默认背景、边框、圆角、内边距时，容易带偏结果。
- 某些 style fact 在 plan 中只是 hint，而不是强约束。

### 5.4 压缩可能过早发生

当前 chain 中存在多层压缩。

风险：

- 关键视觉节点可能在 evidence 阶段就被截断。
- 关键 section 可能没有进入 widgetTree。
- 关键 token 可能没有进入 themeMappings。
- 被压掉的未必是“次要信息”，也可能是背景层、active tab、边框、阴影等高价值视觉事实。

### 5.5 可观察性不足

目前 `page-evidence.json` 和 `ui-implementation-plan.json` 信息量很大，但缺少适合人和 AI 快速定位问题的索引。

风险：

- 排查必须通读大量 JSON。
- 很难快速回答“这个偏差发生在哪一层”。
- 很难系统复盘某类问题到底主要来自 capture、plan，还是 Flutter 实现。

---

## 6. 当前 workflow 的问题地图

下面按流水线分层记录问题。

### 6.1 Capture 层

已知风险：

- capture 当前以 URL 单状态采样为主。
- viewport 固定或手动传入，可能与真实目标设备不一致。
- 单次采样不一定覆盖滚动、切换、弹框、条件渲染状态。

已观察到的问题：

- 某些状态 UI 无法进入最终证据。
- 视觉对照只基于一张 screenshot 时，容易低估交互态差异。

当前能确认的事实：

- 当前主路径是 Playwright 打开页面，截图并抽取 rendered DOM。

当前不能确认的内容：

- 某个具体页面的缺失，究竟是 DOM 未渲染、capture 未触发状态，还是后续 evidence 压缩导致。

### 6.2 Evidence 层

已知风险：

- 从 `document.body` 开始抽取，整体背景可能缺失或不完整。
- 可见性过滤、role 推断和 token 抽取都带有启发式。
- node / section / token 存在数量上限。

已观察到的问题：

- 背景不一致。
- tab 状态信息不稳定。
- 边框、阴影、颜色等信息不一定稳定保留。

当前能确认的事实：

- evidence 是“可见 UI 证据模型”，不是完整 DOM。

当前不能确认的内容：

- 某个具体样式丢失，是没抽到、抽到了但没索引到，还是后续没被消费。

### 6.3 Planning 层

已知风险：

- section、widget、component、theme 都会进一步压缩 evidence。
- component mapping 当前按 role 做粗粒度匹配。
- theme mapping 对 color / typography 支持相对更强，对 border / shadow / radius 约束偏弱。

已观察到的问题：

- 有背景的组件可能被映射到自带背景的 target component。
- 某些视觉事实在 plan 中只剩 hint，没有形成强约束。

当前能确认的事实：

- plan 当前是 target-facing implementation guidance，不是 deterministic compiler output。

当前不能确认的内容：

- 在典型问题样本里，plan 层究竟是不是偏差的主要来源。

### 6.4 Target Component 层

已知风险：

- 目标组件默认样式可能带来背景、边框、圆角、内边距偏差。
- 组件复用策略可能优先于 node-level fidelity。

已观察到的问题：

- 某些组件“看起来类似”，但自带样式与源页面不一致。

当前能确认的事实：

- 当前 workflow 明确鼓励优先复用 target common widgets 和 similar examples。

当前不能确认的内容：

- 哪些 target component 是高风险组件，需要在 plan 中显式提示“谨慎复用”。

### 6.5 Flutter Implementation 层

已知风险：

- agent 仍然需要大量判断。
- 最终实现可能受 coding agent 风格、上下文和局部理解影响。

已观察到的问题：

- evidence 和 plan 都可能没错，但代码仍然没有按预期还原。

当前能确认的事实：

- 当前 validate 更偏实现后 review，不足以替代前置的视觉 trace。

当前不能确认的内容：

- 各类视觉偏差里，D 类问题的占比到底有多高。

---

## 7. 当前已观察到的典型问题

- 页面整体背景不一致。
- 某些 tab 的背景和边框不一致。
- 某些组件自带背景，导致还原结果偏离原页面。
- 某些颜色没有被正确保留或映射。

这些问题当前更适合作为“样本入口”，而不是直接认定为单点 bug。

---

## 8. 问题归因框架

每个视觉问题建议落入以下四类之一：

- A. capture / evidence 缺失
- B. plan 压缩或映射歧义
- C. target component 默认样式带偏
- D. Flutter 实现遗漏或实现错误

解释：

- A 类：DOM、bbox、computedStyle、tokens、assets 等关键事实没有被保留下来。
- B 类：evidence 有，但 plan 没保留、保留不够，或映射过粗、发生歧义。
- C 类：planner 建议复用某个 target 组件，但该组件默认样式本身带偏。
- D 类：evidence 和 plan 都基本正确，但最终 Flutter 代码没有照着落地。

---

## 9. 标准排查链路

后续排查视觉问题时，建议固定使用下面的链路：

```text
视觉问题
  -> screenshot 中定位区域
  -> 用文本 / bbox / section 找到 sectionId
  -> 用 section.nodeIds 找到相关 nodes
  -> 检查 node style facts 是否完整
  -> 检查 themeMappings / componentMappings 是否保留这些 facts
  -> 检查 widgetTree 是否表达了正确结构
  -> 检查 Flutter 实现是否按 plan 落地
```

建议不要把第二段简单理解成“大 JSON 到 Flutter 代码的一一映射”，而应理解成以下链路：

```text
screenshot -> section / node / token -> themeMappings / componentMappings / widgetTree -> Flutter 实现
```

---

## 10. 复杂 JSON 的定位方案

不要直接阅读完整几千行 `page-evidence.json`，建议按问题切片定位：

- 先从截图中圈定问题区域。
- 记录问题类型、文本锚点、预期效果、实际效果。
- 优先在 `sections` 中找到对应区块。
- 再根据 `section.nodeIds` 反查相关 `nodes`。
- 重点查看这些节点的 `bbox`、`text`、`computedStyle`、`cssVarRefs`、`assetRefs`。
- 再检查这些 `nodeIds` 是否进入了 `themeMappings`、`componentMappings`、`interactionPlan`。
- 如果 evidence 正确但 plan 不正确，问题大概率在 planner。
- 如果 evidence 和 plan 都正确，问题大概率在 Flutter 落地。

---

## 11. 需要补齐的定位能力

当前最需要补的是一类问题定位能力：

```text
某个视觉偏差到底发生在 capture、evidence、plan、target component，还是 Flutter 实现阶段？
```

建议规划一个轻量调试索引产物，例如：

```text
.proto-bridge/evidence/<page>-<timestamp>/
├── screenshot.png
├── page-evidence.json
├── ui-implementation-plan.json
└── visual-debug-index.json
```

`visual-debug-index.json` 的可能内容：

- section index：`sectionId`、区域 bbox、标题文本、主要 nodeIds。
- node style index：`nodeId`、文本锚点、bbox、background、color、border、radius、shadow、font。
- visual token index：颜色、字体、间距、圆角、边框等 token 与 node 的对应关系。
- mapping index：`nodeId / sectionId -> themeMappings / componentMappings / widgetTree`。
- risk index：被截断、被压缩、缺少样式、heuristic 推断、target component 可能带默认样式的节点。

这个索引的价值不是“生成更多内容”，而是减少排查时必须通读几千行 JSON 的成本。

---

## 12. 重点专题调研方向

后续不建议直接跳进改代码，建议先分专题调研。

### 12.1 State Coverage

目标：

- 评估当前 workflow 是否只覆盖了页面的单一状态。
- 评估滚动、tab、弹框、筛选、展开态、条件渲染是否进入 evidence。

建议样本：

- 长滚动页
- tab 页
- 带 modal / dropdown / filter 的页面

核心问题：

- 当前 capture 丢失的是“页面未渲染的状态”，还是“已渲染但未被抽取的状态”。

### 12.2 Role Taxonomy

目标：

- 评估当前单一 role 是否过粗。
- 评估 role 是否混合了语义、布局、交互、区域等不同维度。

核心问题：

- role 是否应该从单值改成多轴标签模型。
- 哪些 component mapping 偏差本质上来自 role 设计不稳。

### 12.3 Compression Loss

目标：

- 识别 evidence 层和 plan 层分别压掉了什么。
- 评估被压掉的信息是否包含关键视觉事实。

核心问题：

- 压缩是否发生得太早。
- 压缩是否缺少“关键样式优先保留”的排序策略。

### 12.4 Mapping Determinism

目标：

- 评估哪些 mapping 是“提示”，哪些可以升级为“强约束”。
- 评估 component mapping 和 theme mapping 中的猜测比例。

核心问题：

- 哪些 target component 应谨慎复用。
- 哪些视觉事实必须从 hint 升级为 explicit constraint。

### 12.5 Visual Debuggability

目标：

- 让人和 AI 都能快速解释一个视觉偏差的来源。

核心问题：

- 当前产物是否足以高效定位问题。
- 是否需要额外的 debug index、trace 或 review artifact。

---

## 13. 分阶段待办

### 13.1 P0：先建立问题样本和归因能力

- [ ] 选择 5 个典型视觉问题作为样本。
- [ ] 每个样本都按 `screenshot -> evidence -> plan -> Flutter` 做一次链路追踪。
- [ ] 给每个样本打归因标签：A / B / C / D。
- [ ] 统计问题主要集中在哪一层。
- [ ] 为复杂页面建立统一排查记录。

### 13.2 P1：先确认问题主要集中在哪个专题

- [ ] 确认页面整体背景问题是否发生在 evidence 层。
- [ ] 确认 tab 选中态信息是否主要依赖 runtime metadata，还是当前仅靠 heuristic。
- [ ] 确认有背景的组件是否被错误映射到了自带背景的 YouFi 组件。
- [ ] 确认颜色缺失问题发生在 token 抽取、theme mapping，还是 Flutter 实现层。
- [ ] 评估长滚动页是否存在状态覆盖不足或虚拟内容遗漏。
- [ ] 评估 plan 层压缩是否会丢失关键节点、关键 section 或关键 token。

### 13.3 P2：再决定是否进入方案设计

- [ ] 如果 A 类最多，优先研究 capture / evidence 演进方案。
- [ ] 如果 B 类最多，优先研究 role / planner / mapping / compression 演进方案。
- [ ] 如果 C 类最多，优先研究 target component 风险清单和复用策略。
- [ ] 如果 D 类最多，优先研究更强的实现约束与验证方式。
- [ ] 只有在样本归因稳定后，才进入具体代码改造方案。

---

## 14. 决策门槛

后续是否改 workflow、改 role、改压缩策略，不应凭个别 case 决定，而应基于样本统计。

建议的决策规则：

- 如果 A 类问题占多数，优先改 capture / evidence。
- 如果 B 类问题占多数，优先改 planner / role / mapping / compression。
- 如果 C 类问题占多数，优先改 target component 复用策略和显式风险提示。
- 如果 D 类问题占多数，优先改 agent 落地规则和实现阶段校验。

只有在样本级证据表明某层是主因时，才进入该层的设计或改造。

---

## 15. 面向 AI 的防幻觉要求

后续让 AI 审查 MCP 流程、定位视觉问题或提出方案时，要求它把判断拆成三类：

- `code fact`：能在代码或产物中确认的事实，必须给出文件路径或产物字段。
- `inference`：基于事实做出的推断，必须说明推断链路。
- `unknown`：当前材料无法确认的内容，必须明确说还不能判断。

示例：

```text
code fact:
extractRenderedPage 当前从 document.body 抽取节点，并设置 maxNodes = 600。

inference:
如果页面背景主要挂在 html 或 body 的特殊样式上，整体背景不一致可能发生在 evidence 层。

unknown:
具体页面是否因此丢失背景，需要查看该页面的 screenshot、page-evidence.json 和相关 node style。
```

这个约束可以减少 AI 在大 JSON 和多段 pipeline 中靠猜测下结论，也能让每次排查更容易复盘。

---

## 16. Case 记录模板

后续可以按下面模板持续补充 case：

```md
### Case: <问题名称>

- 页面 URL:
- 问题类型:
- 预期:
- 实际:
- 截图区域:
- 对应 sectionId:
- 对应 nodeIds:
- 关键 computedStyle:
- themeMappings:
- componentMappings:
- 最终归因: A / B / C / D
- 备注:
```

---

## 17. 当前平台与架构判断

当前阶段的产品与架构判断如下：

- CLI：source-aware migration，可继续作为高级能力和批处理能力保留。
- MCP：URL-first UI reconstruction，应继续作为主产品路径强化。
- Core：继续沉淀 source / snapshot / target / workflow 的中间层能力。

当前不是“代码已经无法维护”，而是“针对复杂视觉问题的观察、追踪、归因能力还不够”。

因此当前主方向应是：

- 保留现有 workflow 主干。
- 增强 evidence fidelity、state coverage、debug trace、mapping clarity。
- 在样本归因完成后，再决定是否调整 role、planner、capture 或压缩策略。
