# 账本星球实现与回归基线

本文记录账本星球特有的实现约束。通用规则以 PBWork 手册和根 Authoring Contract 为准。

## 导航状态

- `BottomNavigation` 只发出一级 Tab value。
- `TabViewport` 统一横滑、动画和 keepMounted。
- `TabRoot` 持有三个一级面板，共享 Screen 壳时不因 home slug 变化卸载整棵一级树。
- `nav.ts` 统一实现 Tab replace、二级 push、同级 replace、返回和完成流。
- History state 携带 `pbScope`、`pbTab`、`pbParent` 和 `pbRootPosition`。
- 二级页面不直接拼业务路径，使用 `pushStack`、`replaceScreen`、`goBack` 和 `finishToHome`。
- 深链没有可用 parent 时返回所属 Tab home。

## Theme session

- `theme-session.ts` 以 localStorage 偏好作为原型会话权威。
- URL `theme` 用于确定性预览和分享。
- Theme 切换使用 route replace，不增加业务 history 条目。
- Runtime 使用事件通知 Workbench Theme 变化。
- Theme 不占用 Variant。

## Workbench Bridge

- iframe 初始 `src` 在一次预览 session 中稳定。
- Workbench 通过 Bridge `navigate` 同步父路由目标。
- Runtime 通过 `route` 消息报告 push、replace 和 back 语义。
- 双向同步以规范化 URL 和明确导航动作判断，不以任意延时窗口判断。
- iframe 重载后重新建立 runtimeId，旧消息失效。

## 列表

```text
ScrollableDataList
  ├── page header / filter / summary
  └── DataList
      └── business rows
```

- `DataList` 提供 surface、圆角、阴影、inset 和分隔。
- `ScrollableDataList` 提供纵滚、pull refresh、load more 和可选 mouse drag。
- `refreshing`、`loadingMore`、`hasMore` 由业务状态控制。
- load-more 使用请求锁，完成后才允许下一次触发。
- 主容器避免第二个纵滚。

## 手势

- `swipe` 只控制 touch/pen，`mouseSwipe` 只控制 mouse。
- Pointer 到达轴锁阈值后才允许捕获。
- 横向动作交给 Tabs/TabViewport，纵向动作交给 ScrollableDataList。
- 有溢出的 `[data-horizontal-scroll]` 在整个手势周期拥有横向手势。
- Touch path 只在确定横向滑动或顶部下拉后阻止浏览器默认平移。
- 有效拖动后抑制紧随其后的 click。
- 短内容 Tabs 使用 `fill` 和完整高度链。

## 视觉层次

- 每个核心 Screen 至少有一个金额、进度、资产或票券等信息锚点。
- 主题色用于关键数字、状态、边框和小面积表面。
- 层次主要使用 Token 化边框、分隔、阴影和透明表面。
- 连续内容优先列表排版，Card 只用于独立模块。
- 页面提供足够字段、状态和下一步操作。

## Evidence 基线

以下 Screen 是完整 Runtime Capture 回归样本：

- `ledger-planet.task-list`
- `ledger-planet.task-detail`
- `ledger-planet.ledger-list`

样本必须验证：

- default/critical Variant 的 required boundary；
- Runtime describe、prepare、readiness、semantic snapshot 和 reset；
- stable Fragment identity；
- visible non-zero bbox；
- 真实 Screenshot；
- PBWork → Store → MCP fixed Evidence slice。

## 交互回归

1. 记账 → 权益 → 券包 → 返回后仍在权益。
2. 记账 → 我的 → 钱包 → 返回后仍在我的。
3. 设置切换 Theme → AppBar 返回 → 浏览器前进/后退，Theme 不回滚。
4. Runtime 和 Workbench 执行页面进栈/返回，不产生路由循环。
5. Tab 点击与横滑共享状态；快速切换不吞点击。
6. 纵滚不误触横滑；下拉刷新只在顶部；load-more 不并发。
7. 任意二级深链返回所属 Tab home。
8. default/critical Variant 的 required Fragment 均唯一、可见、bbox 非零。
