---
name: pbwork
description: >-
  Design, build, or maintain PBWork business prototypes, visual explorations,
  Runtime/Evidence authoring, tokens, themes, design-system components,
  shared gestures, Workbench, Canvas, Inspector, Capture, and Deliver UI.
  Use for any task under apps/pbwork. A new prototype or visual direction
  starts with a brief intake that asks the user for missing positioning,
  audience, and style, and must apply the repository-local frontend-design
  skill; do not use for ProtoBridge Core,
  Store, CLI, MCP, or Target implementation outside PBWork.
---

# PBWork

Use one PBWork entry point and load only the reference for the work being done.
Do not read every reference by default.

## Route the task

| Task                                                                                             | Required reference                                          |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| New prototype, brief intake, product structure, navigation, visual direction, exploration, or `docs/design.md` | [prototype-design.md](references/prototype-design.md) |
| Approved Screen, Variant, fixture, action, scenario, Runtime, or Evidence implementation         | [prototype-authoring.md](references/prototype-authoring.md) |
| Token, Theme, component, Contract, Registry, Playground, or shared gesture                       | [design-system.md](references/design-system.md)             |
| Workbench shell, Canvas, Inspector, Capture Console, Deliver, task center, or Evidence Review    | [workbench.md](references/workbench.md)                     |

Read more than one reference when a task genuinely crosses boundaries. For
example, promoting a visual exploration may require prototype design first,
then design-system work, then formal authoring.

## Common boundaries

- Treat `apps/pbwork/src/prototypes/{prototypeId}/docs/design.md` as the formal
  product and experience baseline.
- Keep exploratory code under `apps/pbwork/src/drafts/{prototypeId}/`;
  it is not PB-compliant Evidence and must not enter Capture/Handoff.
- A new prototype, new visual direction, or whole-page redesign starts with the
  brief intake in `prototype-design.md`. When the prompt is sparse, ask; do not
  fill the gaps with the current PBWork look.
- Reading and applying the repository-local `frontend-design` Skill is
  mandatory when setting or changing visual direction: a new prototype, a style
  draft, a whole-page redesign, or visual dissatisfaction. Follow the PBWork
  overrides in `prototype-design.md`. After formal authoring of a new or
  materially reshaped business Screen, run at least the Quick Experience Check.
  Escalate to the Focused Experience Gate or Full Experience Audit by risk, user
  feedback, or explicit instruction. Do not use it by default for routine
  Token, component, Contract, Workbench, copy, or established defect
  maintenance.
- PBWork DS is the foundation, not the ceiling. Use a DS component when both
  shape and style match, its public variants when they suffice, and a shared DS
  extension or prototype-local component when the approved style conflicts.
  The style wins; record the DS gap. Interaction mechanics are never copied.
- Keep product logic and PBWork delivery constraints in this Skill. Do not
  modify the vendored `frontend-design` Skill with PBWork-specific rules.
- Prototype Runtime components and Workbench UI are separate component
  systems. Do not reuse one as the other.
- If implementation exposes unresolved product structure, fake interaction,
  or an unshippable visual direction, return to prototype design instead of
  silently changing the baseline.
- The PBWork Delivery Gate is always required. Record the formal Screen's
  Experience review level separately as `quick-checked`, `accepted`,
  `fully-audited`, `needs-focused-review`, or explicitly `deferred`; do not
  describe a Quick Check as full Experience acceptance. Follow the escalation
  and proportional recheck rules in `prototype-authoring.md`.

## Baseline reading

Always read `AGENTS.md` and the files named by the selected reference. Use
`apps/pbwork/docs/checklist.md` before completing implementation work.
