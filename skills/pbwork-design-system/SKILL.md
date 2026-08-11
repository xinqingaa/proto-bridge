---
name: pbwork-design-system
description: >-
  Modify PBWork tokens, themes, basic or complex components, component
  contracts, registry metadata, Playground scenarios, shared gestures,
  composition rules, or prototype design-system documentation.
---

# PBWork Design System Skill

使用本 Skill 时，必须在开始工作时提醒用户：组件、Token、Theme 或共享手势变化需要同步 PBWork 文档；交付时列出已同步项。

## 必读

1. `apps/pbwork/docs/development.md`
2. `apps/pbwork/docs/principles.md`
3. Token 任务 → `tokens/overview.md`、`catalog.md`、`themes.md`
4. Component 任务 → `components/overview.md`、`composition.md`、具体组件页
5. 手势任务 → `components/shared-gestures.md`
6. `docs/reference/prototype-authoring.md`
7. `docs/reference/semantic-authoring.md`

## 组件原子变更

按[跨栈对齐协议](../../apps/pbwork/docs/components/alignment-protocol.md)分级同步：

| 变更 | 必须同批 | 可不做 |
| --- | --- | --- |
| 语义（role / Token 槽 / state / behavior / 拆组件） | Contract + Vue + registry + 测试 | Flutter（P1.5） |
| 用法铁律 / 反例 | 文档短叙事 | 不抄 props 表 |
| Playground 展示 | Contract `playground.presentation` | — |
| 纯实现修（同语义） | Vue（+ 单测） | 无字段变更时可不改 Contract/文档 |

同一任务至少检查：

1. `src/design-system/components/contracts/{id}.json`（含 `playground.presentation`；语义变更补 `summary`/`behavior`/`states[].kind`）
2. Vue 实现
3. `components/registry.ts`
4. `components/scenarios.ts`（适用时）
5. `apps/pbwork/docs/components/**/{id}.md`（触达时按新骨架，不以 props 表为权威）
6. Unit/Playwright tests

不能只改 Vue 或只改文档。图标包仅 Lucide。大类型嫌疑先查 [audit-large-types.md](../../apps/pbwork/docs/components/audit-large-types.md)。

## Token/Theme 原子变更

- 修改 `tokens.json`；
- 需要组件绑定时修改 `bindTokens.ts`；
- 按需修改 light/dark Theme；
- 更新 Token 文档与 catalog；
- 验证所有组件绑定仍在允许池中。

Theme 只覆盖值，不改变 Token 语义或组件绑定。

## 硬约束

- DS 组件（style、template、script 与共享 TS helper）只使用 Flex 或常规文档流；禁止 `grid` / `inline-grid`、全部 `grid-*` 和 `place-*`。
- 所有可见或可测量的设计量只消费 Foundation / Theme Token：不得写固定色、单位值、裸数值（含设计意义的 `0`）、视觉组件 prop 数字、脚本生成固定 CSS 或 literal fallback。`calc()` 只能组合 Token 与运行时派生变量。
- DOM 测量或交互状态产生的运行时几何值可以经 CSS custom property 传入；它必须是派生结果，不能成为新的固定设计默认值或公开样式逃生口。
- 缺值先补语义 Token；不得以组件名、业务名或数值命名 Token。结构关键词只允许 `flex`、常规文档流、定位、`auto`、`none` 等无设计量语义值。
- 共享能力不使用业务命名。
- 形状匹配时扩展现有组件，不创建平行组件。
- Props 使用有限 Contract，不提供自由样式/Token 换绑入口。
- 手势仲裁集中在 `_shared` 和对应 complex component。
- Workbench 不复用 Prototype Design System 组件。
- `data-pb-*`、HTML/ARIA、键盘和焦点语义保持一致。
- Component Contract 声明并校验 fixed/contextual/decorative semantic role policy；组件注册提供的 token bindings 保留真实 provenance。
- Inspector `getTokenBindings` 的槽位集合必须与对应 JSON Contract 完全一致；实现新增 Token 依赖必须同步 Bind 池（需要时）、Contract、Inspector、组件文档和测试。
- DS 组件默认 `ds.*` 只服务 Playground/测试；业务原型通过 `inspectId` 提供 Fragment identity。

## 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test -- flex-layout-policy component-inspector-contract
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
```

涉及手势、Overlay、导航或 Playground 时补跑对应 Playwright spec。
