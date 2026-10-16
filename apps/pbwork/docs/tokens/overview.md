# Token 规范

## 权威链

```text
键目录 + Contract.componentTokens + 主题包
  → CSS 变量 --pb-*
  → 组件与原型只读 var(--pb-*)
```

- 语义键：`src/design-system/theme/key-catalog.json`；组件键由各 Contract 的 `componentTokens` 声明并汇总
- 取值：`theme-packs/*/` 与 `prototypes/*/theme/`；Core 负责继承、表达式、主题/模式、类型与对比度校验
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
| 全量主题键 | key-catalog + Contract.componentTokens | 133 项定义，由 Core 解析取值 |
| Bind 池 | theme/bindings.ts | 自动选择 bindable=true 的 127 项 |
| 不可绑定控制项 | density、motion.personality、surface.treatment 与三个组件材质控制 | 影响包内表达式或共享材质分支 |
| 实现常量 | theme/constants.json | 31 项；CSS 可消费，JS 经 themeConstantNumber/Css 读取；不进入 Catalog/绑定/Target |
| 绑定字面量 | transparent、none | 由 Core 声明；不是 Token，不生成 Target obligation |

组件内 JS 读取主题键使用 useToken/useTokenNumber 的 computed；禁止模块级缓存主题默认值。字阶部件只读且不可绑定。Contract 与 Inspector 只列可绑定的主题键，不把布局比例、层级或手势阈值等常量伪装成主题证据。

## tokenBindings 怎么用

1. Contract 声明槽位（如 `background`、`typography`）→ Bind 池内 ID。
2. 运行时按 Theme 解析为 CSS 变量。
3. 少数控件另提供 **Token-ref props**（如 Checkbox 的 `selectedColor`）在实例上覆盖色槽；值仍必须来自 Bind 池或 `transparent`，禁止硬编码色值。Button 不走色槽，只选择 `kind`（主要 / 次要 / 描边）。
4. Playground「令牌」页只读展示绑定；换肤改 Theme，不在此改绑。

## 业务局部节点的 Evidence

业务页面仍通过 CSS `var(--pb-*)` 应用实际样式，但需要 Agent 独立实现或验收的自定义节点还必须使用 `data-pb-token-{slot}` 声明 binding。CSS 使用和 Evidence binding 缺一不可。

DS 组件由 Contract/运行时 registration 提供 bindings，不在每个业务实例重复手写。自定义 binding 的 Token ID 必须存在于固定 Catalog，Capture provenance 必须标为 `data-pb`。完整规则见[语义标记与证据门禁](../../../../docs/reference/semantic-authoring.md)。

## 换肤

- 改主题包 values/themes/modes/themeModes 中的值，保持组件绑定不变。
- 不改组件 bindings，不在 Playground 编辑 Token。
- 原型内主题会话与 history 规则见 [themes.md](./themes.md)。

## 新增 Token 流程

1. 通用语义键写入 key-catalog.json；仅旧值等价与通用材质需要的组件键写入所属 Contract.componentTokens，不为每个槽复制组件键。
2. 在基础包提供取值或明确的组件默认表达式，声明 valueType、modeVariant 与 bindable；单位只由 valueType 决定。
3. 更新 Contract/Vue/Inspector、目录、等价测试与 Target 漂移状态；新常量写 constants.json，不进入绑定。
4. 按范围运行组件校验与主题检查，运行 docs:verify 和 ds:target-sync:verify。

## 语义要点（易混）

- **`color.primary`**：克制强调（选中、焦点、链接、进度），不是实心主按钮默认底。
- **`color.action`**：实心主按钮中性主操作色。
- **`*-soft`**：混合实色软底（非 alpha），用于 tonal / Chip。
- **`on-*`**：落在对应底色上的前景。
- **size.touch**：触控目标下限相关尺寸，优先保证可点区域。
