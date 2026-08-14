---
name: pbwork
description: >-
  Design, build, or maintain PBWork business prototypes, visual explorations,
  Runtime/Evidence authoring, tokens, themes, design-system components,
  shared gestures, Workbench, Canvas, Inspector, Capture, and Deliver UI.
  Use for any task under apps/pbwork. For visual direction, coordinate the
  repository-local frontend-design skill; do not use for ProtoBridge Core,
  Store, CLI, MCP, or Target implementation outside PBWork.
---

# PBWork

Use one PBWork entry point and load only the reference for the work being done.
Do not read every reference by default.

## Route the task

| Task | Required reference |
| --- | --- |
| New prototype, product structure, navigation, visual direction, exploration, or `docs/design.md` | [prototype-design.md](references/prototype-design.md) |
| Approved Screen, Variant, fixture, action, scenario, Runtime, or Evidence implementation | [prototype-authoring.md](references/prototype-authoring.md) |
| Token, Theme, component, Contract, Registry, Playground, or shared gesture | [design-system.md](references/design-system.md) |
| Workbench shell, Canvas, Inspector, Capture Console, Deliver, task center, or Evidence Review | [workbench.md](references/workbench.md) |

Read more than one reference when a task genuinely crosses boundaries. For
example, promoting a visual exploration may require prototype design first,
then design-system work, then formal authoring.

## Common boundaries

- Treat `apps/pbwork/src/prototypes/{prototypeId}/docs/design.md` as the formal
  product and experience baseline.
- Keep exploratory code under `apps/pbwork/src/drafts/{prototypeId}/`;
  it is not PB-compliant Evidence and must not enter Capture/Handoff.
- Use the repository-local `frontend-design` Skill for visual identity,
  composition, typography, or aesthetic exploration. Do not use it by default
  for routine Token, component, Contract, Workbench, or defect maintenance.
- Keep product logic and PBWork delivery constraints in this Skill. Do not
  modify the vendored `frontend-design` Skill with PBWork-specific rules.
- Prototype Runtime components and Workbench UI are separate component
  systems. Do not reuse one as the other.
- If implementation exposes unresolved product structure, fake interaction,
  or an unshippable visual direction, return to prototype design instead of
  silently changing the baseline.

## Baseline reading

Always read `AGENTS.md` and the files named by the selected reference. Use
`apps/pbwork/docs/checklist.md` before completing implementation work.
