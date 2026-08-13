---
name: proto-bridge
description: >-
  Modify ProtoBridge Core contracts, Capture, Store, Local Service, CLI, MCP,
  Target query/validation, repository documentation, or product regression
  tests outside PBWork-specific UI and prototype authoring.
---

# ProtoBridge

## Read first

1. `AGENTS.md` and `docs/README.md`.
2. By task:
   - Contract or Store: `docs/architecture/evidence-model.md`.
   - Capture or Runtime protocol: `docs/architecture/capture-pipeline.md`.
   - Semantic authoring or gates: `docs/reference/semantic-authoring.md`.
   - CLI, MCP, or Service: `docs/architecture/proto-bridge.md`.
   - Documentation: `docs/maintenance/documentation.md`.

Use the `pbwork` Skill for changes under `apps/pbwork` that concern its
business prototypes, Design System, Workbench, or Capture UI.

## Locations

```text
packages/core/src/v2/                  Contract / Capture / Store
packages/core/src/target/flutter-app/  Target query / validation
packages/local-service/                browser to Node process boundary
packages/cli/                          Producer CLI
packages/mcp-server/                   Consumer MCP
```

## Constraints

- Put product semantics in Core only.
- Do not maintain duplicate Selection, state, risk, Case identity, or reference
  algorithms at entry points.
- Keep Store history immutable and pin Handoff to Snapshot/revision.
- Expose unknown, conflict, partial, stale, and unsupported states to users and Agents.
- Only authored Runtime Contracts may declare required boundaries.
- Keep Target scanning read-only and separate from Evidence.
- Let target-project docs and machine contracts own Target mapping. DS
  fingerprint covers protocol Schema, Contract, role, and Token/Theme surface;
  sync lists expose drift rather than encoding target symbols in Core.
- Do not expose Store layout through MCP or substitute active/latest for a fixed ref.

## Documentation and verification

For public Schema, command, Tool, Resource, Prompt, configuration, environment,
path, or product-boundary changes, use the ownership matrix in
`docs/maintenance/documentation.md` and update authoritative documentation in
the same task. Keep current behavior in main docs, history in `docs/history`,
and design rationale in `docs/decisions`.

Run scoped tests and complete with:

```bash
pnpm docs:verify
pnpm ds:target-sync:verify
pnpm verify
```
