# ProtoBridge Agent 工作指南

本文档面向在本仓库协作或使用 ProtoBridge 处理目标应用的 AI coding agent 和开发者。

ProtoBridge 是团队把“PRD + Figma 静态稿 + 人工 UI 走查”升级为“交互原型 + 源码证据 + AI 编排 + 可验证产物”的上下文桥接工具。它负责准备证据、实现计划、review 文档和验证结果；它不替代真正修改目标 Flutter 应用的 coding agent。

## 操作模型

```text
可用输入
  -> 重建页面上下文
  -> 阅读产物
  -> 必要时检查目标工程示例
  -> 在 target repo 中实现
  -> 验证目标变更
```

主入口：

- Core：`reconstructPageContext`
- CLI：`proto-bridge generate`
- MCP：`reconstruct_page_context`

主产物：

- `page-canonical.json`
- `page-debug-index.json`
- `ui-build-plan.json`
- `ui-build-review.md`
- `screenshots/full-page.png`

## 实现前先判断输入

先判断当前有哪些输入：

- 有 source route 或 Vue 文件：使用 source analysis。
- 有运行中的 URL：使用 runtime capture。
- 有 screenshot 或 OCR 文本：附加视觉和文字证据。
- 有 target repository：读取 target conventions 并生成 plan。

不要要求用户同时提供 source 和 URL。它们是可组合证据源，不是共同必填项：

- 有 `source.root + route/vue`：可以跑 source-only。
- 有 `url`：可以跑 runtime-only。
- 两者都有：跑 hybrid。
- 只有 screenshot/OCR：可以作为视觉和文字补证。
- 没有 `source.root` 时，不要用 `route/vue` 强行跑 source analysis；改用 URL，或请用户补充 `sourceRoot`。
- 没有 URL 时，不要强行 capture；先跑 source-only。

MCP 场景调用 `reconstruct_page_context`，CLI 场景运行 `proto-bridge generate`。

source-only MCP 示例：

```json
{
  "route": "/prototype/asset/pnl-analysis"
}
```

runtime-only MCP 示例：

```json
{
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true
}
```

hybrid MCP 示例：

```json
{
  "route": "/prototype/asset/pnl-analysis",
  "url": "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1",
  "capture": true,
  "trace": true
}
```

## 产物阅读优先级

根据任务优先读最高价值的产物：

1. `ui-build-review.md`：人类可读实现交接。
2. `ui-build-plan.json`：文件树、Widget 树、mapping、i18n、assets、interactions、risks、validation hints。
3. `page-debug-index.json`：排查视觉偏差时的快速索引。
4. `page-canonical.json`：完整 evidence、provenance、merge rules、mismatches 和 trace。
5. `screenshots/`：runtime capture 存在时的视觉参考。

不要把 `migration-spec.md` 当唯一主产物。有 source + target facts 时它会和 `ui-build-review.md` 一起输出；实现时仍先读 `ui-build-review.md`，再用 `migration-spec.md` 补充 source-aware 细节。

## 证据规则

- Source 最适合表达结构、语义区块、状态空间、交互意图和设计意图。
- Runtime 最适合表达实际可见性、bbox、computed style、active/open state 和可见文案。
- Screenshot/OCR 最适合表达视觉对照和补充文字证据。
- Target repository conventions 最适合表达文件落点、组件复用、routes、theme、i18n 和 assets。

在本团队场景中，原型平台与客户端的组件、主题和布局规范应尽量一一对应。Source evidence 的价值不只是“看源码”，而是提取交互原型平台中的结构、状态、组件意图和 token intent；target evidence 则用于把这些意图映射到客户端工程可复用能力。

如果证据缺失或互相冲突，要记录 risk 或 manual confirmation。不要编造隐藏 API、权限、埋点、风控、业务流或数据归属。

## 目标应用实现流程

1. 用 `reconstruct_page_context` 或 `proto-bridge generate` 生成上下文。
2. 阅读 `ui-build-review.md`。
3. 阅读 `ui-build-plan.json`。
4. 目标复用方式不明确时，调用 `read_target_conventions` 或 `find_target_examples`。
5. 只编辑 plan 需要的目标文件，除非用户明确要求扩大范围。
6. 优先沿用 target app 的 patterns、theme tokens、i18n conventions、routing conventions 和 reusable components。
7. 无法确认的业务行为保留为明确 TODO 或 manual confirmation，不要猜。
8. 能运行时，执行目标应用的 format、analyze 和 tests。
9. 调用 `validate_ui_build`。
10. 汇报 changed files、validation status、warnings 和 unresolved confirmations。

## 验证

MCP validation 示例：

```json
{
  "name": "validate_ui_build",
  "arguments": {
    "pageId": "page-pnl-analysis-20260514T05343",
    "targetRoot": "/Users/name/work/youfi"
  }
}
```

Validation 会检查：

- git diff、staged changes 和 untracked files。
- 是否有文件超出 allowed paths。
- plan 预期文件是否缺失。
- placeholder text 和 TODO markers。
- hard-coded colors 和 font sizes。
- local shadows、network images 和 navigation risk markers。
- plan validation hints。

Validation 是 review 辅助，不等于证明视觉和业务完全正确。

## 仓库修改边界

修改 ProtoBridge 本身时按下面边界判断：

- `packages/cli`：命令参数、config 读取、终端输出。
- `packages/mcp-server`：MCP 协议、tools、resources、prompts、session state。
- `packages/core/capabilities`：共享 capability facade。
- `packages/core/workflows/capability-first`：统一编排。
- `packages/core/source`：source adapters。
- `packages/core/snapshot`：browser capture、OCR、evidence enrichment。
- `packages/core/target`：target conventions、examples、planning、validation。
- `packages/core/artifacts`：文件写出。

共享行为应进入 core capabilities。入口包只做参数适配和输出适配，不承载产品逻辑。

## 仓库脚本使用

根目录脚本分为四类：

- 开发回归：`pnpm run build`、`pnpm run typecheck`、`pnpm run lint`。
- 本地 CLI：`pnpm run generate -- ...`，用于验证 monorepo 当前源码下的 `proto-bridge generate`。
- 示例体验：`pnpm run example`、`pnpm run example:dev`、`pnpm run example:android`，只服务 `examples/vue3-to-flutter`。
- 测试回归：`pnpm run test:config`、`pnpm run test:e2e:cli`、`pnpm run test:e2e:mcp`、`pnpm run test:e2e`。

`pnpm run example` 是 example harness，会一次性生成示例 artifacts 和 Flutter `_proto` 页面，用来降低首次体验心智负担。不要把它当成 ProtoBridge 正式产品能力等同于“自动生成生产 Dart 页面”的证明。

`example:dev` 和 `example:android` 会优先运行 `pnpm run example` 生成的 `target-flutter/lib/main_proto.dart`。没有 `main_proto.dart` 时运行默认兜底入口，提示用户先生成示例。

根据修改范围选择验证：

- 只改文档：检查相关链接和命令名即可。
- 改 TypeScript 源码：至少跑 `pnpm run typecheck`，必要时跑 `pnpm run build`。
- 改 config 解析：跑 `pnpm run test:config`。
- 改 CLI 入口或 artifact contract：跑 `pnpm run test:e2e:cli`，并按需传 `--source-root`、`--target-root`、`--url`。
- 改 MCP tools 或 validation：跑 `pnpm run test:e2e:mcp`。
- 改示例脚本或 Flutter target：跑对应 `pnpm run example` / `pnpm run example:dev` / `flutter analyze` / `flutter test`。

不要提交这些生成内容：

- `examples/vue3-to-flutter/output/`
- `examples/vue3-to-flutter/target-flutter/lib/main_proto.dart`
- `examples/vue3-to-flutter/target-flutter/lib/app/app_proto.dart`
- `examples/vue3-to-flutter/target-flutter/lib/app/routes/app_pages_proto.dart`
- `examples/vue3-to-flutter/target-flutter/lib/app/modules/**/_proto/`
- Flutter `build/`、`.dart_tool/` 和本地设备配置。

## 文档规则

正式文档应描述稳定行为和当前命令：

- 项目背景：`docs/background.md`
- 架构说明：`docs/architecture.md`
- 工作流：`docs/workflows.md`
- 安装与示例：`docs/quickstart.md`
- 开发命令：`docs/development.md`
- 输出产物：`docs/artifacts.md`

不要在正式文档里加入阶段标签、研究台账口吻，或不属于支持路径的工具名。
