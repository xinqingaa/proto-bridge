# ProtoBridge MCP Roadmap & Research TODO

本文档不是零散问题清单，而是 ProtoBridge MCP UI Reconstruction 的调研、排查、评估与后续演进台账。

它服务三个目标：

- 记录当前已经确认的代码事实和 workflow 边界。
- 把零散视觉问题上升为可定位、可归因、可决策的流程问题和架构问题。
- 为后续是否调整 capture、evidence、planning、role、mapping、压缩策略提供统一输入。

---

## 1. 优先级总览

当前阶段已经完成 P0 / P1 / P2，下一步最高优先级调整为 P5：Capability-first 工作流重构。

现在不继续沿旧的 URL-first / source-aware 两条固定 workflow 做 P3 / P4 增强。P3 / P4 暂停作为主线，但不废弃；它们应在 P5 完成后分别作为 `runtime.capture`、`ui.plan` / `target.inspect` capability 的增强继续推进。

新的推进顺序是：

```text
P0 统一产物模型与 MCP 契约（已完成）
  -> P1 MCP 可用性与问题归因基础（已完成）
  -> P2 Evidence / Artifact 可观察性（已完成）
  -> P5 Capability-first 工作流重构（当前最高优先级）
  -> P3 Runtime Capture capability 增强
  -> P4 Planning / Target Mapping capability 增强
  -> P6 MCP 高级协议能力
```

解释：

- 先定 artifact、resource URI、tool output 和命名契约，避免后续 debug index、artifact index、hybrid 产物各做各的。
- 再让 MCP client 和 agent 知道 ProtoBridge 怎么用。
- 再让 evidence / plan / review / debug artifact 可查、可读、可复盘。
- 当前应优先打破 CLI / MCP 两条固定 workflow 的壁垒，把底层能力提升为共享 capability。
- P5 完成后，再增强 Playwright capture 覆盖面，此时它会作为 `runtime.capture` capability 同时服务 CLI 和 MCP。
- 再收紧 planner / mapping 的实现约束，此时它会作为 `ui.plan` / `target.inspect` capability 同时服务 CLI 和 MCP。
- 最后才评估 roots、elicitation、sampling、Streamable HTTP/auth 等高级协议能力。

### 1.1 当前已完成成果压缩说明

P0 已完成统一产物模型与 MCP 契约：

- 稳定 page-centric artifact：`page-canonical.json`、`page-debug-index.json`、`ui-build-plan.json`、`ui-build-review.md`、screenshots。
- 稳定 MCP tool output：`pageId`、`artifactSetId`、`files`、`resources`、`warnings`、`nextActions`、`summary`。
- 稳定 page resource URI：`proto-bridge://pages/{pageId}/...`。

P1 已完成 MCP 可用性基础：

- 7 个 MCP tools 已补中文 title / description / 参数说明 / annotations / outputSchema。
- 已暴露 workflow guide、tool catalog、latest artifacts、prompts。
- 已确认 Codex CLI `/mcp` 面板只显示 tool names，但协议层能返回完整描述。

P2 已完成 Evidence / Artifact 可观察性基础：

- 已增加 resource templates，用于 capture 前发现 page artifact URI。
- 已增加 artifact index resource。
- 已增强并瘦身 `page-debug-index.json`。
- `page-debug-index.json` 定位为“索引和诊断卡片”，不是 `page-canonical.json` 的副本；它负责指向 section / node / mapping / risk，完整证据仍回到 `page-canonical.json` / `ui-build-plan.json`。

---

## 2. P0：统一产物模型与 MCP 契约

目标：

- 先定义 ProtoBridge 后续所有产物的命名、层级和关系。
- 让 MCP tools、resources、prompts、artifact index 和未来 hybrid 产物共享同一套契约。
- 避免在 `page-debug-index`、`artifact index`、`resource templates` 和 hybrid `page-canonical` 之间反复改名和返工。

### 2.1 Canonical Artifact 与 Projection Artifacts

已按 page-centric 模型落地，产物分成两类：

#### A. Canonical artifact

系统内部真正可信、最完整的标准上下文。

- `page-canonical.json`

它应尽量完整地保留：

- source facts
- runtime facts
- screenshot refs
- provenance
- merge result
- mismatch warnings

当前实现：

- `page-canonical.json` 是 URL-first 场景的 runtime canonical。
- canonical 内固定保留 `source`、`runtime`、`visual` 相关证据、`ocr`、`screenshots`、`provenance`、`warnings`、`mismatches` 和 `artifacts`。
- 未来 hybrid 引入 source facts 时继续扩展 `page-canonical.json`。

#### B. Projection artifacts

不同阶段、不同对象需要阅读的投影视图。

- `page-debug-index.json`
- `ui-build-plan.json`
- `ui-build-review.md`
- `screenshots/`

旧产物名已退出主流程，仅作为历史背景保留：

- `page-evidence.json`
- `ui-implementation-plan.json`
- `ui-review.md`
- `visual-debug-index.json`

### 2.2 MCP Tool Output Contract

每个会产生 artifact 的 tool 统一返回：

- `pageId`
- `artifactSetId`
- `planId`
- `files`
- `resources`
- `warnings`
- `nextActions`
- `summary`

`planId` 只在 plan/review 阶段出现。agent 应优先用 `pageId` 读取 page-centric resources。

### 2.3 MCP Resource URI Contract

已稳定以下 URI：

- `proto-bridge://workflow/ui-reconstruction-guide`
- `proto-bridge://workflow/tool-catalog`
- `proto-bridge://artifacts/latest`
- `proto-bridge://pages/{pageId}/page-canonical`
- `proto-bridge://pages/{pageId}/page-debug-index`
- `proto-bridge://pages/{pageId}/screenshot/{name}`
- `proto-bridge://pages/{pageId}/ui-build-plan`
- `proto-bridge://pages/{pageId}/ui-build-review`

### 2.4 Artifact Lifecycle

```text
capture
  -> page-canonical.json
  -> page-debug-index.json
  -> screenshots/full-page.png

plan
  -> ui-build-plan.json

review
  -> ui-build-review.md

validate
  -> validation result
```

### 2.5 P0 待办

- [x] 制定 canonical / projection artifact 分层。
- [x] 明确当前 MCP 产物与未来 hybrid 产物的兼容关系。
- [x] 制定 MCP tool 返回结构规范。
- [x] 制定 MCP resource URI 命名规范。
- [x] 制定 artifact lifecycle：capture、plan、review、validate 之间如何关联。
- [x] 明确短期不做 source/runtime merge，只预留字段和命名空间。

---

## 3. P1：MCP 可用性与问题归因基础

目标：

- 让 agent 第一次看到 ProtoBridge MCP server 时，能理解完整 workflow，而不是只看到一串 tool 名。
- 让任意视觉偏差都能按统一链路定位到 capture/evidence、plan、target component 或 Flutter implementation。

### 3.1 MCP Discoverability 与能力暴露面

新观察：

当前在 MCP client 中看到的 server 摘要过于单薄：

```text
MCP Tools

• proto-bridge
  • Auth: Unsupported
  • Tools: capture_page_canonical, build_ui_plan, attach_screenshot_ocr,
    export_ui_review, read_target_conventions, find_target_examples, validate_ui_build
```

这会让第一次使用 ProtoBridge 的 agent 或人类维护者很难判断：

- 这些 tool 的完整职责是什么。
- 每个 tool 应该在 workflow 的哪一步调用。
- tool 输入 schema 里哪些字段必填、哪些字段可选。
- tool 输出里哪些 artifact、resource、id 后续应该继续使用。
- server 是否支持 resources、prompts、sampling、elicitation、roots、resource templates 等 MCP 能力。
- Playwright 当前只是截图，还是还可以提供 DOM、网络、console、trace、交互状态、可访问性树等证据。

#### 3.1.1 当前代码事实

`code fact`：

- `packages/mcp-server/src/server/dispatcher.ts` 的 `initialize` 当前声明了 `tools`、`resources`、`prompts` 三类 server capability。
- 当前没有声明 `logging`、`completions`、`experimental` 或其他扩展 capability。
- 当前没有处理 `roots/list`、`sampling/createMessage`、`elicitation/create` 等 client capability 相关请求。
- `packages/mcp-server/src/tools/registry.ts` 已注册 7 个 tool：`capture_page_canonical`、`build_ui_plan`、`attach_screenshot_ocr`、`export_ui_review`、`read_target_conventions`、`find_target_examples`、`validate_ui_build`。
- 当前 tool schema 已补 `required`、`additionalProperties: false`、`annotations` 和 `outputSchema`，并已通过 stdio `tools/list` 验证描述可返回。
- `packages/mcp-server/src/resources/index.ts` 已暴露强化后的 workflow guide、tool catalog、latest artifacts、target conventions，并在 session 内动态暴露 page-centric artifacts。
- 当前已提供 resource templates，因此 client 可在 capture 前知道 page canonical、debug index、screenshot、plan、review 的 URI 模板。
- `packages/mcp-server/src/prompts/index.ts` 当前暴露 5 个 prompt：`reconstruct_url_ui`、`capture_url_evidence`、`investigate_visual_mismatch`、`implement_from_existing_plan`、`validate_ui_reconstruction`。
- 当前 stdio server 是自写 JSON-RPC line protocol，不是基于官方 TypeScript SDK 的 `McpServer` 封装。
- 当前只支持本地 stdio 接入，没有 Streamable HTTP、OAuth/auth 或远程部署形态。

`inference`：

- client 摘要只显示 tool 名称，并不等于 server 没有 resources/prompts；但当前资源和 prompt 对第一次使用者确实不可发现性弱。
- 现有 tool 能力已经足够支撑 URL-first UI reconstruction，但缺少让 agent 自动理解 workflow、artifact 关系和安全边界的描述层。
- 如果继续只增加 tool 数量而不改描述、schema、resource template 和 prompt，MCP 面板会更像“函数名列表”，不会真正提升可用性。

`unknown`：

- Codex、Cursor、Claude Code 等不同 MCP client 是否展示 tool description、annotations、resource templates、prompts 的方式不完全一致，需要分别验证。
- 当前客户端是否会使用 prompts/list 或 resources/list 的展示信息，需要用真实 client 做一次兼容性检查。

#### 3.1.2 推荐结论

该问题应该新增为一个独立专题：

```text
MCP server discoverability / capability surface is too thin.
```

它和前面视觉保真问题不是同一层，但会直接影响 agent 是否能正确使用 ProtoBridge。

建议优先级：

- P0：已定 artifact / resource / tool output 契约。
- P1：已补 tools/list 中文长描述、annotations、outputSchema、workflow resources、prompts、client 展示样本和第一轮视觉归因样本。
- P2：已补 resource templates 和增强 debug index；剩余 client compatibility matrix，以及更细的 evidence/debug 切片资源。
- P6：再研究 roots、elicitation、logging、completions、sampling、Streamable HTTP/auth。

#### 3.1.3 可能新增或改造的 MCP 能力

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
   - `proto-bridge://pages/{pageId}/page-canonical`
   - `proto-bridge://pages/{pageId}/page-debug-index`
   - `proto-bridge://pages/{pageId}/screenshot/{name}`
   - `proto-bridge://pages/{pageId}/ui-build-plan`
   - `proto-bridge://pages/{pageId}/ui-build-review`

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

### 3.2 问题归因框架

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

### 3.3 标准排查链路

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

### 3.4 复杂 JSON 的定位方案

不要直接阅读完整几千行 `page-canonical.json`，建议按问题切片定位：

- 先从截图中圈定问题区域。
- 记录问题类型、文本锚点、预期效果、实际效果。
- 优先在 `sections` 中找到对应区块。
- 再根据 `section.nodeIds` 反查相关 `nodes`。
- 重点查看这些节点的 `bbox`、`text`、`computedStyle`、`cssVarRefs`、`assetRefs`。
- 再检查这些 `nodeIds` 是否进入了 `themeMappings`、`componentMappings`、`interactionPlan`。
- 如果 evidence 正确但 plan 不正确，问题大概率在 planner。
- 如果 evidence 和 plan 都正确，问题大概率在 Flutter 落地。

### 3.5 需要补齐的定位能力

当前最需要补的是一类问题定位能力：

```text
某个视觉偏差到底发生在 capture、evidence、plan、target component，还是 Flutter 实现阶段？
```

建议规划一个轻量调试索引产物，例如：

```text
.proto-bridge/pages/<page>-<timestamp>/
├── screenshots/full-page.png
├── page-canonical.json
├── ui-build-plan.json
└── page-debug-index.json
```

`page-debug-index.json` 的可能内容：

- section index：`sectionId`、区域 bbox、标题文本、主要 nodeIds。
- node style index：`nodeId`、文本锚点、bbox、background、color、border、radius、shadow、font。
- visual token index：颜色、字体、间距、圆角、边框等 token 与 node 的对应关系。
- mapping index：`nodeId / sectionId -> themeMappings / componentMappings / widgetTree`。
- risk index：被截断、被压缩、缺少样式、heuristic 推断、target component 可能带默认样式的节点。

这个索引的价值不是“生成更多内容”，而是减少排查时必须通读几千行 JSON 的成本。

### 3.6 P1 第一轮实测记录

#### 3.6.1 MCP discoverability 样本

样本时间：2026-05-12。

样本来源：

- 用户在 Codex CLI `/mcp` 面板中观察到：面板只展示 server、auth、command 和工具名列表。
- 本地 stdio JSON-RPC 验证：`tools/list`、`prompts/list`、`resources/list`、`resources/read` 均能返回中文 title / description / prompt / guide。

结论：

- server 侧的 P1 discoverability contract 已具备：工具描述、参数描述、annotations、outputSchema、workflow guide、tool catalog、prompts 都能通过协议返回。
- Codex CLI `/mcp` 面板当前只显示 tool names，不显示 tool description / resources / prompts；这是 client 展示层限制，不是 ProtoBridge server 没有暴露描述。
- Cursor / Claude Code 等 client 的展示行为不在 P1 内逐个适配，后续进入 P2 compatibility matrix。

#### 3.6.2 视觉归因样本

样本 artifact：

- `output/test-p1-zh/mcp-pnl-analysis-2026-05-12T07-15-40-954Z/page-canonical.json`
- `output/test-p1-zh/mcp-pnl-analysis-2026-05-12T07-15-40-954Z/page-debug-index.json`
- `output/test-p1-zh/mcp-pnl-analysis-2026-05-12T07-15-40-954Z/ui-build-plan.json`
- `output/test-p1-zh/mcp-pnl-analysis-2026-05-12T07-15-40-954Z/ui-build-review.md`
- `output/test-p1-zh/mcp-pnl-analysis-2026-05-12T07-15-40-954Z/screenshots/full-page.png`

样本 1：顶部导航与 tab 选中态

- screenshot：顶部为 `Account Detail`，一级 tab 中 `P/L Analysis` 处于选中态，并有下方小三角。
- evidence：`section_node_15` 覆盖 app-bar，`section_node_24/26/28/29/31` 覆盖 tab-bar；`section_node_28` title=`P/L Analysis`，`section_node_29` title=`▼`。
- plan：tab-bar 被保留为本地 widget，component mapping 对 `tab-bar` confidence=low，说明没有稳定目标组件。
- 归因：主要风险是 B / D。B 是选中态依赖文本、颜色、位置和三角节点组合；D 是 Flutter 实现阶段容易只做文字 tab 而漏掉三角、间距或选中颜色。

样本 2：分段按钮与 pill 圆角

- screenshot：`Account P/L` 与 `Symbol P/L` 是上方圆角分段按钮，选中项浅灰底。
- evidence：`section_node_32` 覆盖分段区域；`node_33` 是 `Account P/L` button，bbox=`16,98,98.11,28`，background=`rgb(241,241,241)`，borderRadius=`9999px`，padding=`6px 14px`。
- plan：button role 映射到 `CommonButton`，但 9999px 圆角、浅灰底、紧凑 padding 仍主要依赖 themeMappings/manual facts。
- 归因：主要风险是 C / D。C 是 `CommonButton` 默认高度、字体、圆角可能带偏；D 是实现阶段需要显式控制 pill 尺寸和选中态。

样本 3：收益数字与红色趋势样式

- screenshot：`+$12,240.52` 与 `+2.23%` 使用强红色，大小和字重明显不同。
- evidence：text 中保留 `+$12,240.52`、`+2.23%`，theme mapping 中 `rgb(244,28,83)` 精确匹配 `themeService.colors.colorTrendRed1`。
- plan：颜色有 high/exact token，但金额、百分比的字号和横向对齐仍需要从 node-level typography 与 bbox 落地。
- 归因：主要风险是 D。evidence 与 token mapping 已较完整，后续偏差大概率来自 Flutter 文本层级、baseline 或 spacing 实现。

样本 4：Trend Analysis 折线图

- screenshot：趋势图包含红色折线、淡红面积填充、横向虚线网格、右侧刻度与底部日期。
- evidence：`section_node_54` 覆盖图表卡片，`section_node_61` 覆盖图表主体，bbox=`16,330,358,252`；text 保留 `12.9K`、`6,147.91`、`-721.26` 和三段日期。
- plan：图表主体没有专用 chart capability，主要被当作普通 section/card 处理，图形路径与面积填充难以直接进入 widget tree。
- 归因：主要风险是 A / B。A 是当前 capture 对 canvas/svg/chart 语义不足；B 是 plan 无法把折线、面积、网格压成可执行图表规范。

样本 5：P/L Calendar 长滚动内容

- screenshot：首屏底部露出 `P/L Calendar`，实际 section 继续向下滚动，fullPage 截图高度超过 viewport。
- evidence：`section_node_94` bbox=`16,754,358,444.59`，`section_node_112` bbox=`16,902,358,280.59`，text 保留日历 weekday、日期与百分比。
- plan：calendar 区域进入 fileTree/widgetTree，但首屏 viewport 只展示一部分，滚动态、月份切换与具体日期格子仍需要人工实现约束。
- 归因：主要风险是 A / D。A 是单次状态采集无法证明月份切换、滚动边界和隐藏日期状态；D 是 Flutter 实现必须复刻长内容和局部滚动，不应只做首屏。

第一轮统计：

- A capture/evidence 缺失：2 个风险样本，集中在图表语义、长滚动/隐藏状态。
- B plan 压缩或映射歧义：2 个风险样本，集中在 tab 选中态、chart 规范和 manual style。
- C target component 默认样式带偏：1 个风险样本，集中在分段按钮复用 `CommonButton`。
- D Flutter 实现问题：4 个样本都需要实现后验证，尤其是 tab、pill、金额层级和 calendar 长内容。

统一排查记录格式：

```text
问题描述
  -> screenshot 区域 / 文本锚点
  -> page-debug-index section
  -> page-canonical nodeIds / computedStyle / assetRefs / interactions
  -> ui-build-plan themeMappings / componentMappings / widgetTree
  -> target Flutter file / component default style / diff
  -> 归因标签 A / B / C / D
  -> 最小修复动作
```

### 3.7 P1 待办

- [x] 新增 MCP discoverability 样本：记录 Codex CLI `/mcp` 面板与 stdio 协议中 `proto-bridge` 当前展示出的 tools、resources、prompts 信息。
- [x] 补全 7 个 MCP tool 的长 description、默认值、安全边界、输出 artifact 说明和调用顺序说明。
- [x] 补全 7 个 MCP tool 的 required schema 与 `additionalProperties: false`。
- [x] 新增稳定 resource：`proto-bridge://workflow/ui-reconstruction-guide` 和 `proto-bridge://workflow/tool-catalog`。
- [x] 强化 `proto-bridge://workflow/ui-reconstruction-guide`，让首次使用者能按 capture -> plan -> review -> validate 执行。
- [x] 强化 `proto-bridge://workflow/tool-catalog`，让它不只是裸 schema dump，而是可读的 workflow tool 目录。
- [x] 增加 MCP tool `annotations` 与 `outputSchema`。
- [x] 新增 prompt：`capture_url_evidence`、`investigate_visual_mismatch`、`implement_from_existing_plan`、`validate_ui_reconstruction`。
- [x] 选择 5 个典型视觉问题作为样本。
- [x] 每个样本都按 `screenshot -> evidence -> plan -> Flutter` 做一次链路追踪。
- [x] 给每个样本打归因标签：A / B / C / D。
- [x] 统计问题主要集中在哪一层。
- [x] 为复杂页面建立统一排查记录。

---

## 4. P2：Evidence 与 Artifact 可观察性

目标：

- 让 capture 产物更容易读、查、复盘。
- 让 evidence、plan、review、debug artifact 能通过稳定入口被 MCP client 和 agent 找到。

### 4.1 可观察性不足

目前 `page-canonical.json` 和 `ui-build-plan.json` 信息量很大，但缺少适合人和 AI 快速定位问题的索引。

风险：

- 排查必须通读大量 JSON。
- 很难快速回答“这个偏差发生在哪一层”。
- 很难系统复盘某类问题到底主要来自 capture、plan，还是 Flutter 实现。

### 4.2 Visual Debuggability

目标：

- 让人和 AI 都能快速解释一个视觉偏差的来源。

核心问题：

- 当前产物是否足以高效定位问题。
- 是否需要额外的 debug index、trace 或 review artifact。

### 4.3 P2 第一轮落地方向

先不新增 MCP tool，也不提前进入 Playwright 多状态采集。第一轮聚焦两件事：

- 让 MCP client 在 capture 前也能发现 page artifact URI 模板。
- 让 `page-debug-index.json` 从 counts/sections 摘要升级为可排查索引。

当前 `page-debug-index.json` 应承载：

- section index：section bbox、role、title、keyNodeIds、text anchors。
- criticalNodes：仅保留关键 node 的 bbox、text、关键 style、assetRefs、interactionIds、sectionIds。
- tokenSummary / mappingSummary：只放统计、低置信和歧义项指针，不重复展开完整 plan。
- diagnostics：承接背景、tab、组件背景、颜色、滚动覆盖、plan 压缩六类排查结论。
- riskIndex：只放 layer、kind、severity、nodeIds、sectionIds、mappingId/tokenId 等定位指针。

体积目标：

- `page-debug-index.json` 应明显小于 `page-canonical.json`。
- debug index 只回答“风险在哪、去哪查、下一步查什么”；详情仍回到 `page-canonical.json` / `ui-build-plan.json`。

### 4.4 P2 待办

- [x] 确认页面整体背景问题是否发生在 evidence 层：由 `diagnostics.background` 输出 evidence-present / not-observed 与下一步检查。
- [x] 确认 tab 选中态信息是否主要依赖 runtime metadata，还是当前仅靠 heuristic：由 `diagnostics.tabStates` 输出 runtime-or-explicit / heuristic-only。
- [x] 确认有背景的组件是否被错误映射到了自带背景的 YouFi 组件：由 `diagnostics.componentBackgroundRisks` 输出带背景节点与目标组件复用风险。
- [x] 确认颜色缺失问题发生在 token 抽取、theme mapping，还是 Flutter 实现层：由 `diagnostics.colorTrace` 串联 visibleColors 与 themeMappings。
- [x] 评估长滚动页是否存在状态覆盖不足或虚拟内容遗漏：由 `diagnostics.scrollCoverage` 输出 screenshot/viewport 高度与首屏外 section。
- [x] 评估 plan 层压缩是否会丢失关键节点、关键 section 或关键 token：由 `diagnostics.compression` 输出 critical node 覆盖情况。
- [x] 增加 resource templates，用于 page canonical、screenshot、plan、review、page-debug-index 的参数化读取。
- [x] 增加 artifact index resource，记录 latest page、相关 screenshot、plan、review markdown 和 debug index。
- [x] 增强并瘦身 `page-debug-index.json`，加入 section、critical node、diagnostics、mapping summary 和 risk 指针索引。

---

## 5. P3：Playwright Capture 增强

当前状态：延后。

P3 不再作为 P2 之后的直接主线。它将在 P5 capability-first 工作流重构完成后，作为 `runtime.capture` capability 的增强继续推进。这样 interaction state、scroll segmentation、network / console / trace 等能力不会只服务 MCP URL-first，而会同时服务 CLI 和 MCP 的统一工作流。

目标：

- 从“单状态页面采样”升级为“多状态运行态证据采集”。
- 判断状态缺失到底是没渲染、没触发、没抽取，还是被压缩。

### 5.1 State Coverage

目标：

- 评估当前 workflow 是否只覆盖了页面的单一状态。
- 评估滚动、tab、弹框、筛选、展开态、条件渲染是否进入 evidence。

建议样本：

- 长滚动页
- tab 页
- 带 modal / dropdown / filter 的页面

核心问题：

- 当前 capture 丢失的是“页面未渲染的状态”，还是“已渲染但未被抽取的状态”。

### 5.2 当前 Playwright 使用过窄

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
- Visual assertions / diff：将原始 screenshot 与实现后的目标页面 screenshot 做像素或区域级对比，为 `validate_ui_build` 增加视觉校验入口。
- Route / mock support：允许注入 auth、cookie、localStorage、请求 mock 或 fixture，提升需要登录和稳定数据页面的 capture 成功率。

### 5.3 P3 待办

- [ ] 调研 Playwright interaction state capture：tab、dropdown、modal、accordion、filter 的自动触发策略和失败回退。
- [ ] 调研 Playwright runtime diagnostics：network、console、pageerror、trace 是否应该进入 evidence 或单独 artifact。
- [ ] 如果 A 类最多，优先研究 capture / evidence 演进方案。

---

## 6. P4：Planner 与 Target Mapping 约束增强

当前状态：延后。

P4 不再作为 P2 之后的直接主线。它将在 P5 capability-first 工作流重构完成后，作为 `ui.plan` / `target.inspect` capability 的增强继续推进。这样 role taxonomy、mapping determinism、component risk、visual validation 等优化会作用于统一 canonical，而不是只补强旧的 URL-first plan。

目标：

- 减少 agent 在 Flutter 落地时的猜测空间。
- 把 plan 中的事实、建议、歧义、人工确认项分清楚。

### 6.1 `ui-build-plan.json` 更像“实现说明书”，不是“确定性翻译结果”

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

### 6.2 Flutter 落地阶段仍然依赖 agent 做大量判断

当前 Flutter 落地不是“照抄 plan”，而是 agent 继续做实现判断，例如：

- 这里该用 `Row`、`Column`、`Stack` 还是自定义 widget。
- 这里是复用现有 YouFi 组件，还是本地新建 widget。
- theme token 该选 exact match 还是 family fallback。
- 目标组件默认背景、边框、圆角是否要覆盖。
- tab、选中态、展开态、弹框状态是否只做 UI 占位还是做更完整表达。

这意味着：

- 同一份 evidence 和 plan，两个 agent 可能都能产出“看起来合理”的 Flutter。
- 当前系统的还原精度不只取决于 evidence，也取决于 planner 的表达力和 agent 的实现判断。

### 6.3 Role Taxonomy

目标：

- 评估当前单一 role 是否过粗。
- 评估 role 是否混合了语义、布局、交互、区域等不同维度。

核心问题：

- role 是否应该从单值改成多轴标签模型。
- 哪些 component mapping 偏差本质上来自 role 设计不稳。

### 6.4 Compression Loss

目标：

- 识别 evidence 层和 plan 层分别压掉了什么。
- 评估被压掉的信息是否包含关键视觉事实。

核心问题：

- 压缩是否发生得太早。
- 压缩是否缺少“关键样式优先保留”的排序策略。

### 6.5 Mapping Determinism

目标：

- 评估哪些 mapping 是“提示”，哪些可以升级为“强约束”。
- 评估 component mapping 和 theme mapping 中的猜测比例。

核心问题：

- 哪些 target component 应谨慎复用。
- 哪些视觉事实必须从 hint 升级为 explicit constraint。

### 6.6 P4 待办

- [ ] 如果 B 类最多，优先研究 role / planner / mapping / compression 演进方案。
- [ ] 如果 C 类最多，优先研究 target component 风险清单和复用策略。
- [ ] 如果 D 类最多，优先研究更强的实现约束与验证方式。
- [ ] 只有在样本归因稳定后，才进入具体代码改造方案。
- [ ] 评估 `compare_page_screenshots` 是否可作为实现后视觉验证 tool。

---

## 7. P5：Capability-first 工作流重构（当前最高优先级）

目标：

- 保留 CLI / MCP 作为入口形态，但彻底打破两者各自绑定固定 workflow 的现状。
- 将 source、runtime/snapshot、screenshot/OCR、target、planning、review、validation 提升成共享 capability。
- 让 CLI 和 MCP 在同等输入条件下调用同一套 core orchestrator，并产出同一套 artifacts。
- 让 system 根据“是否有源码 / 是否有 URL / 是否有 screenshot / 是否有 target repo”决定调用哪些能力。
- P5 完成后，P3 / P4 的增强都应落在 capability 上，而不是落在某条旧 workflow 上。

### 7.0 当前必须解决的问题

当前典型问题：

- 明明本地同时有 source 和 URL/runtime，但 MCP 仍然只按 URL-first 方式工作。
- 明明 source-aware 路径可能更强，但 CLI 又主要停留在 JSON / Markdown 产出，而不是被 agent 继续调度到统一 plan / review / validation。
- CLI 与 MCP 作为 mode 是合理的，但 mode 绑定了过于固定的 workflow。

P5 的目标不是合并 CLI 和 MCP，而是：

```text
CLI / MCP = 入口
workflow = 预设编排
capability = 可复用底层能力
```

### 7.1 Mode / Workflow / Capability 关系

建议明确区分：

```text
mode = 入口形态
workflow = 预设编排
capability = 通用底层能力
```

目标形态：

- `CLI` 继续存在，作为终端入口。
- `MCP` 继续存在，作为 agent / tool 调用入口。
- 两者都不再只绑定一条固定 workflow。
- source、snapshot、target、planning、validation 都应逐步变成共享 capability。
- system 应能根据“是否有源码 / 是否有 URL / 是否有 screenshot / 是否有 target repo”决定调用哪些能力。

P5 完成后的目标形态：

```text
input
  -> reconstructPageContext(input)
  -> capability selection
  -> source/runtime/screenshot/target facts
  -> page.merge
  -> page-canonical.json
  -> page-debug-index.json
  -> ui-build-plan.json
  -> ui-build-review.md
  -> validate result
```

CLI 和 MCP 只负责接收输入、调用 orchestrator、返回 artifact handles；不再各自维护一条固定 workflow。

### 7.1.1 共享 capability 边界

P5 需要把现有能力拆成可编排 capability：

- `source.analyze`：从 source root、route、vuePath 中提取 source facts。
- `runtime.capture`：从 URL / rendered page 中提取 runtime facts、computed style、bbox、assets、interactions、screenshot。
- `screenshot.attach` / `ocr.attach`：从 screenshot / OCR 补充视觉证据。
- `target.inspect`：读取 target Flutter repo 的 module、route、theme、component、i18n、asset conventions。
- `page.merge`：按字段级优先级合并 source facts、runtime facts、screenshot facts、target facts。
- `ui.plan`：从统一 canonical 生成 `ui-build-plan.json`。
- `ui.review`：从统一 canonical + plan 生成 `ui-build-review.md`。
- `ui.validate`：根据 canonical / plan / target diff 验证实现范围与风险。

### 7.1.2 统一 orchestrator

新增统一编排入口：

```text
reconstructPageContext(input)
```

它根据输入自动选择 capability：

- 有 `sourceRoot` + `route` / `vuePath`：调用 `source.analyze`。
- 有 `url`：调用 `runtime.capture`。
- 有 `screenshotPath` / OCR 输入：调用 `screenshot.attach` / `ocr.attach`。
- 有 `targetRoot`：调用 `target.inspect`。
- source / runtime / screenshot / target facts 同时存在：调用 `page.merge`。
- 有 canonical：调用 `ui.plan`、`ui.review`、`ui.validate`。

### 7.1.3 统一 artifact 产物

P5 后，CLI 和 MCP 在同等输入下都应产出同一套 artifacts：

- `page-canonical.json`
- `page-debug-index.json`
- `ui-build-plan.json`
- `ui-build-review.md`
- `screenshots/`

旧的 CLI `migration-context.json` / `migration-spec.md` 可以短期保留为兼容投影，但不能继续作为 source-aware 主产物模型。

重要补充：

- 当前 CLI 生成的 `migration-spec.md` 在有源码场景下质量明显高于 MCP 当前的 `ui-build-review.md`。
- P5 重构不能直接删除或弱化 `migration-spec.md` 的生成逻辑。
- 更合理的方向是把 `migration-spec.md` 背后的高质量 source-aware review / implementation instruction 生成能力提升成共享 projection capability。
- 当输入包含 source facts 时，MCP 也应能产出接近或等同 `migration-spec.md` 质量的人类可读 MD。
- 统一产物后，可以将其命名为 `ui-build-review.md`、`migration-spec.md` 兼容投影，或同时产出二者；但 source-aware 的高质量说明能力必须保留。

### 7.1.4 CLI / MCP 入口关系

CLI：

- 继续作为终端入口。
- 支持统一 reconstruct 命令或改造现有 generate 入口。
- 输入可以是 source、URL、screenshot、target repo 的任意组合。
- 内部调用 `reconstructPageContext(input)`。

MCP：

- 继续作为 agent / tool 调用入口。
- 增加或切换到统一工具，例如 `reconstruct_page_context`。
- 输入可以是 `url`、`sourceRoot`、`route`、`vuePath`、`screenshotPath`、`targetRoot`、`output`。
- 内部调用同一个 `reconstructPageContext(input)`。

现有 URL-first MCP tools 可以作为兼容层保留，但它们不应继续拥有独立 workflow 逻辑。

### 7.2 字段级优先级方向

不建议把前提写成：

```text
源码绝对优先
```

更建议写成：

```text
源码优先表达结构、语义、状态空间和设计意图；
runtime 优先表达当前真实渲染结果；
screenshot 优先表达最终视觉对照和补证。
```

建议未来按字段类型决定优先级：

- `module / screenId / semantic section / interaction intent / state space`
  优先 source

- `visible / bbox / computed style / actual active state / actual open modal / actual visible text`
  优先 runtime

- `pixel appearance / OCR text / visual comparison`
  优先 screenshot / OCR

- `component reuse / theme target / file tree / route placement`
  优先 target repo conventions

### 7.3 Source / Runtime 冲突处理方向

冲突可能出现在：

- 多状态分支页面。
- 源码有语义 token，但 runtime 被覆盖。
- 数据不同导致结构不同。
- modal / tab 存在，但当前未触发。
- source 和 runtime 版本不一致。
- source 更语义化，runtime 更扁平事实化。

这些冲突不应靠整体优先级解决，而应保留 provenance、mismatch warning 和人工确认入口。

### 7.4 过渡方案

`skill -> 调 CLI -> 生成 migration-context.json / migration-spec.md -> 再继续自动生成 Dart` 是合理的短期桥接方案。

短期价值：

- CLI 已经具备 source-aware 能力。
- CLI 产物已经比较完整。
- 这条路径能够让 agent 利用 source 侧更强的结构语义。
- 工程上容易先跑通。

中长期限制：

- CLI 颗粒度偏粗，更像固定 workflow，不像可细粒度组合的 capability。
- shell 调 CLI 后，artifact 文件会变成主要接口，agent 需要再读文件、再解析、再转语义。
- 局部重试、局部增量更新、动态编排不如直接调用能力灵活。
- 随着 hybrid workflow 变复杂，“skill 包一层 CLI 黑盒”的方式会越来越绕。

### 7.5 P5 待办

P5-A 已选择方案 C：

- 无源码：默认生成 `ui-build-review.md`。
- 有源码：生成增强版 `ui-build-review.md`。
- 有源码 + runtime：`ui-build-review.md` 展示 merged review。
- `migration-spec.md` 暂作为 source-aware implementation brief 和质量对照物保留；当前 `ui-build-review.md` 尚未完全达到 `docs/migration-spec.md` 的质量标准。
- P5-A 允许保留 CLI/MCP 旧入口作为过渡兼容层；P5 完成时必须删除所有旧 workflow 兼容层和 projection 兼容输出。

- [x] 定义 mode / workflow / capability 的关系，并在代码结构中体现 CLI / MCP 只是入口。
- [x] 定义共享 capability 边界：`source.analyze`、`runtime.capture`、`screenshot.attach`、`target.inspect`、`page.merge`、`ui.plan`、`ui.review`、`ui.validate`。
- [x] 新增统一 orchestrator：`reconstructPageContext(input)`。
- [x] 重构 `page-canonical.json` 为 hybrid canonical，支持 `sourceFacts`、`runtimeFacts`、`screenshotFacts`、`targetFacts`、`merge`、`provenance`、`mismatches`、`fieldPriority`。
- [x] 制定 source / runtime / screenshot / target 的字段级优先级表，并写入 canonical merge 逻辑。
- [x] 设计 source/runtime mismatch warning 与 manual confirmation 机制。
- [x] CLI 改为调用统一 orchestrator，终端入口不再只绑定 source-aware migration workflow。
- [x] MCP 增加统一 orchestrator 工具 `reconstruct_page_context`；旧 URL-first tools 暂作为 P5-A 兼容层保留，P5 完成后删除。
- [x] CLI / MCP 在同等输入条件下产出同一套主 artifacts：`page-canonical.json`、`page-debug-index.json`、`ui-build-plan.json`、`ui-build-review.md`、screenshots。
- [x] `build_ui_plan` 只消费统一 canonical，不关心 canonical 来源是 source、runtime、screenshot 还是 hybrid。
- [x] 能力化旧 CLI `migration-spec.md` 背后的 source-aware 说明生成逻辑；有 source facts 时，主产物为增强版 `ui-build-review.md`，`migration-spec.md` 仅作为 source-aware implementation brief。
- [x] 旧 CLI `migration-context.json` 降级为 source-aware projection；主链路改用统一 artifacts。P5-C 起默认不再输出 `migration-context.json`，仅保留内部兼容开关。
- [x] P5-B：增强 `ui.plan` 对 source-only / hybrid canonical 的消费；source-only 时也能从 SFC sections/components/interactions/style tokens 生成 widget tree、component/theme/asset/interaction plan。
- [x] P5-B：将 `ui-build-review.md` 的 source-aware 内容改成结构化 projection，不再整篇嵌入旧 `migration-spec.md`。
- [x] 更新测试脚本，验证 CLI 和 MCP 在相同 source/url/target 输入下产物契约一致。
- [x] P5-C：增加临时 orchestration trace，写入 `page-canonical.json`，CLI 可用 `--trace` 打印，MCP 可用 `trace=true` 返回 `summary.trace`。
- [x] P5-C：测试脚本改成 source-only / runtime-only / hybrid case 矩阵；默认 case 改为 hybrid，runtime-only / hybrid 强制要求 screenshot 和 `runtimeFacts`。
- [x] P5-C：修复测试脚本默认 URL 与默认 route 不一致的问题；route 默认从 URL 推断，避免 DEFAULT_URL 被闲置。
- [x] P5-D：以 `docs/migration-spec.md` 为标准做 review quality parity，确保 `ui-build-review.md` 覆盖页面元信息、迁移结论、文件树、Widget contracts、状态/生命周期、路由布局、主题/i18n/资源、可复用组件和可执行人工确认项。
- [x] P5-D：为 `ui-build-review.md` 增加 parity checklist，并在测试脚本中断言关键章节存在且不能整篇嵌入旧 `migration-spec.md`。
- [ ] P5-D follow-up：压缩过长的 source layout/style evidence，避免 review 在复杂页面中过度冗长。
- [ ] P5-final：删除旧 URL-first MCP tool 主路径，只保留 capability-first `reconstruct_page_context` 与必要只读/验证工具。
- [ ] P5-final：删除旧 source-aware workflow 主路径，CLI 只保留 capability-first generate。
- [ ] P5-final：删除 `migration-context.json` 内部兼容开关。
- [ ] P5-final：删除 `migration-spec.md` 作为顶层主产物的所有描述；如仍需 source-aware brief，必须作为 `ui.review` projection 的内部章节或显式可选导出。
- [ ] P5 完成后，再回到 P3 增强 `runtime.capture` capability。
- [ ] P5 完成后，再回到 P4 增强 `ui.plan` / `target.inspect` capability。

---

## 8. P6：MCP 高级协议能力

当前状态：最后评估。

P6 不进入当前 P5 工作流重构主线。roots、elicitation、logging、completions、sampling、Streamable HTTP/auth、client compatibility matrix 等能力，只有在 capability-first 主链路稳定后再评估。

目标：

- 只在有明确收益时引入高级 MCP 能力。
- 保持 ProtoBridge MCP 的定位：evidence provider + workflow guide，而不是替代 coding agent。

### 8.1 MCP 协议能力评估

官方 MCP 能力可以按当前项目相关性分层：

**第一层：已在 P1 / P2 承接**

- Tools：继续作为主操作入口，但要补全 schema 质量、调用顺序说明、输入输出示例、artifact id 说明和风险说明。
- Resources：不只暴露 session 内 page/plan，还应暴露稳定的只读上下文，例如 target conventions、workflow guide、artifact index、latest page、latest plan、debug index。
- Prompts：增加可复用 workflow prompt，例如 capture-only、review-only、implementation-with-validation、visual-diff-investigation。
- Resource templates：用于表达 `proto-bridge://pages/{pageId}/page-canonical`、`proto-bridge://pages/{pageId}/ui-build-plan`、`proto-bridge://pages/{pageId}/ui-build-review` 这类可参数化资源。

**第二层：适合在 P6 研究**

- Roots：让 client 明确告知 server 当前 target repo / allowed roots，减少依赖 `process.cwd()` 和手填 `targetRoot` 的不确定性。
- Elicitation：当缺少 targetModule、页面账号、viewport、业务确认项时，让 server 请求结构化补充信息，而不是只抛错或让 agent 猜。
- Logging：把 capture 阶段、artifact 路径、截断、warning、heuristic 推断输出成 client 可观察日志。
- Completions：为 prompt 参数或 tool 参数提供 target module、artifact id、resource uri 补全。

**第三层：谨慎或暂不建议作为主线**

- Sampling：server 请求 client 代调用模型可以用于总结 evidence、生成 review 或归纳风险，但会让 server 变得更像 agent 编排器。ProtoBridge 当前定位是 evidence/provider，不建议在没有明确安全与成本边界前把 sampling 放进 P0。
- 远程 Streamable HTTP / auth：适合团队共享服务或云端部署，但当前 URL capture 和 target repo 扫描都偏本地开发流，先把 stdio 的 discoverability 补强更划算。

### 8.2 风险与边界

- 不能为了“看起来能力很多”把 CLI source-aware migration 暴露进 MCP runtime；这会破坏当前 CLI / MCP workflow 边界。
- Sampling 不应替代 agent 的实现职责，否则 server 会承担模型调用、成本、安全和提示词漂移问题。
- Elicitation 和 roots 依赖 client 支持，必须做 capability detection 和 fallback。
- Playwright trace、network、fullPage screenshot、分段截图可能产生大量 artifact，需要输出开关和保留策略。
- 视觉 diff 需要目标实现可运行且有稳定 preview URL，不能作为所有场景的强制步骤。

### 8.3 P6 待办

- [ ] 评估 roots capability 是否能替代或补强 `targetRoot` / `process.cwd()` 推断。
- [ ] 评估 elicitation 是否适合用于 targetModule、viewport、登录态、业务确认项等结构化补充信息。
- [ ] 评估 logging / completions 是否能提升 MCP client 内的可观察性和参数选择体验。
- [ ] 暂缓 sampling 和 Streamable HTTP/auth，除非出现明确远程部署或 server-side LLM 总结需求。

---

## 9. 当前判断与调研背景

### 9.1 执行摘要

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

### 9.2 调研范围

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

### 9.3 当前确认的事实

以下内容属于当前已能从代码或文档中确认的 `code fact`。

#### 9.3.1 输入与 capture 边界

- MCP 当前主输入是 `URL`，不是“URL 或截图二选一”。
- `capture_page_canonical` 会用 Playwright 打开 URL，使用给定 viewport 或默认 viewport 进行 capture。
- 当前默认 viewport 为 `390 x 844`，这会直接影响截图、bbox、section 和样式判断。
- 页面截图 `screenshots/full-page.png` 是视觉基准证据，但当前 node tree 主要来自 rendered DOM，而不是来自截图本身。
- `attach_screenshot_ocr` 当前主要补充 OCR 文字证据，不能替代 URL capture，也不能单独生成和 DOM 同等级的 node tree。
- 当前 CLI 仍是 source-aware migration workflow：`--url` 会先抽取 route，并要求该 route 能在 `proto-bridge.config.json` 的 source project 中解析到源码页面。
- 当前 CLI 不能把任意 URL-only design page 直接转成 `page-canonical.json` / `ui-build-plan.json`；这属于 P5 hybrid capability-first 后才应解决的编排能力。

#### 9.3.2 Evidence 生成边界

- `PageCanonical` 的基础数据来自 rendered DOM 抽取。
- `PageCanonical` 不是原始 DOM dump，而是经过可见性过滤、role 推断、token 抽取和 section 归纳后的证据模型。
- `PageCanonical` 还会叠加 runtime metadata、page list、tab traversal、asset extraction、OCR 等增强信息。
- evidence 抽取当前从 `document.body` 开始，不是从 `html` 开始。

#### 9.3.3 Plan 与 Flutter 落地边界

- `ui-build-plan.json` 不是 node 到 Flutter 的确定性翻译结果。
- 它更像是基于 evidence 生成的 section、widget、component、theme、asset、interaction 计划。
- Flutter 落地阶段仍然依赖 agent 根据 evidence 和 plan 继续实现。
- 当前 component mapping 的输入主要是 evidence role，不是 HTML tag，也不是节点级严格语义树。

#### 9.3.4 当前可确认的压缩点

- node 抽取有上限，复杂页面可能被截断。
- section 抽取和 plan 生成都存在数量截断和摘要压缩。
- 当前 chain 中至少存在 evidence 层压缩和 plan 层压缩这两段。

### 9.4 从局部问题到总体问题

当前暴露出来的不是单点 bug，而是一组系统性问题。

#### 9.4.1 状态覆盖不足

单次 URL capture 更像“当前页面状态的一次采样”，不是“页面状态空间的完整采集”。

潜在风险：

- 长滚动页面底部内容未被真实表达。
- 虚拟列表、懒加载内容、滚动后才渲染的内容缺失。
- tab 切换后的内容没有进入 evidence。
- modal / sheet / dropdown / filter / popover 没有进入 evidence。
- 条件渲染、折叠态、展开态、选中态信息不完整。

#### 9.4.2 Role 设计过粗

当前 role 同时承担了多种职责：

- 语义控件：`button`、`input`、`image`
- 页面区域：`app-bar`、`bottom-bar`、`modal`
- 结构容器：`section`、`list`、`card`
- 兜底类别：`text`、`unknown`

风险：

- role 粒度混杂，含义不稳定。
- role 一旦直接驱动 component mapping，就容易过早收敛。
- 某些复杂容器和特殊组件会被粗暴映射到过泛的 role。

#### 9.4.3 Plan 不是确定性翻译

当前 plan 更偏“实现建议”，而不是严格约束。

风险：

- component mapping 是启发式建议，不一定能稳定保留原始视觉特征。
- target 组件自带默认背景、边框、圆角、内边距时，容易带偏结果。
- 某些 style fact 在 plan 中只是 hint，而不是强约束。

#### 9.4.4 压缩可能过早发生

当前 chain 中存在多层压缩。

风险：

- 关键视觉节点可能在 evidence 阶段就被截断。
- 关键 section 可能没有进入 widgetTree。
- 关键 token 可能没有进入 themeMappings。
- 被压掉的未必是“次要信息”，也可能是背景层、active tab、边框、阴影等高价值视觉事实。

---

## 10. 当前 Workflow 的问题地图

下面按流水线分层记录问题。

### 10.1 Capture 层

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

### 10.2 Evidence 层

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

### 10.3 Planning 层

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

### 10.4 Target Component 层

已知风险：

- 目标组件默认样式可能带来背景、边框、圆角、内边距偏差。
- 组件复用策略可能优先于 node-level fidelity。

已观察到的问题：

- 某些组件“看起来类似”，但自带样式与源页面不一致。

当前能确认的事实：

- 当前 workflow 明确鼓励优先复用 target common widgets 和 similar examples。

当前不能确认的内容：

- 哪些 target component 是高风险组件，需要在 plan 中显式提示“谨慎复用”。

### 10.5 Flutter Implementation 层

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

## 11. 问题池与 Case 模板

### 11.1 当前已观察到的典型问题

- 页面整体背景不一致。
- 某些 tab 的背景和边框不一致。
- 某些组件自带背景，导致还原结果偏离原页面。
- 某些颜色没有被正确保留或映射。

这些问题当前更适合作为“样本入口”，而不是直接认定为单点 bug。

### 11.2 Case 记录模板

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

## 12. 决策门槛

后续是否改 workflow、改 role、改压缩策略，不应凭个别 case 决定，而应基于样本统计。

建议的决策规则：

- 如果 A 类问题占多数，优先改 capture / evidence。
- 如果 B 类问题占多数，优先改 planner / role / mapping / compression。
- 如果 C 类问题占多数，优先改 target component 复用策略和显式风险提示。
- 如果 D 类问题占多数，优先改 agent 落地规则和实现阶段校验。

只有在样本级证据表明某层是主因时，才进入该层的设计或改造。

---

## 13. 面向 AI 的防幻觉要求

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
具体页面是否因此丢失背景，需要查看该页面的 screenshot、page-canonical.json 和相关 node style。
```

这个约束可以减少 AI 在大 JSON 和多段 pipeline 中靠猜测下结论，也能让每次排查更容易复盘。

---

## 14. 当前平台与架构判断

当前阶段的产品与架构判断如下：

- CLI：source-aware migration，可继续作为高级能力和批处理能力保留。
- MCP：URL-first UI reconstruction，应继续作为主产品路径强化。
- Core：继续沉淀 source / snapshot / target / workflow 的中间层能力。

当前不是“代码已经无法维护”，而是“针对复杂视觉问题的观察、追踪、归因能力还不够”。

因此当前主方向应是：

- 保留现有 workflow 主干。
- 增强 evidence fidelity、state coverage、debug trace、mapping clarity。
- 在样本归因完成后，再决定是否调整 role、planner、capture 或压缩策略。
