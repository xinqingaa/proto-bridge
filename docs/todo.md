# ProtoBridge MCP Roadmap & Research TODO

本文档不是零散问题清单，而是 ProtoBridge MCP UI Reconstruction 的调研、排查、评估与后续演进台账。

它服务三个目标：

- 记录当前已经确认的代码事实和 workflow 边界。
- 把零散视觉问题上升为可定位、可归因、可决策的流程问题和架构问题。
- 为后续是否调整 capture、evidence、planning、role、mapping、压缩策略提供统一输入。

---

## 1. 优先级总览

当前阶段先不重写 workflow，也不盲目增加 MCP tool 数量。

后续不建议直接跳进改代码，建议先分专题调研。

更合理的推进顺序是：

```text
P0 MCP 可用性与问题归因基础
  -> P1 Evidence / Artifact 可观察性
  -> P2 Playwright Capture 增强
  -> P3 Planner / Target Mapping 约束增强
  -> P4 MCP 高级协议能力
```

解释：

- 先让 MCP client 和 agent 知道 ProtoBridge 怎么用。
- 再让视觉偏差能被稳定定位和归因。
- 再增强 Playwright capture 覆盖面。
- 再收紧 planner / mapping 的实现约束。
- 最后才评估 roots、elicitation、sampling、Streamable HTTP/auth 等高级能力。

---

## 2. P0：MCP 可用性与问题归因基础

目标：

- 让 agent 第一次看到 ProtoBridge MCP server 时，能理解完整 workflow，而不是只看到一串 tool 名。
- 让任意视觉偏差都能按统一链路定位到 capture/evidence、plan、target component 或 Flutter implementation。

### 2.1 MCP Discoverability 与能力暴露面

新观察：

当前在 MCP client 中看到的 server 摘要过于单薄：

```text
MCP Tools

• proto-bridge
  • Auth: Unsupported
  • Tools: build_ui_implementation_plan, capture_page_evidence, export_review_markdown,
    find_target_examples, get_target_conventions, ocr_screenshot, validate_target_changes
```

这会让第一次使用 ProtoBridge 的 agent 或人类维护者很难判断：

- 这些 tool 的完整职责是什么。
- 每个 tool 应该在 workflow 的哪一步调用。
- tool 输入 schema 里哪些字段必填、哪些字段可选。
- tool 输出里哪些 artifact、resource、id 后续应该继续使用。
- server 是否支持 resources、prompts、sampling、elicitation、roots、resource templates 等 MCP 能力。
- Playwright 当前只是截图，还是还可以提供 DOM、网络、console、trace、交互状态、可访问性树等证据。

#### 2.1.1 当前代码事实

`code fact`：

- `packages/mcp-server/src/server/dispatcher.ts` 的 `initialize` 当前声明了 `tools`、`resources`、`prompts` 三类 server capability。
- 当前没有声明 `logging`、`completions`、`experimental` 或其他扩展 capability。
- 当前没有处理 `roots/list`、`sampling/createMessage`、`elicitation/create` 等 client capability 相关请求。
- `packages/mcp-server/src/tools/registry.ts` 已注册 7 个 tool，并为每个 tool 提供了 `description` 和 `inputSchema`。
- 当前 tool schema 没有显式 `required` 字段，也没有 `additionalProperties: false`、`annotations`、`outputSchema` 或面向 workflow 的长描述。
- `packages/mcp-server/src/resources/index.ts` 已暴露 `proto-bridge://target/conventions`，并在 session 内动态暴露 captured evidence 与 UI plan 资源。
- 当前没有 resource templates，因此 client 很难在 capture 前知道可以通过 URI 模板读取哪些 artifact。
- `packages/mcp-server/src/prompts/index.ts` 当前只暴露一个 prompt：`reconstruct_url_ui`。
- 当前 stdio server 是自写 JSON-RPC line protocol，不是基于官方 TypeScript SDK 的 `McpServer` 封装。
- 当前只支持本地 stdio 接入，没有 Streamable HTTP、OAuth/auth 或远程部署形态。

`inference`：

- client 摘要只显示 tool 名称，并不等于 server 没有 resources/prompts；但当前资源和 prompt 对第一次使用者确实不可发现性弱。
- 现有 tool 能力已经足够支撑 URL-first UI reconstruction，但缺少让 agent 自动理解 workflow、artifact 关系和安全边界的描述层。
- 如果继续只增加 tool 数量而不改描述、schema、resource template 和 prompt，MCP 面板会更像“函数名列表”，不会真正提升可用性。

`unknown`：

- Codex、Cursor、Claude Code 等不同 MCP client 是否展示 tool description、annotations、resource templates、prompts 的方式不完全一致，需要分别验证。
- 当前客户端是否会使用 prompts/list 或 resources/list 的展示信息，需要用真实 client 做一次兼容性检查。

#### 2.1.2 推荐结论

该问题应该新增为一个独立专题：

```text
MCP server discoverability / capability surface is too thin.
```

它和前面视觉保真问题不是同一层，但会直接影响 agent 是否能正确使用 ProtoBridge。

建议优先级：

- P0：补 tools/list 描述、required schema、workflow resource、prompts、artifact index。
- P1：补 resource templates、debug index resource、client compatibility matrix。
- P2：研究 roots、elicitation、logging、completions。
- P3：再评估 sampling 与 Streamable HTTP/auth，除非已有明确远程部署需求。

#### 2.1.3 可能新增或改造的 MCP 能力

优先不建议一口气增加很多 tool。更合理的演进是：

1. 先增强现有 `tools/list` 信息质量。
   - 为每个 tool 增加更长、更明确的 description。
   - 在 schema 中标出 required 字段。
   - 增加参数说明、默认值、安全边界、输出 artifact 说明。
   - 如 client 支持，增加 tool annotations，例如 read-only、destructive、idempotent、open-world 等调用提示。

2. 增加 MCP 元信息资源。
   - `proto-bridge://workflow/ui-reconstruction-guide`
   - `proto-bridge://workflow/tool-catalog`
   - `proto-bridge://artifacts/latest`
   - `proto-bridge://target/conventions`
   - `proto-bridge://target/component-risk-index`

3. 增加 resource templates。
   - `proto-bridge://evidences/{evidenceId}/page-evidence`
   - `proto-bridge://evidences/{evidenceId}/screenshot`
   - `proto-bridge://evidences/{evidenceId}/visual-debug-index`
   - `proto-bridge://plans/{planId}/ui-implementation-plan`
   - `proto-bridge://plans/{planId}/review-markdown`

4. 增加 prompts。
   - `reconstruct_url_ui`：现有 prompt，继续保留。
   - `capture_url_evidence`：只采集证据，不实现代码。
   - `investigate_visual_mismatch`：按 A/B/C/D 归因框架定位偏差。
   - `implement_from_existing_plan`：已有 plan 时直接实现。
   - `validate_ui_reconstruction`：实现后校验 target diff 与视觉风险。

5. 再考虑新增 Playwright 证据 tool。
   - `capture_interaction_states`：围绕 tab/dropdown/modal 等交互态采集 state evidence。
   - `capture_scroll_segments`：长页面分段截图与分段 DOM evidence。
   - `capture_runtime_diagnostics`：network、console、pageerror、资源失败、trace。
   - `compare_page_screenshots`：源 URL 与 target preview URL 的截图对比。

6. 对 client capability 做兼容适配。
   - 在 `initialize` 中记录 client capabilities。
   - 如果 client 支持 roots，优先使用 roots 推断 target root。
   - 如果 client 支持 elicitation，在缺参时请求结构化输入。
   - 如果 client 不支持，则保持现有 tool 参数模式。

### 2.2 问题归因框架

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

### 2.3 标准排查链路

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

### 2.4 复杂 JSON 的定位方案

不要直接阅读完整几千行 `page-evidence.json`，建议按问题切片定位：

- 先从截图中圈定问题区域。
- 记录问题类型、文本锚点、预期效果、实际效果。
- 优先在 `sections` 中找到对应区块。
- 再根据 `section.nodeIds` 反查相关 `nodes`。
- 重点查看这些节点的 `bbox`、`text`、`computedStyle`、`cssVarRefs`、`assetRefs`。
- 再检查这些 `nodeIds` 是否进入了 `themeMappings`、`componentMappings`、`interactionPlan`。
- 如果 evidence 正确但 plan 不正确，问题大概率在 planner。
- 如果 evidence 和 plan 都正确，问题大概率在 Flutter 落地。

### 2.5 需要补齐的定位能力

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

### 2.6 P0 待办

- [ ] 新增 MCP discoverability 样本：记录 Codex / Cursor / Claude Code 中 `proto-bridge` 当前展示出的 tools、resources、prompts 信息。
- [ ] 补全 7 个 MCP tool 的 description、required schema、默认值、输出 artifact 说明和调用顺序说明。
- [ ] 新增稳定 resource：`proto-bridge://workflow/ui-reconstruction-guide` 和 `proto-bridge://workflow/tool-catalog`。
- [ ] 新增 prompt：`capture_url_evidence`、`investigate_visual_mismatch`、`implement_from_existing_plan`、`validate_ui_reconstruction`。
- [ ] 选择 5 个典型视觉问题作为样本。
- [ ] 每个样本都按 `screenshot -> evidence -> plan -> Flutter` 做一次链路追踪。
- [ ] 给每个样本打归因标签：A / B / C / D。
- [ ] 统计问题主要集中在哪一层。
- [ ] 为复杂页面建立统一排查记录。

---

## 3. P1：Evidence 与 Artifact 可观察性

目标：

- 让 capture 产物更容易读、查、复盘。
- 让 evidence、plan、review、debug artifact 能通过稳定入口被 MCP client 和 agent 找到。

### 3.1 可观察性不足

目前 `page-evidence.json` 和 `ui-implementation-plan.json` 信息量很大，但缺少适合人和 AI 快速定位问题的索引。

风险：

- 排查必须通读大量 JSON。
- 很难快速回答“这个偏差发生在哪一层”。
- 很难系统复盘某类问题到底主要来自 capture、plan，还是 Flutter 实现。

### 3.2 Visual Debuggability

目标：

- 让人和 AI 都能快速解释一个视觉偏差的来源。

核心问题：

- 当前产物是否足以高效定位问题。
- 是否需要额外的 debug index、trace 或 review artifact。

### 3.3 P1 待办

- [ ] 确认页面整体背景问题是否发生在 evidence 层。
- [ ] 确认 tab 选中态信息是否主要依赖 runtime metadata，还是当前仅靠 heuristic。
- [ ] 确认有背景的组件是否被错误映射到了自带背景的 YouFi 组件。
- [ ] 确认颜色缺失问题发生在 token 抽取、theme mapping，还是 Flutter 实现层。
- [ ] 评估长滚动页是否存在状态覆盖不足或虚拟内容遗漏。
- [ ] 评估 plan 层压缩是否会丢失关键节点、关键 section 或关键 token。
- [ ] 增加 resource templates，用于 evidence、screenshot、plan、review、visual-debug-index 的参数化读取。
- [ ] 增加 artifact index resource，记录 latest evidence、latest plan、相关 screenshot、review markdown 和 debug index。
- [ ] 建立 MCP client compatibility matrix，记录不同 client 对 descriptions、prompts、resources、templates、roots、elicitation 的支持情况。

---

## 4. P2：Playwright Capture 增强

目标：

- 从“单状态页面采样”升级为“多状态运行态证据采集”。
- 判断状态缺失到底是没渲染、没触发、没抽取，还是被压缩。

### 4.1 State Coverage

目标：

- 评估当前 workflow 是否只覆盖了页面的单一状态。
- 评估滚动、tab、弹框、筛选、展开态、条件渲染是否进入 evidence。

建议样本：

- 长滚动页
- tab 页
- 带 modal / dropdown / filter 的页面

核心问题：

- 当前 capture 丢失的是“页面未渲染的状态”，还是“已渲染但未被抽取的状态”。

### 4.2 当前 Playwright 使用过窄

当前 Playwright 主要承担：

- 打开 URL。
- 等待 `networkidle`。
- 截 fullPage screenshot。
- 在页面内 `evaluate` 抽取 rendered DOM、computed style、asset、interaction。

但 Playwright 还可以成为更强的证据采集层，而不只是截图工具：

- Interaction state capture：自动点击 tab、dropdown、filter、accordion、modal trigger，采集多状态 evidence。
- Scroll segmentation：按 viewport 分段滚动截图和 DOM 抽取，标注每段 scroll offset，避免长页面只靠 fullPage screenshot。
- Network evidence：记录主要 API、静态资源、失败请求、response content-type，帮助判断内容是否懒加载或接口失败。
- Console/pageerror evidence：记录运行时报错和 console warning，区分页面未渲染与抽取失败。
- Trace artifact：保存 Playwright trace，方便复盘 capture 期间的 DOM、network、console、screenshot 时间线。
- Locator / accessibility evidence：补充 role、name、aria-selected、aria-expanded、aria-controls、disabled 等交互语义，减少只靠 className 和 heuristic 推断。
- Visual assertions / diff：将原始 screenshot 与实现后的目标页面 screenshot 做像素或区域级对比，为 `validate_target_changes` 增加视觉校验入口。
- Route / mock support：允许注入 auth、cookie、localStorage、请求 mock 或 fixture，提升需要登录和稳定数据页面的 capture 成功率。

### 4.3 P2 待办

- [ ] 调研 Playwright interaction state capture：tab、dropdown、modal、accordion、filter 的自动触发策略和失败回退。
- [ ] 调研 Playwright runtime diagnostics：network、console、pageerror、trace 是否应该进入 evidence 或单独 artifact。
- [ ] 如果 A 类最多，优先研究 capture / evidence 演进方案。

---

## 5. P3：Planner 与 Target Mapping 约束增强

目标：

- 减少 agent 在 Flutter 落地时的猜测空间。
- 把 plan 中的事实、建议、歧义、人工确认项分清楚。

### 5.1 `ui-implementation-plan.json` 更像“实现说明书”，不是“确定性翻译结果”

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

### 5.2 Flutter 落地阶段仍然依赖 agent 做大量判断

当前 Flutter 落地不是“照抄 plan”，而是 agent 继续做实现判断，例如：

- 这里该用 `Row`、`Column`、`Stack` 还是自定义 widget。
- 这里是复用现有 YouFi 组件，还是本地新建 widget。
- theme token 该选 exact match 还是 family fallback。
- 目标组件默认背景、边框、圆角是否要覆盖。
- tab、选中态、展开态、弹框状态是否只做 UI 占位还是做更完整表达。

这意味着：

- 同一份 evidence 和 plan，两个 agent 可能都能产出“看起来合理”的 Flutter。
- 当前系统的还原精度不只取决于 evidence，也取决于 planner 的表达力和 agent 的实现判断。

### 5.3 Role Taxonomy

目标：

- 评估当前单一 role 是否过粗。
- 评估 role 是否混合了语义、布局、交互、区域等不同维度。

核心问题：

- role 是否应该从单值改成多轴标签模型。
- 哪些 component mapping 偏差本质上来自 role 设计不稳。

### 5.4 Compression Loss

目标：

- 识别 evidence 层和 plan 层分别压掉了什么。
- 评估被压掉的信息是否包含关键视觉事实。

核心问题：

- 压缩是否发生得太早。
- 压缩是否缺少“关键样式优先保留”的排序策略。

### 5.5 Mapping Determinism

目标：

- 评估哪些 mapping 是“提示”，哪些可以升级为“强约束”。
- 评估 component mapping 和 theme mapping 中的猜测比例。

核心问题：

- 哪些 target component 应谨慎复用。
- 哪些视觉事实必须从 hint 升级为 explicit constraint。

### 5.6 P3 待办

- [ ] 如果 B 类最多，优先研究 role / planner / mapping / compression 演进方案。
- [ ] 如果 C 类最多，优先研究 target component 风险清单和复用策略。
- [ ] 如果 D 类最多，优先研究更强的实现约束与验证方式。
- [ ] 只有在样本归因稳定后，才进入具体代码改造方案。
- [ ] 评估 `compare_page_screenshots` 是否可作为实现后视觉验证 tool。

---

## 6. P4：MCP 高级协议能力

目标：

- 只在有明确收益时引入高级 MCP 能力。
- 保持 ProtoBridge MCP 的定位：evidence provider + workflow guide，而不是替代 coding agent。

### 6.1 MCP 协议能力评估

官方 MCP 能力可以按当前项目相关性分层：

**第一层：应该尽快补强**

- Tools：继续作为主操作入口，但要补全 schema 质量、调用顺序说明、输入输出示例、artifact id 说明和风险说明。
- Resources：不只暴露 session 内 evidence/plan，还应暴露稳定的只读上下文，例如 target conventions、workflow guide、artifact index、latest evidence、latest plan、debug index。
- Prompts：增加可复用 workflow prompt，例如 capture-only、review-only、implementation-with-validation、visual-diff-investigation。
- Resource templates：用于表达 `proto-bridge://evidences/{evidenceId}/page-evidence`、`proto-bridge://plans/{planId}/ui-implementation-plan`、`proto-bridge://reviews/{planId}/ui-review` 这类可参数化资源。

**第二层：适合中期研究**

- Roots：让 client 明确告知 server 当前 target repo / allowed roots，减少依赖 `process.cwd()` 和手填 `targetRoot` 的不确定性。
- Elicitation：当缺少 targetModule、页面账号、viewport、业务确认项时，让 server 请求结构化补充信息，而不是只抛错或让 agent 猜。
- Logging：把 capture 阶段、artifact 路径、截断、warning、heuristic 推断输出成 client 可观察日志。
- Completions：为 prompt 参数或 tool 参数提供 target module、artifact id、resource uri 补全。

**第三层：谨慎或暂不建议作为主线**

- Sampling：server 请求 client 代调用模型可以用于总结 evidence、生成 review 或归纳风险，但会让 server 变得更像 agent 编排器。ProtoBridge 当前定位是 evidence/provider，不建议在没有明确安全与成本边界前把 sampling 放进 P0。
- 远程 Streamable HTTP / auth：适合团队共享服务或云端部署，但当前 URL capture 和 target repo 扫描都偏本地开发流，先把 stdio 的 discoverability 补强更划算。

### 6.2 风险与边界

- 不能为了“看起来能力很多”把 CLI source-aware migration 暴露进 MCP runtime；这会破坏当前 CLI / MCP workflow 边界。
- Sampling 不应替代 agent 的实现职责，否则 server 会承担模型调用、成本、安全和提示词漂移问题。
- Elicitation 和 roots 依赖 client 支持，必须做 capability detection 和 fallback。
- Playwright trace、network、fullPage screenshot、分段截图可能产生大量 artifact，需要输出开关和保留策略。
- 视觉 diff 需要目标实现可运行且有稳定 preview URL，不能作为所有场景的强制步骤。

### 6.3 P4 待办

- [ ] 评估 roots capability 是否能替代或补强 `targetRoot` / `process.cwd()` 推断。
- [ ] 评估 elicitation 是否适合用于 targetModule、viewport、登录态、业务确认项等结构化补充信息。
- [ ] 评估 logging / completions 是否能提升 MCP client 内的可观察性和参数选择体验。
- [ ] 暂缓 sampling 和 Streamable HTTP/auth，除非出现明确远程部署或 server-side LLM 总结需求。

---

## 7. 当前判断与调研背景

### 7.1 执行摘要

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

### 7.2 调研范围

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

### 7.3 当前确认的事实

以下内容属于当前已能从代码或文档中确认的 `code fact`。

#### 7.3.1 输入与 capture 边界

- MCP 当前主输入是 `URL`，不是“URL 或截图二选一”。
- `capture_page_evidence` 会用 Playwright 打开 URL，使用给定 viewport 或默认 viewport 进行 capture。
- 当前默认 viewport 为 `390 x 844`，这会直接影响截图、bbox、section 和样式判断。
- 页面截图 `screenshot.png` 是视觉基准证据，但当前 node tree 主要来自 rendered DOM，而不是来自截图本身。
- `ocr_screenshot` 当前主要补充 OCR 文字证据，不能替代 URL capture，也不能单独生成和 DOM 同等级的 node tree。

#### 7.3.2 Evidence 生成边界

- `PageEvidence` 的基础数据来自 rendered DOM 抽取。
- `PageEvidence` 不是原始 DOM dump，而是经过可见性过滤、role 推断、token 抽取和 section 归纳后的证据模型。
- `PageEvidence` 还会叠加 runtime metadata、page list、tab traversal、asset extraction、OCR 等增强信息。
- evidence 抽取当前从 `document.body` 开始，不是从 `html` 开始。

#### 7.3.3 Plan 与 Flutter 落地边界

- `ui-implementation-plan.json` 不是 node 到 Flutter 的确定性翻译结果。
- 它更像是基于 evidence 生成的 section、widget、component、theme、asset、interaction 计划。
- Flutter 落地阶段仍然依赖 agent 根据 evidence 和 plan 继续实现。
- 当前 component mapping 的输入主要是 evidence role，不是 HTML tag，也不是节点级严格语义树。

#### 7.3.4 当前可确认的压缩点

- node 抽取有上限，复杂页面可能被截断。
- section 抽取和 plan 生成都存在数量截断和摘要压缩。
- 当前 chain 中至少存在 evidence 层压缩和 plan 层压缩这两段。

### 7.4 从局部问题到总体问题

当前暴露出来的不是单点 bug，而是一组系统性问题。

#### 7.4.1 状态覆盖不足

单次 URL capture 更像“当前页面状态的一次采样”，不是“页面状态空间的完整采集”。

潜在风险：

- 长滚动页面底部内容未被真实表达。
- 虚拟列表、懒加载内容、滚动后才渲染的内容缺失。
- tab 切换后的内容没有进入 evidence。
- modal / sheet / dropdown / filter / popover 没有进入 evidence。
- 条件渲染、折叠态、展开态、选中态信息不完整。

#### 7.4.2 Role 设计过粗

当前 role 同时承担了多种职责：

- 语义控件：`button`、`input`、`image`
- 页面区域：`app-bar`、`bottom-bar`、`modal`
- 结构容器：`section`、`list`、`card`
- 兜底类别：`text`、`unknown`

风险：

- role 粒度混杂，含义不稳定。
- role 一旦直接驱动 component mapping，就容易过早收敛。
- 某些复杂容器和特殊组件会被粗暴映射到过泛的 role。

#### 7.4.3 Plan 不是确定性翻译

当前 plan 更偏“实现建议”，而不是严格约束。

风险：

- component mapping 是启发式建议，不一定能稳定保留原始视觉特征。
- target 组件自带默认背景、边框、圆角、内边距时，容易带偏结果。
- 某些 style fact 在 plan 中只是 hint，而不是强约束。

#### 7.4.4 压缩可能过早发生

当前 chain 中存在多层压缩。

风险：

- 关键视觉节点可能在 evidence 阶段就被截断。
- 关键 section 可能没有进入 widgetTree。
- 关键 token 可能没有进入 themeMappings。
- 被压掉的未必是“次要信息”，也可能是背景层、active tab、边框、阴影等高价值视觉事实。

---

## 8. 当前 Workflow 的问题地图

下面按流水线分层记录问题。

### 8.1 Capture 层

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

### 8.2 Evidence 层

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

### 8.3 Planning 层

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

### 8.4 Target Component 层

已知风险：

- 目标组件默认样式可能带来背景、边框、圆角、内边距偏差。
- 组件复用策略可能优先于 node-level fidelity。

已观察到的问题：

- 某些组件“看起来类似”，但自带样式与源页面不一致。

当前能确认的事实：

- 当前 workflow 明确鼓励优先复用 target common widgets 和 similar examples。

当前不能确认的内容：

- 哪些 target component 是高风险组件，需要在 plan 中显式提示“谨慎复用”。

### 8.5 Flutter Implementation 层

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

## 9. 问题池与 Case 模板

### 9.1 当前已观察到的典型问题

- 页面整体背景不一致。
- 某些 tab 的背景和边框不一致。
- 某些组件自带背景，导致还原结果偏离原页面。
- 某些颜色没有被正确保留或映射。

这些问题当前更适合作为“样本入口”，而不是直接认定为单点 bug。

### 9.2 Case 记录模板

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

## 10. 决策门槛

后续是否改 workflow、改 role、改压缩策略，不应凭个别 case 决定，而应基于样本统计。

建议的决策规则：

- 如果 A 类问题占多数，优先改 capture / evidence。
- 如果 B 类问题占多数，优先改 planner / role / mapping / compression。
- 如果 C 类问题占多数，优先改 target component 复用策略和显式风险提示。
- 如果 D 类问题占多数，优先改 agent 落地规则和实现阶段校验。

只有在样本级证据表明某层是主因时，才进入该层的设计或改造。

---

## 11. 面向 AI 的防幻觉要求

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

## 12. 当前平台与架构判断

当前阶段的产品与架构判断如下：

- CLI：source-aware migration，可继续作为高级能力和批处理能力保留。
- MCP：URL-first UI reconstruction，应继续作为主产品路径强化。
- Core：继续沉淀 source / snapshot / target / workflow 的中间层能力。

当前不是“代码已经无法维护”，而是“针对复杂视觉问题的观察、追踪、归因能力还不够”。

因此当前主方向应是：

- 保留现有 workflow 主干。
- 增强 evidence fidelity、state coverage、debug trace、mapping clarity。
- 在样本归因完成后，再决定是否调整 role、planner、capture 或压缩策略。
