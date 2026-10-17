# ActionSheet

> 组件 id：`action-sheet` · 分类：`feedback`
> 实现：[ActionSheet.vue](../../../src/design-system/components/feedback/ActionSheet.vue)
> 契约：[action-sheet.json](../../../src/design-system/components/contracts/action-sheet.json)

BottomSheet 内的动作列表组合，危险操作显式区分。

## 职责与边界

固定使用 `role=section`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- Overlay、焦点、scrim 和关闭复用 BottomSheet；本组件 section 只拥有动作内容，shell 单独登记。
- 选择可用动作先发出稳定 id，再关闭；取消和 scrim 关闭不触发 select。

## States

| id | label | kind |
| --- | --- | --- |
| `open` | 打开 | `content` |
| `disabled` | 不可用操作 | `interaction` |

## 用法与反例

用于少量即时命令；业务监听 select 的稳定 id 执行动作。取消不触发 select；多步流程用 FlowSheet，需确认的破坏性动作再调用 Confirm。

Props、Slots、Events、默认值与 Token 槽以 [ActionSheet Contract](../../../src/design-system/components/contracts/action-sheet.json) 为准。
