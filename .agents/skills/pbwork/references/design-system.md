# PBWork design system

Use this workflow for Tokens, Themes, components, component Contracts,
Registry metadata, Playground scenarios, composition, and shared gestures.
At the start of a task, tell the user that these changes may require PBWork
documentation synchronization. At delivery, list what was synchronized.

Routine maintenance does not require `frontend-design`. Use it only when the
request introduces a new visual identity, cross-page visual primitive, or
broad component-language redesign.

The DS is the shared foundation that prototypes extend. DS gaps recorded in a
prototype's `docs/implementation.md` (style conflicts, missing variants) are
input for DS work: add a variant or component when the need is generic, and
leave business-specific shapes in the prototype.

For Theme, Registry or Playground changes, read
[Workbench preview workflow](../../../../apps/pbwork/docs/workbench-preview.md).
Synchronize resource ownership, base relationships and previews with the change;
ordinary use of a DS public variant is not a prototype extension. Report missing
registration/preview support rather than claiming it exists.

## Read first

1. `apps/pbwork/docs/development.md` and `principles.md`.
2. Token work: `tokens/overview.md`, `catalog.md`, and `themes.md`.
3. Component work: `components/overview.md`, `composition.md`, and its page.
4. Gesture work: `components/shared-gestures.md`.
5. `docs/reference/prototype-authoring.md` and `semantic-authoring.md`.

For theme-pack parser, preparation data, reactive Runtime helpers, or typed CSS generation, also read
`docs/architecture/theme-packs.md`. Runtime now provides the Core-resolved table, CSS variables, local Vuetify themes
and per-prototype v2 preferences. DS/prototype consumers now use the new keys and reactive Token readers.
All foundations, theme modes and registered DS components now use the shared phone preview in
`src/workbench/preview/`, with real Registry-bound prototype contexts, explicit
samples, atomic theme identity and isolated device sessions. Prototype variants and own components use explicit metadata plus validated module associations in `workbench/preview/extensions`; production resources come from explicit prototype registrations, with isolated fixture coverage for the registration mechanism. Preview registration never replaces Runtime/Evidence gates. Constants never enter bindings, the token Catalog, or Target mapping.
Capture pins the pack digest and every theme×mode value table; Handoff names the default theme and mode. New Case identities include the named theme plus the existing mode id; legacy identities remain readable.
See the architecture document for the current activation boundary.

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
only Vue or only documentation when semantics changed. Use the stable PBWork SVG registry for DS icons; new prototype icons follow [Icon authoring and sync](../../../../apps/pbwork/docs/components/action/icon.md), using native SVG and explicit ownership. Theme SVG files share the same canonical glyphs storage; theme catalogs hold references only. Follow that document for paths and export policy instead of duplicating rules here. Existing caller-supplied Lucide components remain supported. Declare the actual icon pack.
Check `apps/pbwork/docs/components/audit-large-types.md` for suspiciously large type.

## Token and Theme atomicity

- Modify semantic key-catalog.json or the owning Contract.componentTokens; bindings.ts derives its pool automatically.
- Update theme packs, Token docs, catalog, reactive JS readers and constant consumers as applicable.
- Verify that component bindings remain in the allowed pool.
- Run the DS-to-Target fingerprint gate. Iteration may defer Flutter polish but
  must expose drift; a stable batch updates Target mapping/API and sync baseline.
- Theme overrides values only; it does not change Token semantics or bindings.

## Constraints

- DS implementation uses Flex or normal document flow only. Do not use CSS
  Grid, `grid-*`, or `place-*`.
- Consume theme keys or PBWork constants for every visible or measurable design value.
  Concrete values belong only in theme packs or the constant table.
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
Test new components with the base pack and an actual prototype-owned pack,
in their declared themes and modes. Reuse BottomSheet for
action overlays and TransientNotice for Toast, including an optional action; keep business
undo, navigation and declared-clock state in the caller. Update Target pending
entries truthfully rather than implying a Flutter implementation.

## Typed local authoring

Local `v-pb` / `pbStyle()` uses generated keys and the shared `theme/slots.ts`
dictionary; it does not rebind DS instances. DS-owned semantic parts declare
`semanticParts` in Inspect Registry, while business children keep explicit
bindings. See `apps/pbwork/docs/prototypes/authoring-tools.md`.

共享预览尺寸交互与本地偏好以 `apps/pbwork/docs/workbench-preview.md` 为准：拖动手机设备容器等比缩放，外层卡片随手机展示高度撑开，舞台不设纵向内部滚动，双机空间不足换行；预览偏好跨页面共用并持久化。预览/来源 Tab 切换保留实例与搜索，来源隐藏侧栏、表格占满卡片，支持减少动态效果；共同滚动使用舞台顶部紧凑开关并持久化，只联动手机内容滚动进度。来源表格完整列出每项实际样板与值（字体按真实配置逐项渲染），不显示差异列/差异筛选或引用链；同值条目仍全部保留。

来源表按真实 pack/theme 独立列出全部主题，固定名称列并横向滚动；模式独立持久化，不从手机 A/B 推断列。玻璃使用共享 GlassMaterial，形状由宿主决定，保留降低透明度/无滤镜降级。整屏启动预览在同一手机内切换状态；自绘图标的导出复用同一 artwork，下载 UI 不进入 Runtime Icon。
