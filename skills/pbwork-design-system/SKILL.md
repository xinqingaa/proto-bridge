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

同一任务必须检查并同步：

1. `src/design-system/components/contracts/{id}.json`
2. Vue 实现
3. `components/registry.ts`
4. `components/scenarios.ts`（适用时）
5. `apps/pbwork/docs/components/**/{id}.md`
6. Unit/Playwright tests

不能只改 Vue 或只改文档。

## Token/Theme 原子变更

- 修改 `tokens.json`；
- 需要组件绑定时修改 `bindTokens.ts`；
- 按需修改 light/dark Theme；
- 更新 Token 文档与 catalog；
- 验证所有组件绑定仍在允许池中。

Theme 只覆盖值，不改变 Token 语义或组件绑定。

## 硬约束

- 共享能力不使用业务命名。
- 形状匹配时扩展现有组件，不创建平行组件。
- Props 使用有限 Contract，不提供自由样式/Token 换绑入口。
- 手势仲裁集中在 `_shared` 和对应 complex component。
- Workbench 不复用 Prototype Design System 组件。
- `data-pb-*`、HTML/ARIA、键盘和焦点语义保持一致。
- Component Contract 声明并校验 fixed/contextual/decorative semantic role policy；组件注册提供的 token bindings 保留真实 provenance。
- DS 组件默认 `ds.*` 只服务 Playground/测试；业务原型通过 `inspectId` 提供 Fragment identity。

## 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
```

涉及手势、Overlay、导航或 Playground 时补跑对应 Playwright spec。
