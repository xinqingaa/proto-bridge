# MCP Agent 工作流规划

本文档记录 ProtoBridge MCP 的当前方向：MCP 不再承接旧 source-aware migration，而是作为 AI coding agent 的 URL Snapshot UI reconstruction 入口。旧 `migration-context.json` / `migration-spec.md` 说明书链路继续保留在 CLI 中。

## 1. 背景判断

AI agent 在 YouFi 中落地页面时，最先需要的是“这个页面可见 UI 长什么样，以及在 YouFi 工程里该怎么写”。完整业务迁移需要接口、权限、风控、埋点、隐藏状态和验收规则，这些信息仅靠 URL snapshot 不能可靠推断。

因此 MCP 的默认目标收敛为：

```text
URL / rendered DOM / screenshot / OCR
  -> screenshot.png
  -> page-snapshot.json
  -> ui-implementation-plan.json
  -> agent implements Dart UI
```

## 2. 目标体验

用户在 AI coding 工具中只提供 URL：

```text
用 ProtoBridge 还原这个页面到 YouFi Flutter：
https://xiaofenhong.cc/TradeAppPrd/#/prototype/etf-detail?is_mobile=1
```

期望流程：

```text
AI agent 调用 ProtoBridge MCP
  -> capture URL，保存 screenshot.png 和 page-snapshot.json
  -> 生成 ui-implementation-plan.json
  -> 获取 YouFi target conventions 和相似 Flutter 页面
  -> 在 target repo 中实现 Dart UI
  -> 调用 validate_target_changes 做结构性校验
  -> 汇报改动文件、验证结果和待确认项
```

用户不需要手动复制 Markdown。需要人工 review 时，agent 可以额外调用 `export_review_markdown` 生成 `ui-review.md`。

## 3. 能力边界

ProtoBridge MCP 负责：

- 采集 URL rendered DOM、截图、bbox、computed style、文案、资源和轻量交互线索。
- 生成 `screenshot.png`、`page-snapshot.json` 和 `ui-implementation-plan.json`。
- 给 agent 提供 YouFi target modules、routes、i18n、assets、common components、theme usage 和相似实现。
- 校验 agent 的改动范围、明显占位文案、硬编码样式和缺失计划文件。

AI coding agent 负责：

- 阅读 snapshot、UI plan、target conventions 和相似页面。
- 创建或修改 Flutter Dart 文件。
- 根据 target 项目习惯选择 `CommonAppBar`、`BaseGetView`、`ListView`、`SmartRefresher`、空态、加载态等实现方式。
- 运行 analyzer/test 或根据错误继续修复。

ProtoBridge MCP 不负责：

- 读取 Vue source、notes、i18n 并生成旧迁移说明书。
- 直接提交业务代码。
- 在 MCP server 内硬编码完整 Flutter 页面生成器。
- 把 snapshot 中看不到的业务接口、权限、风控、埋点写成确定结论。

## 4. 当前 MCP 工具

### `capture_page_snapshot`

打开 URL 并保存页面证据。

主产物：

- `screenshot.png`
- `page-snapshot.json`

### `build_ui_implementation_plan`

基于 `page-snapshot.json` 和 YouFi target conventions 生成 UI 实现计划。

主产物：

- `ui-implementation-plan.json`

### `ocr_screenshot`

对截图执行 OCR，或在没有 OCR provider 时返回明确 warning。

可选产物：

- `ocr-result.json`

### `export_review_markdown`

把 snapshot 和 UI plan 导出为人工 review 用 Markdown。

可选产物：

- `ui-review.md`

### `get_target_conventions`

读取当前 YouFi target conventions，包括 modules、routes、translations、assets、common widgets、theme usage、route usage 和 i18n usage。

### `find_target_examples`

按 module、pattern、roles、symbols、screenId 查找相似 Dart 文件和使用片段。

### `validate_target_changes`

对 agent 生成后的 target 改动进行结构性检查。

初期检查项：

- 是否只写入允许范围。
- plan 中预期文件是否缺失。
- 是否存在明显占位 UI 文案或 TODO。
- 是否存在硬编码颜色、字号、阴影。
- 是否出现未经确认的导航行为或网络图片。

## 5. 不暴露的旧工具

MCP 启动和运行时不暴露旧 source-aware 工具：

- `generate_migration_spec`
- `get_migration_brief`
- `read_migration_artifact`

旧链路继续存在于 `@proto-bridge/core/workflows/source-aware-migration` 和 `@proto-bridge/cli generate`，但团队日常 MCP 使用不能触发它。等 snapshot UI reconstruction 完全打通并稳定后，再单独评估是否增加兼容入口。

## 6. 推荐 Agent 流程

```text
1. 调用 capture_page_snapshot(url)
2. 调用 build_ui_implementation_plan(snapshotId)
3. 按需调用 get_target_conventions()
4. 按需调用 find_target_examples(module/pattern/roles)
5. 在 target repo 中实现 Dart UI
6. 运行 analyzer/test 或至少做静态检查
7. 调用 validate_target_changes(planId)
8. 向用户汇报改动文件、验证结果和待确认项
```

## 7. CLI 与 MCP 的关系

CLI 保持 source-aware migration：

```bash
npx @proto-bridge/cli generate --route /prototype/nav-history
```

CLI 输出：

```text
output/<page>/
├── migration-context.json
└── migration-spec.md
```

MCP 保持 snapshot UI reconstruction：

```text
.proto-bridge/snapshots/<page>/
├── screenshot.png
├── page-snapshot.json
├── ui-implementation-plan.json
├── ocr-result.json      # optional
└── ui-review.md         # optional
```
