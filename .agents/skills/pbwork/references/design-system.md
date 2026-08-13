# PBWork design system

Use this workflow for Tokens, Themes, components, component Contracts,
Registry metadata, Playground scenarios, composition, and shared gestures.
At the start of a task, tell the user that these changes may require PBWork
documentation synchronization. At delivery, list what was synchronized.

Routine maintenance does not require `frontend-design`. Use it only when the
request introduces a new visual identity, cross-page visual primitive, or
broad component-language redesign.

## Read first

1. `apps/pbwork/docs/development.md` and `principles.md`.
2. Token work: `tokens/overview.md`, `catalog.md`, and `themes.md`.
3. Component work: `components/overview.md`, `composition.md`, and its page.
4. Gesture work: `components/shared-gestures.md`.
5. `docs/reference/prototype-authoring.md` and `semantic-authoring.md`.

## Component atomicity

Follow `apps/pbwork/docs/components/alignment-protocol.md`:

| Change | Same-batch obligation |
| --- | --- |
| Semantic role, Token slot, state, behavior, or component boundary | Contract, Vue, Registry, tests, Target drift status |
| Usage rule or counterexample | Concise narrative documentation |
| Playground presentation | Contract `playground.presentation` |
| Implementation-only fix with unchanged semantics | Vue and relevant tests |

Check the JSON Contract, Vue implementation, `components/registry.ts`, relevant
`components/scenarios.ts`, component documentation, and tests. Do not change
only Vue or only documentation when semantics changed. Use Lucide for icons.
Check `apps/pbwork/docs/components/audit-large-types.md` for suspiciously large type.

## Token and Theme atomicity

- Modify `tokens.json` and, when component binding changes, `bindTokens.ts`.
- Update light/dark Theme values, Token docs, and catalog as applicable.
- Verify that component bindings remain in the allowed pool.
- Run the DS-to-Target fingerprint gate. Iteration may defer Flutter polish but
  must expose drift; a stable batch updates Target mapping/API and sync baseline.
- Theme overrides values only; it does not change Token semantics or bindings.

## Constraints

- DS implementation uses Flex or normal document flow only. Do not use CSS
  Grid, `grid-*`, or `place-*`.
- Consume Foundation/Theme Tokens for every visible or measurable design value.
  Do not write fixed colors, units, visual numbers, generated fixed CSS, or
  literal fallbacks. `calc()` may combine Tokens and derived runtime variables.
- DOM-derived geometry may pass through a custom property but cannot become a
  fixed design default or public styling escape hatch.
- Add a semantic Token when a value is missing. Do not name Tokens after a
  component, business concept, or numeric value.
- Keep shared capabilities free of business naming. Extend an existing matching
  component instead of creating a parallel one.
- Use finite component Contracts; do not expose arbitrary style or Token rebinding.
- Centralize gesture arbitration in `_shared` and the relevant complex component.
- Do not reuse Prototype DS components in Workbench UI.
- Preserve `data-pb-*`, HTML/ARIA, keyboard, and focus semantics.
- Declare and validate fixed/contextual/decorative role policy and true Token
  binding provenance in component Contracts and registration.
- Keep Inspector `getTokenBindings` slots identical to JSON Contracts. New Token
  dependencies synchronize the binding pool, Contract, Inspector, docs, and tests.
- Reserve default `ds.*` identity for Playground/tests. Business prototypes
  provide stable `inspectId` values.

## Verify

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test -- flex-layout-policy component-inspector-contract
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
pnpm ds:target-sync:verify
```

Add relevant Playwright specs for gestures, overlays, navigation, or Playground.
