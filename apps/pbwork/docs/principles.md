# 原则与边界

## 1. 分层依赖

```text
  Token / Theme
  → action / input / display
  → navigation / data / feedback
  → Screen / Panel
  → Prototype
```

每一层只消费下层公开 props、slots、events 和 `tokenBindings`。禁止复制下层实现、依赖私有 class 或读取内部状态。

## 2. 复用优先

页面缺少能力时依次判断：

1. 现有 Token 能否表达；
2. 现有职责分类下的组件能否组合；
3. 是否真的是业务局部 UI；
4. 是否经过至少两个独立使用场景，值得提升为共享能力。

业务专用颜色、间距、组件名和页面状态不得进入共享 Token/Contract。

## 3. 组件红线

- 对口组件存在时必须使用。
- `Tabbar` 只导航；根视图区使用 `TabViewport` 或路由内容。
- 一级/二级 Tab 可以嵌套，但同一触摸区域只允许一个带 window 的横滑 owner；三级 Tab 绝不拥有 window。
- `DataList` 管列表表面，`ScrollableDataList` 管纵滚、刷新和分页。
- `FilterBar`、`SearchBar`、Confirm、Sheet、Toast、Loading、EmptyState 等不得页内复制。
- 页内局部 UI 仍必须使用 Token。
- 需要 Agent 独立实现或验收的局部节点必须显式进入 Evidence；只写 CSS Token 不构成 Token binding。
- 禁止组件实例换绑 Token。

## 4. 手势红线

- 不在业务页面自造横滑、下拉刷新、拖滚或 click suppression。
- 复用 `_shared/usePointerSwipe`、`useHorizontalDragScroll` 和 `ScrollableDataList`。
- 嵌套横滚、表单输入和无 window 分段使用标准忽略标记。
- 一个页面只有一个主纵滚。

## 5. Workbench 与 Runtime

- Workbench 控件来自 `src/workbench/ui`。
- Runtime 原型组件来自 `src/design-system/components`。
- 两套组件不交叉复用。
- Workbench 临时 Inspector handle 不进入持久 Evidence。
- Runtime Screen 遵守 [Authoring Contract](../../../docs/reference/prototype-authoring.md)。

## 6. Registry

- Component Contract、Vue、Registry、Scenario、文档和测试保持一致。
- Prototype/Screen/Variant/Action/Scenario 只在 `prototypes/registry.ts` 注册。
- Runtime 路由、工作台导航和 Capture manifest 不维护平行清单。

## 7. Semantic Evidence

- DS 业务实例必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
- 业务局部证据节点必须在同一实际元素上提供 `data-pb-id`、`data-pb-role`、按需 `data-pb-key` 和所需 `data-pb-token-*`。
- 不标记所有 DOM；是否需要独立 Evidence 以实现、验收、状态和视觉差异为准。
- required boundary、Action 和 Scenario 只引用能被 Runtime 精确解析的稳定 Fragment。

完整规则与门禁等级见[语义标记与证据门禁](../../../docs/reference/semantic-authoring.md)。

## 8. 规范升级

通用规范必须来源于稳定、可复用、经过测试的行为。业务视觉偏好、单页 workaround 和未验证方向留在业务需求或局部实现，不写成全局铁律。
