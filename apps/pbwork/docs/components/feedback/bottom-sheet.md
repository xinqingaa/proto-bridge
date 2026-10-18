# Bottom Sheet

> 组件 id：`bottom-sheet` · 分类：`feedback`
> 实现：[BottomSheet.vue](../../../src/design-system/components/feedback/BottomSheet.vue)
> 契约：[bottom-sheet.json](../../../src/design-system/components/contracts/bottom-sheet.json)

从底部覆盖当前页面的操作容器，支持内容自适应、半屏和展开档位。

## 职责与边界

- 固定使用 `role=sheet`，保持独立 scrim、Sheet surface、关闭入口和焦点边界。
- 顶栏与 Flow Sheet 共用：居中标题、右侧关闭 Icon Button；无返回。
- 默认 `detent=content` 保持内容自适应；`medium` / `expanded` 从主题包读取面板高度。只在提供 `detents` 时展示档位按钮，调用方处理 `update:detent` 回写。档位切换不另造拖拽机制。决策按钮放在 `actions` 槽。
- 默认 slot 完全拥有业务内容；连续多步流程使用 Flow Sheet。

## 行为要点

- 打开时挂载 scrim、dialog 可访问语义和顶部关闭入口。
- 关闭只更新 `modelValue` 并恢复下层交互，不替业务内容决定取消、提交或路由。受控打开时记住实际触发器，离场后返回焦点；另一个可见 modal 仍在时不抢焦点，触发器已移除则不强行恢复。焦点圈定、Escape 与关闭仍复用共享 Overlay。
- 操作区一颗按钮时使用主要类型并占满；两颗时左侧次要、右侧主要，等分撑满。
- 选项列表：选中行右侧 `check` Icon，标签用 `typography.label`；选项 `DataList` 默认不分隔线。
- 内容区默认隐藏滚动条，仍可滚动。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 打开 | `content` |
| `closed` | 关闭 | `content` |
| `medium` | 半屏 | `variant` |
| `expanded` | 展开 | `variant` |

## 用法与反例

- 用于半屏操作、选择或短内容；多步确认/执行/结果使用 Flow Sheet。
- 不在业务页面复制 scrim、焦点管理、顶部圆角、关闭或返回。
- Props、Slots、Events、默认值与 Token 槽以 [Bottom Sheet Contract](../../../src/design-system/components/contracts/bottom-sheet.json) 为准。
