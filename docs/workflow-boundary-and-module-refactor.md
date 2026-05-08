# ProtoBridge Workflow Boundary 与模块重构计划

本文档用于规划 ProtoBridge 后续代码重构方向。目标不是立刻重写业务逻辑，而是先明确 CLI 模式与 MCP 模式的边界、模块归属、依赖规则和分阶段重构路径，让后续维护者能清楚判断功能应该放在哪里。

核心结论：

```text
CLI 和 MCP 不是同一个流程的两个参数。
它们是两个独立 workflow。

CLI = Source-aware Migration Workflow
MCP = Snapshot UI Reconstruction Workflow
```

两条 workflow 可以共享底层能力，例如 YouFi target connect、target examples、theme mapping、artifact writer、部分 capture 能力；但不共享 workflow 编排，也不互相 import。

## 1. 背景

ProtoBridge 当前历史上从 source-aware 迁移说明书链路发展而来：

```text
Vue source / route / URL
  -> source facts
  -> target facts
  -> migration-context.json
  -> migration-spec.md
```

这个链路适合 CLI：

- 读取 source 仓库。
- 分析 Vue SFC、notes、i18n、页面 config。
- 结合 YouFi target 工程约束。
- 输出面向人工和 AI coding 工具的迁移说明文档。

新的 MCP 链路目标不同：

```text
URL / rendered HTML / screenshot / OCR
  -> screenshot.png
  -> page-snapshot.json
  -> ui-implementation-plan.json
  -> AI agent implements Dart UI
```

这个链路适合 MCP：

- 不要求 `proto-bridge.config.json`。
- 不读取旧 source 仓库。
- 默认当前工作目录就是 YouFi target。
- 重点是快速还原可见 UI。
- 业务行为只作为轻量交互线索和待确认项。

因此，后续架构需要避免两类问题：

- MCP 误触旧 source-aware 链路，导致团队成员因 config/source 路径报错。
- CLI 被 snapshot/OCR/agent-first 逻辑污染，导致原本稳定的说明书链路难维护。

## 2. 重构目标

### 2.1 产品目标

- CLI 保留旧模式，作为 source-aware documentation workflow。
- MCP 只走新模式，作为 snapshot UI reconstruction workflow。
- 两种模式可以独立扩展、独立优化、独立发布说明。
- 同一底层能力如果两边都需要，应抽到共享模块，而不是让一个 workflow 依赖另一个 workflow。

### 2.2 工程目标

- 让目录结构直接表达 workflow 边界。
- 让 package 入口的 import 关系能看出职责边界。
- 让新增功能时能快速判断模块归属。
- 尽量通过移动和命名梳理先完成结构重构，避免第一步就重写大量逻辑。

## 3. 两种模式边界

| 项 | CLI 模式 | MCP 模式 |
| --- | --- | --- |
| 推荐命名 | Source-aware Migration | Snapshot UI Reconstruction |
| 主要使用者 | 人、批处理、维护者、CLI 调试 | AI coding agent、MCP client |
| 核心目标 | 生成迁移说明文档 | 快速生成 UI 实现上下文 |
| 输入 | route / Vue / URL + source config | URL / rendered HTML / screenshot / OCR |
| 是否读取 source 仓库 | 是 | 否 |
| 是否依赖 `proto-bridge.config.json` | 是，可以保留 | 否 |
| target root | config 指定 | 默认 `process.cwd()`，可参数覆盖 |
| 主产物 | `migration-spec.md` | `screenshot.png`、`page-snapshot.json`、`ui-implementation-plan.json` |
| 调试产物 | `migration-context.json` | `ocr-result.json`、debug snapshot evidence |
| review 产物 | `migration-spec.md` 本身 | `ui-review.md` 可选 |
| 业务行为 | 尽量从源码/notes/i18n 提取并说明 | 只做可见交互线索和待确认项 |
| Dart 代码生成 | 不做 | MCP 不直接写，agent 写 |
| 默认入口 | `@proto-bridge/cli generate` | `@proto-bridge/mcp-server` tools |

注意：MCP 的主产物必须包含 screenshot。截图不是附属调试文件，而是 UI 还原的重要证据，应该与 `page-snapshot.json` 和 `ui-implementation-plan.json` 一起被视为主产物。

## 4. 推荐目标目录结构

目标结构建议：

```text
packages/core/src/
├── workflows/
│   ├── source-aware-migration/
│   │   ├── generate-migration-context.ts
│   │   ├── generate-migration-spec.ts
│   │   ├── render-migration-markdown.ts
│   │   └── types.ts
│   └── snapshot-ui-reconstruction/
│       ├── capture-page-snapshot.ts
│       ├── analyze-html-snapshot.ts
│       ├── ocr-screenshot.ts
│       ├── build-ui-implementation-plan.ts
│       ├── render-ui-review-markdown.ts
│       └── types.ts
├── source/
│   └── vue3-prototype/
│       ├── prototype-page.ts
│       ├── vue-sfc.ts
│       └── types.ts
├── snapshot/
│   ├── browser-capture/
│   │   ├── capture-rendered-page.ts
│   │   └── dom-serializer.ts
│   ├── html-snapshot/
│   │   └── analyze-rendered-html.ts
│   ├── ocr/
│   │   ├── ocr-provider.ts
│   │   └── external-ocr.ts
│   └── visual-analysis/
│       ├── visual-section-classifier.ts
│       ├── token-evidence.ts
│       └── asset-evidence.ts
├── target/
│   └── flutter-app/
│       ├── target-connect.ts
│       ├── conventions.ts
│       ├── examples.ts
│       ├── validation.ts
│       ├── theme-mapping.ts
│       ├── migration-planner.ts
│       └── ui-reconstruction-planner.ts
├── artifacts/
│   ├── artifact-writer.ts
│   ├── artifact-paths.ts
│   └── markdown.ts
└── shared/
    ├── paths.ts
    ├── ids.ts
    └── types.ts
```

这个结构表达三层关系：

```text
workflow = 编排
source/snapshot/target = 能力模块
artifacts/shared = 横向基础设施
```

## 5. 模块职责

### 5.1 `workflows/source-aware-migration`

只服务 CLI 旧模式。

职责：

- 编排 source adapter、target connect、token mapping、migration context 和 Markdown spec。
- 生成 CLI 的主产物 `migration-spec.md`。
- 保留 `migration-context.json` 作为调试和追溯产物。

允许依赖：

- `source/vue3-prototype`
- `target/flutter-app`
- `artifacts`
- `shared`
- 未来必要时可依赖共享 `snapshot/browser-capture`，用于 CLI capture 增强。

禁止依赖：

- `workflows/snapshot-ui-reconstruction`
- MCP package 内任何代码。

### 5.2 `workflows/snapshot-ui-reconstruction`

只服务 MCP 新模式。

职责：

- 编排 URL / rendered HTML / screenshot / OCR 输入。
- 生成 `screenshot.png`。
- 生成 `page-snapshot.json`。
- 结合 YouFi target connect 生成 `ui-implementation-plan.json`。
- 可选生成 `ui-review.md`。

允许依赖：

- `snapshot/browser-capture`
- `snapshot/html-snapshot`
- `snapshot/ocr`
- `snapshot/visual-analysis`
- `target/flutter-app`
- `artifacts`
- `shared`

禁止依赖：

- `workflows/source-aware-migration`
- `source/vue3-prototype`
- CLI package 内任何代码。

### 5.3 `source/vue3-prototype`

只负责读取和分析 Vue 原型 source。

职责：

- route / Vue SFC 定位。
- prototype screen config。
- notes。
- i18n。
- Vue SFC facts。

它不应该知道 CLI 或 MCP，也不应该生成最终 Markdown。

### 5.4 `snapshot/*`

负责把页面运行时事实转换为 snapshot evidence。

职责：

- browser capture。
- rendered DOM serialization。
- screenshot 保存。
- rendered HTML 分析。
- OCR evidence。
- visual sections。
- visual token evidence。
- asset evidence。
- interaction evidence。

当前主要由 MCP workflow 使用，但它不应该被设计成 MCP 私有能力。未来 CLI 如果需要运行时截图、DOM、OCR 或视觉校对，也应该可以复用 `snapshot/*` 模块。

重要边界：

```text
snapshot/* 是 source 输入能力，不是 MCP 入口能力。
```

也就是说，MCP 可以调用 snapshot workflow，但 snapshot 模块本身不依赖 MCP。

### 5.5 `target/flutter-app`

YouFi / Flutter target 能力，供两条 workflow 共享。

职责：

- 扫描 modules。
- 扫描 routes。
- 扫描 translations。
- 扫描 assets。
- 扫描 common widgets。
- 查找 similar examples。
- 主题 token / text style mapping。
- target validation。
- 为 source-aware migration 提供 Flutter implementation planning。
- 为 snapshot UI reconstruction 提供 UI implementation planning。

建议把规划能力拆成两个 planner：

```text
migration-planner.ts
ui-reconstruction-planner.ts
```

这样旧链路和新链路都能复用 target facts，但不会共享同一个过度复杂 planner。

### 5.6 `artifacts`

负责产物路径、写文件和 Markdown 基础渲染。

职责：

- 输出目录规范。
- JSON 写入。
- Markdown 写入。
- artifact metadata。
- run/snapshot/plan id 辅助。

它不应该理解 Vue、Flutter、MCP 或 CLI 的业务语义。

### 5.7 `shared`

只放真正通用的小工具。

适合放：

- path utils。
- id utils。
- string utils。
- 通用类型。

不适合放：

- Vue 分析。
- Flutter 规则。
- OCR 规则。
- Markdown 章节业务逻辑。

## 6. 依赖规则

建议把以下规则写成长期维护约束：

```text
packages/cli 只能 import source-aware migration workflow。
packages/mcp-server 只能 import snapshot UI reconstruction workflow 和 target helper tools。
两个 workflow 不能互相 import。
source 模块不能 import workflow。
snapshot 模块不能 import workflow。
target 模块不能 import CLI 或 MCP。
artifacts/shared 不能 import source/snapshot/target/workflow。
```

更具体地：

- `packages/cli` 不直接 import `source/vue3-prototype`、`target/flutter-app` 的底层文件，而是通过 `workflows/source-aware-migration`。
- `packages/mcp-server` 不直接 import `source/vue3-prototype`。
- `packages/mcp-server` 不暴露 `generate_migration_spec`、`get_migration_brief`、`read_migration_artifact`。
- 如果 MCP 需要 target conventions / examples / validation，可以通过 `workflows/snapshot-ui-reconstruction` 或明确的 target helper API 调用。
- 如果 CLI 将来需要截图，应依赖共享 `snapshot/browser-capture`，而不是依赖 MCP workflow。

## 7. 功能归属判断规则

新增功能时按以下顺序判断：

### 7.1 只和 CLI 旧说明书有关

放入：

```text
workflows/source-aware-migration
source/vue3-prototype
```

示例：

- 更强的 Vue SFC 状态分析。
- notes 解析增强。
- migration-spec.md 章节优化。
- source i18n 映射说明。

### 7.2 只和 MCP UI 还原有关

放入：

```text
workflows/snapshot-ui-reconstruction
snapshot/*
```

示例：

- OCR provider。
- rendered HTML 输入。
- screenshot 视觉分区。
- DOM bbox 清洗。
- UI review markdown。
- snapshot interaction evidence。

### 7.3 和 YouFi / Flutter target 有关

放入：

```text
target/flutter-app
```

示例：

- common widget scan。
- routes scan。
- translations scan。
- assets scan。
- themeService mapping。
- similar examples。
- target validation。

### 7.4 CLI 和 MCP 都可能需要

优先放入：

```text
target/flutter-app
snapshot/*
artifacts
shared
```

不要放入某一个 workflow 再让另一个 workflow import。

典型例子：

- screenshot capture：当前服务 MCP，未来 CLI 也可能用，所以放 `snapshot/browser-capture`。
- target validation：两边都可能用，所以放 `target/flutter-app/validation`。
- artifact writer：两边都用，所以放 `artifacts`。

## 8. 重构阶段

### Phase 1：目录边界重排

目标：只移动文件、调整 export，不改行为。

动作：

- 创建 `workflows/source-aware-migration`。
- 创建 `workflows/snapshot-ui-reconstruction`。
- 创建 `source/vue3-prototype`。
- 创建 `snapshot/*`。
- 创建 `target/flutter-app`。
- 创建 `artifacts` 和 `shared`。
- 保持现有 CLI / MCP 行为不变。

验收：

- CLI 仍能生成旧 `migration-spec.md`。
- MCP tools/list 不出现旧 source-aware tools。
- TypeScript build 通过。

### Phase 2：入口依赖收口

目标：让入口 package 只依赖对应 workflow。

动作：

- `packages/cli` 改为只 import `workflows/source-aware-migration`。
- `packages/mcp-server` 改为只 import `workflows/snapshot-ui-reconstruction` 和必要 target helper facade。
- 移除 CLI/MCP 对底层 adapter 文件的散乱 import。

验收：

- 搜索 `packages/mcp-server`，不能 import `source/vue3-prototype`。
- 搜索 `packages/cli`，不能 import `snapshot-ui-reconstruction`。
- 两条 workflow 不能互相 import。

### Phase 3：Target 能力拆分

目标：让 `flutter-app` target 能力成为真正共享模块。

动作：

- 新增 `target/flutter-app/conventions.ts`，作为 YouFi modules、routes、translations、assets、components、theme usage 的 facade。
- 新增 `target/flutter-app/examples.ts`，作为相似 Dart 文件检索 facade。
- 新增 `target/flutter-app/migration-planner.ts`，保留 CLI source-aware migration 的 Flutter implementation planner facade。
- 新增 `target/flutter-app/ui-reconstruction-planner.ts`，承载 MCP snapshot UI reconstruction 的 YouFi UI plan 生成规则。
- 新增 `target/flutter-app/validation.ts`，承载 target Dart 改动范围和明显实现风险校验。
- MCP `validate_target_changes` 只保留 git diff 收集，具体 Flutter 校验规则从 `@proto-bridge/core/target/flutter-app` 引入。

验收：

- source-aware migration 可以复用 target facts。
- snapshot UI reconstruction 可以复用 target facts。
- 两边 planner 不再混在同一个大型 implementation plan 文件里。
- MCP 不复制 target validation 规则。

### Phase 4：文档和命名清理

目标：让文档、README、工具名与代码结构一致。

动作：

- 更新 README。
- 更新 `docs/architecture.md`。
- 更新 `docs/integration.md`。
- 更新 MCP README。
- 更新 core / CLI package README。
- 明确 CLI 旧模式和 MCP 新模式的用户说明。

验收：

- 文档中不再把 CLI/MCP 描述成同一个 workflow 的两个入口。
- MCP 文档不再出现旧 source-aware tools 的默认用法。
- CLI 文档不引导用户使用 snapshot UI reconstruction。

## 9. 验收标准

重构完成后，应满足：

- CLI 可以继续执行 source-aware migration。
- CLI 主产物是 `migration-spec.md`。
- CLI 可保留 `migration-context.json` 作为调试产物。
- MCP 可以执行 snapshot UI reconstruction。
- MCP 主产物包含：
  - `screenshot.png`
  - `page-snapshot.json`
  - `ui-implementation-plan.json`
- MCP 可选产物包含：
  - `ocr-result.json`
  - `ui-review.md`
- MCP `tools/list` 不出现：
  - `generate_migration_spec`
  - `get_migration_brief`
  - `read_migration_artifact`
- `target/flutter-app` 被两条 workflow 共享。
- `snapshot/browser-capture` 当前服务 MCP，但未来 CLI 可以复用。
- 两条 workflow 无互相 import。
- TypeScript typecheck / build 通过。

## 10. 推荐执行原则

- 先移动和命名，再重写逻辑。
- 每次重构都保持 CLI 和 MCP 可运行。
- 不在同一步里同时做目录重排和复杂行为优化。
- 遇到共享需求时，优先抽底层 capability，不要让 workflow 互相依赖。
- 保持旧 source-aware 逻辑存在，但 MCP runtime 不暴露旧入口。

最终目标是让维护者看到目录结构就能判断：

```text
这是 CLI 旧模式的事？
这是 MCP 新模式的事？
这是两边共享的 target/snapshot/artifact 能力？
```

如果答案清晰，架构就朝正确方向前进。
