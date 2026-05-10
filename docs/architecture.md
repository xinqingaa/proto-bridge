# ProtoBridge 架构与数据模型

本文档解释 ProtoBridge 的模块边界、目录职责、关键数据模型和设计约束。它承接 [README.md](../README.md) 的总览，不再重复展开具体使用方式；CLI / MCP 的使用细节见 [workflows.md](workflows.md)。

## 1. 设计目标

ProtoBridge 的架构目标是把“source 页面要表达什么”“页面可见 UI 是什么”“目标工程应该怎么实现”三类问题拆开处理，再按不同 workflow 重新编排。

```text
CLI = Source-aware Migration
MCP = UI Reconstruction
```

它不是 Vue 转 Dart 编译器，也不是直接写业务代码的生成器。它提供的是结构化上下文、证据和实现建议。

## 2. 核心分层

ProtoBridge 的核心分层如下：

```text
source/*    -> source 页面事实
snapshot/*  -> 页面可见 UI 证据
target/*    -> target 工程约束与实现建议
workflows/* -> 组合成 CLI 或 MCP
artifacts/* -> 写出 JSON / Markdown
shared/*    -> 通用协议和小型工具
```

它们分别回答：

- `source/*`：source 页面要表达什么。
- `snapshot/*`：页面可见 UI 是什么。
- `target/*`：目标工程应该怎么实现。
- `workflows/*`：在 CLI 或 MCP 模式中，应该按什么顺序组合这些能力。

## 3. 仓库结构

仓库结构：

```text
proto-bridge/
├── README.md
├── AGENT.md
├── docs/
├── packages/
│   ├── core/
│   ├── cli/
│   └── mcp-server/
├── examples/
└── scripts/
```

核心源码结构：

```text
packages/core/src/
├── adapters/
├── artifacts/
├── shared/
├── source/
├── snapshot/
├── target/
├── workflows/
└── types/
```

## 4. 各目录职责

### 4.1 入口包

- `packages/cli`：CLI 入口，只负责参数、配置读取、输出展示和 source-aware workflow 调用。
- `packages/mcp-server`：MCP 入口，只负责 tools、resources、prompts、session state 和 UI reconstruction workflow 调用。

### 4.2 Core

- `adapters/`：定义 `SourceAdapter`、`TargetAdapter` 协议和 registry。
- `artifacts/`：写出 JSON / Markdown 文件。
- `shared/`：共享 evidence 工具、路径工具和 runtime protocol。
- `source/`：source 技术栈实现，当前为 `vue3-prototype`。
- `snapshot/`：URL capture、rendered DOM 抽取、OCR、capability detection、evidence enrichers。
- `target/`：target 技术栈实现，当前为 `flutter-app` 的 conventions、examples、planning、validation。
- `workflows/`：两条 workflow 的编排入口。
- `types/`：共享数据结构。

### 4.3 Docs

- `README.md`：总览入口。
- `AGENT.md`：协作规则入口。
- `docs/workflows.md`：CLI / MCP 双 workflow 详细说明。
- `docs/mcp-ui-reconstruction-workflow.md`：MCP 深度拆解。
- `docs/migration-spec.md`：CLI 说明书质量标准。
- `docs/integration.md`：工具接入与集成方式。
- `docs/npm-publish.md`：npm 包发布与更新规则。

## 5. 两条 workflow 的架构流转

### 5.1 CLI 流转

```text
packages/cli
  -> workflows/source-aware-migration
    -> source/vue3-prototype
    -> optional snapshot/browser-capture
    -> target/flutter-app
    -> artifacts
    -> migration-context.json / migration-spec.md
```

CLI 关注的是 source-aware 的文档链路：先读 source 语义，再结合 target 工程约束生成 target-facing 说明书。

### 5.2 MCP 流转

```text
packages/mcp-server
  -> workflows/ui-reconstruction
    -> snapshot/browser-capture
    -> snapshot/capabilities
    -> snapshot/enrichers
    -> snapshot/ocr
    -> target/flutter-app conventions / examples / planning / validation
    -> artifacts
    -> screenshot.png / page-evidence.json / ui-implementation-plan.json
```

MCP 关注的是 evidence-first 的 UI reconstruction 链路：先 capture 页面证据，再组织 target-facing 的 UI 实现计划。

## 6. 关键数据模型

### 6.1 `MigrationContext`

CLI 的核心上下文模型：

```ts
type MigrationContext = {
  source: PrototypePageAnalysis
  capture?: CaptureResult
  tokenMap: TokenMapResult
  target: FlutterContextAnalysis
  recommendations: MigrationRecommendations
}
```

它回答：

- source 页面身份、结构、交互、状态和文案是什么。
- 运行时截图与 DOM 证据是什么。
- token 怎样映射到 target。
- target 工程约束和实现建议是什么。

### 6.2 `PageEvidence`

MCP 的核心证据模型：

```ts
type PageEvidence = {
  id: string
  source: PageEvidenceSource
  screenshot?: ...
  viewport?: ...
  page: ...
  sections: VisualSection[]
  nodes: PageSnapshotNode[]
  text: string[]
  assets: AssetEvidence[]
  interactions: InteractionEvidence[]
  tokens?: VisualTokenEvidence[]
  capabilities: DetectedCapabilities
  runtime?: RuntimePageProtocolPayload
  ocr?: OcrResult
  warnings: string[]
  provenance: PageEvidenceProvenance[]
}
```

它回答：

- 页面可见 UI 由哪些节点、区块、文本、资源和交互组成。
- 哪些事实来自 rendered DOM、runtime metadata、page list 或 OCR。

### 6.3 `UiImplementationPlan`

MCP 的 target-facing UI 计划模型：

```ts
type UiImplementationPlan = {
  id: string
  evidenceId: string
  target: ...
  page: ...
  fileTree: FlutterPlannedFile[]
  widgetTree: FlutterWidgetPlan[]
  componentMappings: ComponentMapping[]
  themeMappings: ThemeMapping[]
  i18nPlan: I18nPlan
  assetPlan: AssetPlan
  interactionPlan: InteractionPlan[]
  businessQuestions: string[]
  risks: string[]
  validationHints: string[]
}
```

它回答：

- target repo 中文件应该落到哪里。
- 页面应该拆成哪些 Widget。
- 组件、主题、i18n、assets 和 visible interactions 应如何接入 target 工程。

## 7. Adapter 边界

Adapter 是隔离技术栈差异的边界。Core 不直接理解 Vue、Flutter、React、Figma 或其他技术栈；它要求 adapter 输出稳定的结构化事实和规划能力。

### 7.1 `SourceAdapter`

当前 `vue3-prototype` 负责：

- 读取 prototype/design screen config。
- 匹配 route 或 Vue SFC。
- 读取 notes 和 i18n。
- 分析 Vue SFC 的 sections、components、interactions、state、routes、lifecycle、layout、assets、styleTokens。

### 7.2 `TargetAdapter`

当前 `flutter-app` 负责：

- 扫描 Flutter modules、routes、translations、assets、common widgets 和相似文件。
- 生成 token mapping。
- 生成 source-aware migration recommendations。
- 生成 UI reconstruction 的 target-facing plan。
- 提供 target validation 能力。

## 8. 目录归属原则

修改代码时应遵守这些归属规则：

- 技术栈专属逻辑放在 `source/*` 或 `target/*`，`adapters/` 只保留协议和 registry。
- URL capture、rendered DOM、OCR、runtime metadata 和 enrichers 放在 `snapshot/*`。
- CLI / MCP 入口只做入口封装，不承载核心业务规则。
- `workflows/*` 只编排，不取代 `source/*`、`snapshot/*`、`target/*` 的职责。
- `artifacts/*` 不理解业务语义。
- `shared/*` 不承载 workflow 级规则。

## 9. 扩展点

### 9.1 扩展 SourceAdapter

新增 source 技术栈时，需要实现：

- adapter id
- source root 解析
- 页面输入解析
- source facts 输出
- warnings

### 9.2 扩展 TargetAdapter

新增 target 技术栈时，需要实现：

- adapter id
- target root 解析
- target context 输出
- planning / mapping / validation 能力
- warnings

### 9.3 扩展 Snapshot 能力

未来可扩展：

- rendered HTML / DOM snapshot 直接输入
- 更多 OCR provider
- 更强的视觉分析能力
- 更强的 runtime metadata / page list / tab traversal enrichers

## 10. 风险与边界

- JS 配置解析无法覆盖所有复杂动态逻辑，遇到不确定内容必须写 warnings。
- Runtime capture 依赖页面可访问性、浏览器环境和运行时状态；capture 失败不应阻断静态上下文生成。
- OCR 是辅助 evidence，不应覆盖 rendered DOM 和 screenshot evidence。
- token 映射无法命中语义 token 时，必须进入 unresolved / risks，不能伪装成确定映射。
- target adapter 输出的是实现建议，不替代目标工程的真实代码审查。
