---
name: pbwork-prototype-authoring
description: >-
  Build or modify PBWork business prototypes, screens, variants, panels,
  shells, navigation, fixtures, authored Evidence boundaries, actions,
  scenarios, or checkpoints in apps/pbwork. New prototypes and structural
  product changes require an approved product design first; use product-design
  when the direction is missing, vague, or internally inconsistent.
---

# PBWork 原型 Skill

用于业务 Prototype 和 Runtime Screen。修改共享 Token/组件时切换到 `pbwork-design-system`；修改 Workbench/Capture GUI 时使用 `pbwork-workbench`。

## 产品设计前置

先判断本次请求是否改变产品定义、根导航、核心流程、业务对象/状态或整体视觉语言。

- 新原型或结构性改动：先使用 `product-design`。设计未获用户批准时停止实现；不要用页面数、功能清单或组件清单代替设计。
- 局部视觉与交互改进：读取现有产品方向，说明本次设计增量后可以实施；只有出现会改变整体方向的未决问题时才暂停。
- 安全区、明确功能缺陷、文案、Token、Evidence、Runtime 或路由修复：直接处理；不要机械要求重写完整产品 brief。

产品设计可以记录在 `requirements.md`，也可以是用户已批准的对话方案；不要求固定标题或字段。实现中若发现设计无法成立、出现假交互、重复导航或需要扩大产品范围，停止实现并回到 `product-design`，不要静默替用户改方向。

## 必读

1. `docs/reference/prototype-authoring.md`
2. `docs/reference/semantic-authoring.md`
3. `apps/pbwork/docs/README.md`
4. `apps/pbwork/docs/principles.md`
5. `apps/pbwork/docs/components/composition.md`
6. `apps/pbwork/docs/prototypes/overview.md`
7. 按任务阅读 shell/navigation、Screen/Variant、recipes、组件和手势文档
8. 完成前使用 `apps/pbwork/docs/checklist.md`

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
| 产品设计或设计增量 | `src/prototypes/{prototypeId}/requirements.md`（适用时） | 由 `product-design` 形成；本文按已批准方向映射为 PBWork 实现 |
| Screen/Panel/Shell | `src/prototypes/{prototypeId}` | Registry、业务需求/说明、tests |
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
