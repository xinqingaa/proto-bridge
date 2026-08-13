---
name: pbwork-prototype-authoring
description: >-
  Build or modify PBWork business prototypes, screens, variants, panels,
  shells, navigation, fixtures, authored Evidence boundaries, actions,
  scenarios, or checkpoints in apps/pbwork from an approved design baseline.
  Use after PBWork prototype design is approved, or for implementation-only
  maintenance that does not change product structure or visual language. Do
  not use for visual exploration, product-direction decisions, Token/component
  maintenance, or Workbench UI.
---

# PBWork 原型 Authoring

用于业务 Prototype 和 Runtime Screen。修改共享 Token/组件时切换到 `pbwork-design-system`；修改 Workbench/Capture GUI 时使用 `pbwork-workbench`。

## 设计前置

先判断本次请求是否改变产品定义、根导航、核心流程、业务对象/状态或整体视觉语言。

- 新原型或结构性改动：必须读取 `src/prototypes/{prototypeId}/docs/design.md`，且文档 frontmatter 必须为 `status: approved`。缺失或未批准时切换到 `pbwork-prototype-design`。
- 局部视觉与交互改进：若改变页面焦点、构图、视觉语法或关键行为，先由 `pbwork-prototype-design` 形成获批设计增量；纯实现精修可直接实施。
- 安全区、明确功能缺陷、文案、Token、Evidence、Runtime 或路由修复：直接处理；不要机械要求重写完整产品 brief。

`docs/design.md` 是正式产品与体验的唯一设计基线。对话中的新决定若改变结构或视觉方向，先回写并批准该文档。实现中若发现设计无法成立、出现假交互、重复导航或需要扩大范围，停止并回到 `pbwork-prototype-design`。

## 必读

1. `docs/reference/prototype-authoring.md`
2. `docs/reference/semantic-authoring.md`
3. `apps/pbwork/docs/README.md`
4. `apps/pbwork/docs/principles.md`
5. `apps/pbwork/docs/components/composition.md`
6. `apps/pbwork/docs/prototypes/design-workflow.md`
7. `apps/pbwork/docs/prototypes/overview.md`
8. 按任务阅读 shell/navigation、Screen/Variant、recipes、组件和手势文档
9. 完成前使用 `apps/pbwork/docs/checklist.md`

## 硬约束

- 形状匹配时必须使用 PBWork Design System 组件。
- 业务原型只使用 Flex 或常规文档流；禁止 `grid` / `inline-grid`、全部 `grid-*` 和 `place-*`。
- 业务局部 UI 的所有可见或可测量设计值都使用现有 Token；style、template、script/TS 生成样式、视觉组件 props 中不得出现固定 CSS 值、裸数值、literal fallback 或带裸数值的 `calc()`。
- DOM 测量或交互状态产生的运行时几何值只能作为派生 custom property 使用；不得暴露固定尺寸/距离/动效等自由样式入口。缺 Token 时切换到 `pbwork-design-system` 补 Foundation。
- 不复制组件、导航、滚动或手势实现。
- `BottomNavigation + TabViewport`、`ScrollableDataList + DataList` 等组合遵循手册。
- Screen/Variant/Action/Scenario 只在 `prototypes/registry.ts` 注册。
- strict Screen 的 default Variant 声明非空 `requiredFragments`；其它 Variant 的覆盖风险保持可见。
- Fragment 使用稳定 `screenId + pbId + optional pbKey`。
- DS 业务实例传业务稳定 `inspectId`，required Fragment 不依赖 `ds.*`。
- 业务局部证据节点显式提供 `data-pb-id`、`data-pb-role`、按需 `data-pb-key` 和实现所需 `data-pb-token-*`；CSS Token 不代替 binding Fact。
- 修改前列出独立实现/验收节点；不确定是否遗漏时给 warning，已确定属于交付范围而缺标记时必须补齐。
- 关键交互声明 Action、Scenario 和 Checkpoint。
- Runtime 能确定性 prepare、readiness、snapshot 和 reset。
- 不为新工作扩大 Evidence exception allowlist。

## 改动落点

| 改动 | 路径 | 同步 |
| --- | --- | --- |
| 获批设计 | `src/prototypes/{prototypeId}/docs/design.md` | 只消费；方向改变时切换 Prototype Design Skill |
| 个案实现说明 | `src/prototypes/{prototypeId}/docs/implementation.md`（可选） | 只记录代码组织和个案决定，不复制通用规范 |
| Screen/Panel/Shell | `src/prototypes/{prototypeId}` | Registry、设计基线、tests |
| Variant/Fixture | Registry、mock/fixture | required boundary、Runtime tests |
| Action/Scenario | Registry、目标节点 | Checkpoint、browser tests |
| 稳定通用能力 | 先切换 Design System Skill | Contract、Registry、docs、tests |

## 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test -- flex-layout-policy
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
```
