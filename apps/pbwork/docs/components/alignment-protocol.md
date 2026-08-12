# 跨栈对齐协议（Producer Contract）

本文定义 PBWork Design System 与后续 Target（如 Flutter 样板）之间的**语义对齐边界**。  
对齐重点是行为、描述、语义（role、Token 槽、状态矩阵）；**不要求** Vue props 与 Dart API 一一镜像。

## 三层职责

| 层                       | 权威位置                                           | 谁读                              | 不做什么                               |
| ------------------------ | -------------------------------------------------- | --------------------------------- | -------------------------------------- |
| **1. Producer Contract** | `src/design-system/components/contracts/{id}.json` | Playground、校验、跨栈对照        | 不当作 Dart 构造参数表                 |
| **2. Producer 文档**     | `apps/pbwork/docs/components/**`                   | 人：职责 / 边界 / 组合铁律 / 反例 | 不替代 Contract；不抄全 props/token 表 |
| **3. Target 映射**       | `apps/flutter_pb_app/docs/proto-bridge.md`（P1.5） | Agent / resolver                  | 不反写进 Core；不要求 API 同构         |

冲突裁决：

1. Contract ↔ Vue → 校验失败，禁止静默选一边。
2. 文档 ↔ Contract → **以 Contract 为准**，改文档。
3. Target 映射 ↔ 本地代码 → 既有 `stale` / `conflict` 规则。

## Contract 语义字段

跨栈对齐可读：

| 字段                       | 用途                                              |
| -------------------------- | ------------------------------------------------- |
| `id` / `semantic`          | 组件身份与 role 策略                              |
| `tokenBindings`            | Token 槽 → Catalog id                             |
| `states` + `states[].kind` | 状态矩阵：`variant` \| `interaction` \| `content` |
| `summary` / `behavior`     | 一句话与交互承诺（可选但样例组件应写）            |
| `layout`                   | 跨端容器、项宽、溢出与视图区归属；不表达 CSS      |
| `visualAnatomy`            | 跨端材质、层级与轮廓；不表达伪元素或样式 API      |
| `playground.presentation`  | **必填**：`interactive` \| `gallery` \| `trigger` |
| `icons`                    | 可选；`pack` 固定 `lucide`                        |

`propsSchema` / `defaultProps` **只服务 Vue 与 Playground**。Target **不得**把 propsSchema 当作公开 API 契约。

### `states[].kind`

| kind          | 含义        | 例                         |
| ------------- | ----------- | -------------------------- |
| `variant`     | 外观枚举    | tonal、outlined、underline |
| `interaction` | 交互态      | loading、disabled          |
| `content`     | 内容/开闭态 | empty、open、closed        |

未标 kind 时 Playground 暂按 `variant` 处理；**新增或改动的 state 必须标 kind**。

### `playground.presentation`

| 值                        | Playground                                                                               | 适用                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| **`interactive`（默认）** | 主互动预览 + Contract state 真实实例；有限类型可直接并置，**无场景下拉与常驻右侧调整栏** | 绝大多数组件                           |
| **`gallery`**             | 平铺 default + states；无场景下拉；只留主题切换                                          | **仅 `icon`、`icon-button`**           |
| **`trigger`**             | 触发按钮打开后挂载                                                                       | confirm / sheet / toast / flow-sheet / loading |

禁止把 `gallery` 扩大到列表、Tabs、表单、AppBar 等大块组件。

`components/scenarios.ts` 可继续提供示例数据和测试夹具，但不等于 Playground 必须暴露场景导航。Playground 不显示“使用场景”选择器（包括 Filter Bar）；内容文案不同但组件语义相同的案例只作为主预览样例。Contract state 必须直接展示为真实组件实例；仅 Contract 未表达的有限类型可使用样例并置。Icon / Icon Button 使用 gallery，Tabbar / 一级 Tab / 二级 Tab 使用各自的专门布局对照；Toast 等反馈类型使用含义明确的多个触发按钮。不得以通用外层卡片强制并置组件变体。

### Token-ref props（色槽）

部分基础控件（如 `button`、`checkbox`、`radio-group`、`switch`）允许通过 props 传入 **Bind 池 Token ID**（或 `transparent`）覆盖默认色槽。  
约束：

- **禁止**实例硬编码色值（`#hex` / `rgb()` 等）。
- 组件样式的颜色也只能使用 `--pb-*` 语义变量：不得写十六进制、`rgb` / `rgba`、`color-mix` 或渐变；主题与 token 文件是唯一可定义颜色值的地方。
- DS 组件的 style/template/script/TS helper、生成样式与 vendor 视觉 props 不得写固定设计量（含设计意义的 `0`），也不得使用 `var(--pb-*, literal)` fallback：尺寸、间距、圆角、边框、排版、阴影、透明度、层级、动效、滤镜与变换距离都必须消费 `--pb-*`。`calc()` 只组合 Token 或运行时派生变量。
- DS 与现役原型不用 CSS Grid：只用 Flex 或常规文档流；完整作用域和结构语法白名单见 [开发规范](../development.md#样式实现铁律)。
- DOM 测量与交互状态的运行时几何值可经 custom property 使用，但不得成为固定默认设计值、自由样式入口或 Contract 外依赖。
- Contract 的 `tokenBindings` / Inspector Token 清单必须覆盖实现实际消费的每个设计 Token，且二者槽位集合完全一致；新增 Foundation 后先补 Contract，再交付组件。
- Playground 的「查看语义与令牌」保持只读；业务差异通过场景呈现，不改绑 Contract。
- 声明 `disabled` 的交互组件统一消费 `opacity.disabled`（当前默认 `0.38`），阻止鼠标、键盘及原生提交；Playground 必须把可用态与禁用态并置并写明条件。
- `loading` 阻止重复触发并保留文字/忙碌反馈，**不得**复用 disabled 的 0.38 外观。

Button 公开语义以色槽与行为（loading 保留文案、disabled 透明度）表达，**不**把公开 API / 文档绑到实现层样式枚举。

## 分级同步义务

| 变更类型                                                                          | 必须同批                                | 明确可不做                         |
| --------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| A. 语义（role / Token 槽 / state 矩阵 / behavior / 布局策略 / 视觉层级 / 拆组件） | Contract + Vue + 必要的 registry + 测试 | Flutter（P1.5）                    |
| B. 用法铁律 / 反例 / 组合边界                                                     | 文档短叙事                              | 不抄 props 表                      |
| C. Playground 展示                                                                | Contract `presentation` + Playground    | —                                  |
| D. 纯实现修（同语义）                                                             | Vue（+ 必要时单测）                     | 文档 / Contract 无字段变更时可不动 |
| E. Target 落点 / Demo / 图标包换栈                                                | —                                       | **P1.5 批量**                      |

文档骨架（触达组件按此写）：职责与边界 → 行为要点 → States 一览（id / label / kind）→ 用法与反例 → 「Props 与 Token 槽以 Contract 为准」。

## 大类型纪律

禁止「一个组件 + 大 type 兼多种语义角色」。嫌疑先审计，再拆；拆后各有独立 `componentId`。  
详见 [audit-large-types.md](./audit-large-types.md)。

## 图标

DS **唯一**图标包为 **Lucide**（稳定 icon id）。基础组件 `icon` 承载策展清单；Playground 仅对 `icon`、`icon-button` 使用 `gallery` 平铺。Flutter 换 `lucide_icons`（或同类）属 P1.5。

## 非目标

- 不要求 Vue propsSchema ↔ Dart API 同名同构
- 不做 tokens.json → Dart codegen（可列后续）
- 不把产品 `Common*` 表硬编码进 Core
