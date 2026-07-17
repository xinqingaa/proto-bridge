# ProtoBridge 概览

ProtoBridge 把交互原型、运行时页面、截图证据和目标 Flutter 工程规范整理成页面级上下文，服务于人工开发者和 AI coding agent。

它**不**把 Vue / HTML / DOM / 截图直接翻译成生产 Dart，也**不**替代在目标工程里写代码的 agent。它产出可追溯、可审查、可验证的 artifacts，让实现前先回答：还原哪一页、有哪些证据、目标工程有哪些约定、预期改哪些文件与 Widget、哪些风险需确认、实现后如何验证。

```text
source / URL / screenshot / target repo
  -> capabilities
  -> page-canonical.json
  -> ui-build-plan.json
  -> ui-build-review.md
  -> implementation + ui.validate
```

## 为什么需要它

静态设计稿无法完整表达交互、状态、滚动、弹窗、tab、空态与异常态。产品和 UI 用交互原型沉淀组件、主题、布局、状态与交互后，ProtoBridge 负责把原型与客户端目标工程连起来：采集 source 语义、runtime / screenshot 证据和 target conventions，生成契约化产物。模式成熟后，大规模事后 UI 走查应收敛为少量异常确认。

## 证据分层

| 证据来源 | 负责 | 不负责 |
| --- | --- | --- |
| Source semantics | 业务区块、状态意图、交互与生命周期意图、Widget contract、禁止直译项、资源与文案线索 | 不决定目标工程用哪种 state / routing / i18n / theme 框架 |
| Target conventions | 目标 Flutter 工程中扫描到的 state、routing、i18n、theme family、component、file organization 证据 | 不决定页面必须接入哪个 route/module/component/token，不替代实现 agent 阅读 B |
| Runtime / screenshot | 可见文案、bbox、section 顺序、computed style、截图、OCR | 不反向决定文件拆分、状态 owner 或架构边界 |

冲突裁决：

1. 逻辑架构看 source semantics。
2. 工程表达优先看 B 文档与 target conventions；证据不足时保持 unresolved。
3. 视觉事实看 runtime / screenshot。
4. target 扫描事实为 `unknown` 时保留抽象建议，写入 warnings / manual questions，不猜测框架。

三类证据汇入 `ui-build-plan.json`。页面事实与逻辑组件是还原权威；B 接入信息位于 `integrationGuidance`，默认是 advisory。`ui-build-review.md` 是中文审查投影，`page-canonical.json` 是证据原档。

## Capability 编排

CLI、MCP 与 Core API 都是入口；产品逻辑在 core capabilities。

```text
source.analyze / runtime.capture / screenshot.attach / target.inspect
  -> page.merge
  -> ui.plan
  -> ui.review
  -> (实现)
  -> ui.validate
```

| Capability | 输入 | 输出 |
| --- | --- | --- |
| `source.analyze` | source root、route、Vue SFC | source facts |
| `runtime.capture` | URL、viewport | runtime facts、screenshots |
| `screenshot.attach` | screenshot、OCR text/boxes | screenshot facts |
| `target.inspect` | Flutter target root | target facts、扫描出的 architecture profile |
| `page.merge` | 各 facts | `page-canonical.json` |
| `ui.plan` | canonical、target、source-aware draft | `ui-build-plan.json` |
| `ui.review` | plan | `ui-build-review.md` |
| `ui.validate` | target diff、plan | validation result |

主入口：

| 入口 | 场景 | 命令 / API |
| --- | --- | --- |
| CLI | 本地准备、批量、人工 review | `proto-bridge generate` |
| MCP | Codex / Cursor / Claude Code 等 | `reconstruct_page_context` |
| Core | 嵌入其他 Node 工具 | `reconstructPageContext` |

### 适配器

| 方向 | 当前 | 后续 |
|------|------|------|
| Source | `vue3-prototype`；通过 tag、class、title、模板指令与源码结构进行启发式分析 | 显式 `data-pb-*` 协议、`react-prototype` 与中立 Source IR 统一设计 |
| Target | `flutter-app` | 按需增加其它 target |

原型工作台的技术栈与首期范围见 [design.md](design.md)；当前 Vue 原型的结构 / 弹层约定见 [conventions.md](conventions.md)。工作台按 design §19 **强制**写入 `data-pb-*` 标记，但当前 Core 仍以 tag / class 启发式为准。显式属性协议与 React adapter 后续映射到同一套 section / uiShell 语义，而不是另起业务词表。

## 通用规则与项目事实

ProtoBridge 不提供项目 preset / restoration profile。配置只描述输入、运行时和输出，不承载 A / B 的架构知识。

- Core 保留 Vue 3、Flutter、标准框架 API、语言语法与通用 UI 语义等技术规则。
- 模块、目录、组件、主题访问器、路由、i18n 和资产位置均从本次 source / target 代码与文档扫描取得。
- 扫描不到的项目事实保持 `unknown`，由消费产物并实现 B 的 agent 结合目标仓库继续确认。
- 项目 README 可提高扫描质量，但不能覆盖代码证据。
- Route/module/component/theme token 命中率不是 PB 核心质量指标；错误建议率必须优先于命中率。
- 私有项目 skill 可与产物一起交给实现 agent，但不进入 PB Core，也不改变页面事实。

## Target conventions

Detector 读取 `pubspec.yaml`、Dart 与可用 target 文档，归纳 `architectureProfile`：`state` / `routing` / `i18n` / `theme` / `components` / `fileOrganization` / `documentation`。

GetX、flutter_bloc、Riverpod、Provider、Navigator、go_router 和 AppLocalizations 可以作为 Flutter 生态识别规则；具体项目的扩展方法、基类与公共组件没有默认名单，只在扫描到定义或用法时影响 contract。

代码扫描优先于 target 文档；文档与代码冲突时保留冲突提示，不以文档覆盖代码事实。

## 工程布局

Planner 内部先生成不属于任何项目的逻辑文件树，再依据目标 Dart 路径样例重定位。无法识别文件组织时不生成猜测落点，而是留下 warning / manual question。

## 包边界

```text
packages/
├── core/          # capabilities、workflow、source/snapshot/target、artifacts、types
├── cli/           # 命令解析、config、终端输出
└── mcp-server/    # MCP stdio、tools、resources、prompts
```

Core 目录：

```text
packages/core/src/
├── capabilities/
├── workflows/capability-first/
├── source/
├── snapshot/
├── target/
├── artifacts/
├── config/
├── shared/
└── types/
```

公开 subpaths：

- `@proto-bridge/core`
- `@proto-bridge/core/workflows/capability-first`
- `@proto-bridge/core/capabilities`
- `@proto-bridge/core/config`
- `@proto-bridge/core/target/flutter-app`
- `@proto-bridge/core/source/vue3-prototype`
- `@proto-bridge/core/snapshot`
- `@proto-bridge/core/artifacts`
- `@proto-bridge/core/shared`

## 相关文档

- 产物契约：[artifacts.md](artifacts.md)
- 使用与集成：[usage.md](usage.md)
- 原型工作台设计定稿：[design.md](design.md)
- 原型 Source 约定：[conventions.md](conventions.md)
- 改本仓库：根目录 `AGENT.md`、`skills/proto-bridge`
