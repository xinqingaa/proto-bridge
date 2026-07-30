# PBWork 原型 Evidence 约定

> 状态：当前强制规范
> 用途：保证新 PBWork 原型能够被 ProtoBridge 确定性采集并证明完整性

## 1. 稳定身份

- Prototype：`prototypeId`
- Screen：`{prototypeId}.{screenSlug}`
- Variant：Screen 内稳定 slug
- Fragment：`screenId + data-pb-id + optional data-pb-key`
- Action、Scenario、Checkpoint：owner Screen 内稳定 slug

禁止使用 DOM path、CSS selector、数组 index、随机值或当前排序位置作为持久身份。

## 2. Runtime 标记

| 属性 | 用途 |
| --- | --- |
| `data-pb-id` | 页面关键节点或重复节点的稳定模板身份 |
| `data-pb-key` | 同一 `data-pb-id` 下重复实例的稳定业务键 |
| `data-pb-role` | `page`、`section`、`list`、`list-item`、`filter`、`search`、`form`、`field`、`sheet` 等语义角色 |
| `data-pb-shell` | `sheet`、`dialog`、`modal`、`drawer` |
| `data-pb-component` | 设计系统组件类型 |
| `data-pb-action` | 由 authored Action 指向的可执行目标 |

每个进入 `requiredFragments` 的节点必须具有合法 role、可见状态和非零 bbox。

## 3. Screen 与 Variant

每个 Screen 在 `apps/pbwork/src/prototypes/registry.ts` 中注册：

- 稳定 `screenId`、`screenSlug`、`path` 和真实 `view`；
- 可通过 URL 确定性打开的 default Variant；
- loading、empty、error、Overlay、校验等关键状态按需注册；
- theme 与业务 Variant 分离。

新 Screen 默认执行严格 Evidence 门禁：

- default Variant 必须声明非空 `requiredFragments`；
- 每个 `critical: true` Variant 必须声明自己的 `requiredFragments`；
- required Fragment 必须属于当前 Screen；
- 新 Screen 禁止加入 `LEGACY_EVIDENCE_SCREEN_IDS`。

legacy allowlist 只隔离已有迁移债务，不代表页面满足完整性标准。

## 4. Action 与 Scenario

关键交互不能依赖无边界自动点击：

- Action 声明稳定 ID、kind 和稳定 Fragment target；
- Scenario 声明初始 Variant 和有序 Action IDs；
- Checkpoint 声明实际 Screen/Variant 和非空 `requiredFragments`；
- Runtime 必须能够 execute、verify 和 reset；
- 任何维度不匹配必须明确失败。

## 5. 完整性与证据

`requiredFragments` 是 authored semantic completeness boundary：

- 全部 resolved 才能声明 `semanticStatus=declared`；
- 缺失节点、重复 identity、非法 role 或不可见节点必须失败或形成 required unknown；
- 未声明边界的 legacy 页面只能报告实际观测结果，不能宣称完整；
- Screenshot 与语义 Facts 必须来自同一固定 Case；
- provenance、unknown、conflict 和 Issue 不得被启发式覆盖。

## 6. 验证

```bash
pnpm --filter @proto-bridge/pbwork test
pnpm --filter @proto-bridge/pbwork typecheck
pnpm test:e2e:runtime
```

当前闭环回归样本：

- `ledger-planet.task-list`
- `ledger-planet.task-detail`
- `ledger-planet.ledger-list`

组件组合、导航和手势规则见 [PBWork 原型手册](../apps/pbwork/docs/README.md)。
