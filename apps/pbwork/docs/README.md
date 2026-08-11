# PBWork 原型生产者手册

本目录是 PBWork Token、Theme、组件、手势、页面组装和开发约束的唯一文档源。仓库根 `docs/pbwork` 软链接到本目录。

PBWork 原型既要表达产品设计，也要作为 ProtoBridge Runtime 提供可验证 Evidence。页面必须同时满足 Design System 规范和 [原型 Authoring Contract](../../../docs/reference/prototype-authoring.md)。

产品、设计和开发人员都通过 Cursor、Codex 等 Coding Agent 修改这里描述的代码资产。Workbench 用于浏览、检查、采集和 Review，不提供另一套可视化或聊天式作者规范。节点标记与门禁统一遵守[语义标记与证据门禁](../../../docs/reference/semantic-authoring.md)。

## 阅读路线

1. [开发规范](./development.md)
2. [原则与边界](./principles.md)
3. [语义标记与证据门禁](../../../docs/reference/semantic-authoring.md)
4. [Token 规范](./tokens/overview.md)和 [Theme](./tokens/themes.md)
5. [组件总论](./components/overview.md)和 [组件组合](./components/composition.md)
6. 按任务阅读具体组件文档
7. 涉及滑动、刷新或横滚时阅读 [手势仲裁](./components/shared-gestures.md)
8. 新建或修改业务原型时阅读：
   - [原型系统](./prototypes/overview.md)
   - [壳与导航](./prototypes/shell-and-nav.md)
   - [Screen 与 Variant](./prototypes/screens-and-variants.md)
   - [页面配方](./prototypes/recipes.md)
9. 提交前执行 [交付检查单](./checklist.md)

## 设计基础

```text
Token / Theme
  → basic components
  → complex components
  → shared composition and gestures
  → Screen / Panel
  → Prototype shell + Runtime Contract
```

任何层只能消费下层公开 Contract，不复制实现、不读取私有状态、不绕开 Design System 创建平行基础。

## 代码地图

```text
apps/pbwork/src/
├── design-system/
│   ├── tokens/tokens.json
│   ├── bindTokens.ts
│   ├── themes/
│   ├── components/
│   │   ├── contracts/
│   │   ├── basic/
│   │   ├── complex/
│   │   ├── _shared/
│   │   ├── registry.ts
│   │   └── scenarios.ts
│   └── schemas/
├── prototypes/
│   ├── registry.ts
│   ├── evidence-policy.ts
│   └── {prototypeId}/
├── runtime/
├── workbench/
└── capture/
```

## 修改同步

| 改动 | 同一任务中必须同步 |
| --- | --- |
| Token | `tokens.json`、按需 `bindTokens.ts`、Theme、Token 文档和测试 |
| Component | 按[分级同步义务](./components/alignment-protocol.md#分级同步义务)更新：纯实现修只改 Vue / 必要测试；语义、布局、视觉层级、状态或 Playground 能力变化才同步 Contract、Registry、场景、文档；Flutter 映射属 P1.5 |
| Shared gesture | `_shared`/组件实现、手势文档、相关组件页和浏览器测试 |
| Prototype Screen | Registry、页面、Authoring Contract 检查和 Runtime 测试 |
| Semantic marker | Authoring Contract、语义门禁、Registry/Runtime lint、Skill、检查单和测试 |
| Workbench UI | `src/workbench/ui`、PBWork 架构/Skill、交互测试 |

Contract 与实现冲突时不能选择一边静默继续；应修正不一致并让校验通过。

## Agent 入口

- 业务原型：`skills/pbwork-prototype-authoring/SKILL.md`
- Token、Theme 和组件：`skills/pbwork-design-system/SKILL.md`
- Workbench 与 Capture UI：`skills/pbwork-workbench/SKILL.md`
