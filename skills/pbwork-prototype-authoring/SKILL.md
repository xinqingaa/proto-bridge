---
name: pbwork-prototype
description: >-
  Build or modify PBWork business prototypes, screens, variants, panels,
  shells, navigation, fixtures, authored Evidence boundaries, actions,
  scenarios, or checkpoints in apps/pbwork.
---

# PBWork 原型 Skill

用于业务 Prototype 和 Runtime Screen。修改共享 Token/组件时切换到 `pbwork-design-system`；修改 Workbench/Capture GUI 时使用 `pbwork-workbench`。

## 必读

1. `docs/reference/prototype-authoring.md`
2. `apps/pbwork/docs/README.md`
3. `apps/pbwork/docs/principles.md`
4. `apps/pbwork/docs/components/composition.md`
5. `apps/pbwork/docs/prototypes/overview.md`
6. 按任务阅读 shell/navigation、Screen/Variant、recipes、组件和手势文档
7. 完成前使用 `apps/pbwork/docs/checklist.md`

## 硬约束

- 形状匹配时必须使用 PBWork Design System 组件。
- 业务局部 UI 的设计值全部使用现有 Token。
- 不复制组件、导航、滚动或手势实现。
- `BottomNavigation + TabViewport`、`ScrollableDataList + DataList` 等组合遵循手册。
- Screen/Variant/Action/Scenario 只在 `prototypes/registry.ts` 注册。
- default 与 critical Variant 声明非空 `requiredFragments`。
- Fragment 使用稳定 `screenId + pbId + optional pbKey`。
- 关键交互声明 Action、Scenario 和 Checkpoint。
- Runtime 能确定性 prepare、readiness、snapshot 和 reset。
- 不为新工作扩大 Evidence exception allowlist。

## 改动落点

| 改动 | 路径 | 同步 |
| --- | --- | --- |
| Screen/Panel/Shell | `src/prototypes/{prototypeId}` | Registry、业务需求/说明、tests |
| Variant/Fixture | Registry、mock/fixture | required boundary、Runtime tests |
| Action/Scenario | Registry、目标节点 | Checkpoint、browser tests |
| 稳定通用能力 | 先切换 Design System Skill | Contract、Registry、docs、tests |

## 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
```
