# Token 规范

## 权威链

```text
Token.defaultValue + Theme.overrides
  → CSS 变量 --pb-*
  → 组件只读 var(--pb-*)
```

- 权威数据：`apps/pbwork/src/design-system/tokens/tokens.json`
- 主题覆盖：`themes/light.json`、`themes/dark.json`
- 组件契约里的 `tokenBindings`：语义槽 → Token ID（只从 Bind 池选取）

**禁止**：在页面或组件实例上改绑 Token；用内联色值覆盖语义色。

## 命名

- 语义 ID：`color.primary`、`typography.label`、`spacing.md`
- 禁止业务名：`color.ledger-expense`、`spacing.coupon-gap` 等

## Bind 池 vs 扩展 Token

| 集合 | 文件 | 用途 |
| --- | --- | --- |
| 全量 Token | `tokens.json` | Foundations 浏览；主题可覆盖 |
| Bind 池 | `bindTokens.ts` | 通用组件 `tokenBindings` **允许**引用的 ID |
| 特殊值 | `transparent`、`none` | 可出现在 bindings，无需注册为 Token |

契约校验会拒绝 Bind 池外的绑定（特殊值除外）。扩展 Token 可先只进 Foundations；确认多组件需要后再加入 Bind 池。

当前 Bind 池主要覆盖：表面与文本色、品牌/反馈色、常用字阶、常用间距/尺寸/圆角、`border.hairline`、常用 elevation、motion 时长与标准缓动。完整对照见 [catalog.md](./catalog.md)。

## tokenBindings 怎么用

1. Contract 声明槽位（如 `background`、`typography`）→ Bind 池内 ID。  
2. 运行时按 Theme 解析为 CSS 变量。  
3. 状态切换只走约定映射（`tone`、`variant` 等），不新增临时绑定表。

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
