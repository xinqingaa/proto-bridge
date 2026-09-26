# PBWork Workbench

Use this workflow for the PBWork management shell, navigation, Canvas,
Inspector, prototype lifecycle management, finalized Capture, task center,
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

- Lifecycle facts live in the Core Store root at
  `pbwork/<workspaceId>/lifecycle-v1.json`; Local Service validates generation
  and `expectedRevision`, persists transitions, and reconciles automated phases.
  The lifecycle Pinia Store is a document cache; formal finalization calls the
  Capture Service Contract directly and keeps warning/risk UI state keyed by
  Prototype ID. Do not route finalization through Capture Store's global draft,
  preflight, Job, or risk fields. Do not restore
  formal identity from Registry, active/latest, or an unbound Bundle. The old
  `pbwork.prototype-lifecycle.v2` key may be imported only into an empty
  sidecar after Service verifies every fixed artifact reference; rejected
  legacy Evidence remains diagnostic. Workspace reset clears the sidecar.
- PBWork delivery begins only at the `review -> final` lifecycle transition.
  Build the whole-Prototype Draft automatically; do not expose range selection
  or manual Screen, Fragment, Component, control, or Prototype capture buttons.
- Run Preflight, Capture, Handoff, and prompt creation as one finalization flow.
  Require the convergence confirmation and confirm warnings and risks
  individually; do not add skip-all.
- Commit `final` only after the existing Core flow produced Evidence, Handoff,
  Delivery, and the one bound Agent prompt. Final/archived views may only read
  and copy it; do not expose generate or regenerate actions.
- PBWork rollback only persists a `rolling-back` operation; Local Service trashes
  the bound Bundle and clears formal artifact refs before returning to `review`.
  Failure stays visible as `failed(action: rollback)` and exposes “重试回退”.
  `archived` is terminal. Never expose Prototype delete.
- Keep CLI capture independent from PBWork lifecycle. Produce the same Core
  Selection Draft as CLI `deliver`; do not duplicate Core logic. CLI capture
  and deliver must warn that they are unofficial; they never mark a prototype
  `final`. Default Agent target comes from session `deliveryTargetRoot`
  (`proto-bridge.json` `delivery.targetRoot`), shown read-only on the
  finalization confirmation step.
- Read Job, Run, Attempt, revision, and Snapshot states from Core Contracts.
- Take result identity from Core `classifyCaptureResults`. Official means the
  lifecycle record's artifacts bind that exact Bundle, Snapshot, Handoff, and
  Delivery. In-progress phases and a failed finalize stay operation states.
  Every other result, including a coverage-complete CLI or historical Bundle,
  is diagnostic-only. A trashed or deleted binding is reference-invalid. An
  unreadable listed Snapshot is read-failed; do not substitute another active
  Snapshot. Show GUI or CLI only when a receipt recorded `source`; otherwise
  the origin is unknown. Do not infer identity or origin from ids, filenames,
  timestamps, or active/latest, and do not offer a claim action.
- Overview, task center, the finalization sheet, and Evidence Review render
  that projection. A diagnostic result must not read as deliverable or
  finalized. Keep partial-failure counts, failure groups, and “继续定稿”.
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
