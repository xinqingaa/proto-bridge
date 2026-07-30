# PBWork 原型生产者手册

> 权威路径：`apps/pbwork/docs/`（仓库根 `docs/pbwork` 为其软链接）  
> 用途：接到「在 pbwork 做/改原型」指令时，按本文使用设计令牌与组件，而不是临时发明 UI 与手势。  
> 范围：只沉淀**已稳定的通用规则**；业务原型视觉与布局可继续迭代，确认可复用后再写入手册。

## 和其它文档的分工

| 文档 | 负责 |
| --- | --- |
| 本手册（`apps/pbwork/docs`） | Token、组件用法、边界、组合、原型组装 |
| [`docs/design.md`](../../../docs/design.md) | 工作台产品设计（Playground、画布、Bridge、注册表 schema） |
| [`docs/conventions.md`](../../../docs/conventions.md) | ProtoBridge Source 识别约定（section / shell） |
| 各原型 `requirements.md` / `implementation-notes.md` | 业务需求与个案笔记 |

平台怎么建 → `design.md`。页面怎么用 DS → **本手册**。

## 必读顺序

1. [principles.md](./principles.md) — 分层与红线  
2. [tokens/overview.md](./tokens/overview.md) + 需要时 [tokens/catalog.md](./tokens/catalog.md)  
3. [components/overview.md](./components/overview.md) + [components/composition.md](./components/composition.md)  
4. 涉及的具体组件页：`components/basic/*`、`components/complex/*`  
5. 涉及横滑 / 下拉刷新 / 嵌套横滚 → [components/shared-gestures.md](./components/shared-gestures.md)  
6. 新建或改业务原型 → [prototypes/overview.md](./prototypes/overview.md)、[shell-and-nav.md](./prototypes/shell-and-nav.md)、[screens-and-variants.md](./prototypes/screens-and-variants.md)、[recipes.md](./prototypes/recipes.md)  
7. 提交前 → [checklist.md](./checklist.md)

Agent 入口：

- 业务原型与原型设计系统：`skills/pbwork-prototype/skill.md`
- PBWork 管理工作壳、采集与 Evidence Review：`skills/pbwork-workbench/SKILL.md`

## 代码地图

```text
apps/pbwork/src/design-system/
├── tokens/tokens.json          # 全量 Token
├── bindTokens.ts               # 组件可绑定 ID 池
├── themes/{light,dark}.json
├── components/
│   ├── registry.ts             # Playground 控件与元数据
│   ├── contracts/*.json        # 组件契约（权威 props / bindings）
│   ├── basic/ · complex/
│   └── _shared/                # 手势等共享实现
└── schemas/                    # Token / Theme / Component JSON Schema

apps/pbwork/src/prototypes/
├── registry.ts                 # 原型与 Screen / Variant 注册
└── {prototypeId}/              # Shell、nav、screens、panels、mock
```

## 变更同步

| 改什么 | 必同步 |
| --- | --- |
| Token 增删改 | `tokens.json`、（若可绑定）`bindTokens.ts`、Theme、本手册 `tokens/` |
| 组件 props / 行为 | `contracts/*.json`、Vue 实现、`registry.ts`、对应 `components/**` 文档 |
| 手势仲裁 | `_shared/*`、`shared-gestures.md`、相关 complex 页、测试 |
| 原型注册 / 路由 | `prototypes/registry.ts`、本手册 `prototypes/` |

契约与实现冲突时，以 **contract + 校验通过的实现** 为准，并立刻改文档。
