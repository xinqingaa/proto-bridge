# Migration Context Schema

The generated `migration-context.json` currently follows the first `vue3-prototype -> flutter-app` implementation.

It is shaped around five sections:

- `source`: route, screen config metadata, Vue path/source, notes, and i18n.
- `capture`: optional Playwright screenshot and DOM snapshot output.
- `tokenMap`: Flutter mappings for semantic colors and typography.
- `target`: YouFi Flutter module, route, translation, asset, and reusable widget context.
- `recommendations`: implementation shape, widget split, risks, and manual questions.

The current TypeScript source of truth is `packages/core/src/types/index.ts`.

## Planned Direction

The next schema should align with the A/B/C model:

```text
A = source project
B = target project
C = ProtoBridge
```

Planned top-level sections:

```ts
type MigrationContext = {
  sourceProject: ResolvedProject
  targetProject: ResolvedProject
  input: RequirementInput
  source: SourceAnalysis
  target: TargetAnalysis
  conventions: ConventionContext
  capture?: CaptureResult
  mappings: MappingContext
  recommendations: MigrationRecommendations
  outputs: OutputPlan
  warnings: string[]
}
```

## Resolved Project

Both A and B should be resolved through the same project resolver:

```ts
type ResolvedProject = {
  role: 'source' | 'target'
  kind: string
  location: {
    type: 'local' | 'remote'
    path?: string
    repo?: string
    ref?: string
  }
  resolvedPath: string
  git?: {
    repo?: string
    ref?: string
    commit?: string
  }
}
```

The first remote implementation should support company GitLab branch/tag refs and cache checkouts under `.proto-bridge/cache/repos`.

## Conventions

ProtoBridge should not store A/B project development standards in this repository.

Instead, the context should record convention files discovered from A and B:

```ts
type ConventionContext = {
  sourceFiles: ConventionFile[]
  targetFiles: ConventionFile[]
  summaries?: {
    source?: string
    target?: string
  }
}

type ConventionFile = {
  path: string
  role: 'readme' | 'docs' | 'architecture' | 'adapter-known-file'
  excerpt?: string
}
```

For `vue3-prototype -> flutter-app`, source conventions may come from the prototype README, docs, notes, and config files. Target conventions may come from the Flutter README, docs, route files, theme service, translation files, module structure, and reusable widgets.

## Planned Output Files

The context should support three reviewable outputs:

```text
migration-context.json
llm-prompt.md
migration-spec.md
```

`llm-prompt.md` is planned as the prompt package prepared for an LLM. It remains useful even before a concrete LLM provider is implemented because it can be manually passed to Cursor, Claude Code, Codex CLI, or another AI tool.
