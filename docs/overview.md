# ProtoBridge 概览

ProtoBridge 把交互原型、运行时页面、截图证据和目标 Flutter 工程规范整理成页面级上下文，服务于人工开发者和 AI coding agent。

它**不**把 Vue / HTML / DOM / 截图直接翻译成生产 Dart，也**不**替代在目标工程里写代码的 agent。它产出可追溯、可审查、可验证的 artifacts，让实现前先回答：还原哪一页、有哪些证据、目标工程有哪些约定、预期改哪些文件与 Widget、哪些风险需确认、实现后如何验证。

```text
source / URL / screenshot / target repo
  -> capabilities
  -> page-canonical.json
  -> page-debug-index.json
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
| Target conventions | 目标 Flutter 工程实际使用的 state、routing、i18n、theme、component、file organization | 不补造 source 没有的业务语义，不替代 runtime 视觉事实 |
| Runtime / screenshot | 可见文案、bbox、section 顺序、computed style、截图、OCR | 不反向决定文件拆分、状态 owner 或架构边界 |

冲突裁决：

1. 逻辑架构看 source semantics。  
2. 工程表达看 target conventions。  
3. 视觉事实看 runtime / screenshot。  
4. target architecture profile 为 `unknown` 时保留抽象建议，写入 warnings / manual questions，不猜测框架。

三类证据汇入 `ui-build-plan.json`（实现蓝图）。`ui-build-review.md` 是从 plan 渲染的中文审查视图。`page-canonical.json` 是证据原档。

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
| `target.inspect` | Flutter target root | target facts、architecture profile |
| `page.merge` | 各 facts | `page-canonical.json`、`page-debug-index.json` |
| `ui.plan` | canonical、target、source-aware draft | `ui-build-plan.json` |
| `ui.review` | plan | `ui-build-review.md` |
| `ui.validate` | target diff、plan | validation result |

主入口：

| 入口 | 场景 | 命令 / API |
| --- | --- | --- |
| CLI | 本地准备、批量、人工 review | `proto-bridge generate` |
| MCP | Codex / Cursor / Claude Code 等 | `reconstruct_page_context` |
| Core | 嵌入其他 Node 工具 | `reconstructPageContext` |

当前适配器：`source: vue3-prototype`，`target: flutter-app`。

## Restoration profile

配置字段名是 `profile`；代码与产物字段是 `RestorationProfile` / `restorationProfile`，与 target 扫描出的 `architectureProfile` 区分。

解析：

1. 显式 `"youfi"` 等已注册 id → 强制该 profile  
2. 显式 `"generic"` 或 `false` → 仅通用能力  
3. `"auto"` 或不配置 → 按 `target.root` 目录名推断（如 `.../youfi` → `youfi`）  
4. 推断不到 → `generic`

Profile 可提供 module aliases、target symbols、role / pattern / usage symbols、theme tokens、source lexicon。只提高候选召回；高置信组件、token、路由与 i18n 建议仍须被 target 扫描证明。

## Target conventions

Detector 读取 `pubspec.yaml`、Dart 与可用 target 文档，归纳 `architectureProfile`：`state` / `routing` / `i18n` / `theme` / `components` / `fileOrganization` / `documentation`。

GetX、flutter_bloc、Riverpod、Provider、Navigator、go_router、`context.t`、AppLocalizations、`themeService`、`context.pbColors`、CommonAppBar 等**不是**通用默认值；可由 profile 进候选池，仅在扫描到时以高置信影响 contract。

代码扫描优先于 target 文档；文档与代码冲突时保留冲突提示，不以文档覆盖代码事实。

## 工程布局假设

Planning、module 枚举与相似文件检索默认关注 `lib/app/modules/<module>/...` 一类组织，并探测常见 routes / translations 路径。非该布局的 Flutter 工程仍可扫描部分架构信号，但文件落点与示例检索质量会下降。

## 包边界

```text
packages/
├── core/          # capabilities、workflow、source/snapshot/target、profile、artifacts、types
├── cli/           # 命令解析、config、终端输出
└── mcp-server/    # MCP stdio、tools、resources、prompts
```

Core 目录：

```text
packages/core/src/
├── capabilities/
├── workflows/capability-first/
├── profile/
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
- 改本仓库：根目录 `AGENT.md`、`skills/proto-bridge`
- YouFi 消费示例：`skills/youfi-flutter-restore`
