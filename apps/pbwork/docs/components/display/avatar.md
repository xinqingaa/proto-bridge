# Avatar

> 组件 id：`avatar` · 分类：`display`
> 实现：[Avatar.vue](../../../src/design-system/components/display/Avatar.vue)
> 契约：[avatar.json](../../../src/design-system/components/contracts/avatar.json)

以头像图片或稳定首字母表示人员与主体。

## 职责与边界

- 固定使用 `role=image`，表达一个主体的视觉身份，不承担点击、在线状态或菜单行为。
- 没有图片时从 `name` 生成稳定首字母，不使用随机图片或时间相关占位。
- 尺寸只使用 Contract 的受控语义档位。

## 行为要点

- 图片和首字母 fallback 表达同一主体身份，切换时不改变 Evidence 槽位。
- `sm`、`md`、`lg` 只改变受控尺寸，不改变语义或内容来源。
- 可点击头像由调用方使用具名 Button/Action 组合，不给 Avatar 偷加交互。

## States

| id | label | kind |
| --- | --- | --- |
| `small` | 小尺寸 | `variant` |
| `large` | 大尺寸 | `variant` |

## 用法与反例

- 用于人员、组织或设备主体的稳定图像/首字母表示。
- 不用 Avatar 代替 Badge、状态灯或没有可访问名称的图标按钮。
- Props、Slots、Events、默认值与 Token 槽以 [Avatar Contract](../../../src/design-system/components/contracts/avatar.json) 为准。
