# Migration Context Schema

The generated `migration-context.json` is shaped around five sections:

- `source`: route, screen config metadata, Vue path/source, notes, and i18n.
- `capture`: optional Playwright screenshot and DOM snapshot output.
- `tokenMap`: Flutter mappings for semantic colors and typography.
- `target`: YouFi Flutter module, route, translation, asset, and reusable widget context.
- `recommendations`: implementation shape, widget split, risks, and manual questions.

The TypeScript source of truth is `packages/core/src/types/index.ts`.
