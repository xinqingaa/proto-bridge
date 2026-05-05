# MCP Tools

Phase 6 will wrap the core package with MCP transport.

MCP is not the primary place for business logic. It should be a thin protocol layer over the same core functions used by the CLI.

The intended first tools are:

- `analyzePrototypePage`
- `capturePrototypePage`
- `mapTokens`
- `analyzeFlutterContext`
- `generateMigrationSpec`

The `packages/mcp-server` package currently exports the same core functions as a placeholder and keeps business logic out of the future MCP transport layer.

## Planned Direction

The next architecture uses the A/B/C model:

```text
A = source project
B = target project
C = ProtoBridge
```

MCP tools should therefore move from Vue/Flutter-specific names toward adapter-aware names while keeping backward-compatible aliases during migration.

Planned tools:

- `resolveProject`
- `listSupportedAdapters`
- `analyzeSourceProject`
- `analyzeTargetProject`
- `generatePromptPackage`
- `generateMigrationSpec`

## generateMigrationSpec

This should remain the most important MCP tool.

Input should include:

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/prototype.git",
      "ref": "main"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/mobile-app.git",
      "ref": "develop"
    }
  },
  "input": {
    "route": "/prototype/trade"
  },
  "outputDir": "./output/stock-trade"
}
```

Output should include:

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

## LLM Provider

MCP should not require a concrete LLM provider in the first implementation.

The first MCP version can generate `llm-prompt.md` and `migration-spec.md` through the deterministic core generator. A future version can call an LLM provider abstraction from core if configured.

Provider configuration should remain outside MCP business logic.
