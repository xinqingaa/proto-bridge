# 语义标记与证据门禁

本规范是 PBWork Runtime 与 ProtoBridge 之间关于节点身份、语义角色、组件来源和 Token 证据的唯一权威。它适用于由开发、设计和产品人员通过 Cursor、Codex 等 Coding Agent 维护的所有新原型。

本文定义当前执行中的 Contract。Block 必须由 Schema、Registry validation、authoring lint、Runtime/Core validation 或 CI 的确定性检查执行；Warning 必须进入 Inspector、Preflight 或 CI 报告。没有对应执行点的提案不得写成现行强制规则。

## 1. 先判断节点是否需要独立证据

满足任一条件的节点是 **evidence-bearing node（证据节点）**：

- 出现在 Variant 或 Checkpoint 的 `requiredFragments` 中；
- 是 Action target、Scenario assertion 或独立验收目标；
- Agent 在目标工程中需要把它识别为独立结构、组件、文案、状态或视觉样式；
- 同一父区域内存在不同字体、颜色、背景、圆角、间距或状态语义，需要分别实现；
- 是重复业务实体模板，需要通过 `pbKey` 区分实例。

纯装饰节点、无独立实现意义的内部包裹层和完全由父证据节点覆盖的普通 DOM 可以不标记。未标记节点不会形成独立 Fragment、role 或 Token Fact，作者不得假设 Agent 能从 CSS 或截图稳定恢复它。

## 2. 两种合规来源

### 2.1 PBWork Design System 组件

业务原型使用注册组件时必须传业务稳定的 `inspectId`。组件负责提供：

- 根节点 `data-pb-role`；
- `data-pb-component` / `componentId`；
- Contract 或运行时注册的 `tokenBindings`；
- 受控 props、state、HTML/ARIA 与交互语义。

因此 DS 组件实例不需要重复手写 `data-pb-token-*`，但不能依赖默认 `ds.*` 作为业务 Fragment identity。Playground、组件单测和不进入业务 Evidence 的孤立预览可以使用 `ds.*`。

### 2.2 业务局部或自定义节点

业务局部节点一旦属于证据节点，必须在拥有真实语义的同一个实际元素上显式提供：

```html
<span
  data-pb-id="orders.task-list.row.reward-hint"
  data-pb-key="task-a17"
  data-pb-role="text"
  data-pb-token-typography="typography.caption"
>
  还差 2 次
</span>
```

要求：

- `data-pb-id` 与 `data-pb-role` 必须成对出现；
- 有重复实例时，每个实例必须提供稳定、唯一且非敏感的 `data-pb-key`；
- 每个需要 Agent 复现的 Token 槽必须使用 `data-pb-token-{slot}` 显式声明；
- CSS 中使用 `var(--pb-*)` 只证明页面消费了 Token，不会自动形成 Token binding Fact；
- 不能只写 class/CSS 后假设 Capture 能推导 typography、color、background、radius 或 spacing；
- 不能为采集额外增加没有产品语义的包裹层。

若同一业务行内标题、副标题、辅助文案使用不同字阶或颜色，它们是不同证据节点；只标记整行只能采集聚合文本与整行几何，不能证明每段文字的 Token 和独立身份。

## 3. Identity 四分法

| 字段 | 唯一职责 | 规则 |
| --- | --- | --- |
| `screenId` | Fragment 所属 Screen | 固定为 `{prototypeId}.{screenSlug}` |
| `pbId` / `data-pb-id` | Screen 内的业务语义槽位模板 | 新业务节点使用 `{screenId}.{slotPath}` |
| `pbKey` / `data-pb-key` | 重复模板的业务稳定实例 | 不使用 index、文案、随机值、时间或敏感数据 |
| `componentId` / `data-pb-component` | PBWork DS 组件类型 | 由组件注册提供，不代替 `pbId` |

`role` 描述当前节点在产品中的语义或交互职责，不描述 Vue/Flutter/Swift 类型。`componentId=card` 的实例可以按 Contract 允许的上下文承担 `card`、`section` 或 `summary`；固定行为组件如 Button 只能承担 `button`。

## 4. Role 规则

- 机器闭集只由 Core `SEMANTIC_ROLES` 定义；文档不维护第二套枚举。
- role 必须表达节点真实产品职责，并与 HTML/ARIA 语义同时成立。
- DS Component Contract 应声明 `fixed`、`contextual` 或 `decorative` role policy、默认 role 和允许的 role。
- `unknown` 只用于无法升级的兼容或低质量输入；新 strict Screen 的 required Fragment、Action target 和 Scenario assertion 禁止使用 `unknown`。
- 装饰性 Divider 等节点默认不应成为证据节点；若业务确实需要独立验收，应选择真实 role 和 Token binding。

## 5. Token binding 规则

常用槽名优先使用：

- `typography`
- `color`
- `background`
- `border`
- `radius`
- `spacing`
- `size`
- `elevation`
- `motion`

所有 binding value 必须是固定 Catalog 中存在的 Token ID，或 Contract 明确允许的特殊值。Capture 必须保留 binding 的真实来源：

- `component-contract`
- `runtime-registration`
- `data-pb`

自定义 `data-pb-token-*` 不得标成 Registry 来源。Theme 只改变 Token 值，不改变 binding。

## 6. Completeness

`requiredFragments` 是作者声明的最小完整性边界，不是“页面上所有标记节点”的列表。每个 required Fragment 必须：

- 属于当前 Checkpoint/Variant 的实际 Screen；
- identity 合法且精确匹配一次；
- role 合法且不是 `unknown`；
- 实际可见；
- bbox 宽高均大于零；
- 在 readiness 后保持稳定；
- 未被错误 Overlay 遮挡到无法验收；
- 所需组件、props 和 Token Facts 能由 DS registration 或显式 `data-pb-token-*` 证明。

任一条件不满足时不得声明 semantic completeness。

## 7. 门禁等级

### Block：必须阻断 Preflight、Capture、Handoff 或 CI

- required Fragment 缺失、重复、不可见、零 bbox、非法 role 或使用 `unknown`；
- `data-pb-id` / `data-pb-role` 只出现一个；
- 重复 `pbId` 缺少唯一稳定 `pbKey`；
- strict 业务 required Fragment 使用 `ds.*`；
- Action/Scenario/Checkpoint 引用不能精确解析；
- 证据节点声明了未知 Token、非法 slot 或与组件 Contract 冲突的 binding；
- 已声明为独立实现/验收目标的业务局部节点缺少显式 Token binding；
- strict Screen 的 default Variant 没有非空 authored boundary；
- Handoff 不能固定所需 Evidence/Catalog revision。

### Warning：必须展示并逐项处理，不得静默忽略

- 源码中疑似实现关键的文字、色面或状态节点只使用 CSS Token，没有语义标记；
- 非 required 的语义节点缺少 Agent 实现所需 Token 槽；
- 自定义局部 UI 与现有 DS 组件形状或职责高度相似；
- 未纳入本次显式 Selection 的 Variant/Scenario 可能未被采集；
- Overlay 遮挡检查无法确定；
- Catalog 或 Source adapter 只能提供部分 provenance。

Warning 可以被明确接受以继续一次 Producer 操作，但接受不会修改 Evidence，也不能把未知事实提升为已证明。

### Info：作者提示

- 装饰节点未标记；
- 非关键内容由父 Fragment 聚合采集；
- 可选 Token 槽或非交付 Variant 未声明。

## 8. Agent 执行纪律

修改原型的 Agent 必须先阅读本规范，再执行：

1. 根据需求列出 Screen、Variant、Scenario 和独立实现/验收节点；
2. 优先映射到现有 DS Component；
3. 为 DS 实例传业务 `inspectId`；
4. 为业务局部证据节点补齐 id、role、key 和 Token bindings；
5. 将最小必要集合写入 `requiredFragments`；
6. 运行静态 authoring lint、Registry validation 和真实 Runtime Capture；
7. 对每个 warning 给出修复或保留理由。

检查单见 [PBWork 交付检查单](../../apps/pbwork/docs/checklist.md)。
