# Icon

> 组件 id：`icon` · 分类：`action`
> 实现：[Icon.vue](../../../src/design-system/components/action/Icon.vue)
> 契约：[icon.json](../../../src/design-system/components/contracts/icon.json)

按稳定 PBWork 自绘 SVG id 渲染策展图标；尺寸与颜色只消费语义 Token。

## 职责与边界

- Icon 只绘制图形，不承担点击、提交或导航；可交互入口使用 Icon Button。
- 图标包固定为 PBWork 自绘 SVG，缺少图标时扩展共享策展清单，不在业务页复制 SVG 或换包。
- Contract 为 decorative policy；无可访问标签时使用装饰语义，默认不形成独立 Evidence 节点。

## 行为要点

- `name` 只接受 Contract 策展清单中的稳定 id。
- 尺寸使用受控语义档位，颜色使用 Token-ref，不接受固定数字或固定色。
- 需要表达独立业务含义时由调用方提供可访问标签和真实上下文，不把文件名当作产品语义。

## States

| id | label | kind |
| --- | --- | --- |
| `plus` | plus | `variant` |
| `search` | search | `variant` |
| `settings` | settings | `variant` |
| `home` | home | `variant` |
| `list` | list | `variant` |
| `user` | user | `variant` |
| `inbox` | inbox | `variant` |
| `check` | check | `variant` |
| `chevron-down` | chevron-down | `variant` |
| `chevron-left` | chevron-left | `variant` |
| `chevron-right` | chevron-right | `variant` |
| `alert-triangle` | alert-triangle | `variant` |
| `alert-circle` | alert-circle | `variant` |
| `clock` | clock | `variant` |
| `refresh-cw` | refresh-cw | `variant` |
| `calendar-current` | calendar-current | `variant` |
| `clipboard-check` | clipboard-check | `variant` |
| `shield-check` | shield-check | `variant` |
| `folder-open` | folder-open | `variant` |
| `thermometer` | thermometer | `variant` |
| `snowflake` | snowflake | `variant` |
| `copy` | copy | `variant` |
| `file-text` | file-text | `variant` |
| `sliders-horizontal` | sliders-horizontal | `variant` |
| `dumbbell` | dumbbell | `variant` |
| `eye` | eye | `variant` |
| `eye-off` | eye-off | `variant` |
| `footprints` | footprints | `variant` |
| `person-standing` | person-standing | `variant` |
| `sparkles` | sparkles | `variant` |
| `x` | x | `variant` |

## 用法与反例

- Playground 使用 gallery 对照策展图标；业务页面只选择实际需要的稳定 id。
- 不给 Icon 添加 `@click` 来绕过 Icon Button 的焦点、命名和状态契约。
- Props、Slots、Events、默认值与 Token 槽以 [Icon Contract](../../../src/design-system/components/contracts/icon.json) 为准。

预览中的图标可选择 SVG 或透明 PNG 下载，PNG 倍率以当前主题 `size.icon` 为基准；运行时 Icon 保持纯图形职责。SVG artwork 的视框、路径与笔画定义为统一资产，不从页面随意注入。

`calendar-current` 用日历与中心定位靶心表达回到当前日期所在周期；不要用刷新图标表示日期导航。
