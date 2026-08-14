# PBWork prototype design

Use this workflow before formal authoring for a new prototype, structural
product change, navigation change, visual-language change, independent visual
exploration, or revision of a prototype design baseline.

## Read first

1. Existing `apps/pbwork/src/prototypes/{prototypeId}/docs/design.md`, pages,
   and user-provided references.
2. `apps/pbwork/docs/prototypes/design-workflow.md`.
3. Before promotion, `apps/pbwork/docs/principles.md`, Token documentation,
   `apps/pbwork/docs/components/composition.md`, and prototype manuals.
4. For visual direction, read and apply
   `.agents/skills/frontend-design/SKILL.md` in addition to this reference.

## Close product logic first

For a new product or structural change, determine:

- target user, usage context, current friction, product promise, and success;
- scope, non-goals, core objects, relationships, and lifecycle;
- root navigation, page map, page responsibility, entry, return, and deep link;
- primary journey plus loading, empty, error, disabled, interruption, recovery,
  persistence, and observable success states;
- assumptions, rejected directions, unresolved decisions, and acceptance signals.

Do not turn ambiguity into a long questionnaire. Infer low-risk details, state
important assumptions, and pause only when alternatives materially change the
product direction, core flow, or information architecture. Do not draw an
unimplemented capability as an interactive control.

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

## Visual direction

When applying `frontend-design`, ground the result in the real business object
and page task. Define a concrete visual thesis, type roles, palette, layout,
signature element, motion, and self-critique. Also specify:

- the product-level grammar shared across pages;
- the single focus and reading order of each page type;
- why a ring, sequence, stage, image, chart, or other structure earns its place;
- light/dark themes, target viewports, safe areas, keyboard, and reduced motion;
- the role of icons, images, SVG, Rive, Lottie, video, or other assets.

Words such as "premium", "clean", or "minimal" are not an executable visual
direction without these decisions.

## Promotion Gate

Classify each important visual element exactly once:

1. Existing PBWork DS capability.
2. New or extended shared DS capability.
3. Prototype-local UI using existing Tokens.
4. External asset or animation with an explicit cross-platform contract.
5. Rejected or degraded because of cost, accessibility, or Evidence risk.

Only stable, reusable capabilities belong in the shared DS. Business-specific
graphics stay in the prototype but remain Token-based and Evidence-aware.
Complex motion defines asset ID, states, trigger, timing, easing, loop, pause,
and reduced-motion fallback. PB cannot infer animation from screenshots or CSS.

## Design document

Follow `apps/pbwork/docs/prototypes/design-workflow.md`. Use `draft`,
`exploring`, or `approved` status. `approved` requires explicit user agreement
and no open decision that would change formal implementation.

Keep Registry entries, file lists, test commands, and Evidence field mechanics
out of `design.md`; they belong to authoring contracts or optional
`docs/implementation.md`. Hand formal implementation an approved direction,
page responsibilities, key states, acceptance signals, Promotion Gate
classification, and the micro-decisions still left to implementation.
