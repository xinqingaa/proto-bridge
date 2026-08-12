# Token 规范

## 权威链

```text
Token.defaultValue + Theme.overrides
  → CSS 变量 --pb-*
  → 组件与原型只读 var(--pb-*)
```

- 权威数据：`apps/pbwork/src/design-system/tokens/tokens.json`
- 主题覆盖：`themes/light.json`、`themes/dark.json`
- 组件契约里的 `tokenBindings`：语义槽 → Token ID（只从 Bind 池选取）

**禁止**：在页面或组件实例上改绑 Token；用内联色值覆盖语义色；在 DS 或原型的 style、template、script/TS helper、生成样式或视觉组件 props 中书写任何固定设计值（含设计意义的 `0`），或通过 `var(--pb-*, literal)` 加入 literal fallback。

## 样式值消费

- 所有可见或可测量的设计量都必须来自 Token：颜色、间距、尺寸、比例尺寸、圆角、边框、排版数值、阴影、透明度、层级、动效、滤镜与变换距离。
- CSS 只允许通过 `var(--pb-*)` 消费这些值；`calc()` 只能组合 Token 变量，不得加入裸数值。
- DOM 测量、索引或指针状态产生的几何值是唯一运行时派生例外：通过 custom property 传入，不进入 Token Catalog，也不得作为组件的固定默认值或自由样式 prop。
- Grid 不属于 PBWork DS / 现役原型的布局能力：使用 Flex 或常规文档流。完整的作用域和结构语法白名单见 [开发规范](../development.md#样式实现铁律)。
- 若现有 Foundation 无法表达一个值，先按本页的新增流程创建语义 Token；不以组件名称或数字命名临时变量。

## 命名

- 语义 ID：`color.primary`、`typography.label`、`spacing.md`
- 禁止业务名：`color.ledger-expense`、`spacing.coupon-gap` 等

## Bind 池 vs 扩展 Token

| 集合       | 文件                  | 用途                                       |
| ---------- | --------------------- | ------------------------------------------ |
| 全量 Token | `tokens.json`         | Foundations 浏览；主题可覆盖               |
| Bind 池    | `bindTokens.ts`       | 通用组件 `tokenBindings` **允许**引用的 ID |
| 绑定字面量 | `transparent`、`none` | 可出现在 bindings；不是 Token，不进入 Target token mapping/obligation |

契约校验会拒绝 Bind 池外的绑定（绑定字面量除外）。扩展 Token 可先只进 Foundations；确认多组件需要后再加入 Bind 池。字面量闭集由 Core 提供，PBWork 不复制第二套枚举。

当前 Bind 池主要覆盖：表面与文本色、品牌/反馈色、常用字阶、常用间距/尺寸/圆角、`border.hairline`、常用 elevation、motion 时长与标准缓动。组件若实际消费任何 Foundation Token，必须在 Contract 与 Inspector 中列出；完整对照见 [catalog.md](./catalog.md)。

## tokenBindings 怎么用

1. Contract 声明槽位（如 `background`、`typography`）→ Bind 池内 ID。
2. 运行时按 Theme 解析为 CSS 变量。
3. 少数控件另提供 **Token-ref props**（如 Button 的 `bgColor`）在实例上覆盖色槽；值仍必须来自 Bind 池或 `transparent`，禁止硬编码色值。
4. Playground「令牌」页只读展示绑定；换肤改 Theme，不在此改绑。

## 业务局部节点的 Evidence

业务页面仍通过 CSS `var(--pb-*)` 应用实际样式，但需要 Agent 独立实现或验收的自定义节点还必须使用 `data-pb-token-{slot}` 声明 binding。CSS 使用和 Evidence binding 缺一不可。

DS 组件由 Contract/运行时 registration 提供 bindings，不在每个业务实例重复手写。自定义 binding 的 Token ID 必须存在于固定 Catalog，Capture provenance 必须标为 `data-pb`。完整规则见[语义标记与证据门禁](../../../../docs/reference/semantic-authoring.md)。

## 换肤

- 改 Theme `overrides` 中的值。
- 不改组件 bindings，不在 Playground 编辑 Token。
- 原型内主题会话与 history 规则见 [themes.md](./themes.md)。

## 新增 Token 流程

1. 确认语义，写入 `tokens.json`（符合 `schemas/token.schema.json`）。
2. 若需进组件契约 → 加入 `bindTokens.ts`。
3. 按需在 light/dark `overrides` 给深色值。
4. 更新 [catalog.md](./catalog.md)（或重新生成对照表）。
5. 跑 pbwork 校验 / 相关测试。

## 语义要点（易混）

- **`color.primary`**：克制强调（选中、焦点、链接、进度），不是实心主按钮默认底。
- **`color.action`**：实心主按钮中性主操作色。
- **`*-soft`**：混合实色软底（非 alpha），用于 tonal / Chip。
- **`on-*`**：落在对应底色上的前景。
- **sizing.touch**：触控目标下限相关尺寸，优先保证可点区域。
