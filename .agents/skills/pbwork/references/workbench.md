# PBWork Workbench

Use this workflow for the PBWork management shell, navigation, Canvas,
Inspector, prototype management, Capture Console, Deliver flow, task center,
Evidence Review, and Workbench-only UI primitives. It does not govern business
Prototype Screens or their Design System.

## Read first

1. `docs/architecture/pbwork.md`.
2. `docs/guides/pbwork-and-pb.md`.
3. `apps/pbwork/docs/development.md`.
4. For Evidence display, `docs/architecture/evidence-model.md`.
5. For Capture flow, `docs/architecture/capture-pipeline.md`.
6. For semantic checks, Inspector guidance, or Preflight gates,
   `docs/reference/semantic-authoring.md`.

## UI boundaries

- Reuse or wrap controls from `src/workbench/ui`.
- Do not introduce inconsistent native selects, checkboxes, inputs, or buttons
  into business views.
- Do not reuse `src/design-system/components`; those serve Prototype Runtime
  and may carry Capture semantics.
- Vuetify is an implementation layer. Keep frequent Workbench controls behind
  `workbench/ui`.
- Give primary navigation an accessible name and Tooltip; use secondary
  navigation for resource hierarchy.

## Capture and Evidence

- Keep "Deliver to Agent" as the primary flow: confirm scope, capture, expose
  result/risk, generate the Agent prompt, and write `.proto-bridge/deliveries/`.
- Deliver may run automatic preflight, but starting delivery requires explicit
  confirmation. Confirm warnings and risks individually; do not add skip-all.
- Produce the same Core Selection Draft as CLI `deliver`; do not duplicate Core logic.
- Read Job, Run, Attempt, revision, and Snapshot states from Core Contracts.
- Keep background history in task center, details in Evidence Review, and the
  active delivery progress in Deliver UI.
- Reorganize Evidence presentation by Screen/Case/Fragment without rewriting
  Store JSON. Keep fixed refs, provenance, unknown, conflict, Coverage, Issue,
  and risk traceable.
- Keep Block/Warning/Info aligned with the authoritative semantic policy.
  Accepting a warning does not upgrade Evidence; Block has no bypass.
- Never persist temporary Inspector handles; use stable Fragment identity.

## Bridge

- Validate origin, source window, `runtimeId`, and `requestId`.
- Re-handshake after iframe load and invalidate old messages.
- Use explicit push/replace/back route semantics, not timing heuristics.
- Workbench tree, canvas chrome, and Capture protocol navigate with Runtime
  forced navigation so the iframe opens the requested Screen.
- Keep the Workbench Bridge separate from the Capture Protocol.

## Verify

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm docs:verify
```

For interaction changes, run relevant Playwright specs and inspect scrolling,
focus, empty/error states, keyboard use, and both themes.
