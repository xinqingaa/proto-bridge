# PBWork prototype authoring

Use this workflow for formal business Prototype and Runtime implementation
after product structure and visual direction are approved.

## Design precondition

Determine whether the request changes product definition, root navigation,
core flow, business objects/states, page composition, or visual language.

- For a new prototype or structural change, require
  `src/prototypes/{prototypeId}/docs/design.md` with `status: approved` and use
  the prototype-design reference if it is missing or unresolved.
- For a local visual or interaction improvement that changes page focus,
  composition, visual grammar, or key behavior, require an approved page design
  increment before implementation. Other pages may remain pending.
- Handle safe-area fixes, established defects, copy, Token, Evidence, Runtime,
  and route corrections directly without demanding a new full brief.

If implementation reveals fake interaction, structural conflict, an
unshippable direction, or expanded scope, return to design instead of silently
rewriting the baseline.

## Read first

1. `docs/reference/prototype-authoring.md`.
2. `docs/reference/semantic-authoring.md`.
3. `apps/pbwork/docs/README.md` and `apps/pbwork/docs/principles.md`.
4. `apps/pbwork/docs/components/composition.md`.
5. `apps/pbwork/docs/prototypes/design-workflow.md` and `overview.md`.
6. Relevant shell/navigation, Screen/Variant, recipe, component, and gesture docs.
7. For a new or materially reshaped user-visible Screen,
   `.agents/skills/frontend-design/SKILL.md` for the post-authoring Experience
   Gate as well as initial direction.

## Constraints

- Use PBWork Design System components whenever the shape matches.
- Use only Flex or normal document flow in business prototypes. Do not use
  CSS Grid, `grid-*`, or `place-*`.
- Express all visible or measurable authored design values through existing
  Tokens. Do not introduce fixed CSS values, visual numeric props, literal
  fallbacks, script-generated fixed CSS, or `calc()` containing raw design values.
- Runtime geometry measured from the DOM may pass through derived custom
  properties; it must not become a fixed default or public styling escape hatch.
  If a semantic value is missing, use the design-system reference to add it.
- Do not copy component, navigation, scrolling, or gesture implementations.
- Follow documented compositions such as `BottomNavigation + TabViewport` and
  `ScrollableDataList + DataList`.
- Register Screens, Variants, Actions, and Scenarios only in
  `prototypes/registry.ts`.
- Give strict default Screens a non-empty authored `requiredFragments`
  boundary and keep coverage risk for other Variants visible.
- Use stable `screenId + pbId + optional pbKey` Fragment identity. Business DS
  instances receive stable `inspectId`; required Fragments never depend on `ds.*`.
- Give prototype-local Evidence nodes explicit `data-pb-id`, `data-pb-role`,
  optional `data-pb-key`, and required `data-pb-token-*`. CSS Token usage does
  not substitute for a binding Fact.
- List independent implementation and acceptance nodes before editing. Warn
  when completeness is uncertain; add a missing marker when it is known to be
  in delivery scope.
- Define Actions, Scenarios, and Checkpoints for key interactions.
- Make Runtime prepare, readiness, snapshot, and reset deterministic.
- Do not enlarge Evidence exception allowlists for new work.

## Change locations

| Change                                  | Location                                              | Synchronize                                        |
| --------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Approved baseline                       | `src/prototypes/{prototypeId}/docs/design.md`         | Consume it; return to design for direction changes |
| Prototype-specific implementation notes | `src/prototypes/{prototypeId}/docs/implementation.md` | Record only local code and migration decisions     |
| Screen, Panel, or Shell                 | `src/prototypes/{prototypeId}`                        | Registry, baseline, tests                          |
| Variant or fixture                      | Registry and mock/fixture                             | Required boundary, Runtime tests                   |
| Action or Scenario                      | Registry and target nodes                             | Checkpoint, browser tests                          |
| Stable shared capability                | Design-system workflow first                          | Contract, Registry, docs, tests                    |

## Dual acceptance

A new or materially reshaped business Screen is not complete until both gates
pass. Run them again after any fix that can affect the other gate.

### PBWork Delivery Gate

- Token-only, DS-first, Flex-only, and documented compositions pass.
- Required Fragments, business Evidence nodes, Actions, Scenarios, Checkpoints,
  Variant fixtures, readiness, and reset are deterministic.
- Typecheck, scoped tests, Runtime verification, and docs verification pass.

### Experience Gate

Apply `frontend-design` to the formal PBWork result, not only to its source
draft. Use a real browser and the target viewport to inspect screenshots and
interactions for the approved page states. Verify:

- the first viewport has one clear focus and follows the contracted reading
  order;
- the signature idea survives DS/Token/Evidence translation;
- every apparent control or hot zone has visible feedback and the contracted
  result, with visible keyboard focus;
- dividers, cards, labels, icons, and decoration encode real structure;
- light and dark themes, narrow layout, reduced motion, and the approved
  default/critical states remain coherent;
- text fits, repeated elements align, overlays do not occlude content, and fixed
  navigation does not cover it.

Critique the screenshot, remove at least one unnecessary accessory when one is
present, fix discovered problems, and repeat both gates. Do not treat a list of
known visual defects as a passed Experience Gate.

## Verify

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test -- flex-layout-policy
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
```
