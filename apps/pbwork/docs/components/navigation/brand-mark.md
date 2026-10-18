# BrandMark

> 组件 id：`brand-mark` · 分类：`navigation`
> 实现：[BrandMark.vue](../../../src/design-system/components/navigation/BrandMark.vue)
> 契约：[brand-mark.json](../../../src/design-system/components/contracts/brand-mark.json)

主题品牌图形与可替换品牌插槽，无资源时退回名称。

## 职责与边界

固定使用 `role=image`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 资产按解析后的拥有包查找 URL，不按模式分支隐藏语义节点。
- 无资源时显示 name；公开 mark / wordmark 插槽允许原型自有品牌形态。

## States

| id | label | kind |
| --- | --- | --- |
| `named` | 名称 | `content` |
| `compact` | 短名称 | `content` |

| `stacked` | 纵向组合 | `variant` |

## 用法与反例

默认读取 asset.brand-mark / asset.brand-wordmark，解析 URL 保留资源所属包；无资源显示 name。原型可通过 mark / wordmark 插槽表达自有品牌形态，不能按明暗模式删除语义节点。

Props、Slots、Events、默认值与 Token 槽以 [BrandMark Contract](../../../src/design-system/components/contracts/brand-mark.json) 为准。

## 展示与组合

图形采用独立品牌尺寸，可横向或纵向组合；无资源时保留真实名称回退。Workbench 的中性示例资源只用于样板，不写入正式主题默认品牌。
