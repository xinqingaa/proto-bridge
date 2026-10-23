# PBWork prototype design

Use this workflow before formal authoring for a new prototype, structural
product change, navigation change, visual-language change, independent visual
exploration, or revision of a prototype design baseline.

Before promotion, read
[Workbench preview workflow](../../../../apps/pbwork/docs/workbench-preview.md).
Include theme ownership and component extension classification in Promotion Mapping;
record implementation and preview gaps in implementation.md, not the product baseline.

## Read first

1. Existing `apps/pbwork/src/prototypes/{prototypeId}/docs/design.md`, pages,
   and user-provided references.
2. `apps/pbwork/docs/prototypes/design-workflow.md`.
3. `.agents/skills/frontend-design/SKILL.md` whenever the task sets or changes
   visual direction (see [Visual direction](#visual-direction)).
4. Before promotion, `apps/pbwork/docs/principles.md`, Token documentation,
   `apps/pbwork/docs/components/composition.md`, and prototype manuals.

Plan documents under `docs/roadmap` are input, not a substitute for the brief.
Confirm their product draft with the user, and do not inherit a visual
direction or component assignment that the user has not chosen.

## Brief intake

Run this step for a new prototype, a new visual direction, a whole-page
redesign, or visual dissatisfaction without a stated direction. Skip it for
local fixes, copy, Token, Evidence, Runtime, and established defects.

The fields are fixed; the questions are not. Every brief must settle:

1. Product positioning and core scenario.
2. User group and usage context.
3. Style: about three mood words, plus reference apps the user likes or
   rejects and what about them.
4. Platform and viewport: iOS, Android or both; phone or tablet.
5. Scope: must-have features, optional features, and explicit non-goals.
6. Brand starting point: a new brand, an existing prototype, or an existing
   customer brand or Flutter App theme.
7. Target Flutter constraints: an existing App, theme, or component library
   the delivery must respect. Delivery is always to the Flutter Target; never
   treat "only a look" as permission to skip the formal constraints.

Protocol:

- Extract what the prompt, attachments, existing docs, and memory already
  answer. Ask only for missing or contradictory fields.
- Ask with the structured question tool: at most five questions per round,
  concrete options plus free input, at most three rounds.
- When style cannot be settled in words (the user is undecided, answers "you
  choose", or two directions stay open), ask whether to build two or three
  style drafts first. Do not build them without asking, and do not silently
  pick one.
- A field the user explicitly delegates becomes a stated assumption, not a
  silent default.
- Before designing, show the brief as a short summary and get confirmation.
  Record it in `design.md` (product definition and visual sections).

Do not replace a missing brief with the current PBWork look. PBWork Tokens,
Theme, and DS are the foundation for formal delivery, not a style answer.

## Close product logic first

For a new product or structural change, determine:

- target user, usage context, current friction, product promise, and success;
- scope, non-goals, core objects, relationships, and lifecycle;
- root navigation, page map, page responsibility, entry, return, and deep link.
  Bottom-tab roots: one Screen per home, and those Screens share one shell view.
  Capture identity stays per Screen; stack pages keep their own views.
- primary journey plus loading, empty, error, disabled, interruption, recovery,
  persistence, and observable success states;
- assumptions, rejected directions, unresolved decisions, and acceptance signals.

After the brief is confirmed, infer low-risk product details and state
important assumptions. Pause again only when alternatives materially change the
product direction, core flow, or information architecture. Do not draw an
unimplemented capability as an interactive control.

## Prototype business scope

Apply [原型业务实现尺度](../../../../apps/pbwork/docs/principles.md#9-原型业务实现尺度).
Implement enough shared state and logic for the approved journeys to be
observable, consistent across pages, demonstrable and repeatable. Mock services,
fixtures and lightweight local state are valid; do not infer a requirement for
production persistence, exhaustive recovery or a complete business backend from
a page contract. Scope such work explicitly only when the experience needs it.
Keep formal authoring and Evidence gates intact.

## Select a mode

### Design baseline

Maintain:

```text
apps/pbwork/src/prototypes/{prototypeId}/docs/design.md
```

Close product structure and interaction before defining the shared product
visual language and each page's distinct composition. Pages may use different
structures, but must share intentional rules for type, color, spacing, icon,
surface, motion, assets, and content voice.

`status: approved` means the product definition, information architecture, core
journeys, and shared visual grammar are stable. It does not require every page
increment to be designed in advance. Maintain a page-design status table in the
document and approve pages or coherent journey batches just in time.

### Page design increment

Before a new or materially reshaped Screen enters formal authoring, close a
compact page contract containing:

- its single responsibility and first-viewport focus;
- named reading order;
- apparent actions or hot zones and their observable results;
- applicable default, in-progress, completed, no-plan, empty, error, or
  interrupted states;
- responsibility boundaries with other pages;
- observable acceptance signals.

The agent drafts this contract by default. A user may provide exact decisions
or delegate the bounded page direction; delegation does not permit skipping the
contract. Ask only when alternatives would materially change product direction,
the core journey, or information architecture. Keep layout measurements,
component names, CSS structure, Registry identity, and Evidence mechanics out.

### Visual exploration

When comparison requires working screens, use:

```text
apps/pbwork/src/drafts/{prototypeId}/
```

Exploration code does not enter the Prototype Registry or Capture/Handoff,
does not overwrite formal Screens, and must not claim PB authoring compliance.
It may use exploratory composition and local visual values, but must record
gaps against PBWork Token, DS, Evidence, accessibility, and cross-platform
asset contracts. Do not move exploration code directly into formal pages.

Declare each draft as one of two kinds on the draft page itself:

- **Style draft** answers "what does it look like". One or two key screens,
  static or lightly interactive, are enough.
- **Journey draft** answers "does it work". Walk every must-have journey from
  the brief in a real browser before reporting, and list what is missing.

When the brand starting point is a new brand, do not inject the PBWork Theme
or `--pb-*` variables into the draft. Give the draft its own palette, type,
and component shapes derived from the chosen direction. Use PBWork DS in a
draft only when the brief says to start from it or a comparison asks for it.

## Visual direction

Applying `frontend-design` is mandatory when setting or changing direction for
a new prototype, a style draft, a whole-page redesign, or visual
dissatisfaction. It is not used for routine maintenance.

PBWork overrides two defaults of that vendored Skill:

- It tells the designer to pin the subject and audience itself. In PBWork,
  take them from the confirmed brief; if a field is missing, return to
  [Brief intake](#brief-intake).
- It says to show ideas only when confident. In PBWork, present two or three
  distinct directions (palette, type roles, signature element, layout sketch)
  and let the user choose before building drafts or formal pages.

`frontend-design` is written for web pages. For an App, also decide its
identity across:

- navigation chrome: tab bar, top bar or large title, back and close;
- signature components the product is remembered by, and which other
  components take a variant of the base shape;
- type roles, including numerals when numbers carry the product;
- iconography style, illustration and image role;
- motion personality, plus sound and haptic intent;
- copy voice for actions, empty states, and errors;
- light and dark behavior.

Ground the result in the real business object and page task. Define a concrete
visual thesis, type roles, palette, layout, signature element, motion, and
self-critique. Also specify:

- the product-level grammar shared across pages;
- the single focus and reading order of each page type;
- why a ring, sequence, stage, image, chart, or other structure earns its place;
- light/dark themes, target viewports, safe areas, keyboard, and reduced motion;
- the role of icons, images, SVG, Rive, Lottie, video, or other assets.

Words such as "premium", "clean", or "minimal" are not an executable visual
direction without these decisions.

## Promotion Gate

PBWork DS is the foundation, not the ceiling. Classify each important visual
element exactly once, walking this ladder from the top and stopping at the
first step that keeps the approved direction intact:

1. Existing DS component as-is.
2. Existing DS component through its public variant, props, or slots.
3. New shared DS variant or component, when the need is generic and reusable.
4. Prototype-local component, when the shape is business-specific or the
   approved style conflicts with every DS option.
5. External asset or animation with an explicit cross-platform contract.
6. Rejected or degraded because of cost, accessibility, or Evidence risk.

When the approved style conflicts with a DS component, the style wins: do not
degrade the direction to fit the DS. Choose step 3 or 4 and record the conflict
as a DS gap. Two limits stay:

- Interaction mechanics are never copied: gesture arbitration, scrolling,
  overlay focus and dismissal, and navigation reuse the shared
  implementations, restyled through public props or slots or a DS extension.
- A prototype-local component obeys the same Token-only, Flex-only, and
  Evidence rules as a DS component.

Brand values belong to the prototype's own theme pack (same ID as the
prototype). It may inherit the base pack and declare multiple named themes
with light/dark modes. Keep existing semantic and component key meanings;
put concrete values in the pack, never a business-named shared Token or a
page-local palette. Record a Token gap only when the existing key semantics
cannot express the need. Sample packs are Gallery/Playground only. See the
Theme manual and ADR 0014 for ownership and resolution.
Typefaces are not part of a prototype's brand layer: use the default PBWork
font stack and do not switch typefaces per prototype, theme, or style direction.

Business-specific graphics stay in the prototype but remain Token-based and
Evidence-aware. Complex motion defines asset ID, states, trigger, timing,
easing, loop, pause, and reduced-motion fallback. PB cannot infer animation
from screenshots or CSS.

Record the engineering classification and DS gaps in `docs/implementation.md`.
Keep only the user-visible visual purpose, behavior, degradation, and
acceptance result in `design.md`.

## Design document

Follow `apps/pbwork/docs/prototypes/design-workflow.md`. Use `draft`,
`exploring`, or `approved` for the product baseline. `approved` requires
explicit user agreement or bounded delegated authority and no open decision that
would change product definition, information architecture, core journeys, or
the shared visual grammar.

`design.md` remains the approval entry and owns approval scope, dates and page
design status. It may link product, logic and UI requirements into the baseline
from sibling docs rather than duplicating their prose. Those requirements keep
the same approval discipline; an existing approved entry does not approve new
behavior added to a linked document.

Keep Promotion mapping, Registry entries, file lists, test commands, component
mapping, and Evidence mechanics out of `design.md`; they belong to authoring
contracts or `docs/implementation.md`. Hand formal implementation an approved
page contract, key states, acceptance signals, and the micro-decisions still
left to implementation.

原型新增变体/自有组件的展示登记已提供 `src/prototypes/{prototypeId}/preview-resources.ts` 入口，字段、校验与预览模块要求以 [Workbench 预览工作流](../../../../apps/pbwork/docs/workbench-preview.md#显式扩展登记) 为准。普通 DS 公开 props 不登记为扩展；该登记不替代 Runtime/Evidence 或正式体验验收。
