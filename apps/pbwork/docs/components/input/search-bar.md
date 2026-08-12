# Search Bar

> 组件 id：`search-bar` · 分类：`input`
> 实现：[SearchBar.vue](../../../src/design-system/components/input/SearchBar.vue)
> 契约：[search-bar.json](../../../src/design-system/components/contracts/search-bar.json)

上下文内搜索入口，封装统一的输入、搜索图标和清除行为。

## 职责与边界

- 固定使用 `role=search`；查询值由页面控制，组件不自行请求网络或决定过滤范围。
- 复用 Text Field 的输入基础，不在业务页面重新拼搜索图标、清除按钮和禁用态。
- 复杂筛选条件使用 Filter Bar 或页面筛选表单，不塞入搜索字符串协议。

## 行为要点

- 输入变化更新受控查询值；清除操作回到空输入状态。
- disabled 时不可输入、清除或提交，并使用 `opacity.disabled`。
- 搜索图标和紧凑尺寸均消费 Contract Token，不接受固定数字覆盖。

## States

| id | label | kind |
| --- | --- | --- |
| `empty` | 空输入 | `content` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 用于当前列表或上下文的关键字搜索，并由调用方决定即时过滤或显式提交。
- 不复制一套“带放大镜的 Text Field”，也不让 Search Bar 拥有业务数据源。
- Props、Slots、Events、默认值与 Token 槽以 [Search Bar Contract](../../../src/design-system/components/contracts/search-bar.json) 为准。
