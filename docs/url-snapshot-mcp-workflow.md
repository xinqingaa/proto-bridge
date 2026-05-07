# URL Snapshot MCP 工作流决策稿

本文档记录 ProtoBridge 的新工作流决策：在保留现有 `vue3-prototype -> flutter-app -> json/md` 链路的同时，新增一条更短、更适合 AI agent 的 **URL / HTML Snapshot UI 还原路径**。

新路径的核心不是完整迁移业务行为，而是把可见页面尽快还原成符合 YouFi Flutter 工程规范的 UI 实现计划，并由 AI coding agent 在当前工作目录中落地 Dart 代码。

## 1. 决策摘要

- 新工作流聚焦 **UI 还原**，不再把复杂业务迁移作为默认目标。
- 新工作流默认运行在 YouFi 当前工作目录，`target.root = process.cwd()`。
- 新工作流主输入优先级为 rendered HTML / DOM snapshot + screenshot，OCR 作为辅助证据。
- 新工作流主产物是 JSON：`page-snapshot.json` 与 `ui-implementation-plan.json`。
- Markdown 只作为可选 review / 归档 / 讨论产物，不再是 agent 实现的必经路径。
- 现有 `@proto-bridge/core`、`@proto-bridge/mcp-server`、`@proto-bridge/cli` 均保留，不删除。
- 现有 source-aware 链路保留，用于需要 Vue 源码、notes、i18n、业务语义和可追溯说明书的场景。
- MCP 启动和运行时先完全关闭旧 source-aware 链路，避免团队成员误触旧工具导致配置报错。
- `flutter-app` adapter 的价值不消失，但要从“生成 Markdown 约束”重定位为“读取 YouFi target conventions 并生成 UI implementation plan 的 target connect 能力”。

## 2. 背景与收敛

当前 ProtoBridge 已经可以通过 route、URL 或 Vue 文件生成：

```text
migration-context.json
migration-spec.md
```

这条链路的信息量较大，能从 Vue 源码、notes、i18n、页面配置和 target Flutter 工程中提取很多语义。但它也带来了复杂度：

- source 仓库路径、config、route、Vue 文件、notes、i18n 都需要被正确识别。
- 输出 Markdown 为了覆盖业务行为、状态、路由、资源、i18n 和实现规划，会越来越重。
- 如果把业务行为也纳入默认目标，MCP 和 adapter 会被迫承担过多不确定推断。
- AI agent 真正最需要的经常是“这个页面长什么样，以及在 YouFi 里该怎么写”。

因此，新路径主动缩小目标：

```text
从“完整迁移页面”收敛为“快速还原可见 UI”。
```

业务信息不是完全丢弃，而是降级为：

- 可见交互线索。
- 待确认项。
- 可参考相似页面的实现习惯。
- agent 实现时需要保留的 TODO 或接口占位边界。

## 3. 新工作流目标

### 3.1 主要目标

新工作流解决以下问题：

- 页面视觉结构：顶部栏、tab、卡片、列表、底部操作区、弹层等。
- 文案：DOM text 与 OCR text 的合并和校验。
- 布局关系：层级、滚动容器、固定区域、间距、对齐、宽高比例。
- 样式线索：颜色、字号、字重、行高、圆角、阴影、边框、背景。
- 资源线索：图片、图标、SVG、背景图、网络资源。
- 轻量交互：按钮、tab、筛选、输入框、可点击区域、弹层入口。
- YouFi 匹配：模块、文件树、常用组件、主题 token、i18n、assets、相似页面。

### 3.2 非目标

新工作流默认不确定性生成以下内容：

- 接口来源。
- 数据字段含义。
- 权限、风控、埋点。
- 隐藏状态和未触发弹层。
- 复杂表单校验和交易规则。
- 生命周期副作用。
- 深层跳转链路。
- 完整 Controller / Repository / Service 业务实现。

这些内容只能进入 `businessQuestions`、`risks`、`todos` 或 `manualConfirmations`，不能被写成确定结论。

### 3.3 质量标准

新工作流的成功标准不是“业务可上线”，而是：

- agent 能基于 JSON plan 在 YouFi 里生成第一版 UI。
- 页面结构、文案、视觉层级与来源页面基本一致。
- 生成代码遵守 YouFi 目录、组件、主题、i18n 和资源习惯。
- 不把推断不出的业务逻辑伪装成已经确认。
- 后续人工或 agent 可以基于 TODO 继续补业务。

## 4. 新旧链路关系

### 4.1 两条链路并行

| 链路 | 推荐命名 | 默认入口 | 主要输入 | 主产物 | 适用场景 |
| --- | --- | --- | --- | --- | --- |
| 旧链路 | Source-aware migration | CLI / core 内部能力 | Vue route / URL / Vue SFC + source config | `migration-context.json`、`migration-spec.md` | 需要业务语义、notes、i18n、源码证据、迁移说明书 |
| 新链路 | URL Snapshot UI reconstruction | MCP 默认工具 | URL / rendered HTML / screenshot | `page-snapshot.json`、`ui-implementation-plan.json` | 快速 UI 还原、低配置、agent 直接实现 |

旧链路不删除，但暂时不从 MCP 暴露。新链路作为 MCP 的唯一运行路径，直到 UI reconstruction 闭环稳定。

### 4.2 MCP 入口关闭策略

当前决策是：MCP 启动和运行时完全关闭旧 source-aware 链路。

- MCP 工具注册表只暴露 URL Snapshot UI reconstruction 相关工具。
- MCP 不暴露 `generate_migration_spec`、`get_migration_brief`、`read_migration_artifact` 这类旧 source-aware 工具。
- MCP 启动不要求 `--config`，也不把 `--config` 作为进入旧链路的开关。
- MCP 默认 `target.root = process.cwd()`。
- 旧链路代码继续留在 `core` / `cli` 中，但团队日常 MCP 使用不能触发它。
- 等新链路完全打通并稳定后，再单独评估是否恢复 MCP 兼容入口。
- CLI 保留现有 `generate` 行为，服务维护者调试和旧链路手动使用。
- CLI 是否增加 `snapshot` / `plan` 命令后续再定。

推荐默认体验：

```text
在 YouFi 当前仓库启动 MCP：

npx -y @proto-bridge/mcp-server

用户告诉 AI：

用 ProtoBridge 还原这个页面：https://example.com/prototype/page
```

不提供 MCP 旧链路兼容体验。若维护者需要旧 source-aware 链路，暂时通过 CLI 或 core 调用处理。

## 5. 输入模型

### 5.1 URL Capture

URL 是最自然的入口。MCP 通过浏览器打开页面后采集：

- screenshot。
- rendered DOM tree。
- text content。
- bounding boxes。
- computed style。
- CSS custom properties。
- font-family / font-size / font-weight / line-height。
- visible images / SVG / background images。
- clickable / input / tab 等可见交互线索。

示例：

```json
{
  "url": "https://xiaofenhong.cc/TradeAppPrd/#/prototype/etf-detail?is_mobile=1",
  "viewport": { "width": 390, "height": 844 },
  "saveArtifacts": true
}
```

### 5.2 Rendered HTML / DOM Snapshot

用户提到的“原始 HTML”方向可以保留，但文档中需要区分两类 HTML：

| 类型 | 价值 | 说明 |
| --- | --- | --- |
| Server HTML | 低 | SPA 常常只有 `<div id="app"></div>`，不足以还原页面 |
| Rendered HTML / DOM Snapshot | 高 | 浏览器执行 JS 后的真实 DOM，包含页面结构和文案 |

对新工作流有价值的是 rendered HTML / DOM snapshot。理想输入应包含：

- body 内可见 DOM。
- 每个元素的 bbox。
- 每个元素的 computed style。
- CSS variables 和使用关系。
- 字体信息。
- 图片、SVG、background image 的来源。
- viewport 信息。
- 与截图的关联。

如果只能拿到 server HTML，新工作流应提示信息不足，并建议改用 URL capture 或手动提供 rendered DOM。

### 5.3 Screenshot + OCR

OCR 是辅助输入，不是主输入。

OCR 适合补充：

- 图片中的文字。
- canvas 中的文字。
- CSS 伪元素中的文字。
- DOM 不完整或 text 被隐藏时的 fallback。

主输入优先级：

```text
Rendered DOM text + bbox + computed style
  > OCR text boxes
  > 人工补充
```

当 OCR 与 DOM 冲突时，保留两份 evidence，并写入 warning。

## 6. PageSnapshot 数据结构

新链路需要定义稳定的 `PageSnapshot`，作为 agent 和 planner 的主上下文。

```ts
type PageSnapshot = {
  id: string;
  source: SnapshotSource;
  capture: SnapshotCapture;
  page: SnapshotPageMeta;
  nodes: PageNode[];
  visualSections: VisualSection[];
  tokens: VisualTokenEvidence[];
  assets: AssetEvidence[];
  interactions: InteractionEvidence[];
  ocr?: OcrResult;
  warnings: string[];
};
```

### 6.1 Source

```ts
type SnapshotSource = {
  kind: 'url' | 'rendered-html' | 'screenshot';
  url?: string;
  htmlPath?: string;
  screenshotPath?: string;
  capturedAt: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  };
};
```

### 6.2 PageNode

```ts
type PageNode = {
  id: string;
  parentId?: string;
  role:
    | 'app-bar'
    | 'tab-bar'
    | 'section'
    | 'card'
    | 'list'
    | 'list-item'
    | 'button'
    | 'input'
    | 'image'
    | 'icon'
    | 'bottom-bar'
    | 'modal'
    | 'text'
    | 'unknown';
  tag?: string;
  text?: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  computedStyle?: SnapshotComputedStyle;
  cssVarRefs?: string[];
  assetRefs?: string[];
  children: string[];
  evidence: string[];
};
```

### 6.3 Token Evidence

```ts
type VisualTokenEvidence = {
  kind: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'border';
  source: string;
  value: string;
  cssVar?: string;
  usage: string[];
  candidateTarget?: string;
  confidence: 'high' | 'medium' | 'low';
};
```

这里的 `candidateTarget` 不要求 capture 阶段确定。它可以在 `build_ui_implementation_plan` 阶段结合 YouFi target conventions 生成。

## 7. UI Implementation Plan 数据结构

`ui-implementation-plan.json` 是 agent 直接消费的实现计划。

```ts
type UiImplementationPlan = {
  id: string;
  snapshotId: string;
  target: YouFiTargetSummary;
  page: UiPagePlan;
  fileTree: PlannedDartFile[];
  widgetTree: PlannedWidget[];
  componentMappings: ComponentMapping[];
  themeMappings: ThemeMapping[];
  i18nPlan: I18nPlan;
  assetPlan: AssetPlan;
  interactionPlan: InteractionPlan[];
  businessQuestions: string[];
  risks: string[];
  validationHints: string[];
};
```

### 7.1 Plan 生成原则

- 以 `PageSnapshot` 描述“页面长什么样”。
- 以 YouFi target connect 描述“目标工程应该怎么写”。
- Widget tree 按视觉区块和 YouFi 组件习惯组织，不按 DOM 层级机械翻译。
- 主题映射优先使用 YouFi 已有 `themeService.colors` 和 `themeService.textStyles`。
- 文案默认建议进入 `.tr`，但是否新增 key 由 agent 结合目标仓库确认。
- 图片和 SVG 优先匹配 YouFi 现有 assets，无法匹配时进入 asset TODO。
- 业务行为只做轻量计划，复杂逻辑进入 `businessQuestions`。

## 8. YouFi Target Connect

新链路强依赖当前工作目录的 YouFi 工程上下文，不把 YouFi 规范硬编码到 ProtoBridge。

MCP 在 YouFi 目录运行时，应扫描：

```text
lib/app/modules/**
lib/app/routes/app_routes.dart
lib/app/routes/app_pages.dart
lib/app/translations/*.dart
assets/images
assets/dark_images
assets/svg
assets/json
lib/app/common/{widget,widgets,pop}/**/*.dart
lib/app/widgets/**/*.dart
```

目标输出：

- 可落地模块建议。
- 文件树建议。
- 可复用组件。
- 真实使用片段。
- `themeService.colors` 和 `themeService.textStyles` 用法。
- `.tr` 翻译习惯。
- 相似页面。
- 空态、加载态、刷新、弹层等模式。

这部分是新旧两条链路的共同核心资产。

## 9. Adapter 价值重定位

### 9.1 `vue3-prototype`

新短路径不再依赖 `vue3-prototype` adapter。

它继续服务旧链路：

- route / Vue SFC 定位。
- prototype screen config。
- notes。
- i18n。
- Vue SFC facts。
- source-aware migration spec。

当任务需要业务语义、源码证据和可追溯迁移说明书时，仍然使用旧链路。

### 9.2 `flutter-app`

`flutter-app` adapter 没有失去价值，但要拆清楚价值层级。

仍然高价值的部分：

- `target-connect`。
- `flutter-context`。
- common widgets 扫描。
- routes / translations / assets 扫描。
- theme usage 扫描。
- similar files 检索。
- validate target changes。

需要调整定位的部分：

- `flutter-migration-spec` 不再是新链路默认输出，只作为 `export_review_markdown` renderer。
- 依赖 `PrototypePageAnalysis` 的 planner 需要抽象到 `PageFacts` 或新增 `SnapshotUiPlanner`。
- token mapping 输入需要从 Vue style token 扩展到 snapshot visual token。

### 9.3 `core`

`@proto-bridge/core` 保留，并扩展职责：

```text
把不同 source 输入转换为结构化页面事实，
再结合 target 工程上下文生成 agent 可用的实现计划。
```

新增方向：

- `PageSnapshot` 类型。
- `UiImplementationPlan` 类型。
- `capturePageSnapshot`。
- `analyzeHtmlSnapshot`。
- `buildUiImplementationPlan`。
- snapshot token evidence 到 YouFi theme 的映射。

### 9.4 `mcp-server`

`@proto-bridge/mcp-server` 是新工作流主入口。

新增方向：

- 不强制 `--config`。
- 默认 `target.root = process.cwd()`。
- 新增 snapshot tools。
- JSON-first 输出。
- 暂不注册旧的 `generate_migration_spec` 等 source-aware tools。
- 旧 MCP 兼容入口等新链路稳定后再评估。

### 9.5 `cli`

`@proto-bridge/cli` 不删除。

保留：

```bash
npx @proto-bridge/cli generate --route /prototype/trade
```

可选新增：

```bash
npx @proto-bridge/cli snapshot --url <url>
npx @proto-bridge/cli plan --snapshot <page-snapshot.json>
```

CLI 新能力不是第一优先级。新路径优先放在 MCP。

## 10. MCP Tools 设计

MCP 第一阶段只注册新链路工具，以及新链路需要复用的 target / validation 工具。

暂不注册：

- `generate_migration_spec`
- `get_migration_brief`
- `read_migration_artifact`

这些旧工具对应 source-aware migration。旧实现继续保留在代码中，但不进入团队默认 MCP runtime。

### 10.1 `capture_page_snapshot`

输入：

```json
{
  "url": "https://xiaofenhong.cc/TradeAppPrd/#/prototype/etf-detail?is_mobile=1",
  "viewport": { "width": 390, "height": 844 },
  "saveArtifacts": true
}
```

输出：

- `snapshotId`。
- `pageSnapshotPath`。
- screenshot path。
- warnings。

### 10.2 `analyze_html_snapshot`

输入：

```json
{
  "html": "<rendered html>",
  "screenshotPath": "/path/to/screenshot.png",
  "viewport": { "width": 390, "height": 844 }
}
```

用途：

- 外部工具已经提供 rendered HTML。
- MCP 不需要自己打开浏览器。
- 可配合 screenshot 做视觉校验。

### 10.3 `ocr_screenshot`

输入：

```json
{
  "screenshotPath": "/path/to/screenshot.png"
}
```

输出：

- OCR text。
- OCR text boxes。
- DOM text 差异。
- warnings。

### 10.4 `build_ui_implementation_plan`

输入：

```json
{
  "snapshotId": "snapshot_xxx",
  "targetRoot": ".",
  "targetModule": "etf"
}
```

输出：

- `planId`。
- `uiImplementationPlanPath`。
- 推荐文件树。
- Widget 组合。
- YouFi component mapping。
- theme / i18n / assets 建议。
- 风险和确认项。

### 10.5 `export_review_markdown`

输入：

```json
{
  "snapshotId": "snapshot_xxx",
  "planId": "plan_xxx"
}
```

输出：

- `migration-spec.md` 或 `ui-review.md`。

该工具是可选的，用于人工 review，不是 agent 实现的必要步骤。

### 10.6 `validate_target_changes`

继续复用现有工具，并补充 UI 还原相关检查：

- 是否修改范围符合 plan 的 fileTree。
- 是否使用 YouFi common widgets。
- 是否存在硬编码颜色、字号或明显临时 UI。
- 是否把无法确认的业务逻辑写死。
- 是否保留必要 TODO。
- 是否存在未处理的 asset / i18n / theme mapping。

## 11. 最短实现路径

除本文档修改外，实现路径压缩为两个阶段。

### Phase 1：MCP 新链路最小闭环

目标：

- MCP 启动不强制读取 `proto-bridge.config.json`。
- MCP 工具注册表关闭旧 source-aware tools。
- 当前工作目录即 target root。
- 新增 `capture_page_snapshot(url)`。
- 输出 `page-snapshot.json`。
- 保存 screenshot。
- 新增 `build_ui_implementation_plan(snapshotId)`。
- 复用 YouFi target connect。
- 输出 `ui-implementation-plan.json`。
- agent 可以直接消费 JSON 生成第一版 Dart UI。

暂不做：

- OCR。
- Markdown。
- CLI snapshot / plan 命令。
- 复杂业务分析。
- 旧 MCP 兼容入口。

### Phase 2：质量增强与 Review 支撑

目标：

- 增强 PageSnapshot 的视觉区块识别和 token evidence。
- 增加 screenshot OCR，补充 DOM 漏识别文字。
- OCR 与 DOM 冲突时输出 warnings。
- 增强 component / theme / i18n / asset mapping。
- 增强 `validate_target_changes` 的 UI 还原检查。
- 新增 `export_review_markdown`，仅作为人工 review 产物。
- 评估 CLI 是否需要新增 `snapshot` 和 `plan`。

暂不做：

- 恢复 MCP 旧链路兼容入口。
- 自动注册 routes。
- 完整业务 Controller 规划。

Phase 2 完成后，再单独讨论是否恢复 MCP 对旧 source-aware 链路的兼容入口。

## 12. 默认 Agent 流程

用户输入：

```text
用 ProtoBridge 还原这个页面：
https://xiaofenhong.cc/TradeAppPrd/#/prototype/etf-detail?is_mobile=1
```

MCP / agent 默认执行：

```text
1. capture_page_snapshot
2. build_ui_implementation_plan
3. get_target_conventions / find_target_examples
4. 生成 Dart UI
5. validate_target_changes
6. 汇报改动文件、验证结果、风险和待确认项
```

用户不需要提供：

- `proto-bridge.config.json`。
- source 仓库路径。
- Vue 文件路径。
- notes 路径。
- i18n 路径。

## 13. 风险与边界

### 13.1 UI 可以还原，业务不能伪造

URL snapshot 能还原页面可见形态，但不能可靠知道业务规则。

处理原则：

- 不生成确定业务结论。
- 不把 mock 数据字段当作真实接口字段。
- 不自动推断权限、风控、埋点。
- 复杂行为进入待确认项。

### 13.2 远程页面访问不稳定

可能遇到：

- 登录态。
- 网络限制。
- 资源跨域。
- 字体加载失败。
- 页面懒加载。
- 截图时机不稳定。

处理原则：

- 支持 cookie/token。
- 支持等待 selector。
- 支持手动提供 rendered HTML。
- 支持保存 screenshot 和 snapshot 供排查。

### 13.3 HTML 输入形态未完全确定

“原始 HTML”是否足够取决于它是不是 rendered HTML。

当前建议：

- URL capture 是 Phase 1 主路径。
- rendered HTML 是等价输入。
- server HTML 只能作为低价值 fallback。
- 后续根据实际外部工具输出格式再稳定 `analyze_html_snapshot` schema。

### 13.4 OCR 不稳定

OCR 可能受到字体、缩放、截图质量影响。

处理原则：

- OCR 只作为辅助 evidence。
- DOM text 优先。
- OCR 和 DOM 冲突时保留 warnings。

## 14. 结论

新方向成立，但必须保持克制。

ProtoBridge 新工作流不是要一次性解决“从原型到完整业务页面”的所有问题，而是先成为 AI agent 的 UI 还原上下文引擎：

```text
URL / rendered HTML / screenshot
  -> page-snapshot.json
  -> YouFi target connect
  -> ui-implementation-plan.json
  -> AI agent implements Dart UI
  -> validate_target_changes
```

旧链路继续存在，服务高信息量、可追溯、source-aware 的迁移说明书场景。新链路成为团队默认的低配置 UI 还原路径。
