# 集成与工具入口

本文档是 CLI、MCP、LLM Provider 和脚本化集成的主维护入口。

## 1. CLI 当前入口

当前主入口是 CLI：

```bash
pnpm run generate -- --url "http://localhost:5173/#/prototype/etf-detail" --out ./output/etf-detail
pnpm run generate -- --route /prototype/etf-detail --out ./output/etf-detail
pnpm run generate -- --vue prototype/src/views/prototype/etf/ETFDetailPage.vue --out ./output/etf-detail
```

CLI 负责：

- 读取 `proto-bridge.config.json`，使用 `source` / `target` adapter 配置。
- 解析参数。
- 调用 core。
- 写入输出文件。

CLI 不应该实现复杂业务逻辑。

## 2. MCP 当前状态

MCP 是 Phase 6 入口，目前仍是骨架。

原则：MCP 是薄协议层，应复用 CLI 调用的 core 能力，不复制 planner、analyzer 或 generator 逻辑。

当前预期工具：

- `analyzeSourceProject`
- `capturePrototypePage`
- `analyzeTargetProject`
- `generateMigrationSpec`

## 3. Core 当前能力

CLI 和未来 MCP 都应调用 core。Core 当前通过 adapter registry 编排默认 `vue3-prototype -> flutter-app` 组合，负责：

- source adapter analysis。
- optional runtime capture。
- target adapter token mapping。
- target adapter context analysis。
- page pattern classification。
- widget blueprint planning。
- target implementation plan generation。
- `migration-context.json` 写入。
- `migration-spec.md` 渲染。

## 4. MCP 工具规划

MCP 工具应使用 adapter-aware 名称，不再暴露旧的 Vue/Flutter 固定名称。

规划工具：

- `resolveProject`
- `listSupportedAdapters`
- `analyzeSourceProject`
- `analyzeTargetProject`
- `classifyPagePattern`
- `generateImplementationPlan`
- `generatePromptPackage`
- `generateMigrationSpec`

## 5. generateMigrationSpec

这是最重要的 MCP 工具。

当前输入示例：

```json
{
  "source": {
    "adapter": "vue3-prototype",
    "root": "/Users/name/work/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/Users/name/work/youfi"
  },
  "route": "/prototype/trade",
  "outDir": "./output/stock-trade",
  "noCapture": true
}
```

规划输出：

```json
{
  "files": {
    "migrationContext": "output/stock-trade/migration-context.json",
    "llmPrompt": "output/stock-trade/llm-prompt.md",
    "migrationSpec": "output/stock-trade/migration-spec.md"
  },
  "warnings": []
}
```

`migration-spec.md` 应保持 target-facing；source-specific evidence 留在 `migration-context.json`。

## 6. LLM Provider 规划

MCP 不应该在第一版强依赖具体 LLM provider。

第一版可以通过 deterministic core generator 输出：

- `migration-context.json`
- `migration-spec.md`
- 未来的 `llm-prompt.md`

后续可在 core 中增加 provider 抽象：

- provider/model 选择。
- prompt 输入。
- 结构化上下文附件。
- response text。
- token/cost metadata。
- error/fallback mode。

provider 配置不应硬编码在 MCP 层。

## 7. Prompt Package 规划

`llm-prompt.md` 是未来的 prompt package。它应该组合：

- source context 摘要。
- target context 摘要。
- Flutter implementation plan。
- 约束和禁止项。
- 文件改动范围。
- 验收 checklist。

即使没有 LLM Provider，该文件也可以手动交给 Cursor、Claude Code、Codex CLI 或公司内部 AI 工具。

## 8. CI / 脚本化使用建议

CLI 应保持可重复运行：

```bash
pnpm run generate -- --route /prototype/xxx --out ./output/xxx
```

建议 CI 或团队脚本关注：

- 命令是否成功。
- `migration-context.json` 是否生成。
- `migration-spec.md` 是否生成。
- warnings 是否超过团队阈值。
- 正式 spec 是否不包含 source 技术栈细节。
