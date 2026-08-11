# 跨栈对齐协议（Producer Contract）

本文定义 PBWork Design System 与后续 Target（如 Flutter 样板）之间的**语义对齐边界**。  
对齐重点是行为、描述、语义（role、Token 槽、状态矩阵）；**不要求** Vue props 与 Dart API 一一镜像。

## 三层职责

| 层 | 权威位置 | 谁读 | 不做什么 |
| --- | --- | --- | --- |
| **1. Producer Contract** | `src/design-system/components/contracts/{id}.json` | Playground、校验、跨栈对照 | 不当作 Dart 构造参数表 |
| **2. Producer 文档** | `apps/pbwork/docs/components/**` | 人：职责 / 边界 / 组合铁律 / 反例 | 不替代 Contract；不抄全 props/token 表 |
| **3. Target 映射** | `apps/flutter_pb_app/docs/proto-bridge.md`（P1.5） | Agent / resolver | 不反写进 Core；不要求 API 同构 |

冲突裁决：

1. Contract ↔ Vue → 校验失败，禁止静默选一边。
2. 文档 ↔ Contract → **以 Contract 为准**，改文档。
3. Target 映射 ↔ 本地代码 → 既有 `stale` / `conflict` 规则。

## Contract 语义字段

跨栈对齐可读：

| 字段 | 用途 |
| --- | --- |
| `id` / `semantic` | 组件身份与 role 策略 |
| `tokenBindings` | Token 槽 → Catalog id |
| `states` + `states[].kind` | 状态矩阵：`variant` \| `interaction` \| `content` |
| `summary` / `behavior` | 一句话与交互承诺（可选但样例组件应写） |
| `playground.presentation` | **必填**：`tile` \| `trigger` |
| `icons` | 可选；`pack` 固定 `lucide` |

`propsSchema` / `defaultProps` **只服务 Vue 与 Playground**。Target **不得**把 propsSchema 当作公开 API 契约。

### `states[].kind`

| kind | 含义 | 例 |
| --- | --- | --- |
| `variant` | 外观枚举 | tonal、outlined、underline |
| `interaction` | 交互态 | loading、disabled |
| `content` | 内容/开闭态 | empty、open、closed |

未标 kind 时 Playground 暂按 `variant` 处理；**新增或改动的 state 必须标 kind**。

### `playground.presentation`

| 值 | Playground | 适用 |
| --- | --- | --- |
| **`single`（默认）** | 单个预览，由场景 + 侧栏驱动 | 绝大多数组件 |
| **`tile`** | 仅平铺 default + states；**无场景下拉、无右侧调整栏**；只留主题切换 | **目前仅 `icon`** |
| **`trigger`** | 触发按钮打开后挂载 | dialog / sheet / snackbar / flow-sheet |

禁止把 `tile` 扩大到列表、Tabs、表单、AppBar 等大块组件。

### Token-ref props（色槽）

部分基础控件（如 `button`、`checkbox`、`radio-group`、`switch`）允许通过 props 传入 **Bind 池 Token ID**（或 `transparent`）覆盖默认色槽。  
约束：

- **禁止**实例硬编码色值（`#hex` / `rgb()` 等）。
- Playground **「令牌」页保持只读**（展示默认 `tokenBindings`）；色槽在「调整组件」里用枚举下拉改 prop，不是改绑 Contract。
- 交互组件 `disabled` 统一消费 `opacity.disabled`（当前默认 `0.38`）。

Button 公开语义以色槽与行为（loading 保留文案、disabled 透明度）表达，**不**把公开 API / 文档绑到实现层样式枚举。

## 分级同步义务

| 变更类型 | 必须同批 | 明确可不做 |
| --- | --- | --- |
| A. 语义（role / Token 槽 / state 矩阵 / behavior / 拆组件） | Contract + Vue + registry + 测试 | Flutter（P1.5） |
| B. 用法铁律 / 反例 / 组合边界 | 文档短叙事 | 不抄 props 表 |
| C. Playground 展示 | Contract `presentation` + Playground | — |
| D. 纯实现修（同语义） | Vue（+ 必要时单测） | 文档 / Contract 无字段变更时可不动 |
| E. Target 落点 / Demo / 图标包换栈 | — | **P1.5 批量** |

文档骨架（触达组件按此写）：职责与边界 → 行为要点 → States 一览（id / label / kind）→ 用法与反例 → 「Props 与 Token 槽以 Contract 为准」。

## 大类型纪律

禁止「一个组件 + 大 type 兼多种语义角色」。嫌疑先审计，再拆；拆后各有独立 `componentId`。  
详见 [audit-large-types.md](./audit-large-types.md)。

## 图标

DS **唯一**图标包为 **Lucide**（稳定 icon id）。基础组件 `icon` 承载策展清单；Playground 仅对 `icon` 使用 `tile` 平铺。Flutter 换 `lucide_icons`（或同类）属 P1.5。

## 非目标

- 不要求 Vue propsSchema ↔ Dart API 同名同构
- 不做 tokens.json → Dart codegen（可列后续）
- 不把产品 `Common*` 表硬编码进 Core
