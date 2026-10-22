# PBWork prototype authoring

Use this workflow for formal business Prototype and Runtime implementation
after product structure and visual direction are approved.

For a new prototype or added Theme/component extension, read
[Workbench preview workflow](../../../../apps/pbwork/docs/workbench-preview.md).
Complete its resource declaration, preview and formal Evidence manual checks in
implementation.md. Missing registration support remains an explicit gap; preview
registration never substitutes for Runtime/Evidence authoring.

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
7. `apps/pbwork/docs/prototypes/authoring-tools.md` for typed styling, local Screen declarations, shared Runtime and scaffolding.
8. For a new or materially reshaped user-visible Screen,
   `.agents/skills/frontend-design/SKILL.md` for the post-authoring Experience
   Gate as well as initial direction.

## Prototype business scope

Apply [原型业务实现尺度](../../../../apps/pbwork/docs/principles.md#9-原型业务实现尺度).
Implement enough shared state and logic for the approved journeys to be
observable, consistent across pages, demonstrable and repeatable. Mock services,
fixtures and lightweight local state are valid; do not infer a requirement for
production persistence, exhaustive recovery or a complete business backend from
a page contract. Scope such work explicitly only when the experience needs it.
Keep formal authoring and Evidence gates intact.

## Constraints

- Build on the PBWork Design System and follow the Promotion Mapping in
  `docs/implementation.md`: a DS component where shape and style match, its
  public variants, props, or slots next, and a recorded prototype-local
  component or DS extension where the approved style conflicts. Never restyle
  DS internals through private classes, and never copy gesture, scrolling,
  overlay, or navigation mechanics.
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
  `ScrollableDataList + DataList`. Root destinations each register a Screen and
  share one shell `view`; TabViewport keeps panels mounted and switches with
  `motion.duration-instant`. See `apps/pbwork/docs/prototypes/shell-and-nav.md`.
- Product `onBeforeRouteLeave` guards return true when
  `isForcedRuntimeNavigation()` is set. Workbench and Capture open the target
  page through Runtime forced navigation.
- Declare Screens, Variants, Actions and Scenarios beside their Screen in
  `screens/{slug}/screen.ts` with `defineScreen()` and `screenScope()`. Registry
  glob aggregation remains the single consumer list. Mark default required nodes
  explicitly; regenerate and review the committed default boundary.
- Give strict default Screens a non-empty authored `requiredFragments`
  boundary and keep coverage risk for other Variants visible.
- Use stable `screenId + pbId + optional pbKey` Fragment identity. Business DS
  instances receive stable `inspectId`; required Fragments never depend on `ds.*`.
  Follow Core `PbId` / `PbKey` validation and the semantic-authoring identity rules;
  preserve case-sensitive camelCase business keys without lowercasing them.
- Prefer typed `v-pb` / `pbStyle()` for local styles and bindings; regenerate
  committed keys with `pnpm ds:keys:generate`, and boundaries with
  `pnpm pb:screens:generate`. Do not rebind DS instances through this helper.
- Give prototype-local Evidence nodes explicit `data-pb-id`, `data-pb-role`,
  optional `data-pb-key`, and required `data-pb-token-*`. CSS Token usage does
  not substitute for a binding Fact.
- Every static `data-pb-role` in a formal prototype must be a Core
  `SEMANTIC_ROLES` member. Run the static authoring lint before Runtime Capture;
  never add a local role word to make an invalid marker pass.
- List independent implementation and acceptance nodes before editing. Warn
  when completeness is uncertain; add a missing marker when it is known to be
  in delivery scope.
- Define Actions, Scenarios, and Checkpoints for key interactions.
- Make Runtime prepare, readiness, snapshot, and reset deterministic.
- Appearance reuse is opt-in: Scenario `appearancePolicy` defaults to `independent`. Mark `shared` only for theme-independent business actions. Declare Prototype `captureState: true` only after authored `useCaptureState` readers cover business/private session state, every Screen and nested UI state affecting checkpoints. Read render style from the resolved theme without rewriting business preferences; missing coverage or changed state falls back to independent execution. See the authoritative prototype authoring contract for the boundary.
- Exclude only shared TabViewport inactive panel subtrees from Capture; do not hide required nodes with `data-pb-capture-inactive`. Preserve hidden states inside the current panel and Overlay Evidence.
- Do not enlarge Evidence exception allowlists for new work.

## Change locations

| Change                                  | Location                                              | Synchronize                                        |
| --------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Approved baseline                       | `src/prototypes/{prototypeId}/docs/design.md`         | Consume it; return to design for direction changes |
| Prototype-specific implementation notes | `src/prototypes/{prototypeId}/docs/implementation.md` | Record local decisions and Experience review level |
| Screen, Panel, or Shell                 | `src/prototypes/{prototypeId}`                        | Registry, baseline, tests                          |
| Variant or fixture                      | Registry and mock/fixture                             | Required boundary, Runtime tests                   |
| Action or Scenario                      | Registry and target nodes                             | Checkpoint, browser tests                          |
| Stable shared capability                | Design-system workflow first                          | Contract, Registry, docs, tests                    |

## Delivery and experience review

Keep delivery correctness and visual confidence as separate, visible results.
The PBWork Delivery Gate is mandatory. A new or materially reshaped business
Screen receives the Quick Experience Check by default after its implementation
is stable. Escalate only when risk or feedback justifies the additional cost.

Record one Experience result in `docs/implementation.md`:

- `quick-checked`: the default low-cost review found no obvious defect;
- `accepted`: a Focused Experience Gate passed;
- `fully-audited`: a Full Experience Audit passed;
- `needs-focused-review`: the Quick Check exposed unresolved visual or
  interaction problems;
- `deferred`: screenshots were explicitly deferred by the user or could not be
  obtained; record the reason and do not imply Experience acceptance.

### PBWork Delivery Gate

- Token-only, Flex-only, the recorded Promotion Mapping, and documented
  compositions pass. Prototype-local components meet the same rules as DS
  components.
- Required Fragments, business Evidence nodes, Actions, Scenarios, Checkpoints,
  Variant fixtures, readiness, and reset are deterministic.
- Typecheck, scoped tests, Runtime verification, and docs verification pass.

### Quick Experience Check

Use this level by default. Apply `frontend-design` to the stable formal PBWork
result, not only to its source draft.

- Inspect one real-browser screenshot of the default state at the primary
  target viewport and theme.
- Inspect at most one additional screenshot chosen by the largest page-specific
  risk: dark theme, narrow layout, overlay, empty/completed state, or the most
  important interaction result.
- Check the first-viewport focus and reading order, signature survival,
  apparent-control feedback, obvious over-decoration, repeated alignment, text
  fit, overlay occlusion, and fixed-navigation coverage.
- Perform no more than one corrective screenshot loop. If a material problem
  remains, record `needs-focused-review` and escalate instead of continuing an
  unbounded review.

Do not require a theme-by-viewport-by-state matrix at this level. A page with no
meaningful secondary risk may pass with one screenshot.

### Focused Experience Gate

Use this level when the user is dissatisfied, the Quick Check finds a material
problem, the Screen establishes shared visual grammar, or the Screen carries a
core journey, data visualization, complex interaction, or complex/central
overlay behavior.

- Inspect three to five screenshots selected from the actual risks rather than
  exhaustively multiplying every state, theme, and viewport.
- Verify the relevant default and critical states, interaction feedback,
  keyboard focus, theme or narrow-layout behavior, structural use of dividers,
  cards, labels, icons, and decoration, plus text and overlay integrity.
- Critique and fix discovered problems until the selected risk surface is
  coherent. Remove unnecessary accessories when present.

Do not mark known material visual defects as `accepted`.

### Full Experience Audit

Run this level only on explicit instruction, for final batch/release review, or
when the product's risk requires comprehensive coverage. Inspect all declared
target themes, viewports, reduced-motion behavior, critical states, and core
interactions. Record `fully-audited` only after discovered material defects are
fixed.

### Proportional recheck

After a visual fix, rerun the Delivery checks affected by that fix and the
selected Experience level. After a Delivery fix that changes rendering or
behavior, rerun the selected Experience level. Do not rerun an unaffected full
matrix or full repository suite during every screenshot iteration; reserve full
verification for the completed Screen or coherent delivery batch.

## Verify

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test -- flex-layout-policy
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
```

原型新增变体/自有组件的展示登记已提供 `src/prototypes/{prototypeId}/preview-resources.ts` 入口，字段、校验与预览模块要求以 [Workbench 预览工作流](../../../../apps/pbwork/docs/workbench-preview.md#显式扩展登记) 为准。普通 DS 公开 props 不登记为扩展；该登记不替代 Runtime/Evidence 或正式体验验收。

Prototype pages hide all visible scrollbars by default, including nested scrollers
and overlays in embedded, standalone and Capture views. Keep wheel, touch and
keyboard scrolling available. Show scrollbars only when the user explicitly asks.
