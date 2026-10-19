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

## 2. DS 是基础，不是上限

DS 维护颜色、字体、间距等 Foundation 和基础组件；每个原型在它之上形成自己的视觉身份。组件按[原型设计工作流的 Promotion Mapping](./prototypes/design-workflow.md#promotion-mapping)自上而下选用：

1. 形状与风格都匹配时原样使用 DS 组件；
2. 通过公开 variant、props 或 slots 满足方向；
3. 需求通用且可复用时扩展 DS；
4. 形状属于本业务，或已批准风格与所有 DS 选项冲突时，实现原型自有组件。

风格与 DS 冲突时以已批准风格为准，并把冲突记为 DS 缺口。提升为共享能力前须经过至少两个独立使用场景。业务专用颜色、间距、组件名和页面状态不得进入共享 Token/Contract。

## 3. 组件红线

- 形状与风格都匹配的 DS 组件存在时必须使用；不用时在 `docs/implementation.md` 记录原因。
- `Tabbar` 只导航；根视图区使用 `TabViewport`。多个根目的地各注册 Screen，`view` 指向同一壳文件。
- 一级 Tab 表达当前页面的主要内容分区，二级 Tab 表达页面内的次级内容分区；两者对应具名内容面板并可按场景启用横滑与过渡。
- 三级 Tab 表达当前区域内的局部筛选、模式或粒度切换，不拥有 viewport；一级/二级嵌套时同一触摸区域只允许一个横滑 owner。
- `DataList` 管列表表面，`ScrollableDataList` 管纵滚、刷新和分页。
- `FilterBar`、`SearchBar`、Confirm、Sheet、Toast、Loading、EmptyState 等的交互机制（焦点、关闭、手势、滚动）不得页内复制；外观差异通过公开 props、slots 或 DS 扩展实现。
- 原型自有组件与页内局部 UI 仍必须使用 Token、Flex 与显式 Evidence。
- 不通过私有 class 覆盖 DS 组件内部样式。
- 需要 Agent 独立实现或验收的局部节点必须显式进入 Evidence；只写 CSS Token 不构成 Token binding。
- 禁止组件实例换绑 Token。

## 4. 手势红线

- 不在业务页面自造横滑、下拉刷新、拖滚或 click suppression。
- 复用 `_shared/usePointerSwipe`、`useHorizontalDragScroll` 和 `ScrollableDataList`。
- 嵌套横滚、表单输入和无 viewport 局部分段使用标准忽略标记。
- 一个页面只有一个主纵滚。

## 5. Workbench 与 Runtime

- Workbench 控件来自 `src/workbench/ui`。
- Runtime 原型组件来自 `src/design-system/components`。
- 两套组件不交叉复用。
- Workbench 临时 Inspector handle 不进入持久 Evidence。
- Runtime Screen 遵守 [Authoring Contract](../../../docs/reference/prototype-authoring.md)。

## 6. Registry

- Component Contract、Vue、Registry、Scenario、文档和测试保持一致。
- Prototype 在就近 `prototype.ts` 声明；Screen/Variant/Action/Scenario 在 `screens/{slug}/screen.ts` 用 `defineScreen()` 声明，由 `prototypes/registry.ts` glob 汇总。
- Runtime 路由、工作台导航和 Capture manifest 不维护平行清单。

## 7. Semantic Evidence

- DS 业务实例必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
- 业务局部证据节点必须在同一实际元素上提供 `data-pb-id`、`data-pb-role`、按需 `data-pb-key` 和所需 `data-pb-token-*`。
- 不标记所有 DOM；是否需要独立 Evidence 以实现、验收、状态和视觉差异为准。
- required boundary、Action 和 Scenario 只引用能被 Runtime 精确解析的稳定 Fragment。

完整规则与门禁等级见[语义标记与证据门禁](../../../docs/reference/semantic-authoring.md)。

## 8. 规范升级

通用规范必须来源于稳定、可复用、经过测试的行为。业务视觉偏好和获批方向留在对应 Prototype 的 `docs/design.md`，单页 workaround 留在局部实现或 `docs/implementation.md`；未验证方向只进入 `src/drafts`，不写成全局铁律。


## 9. 原型业务实现尺度

原型的数据流程、逻辑流转、页面交互和关键流程，以适配原型、可演示、可流转为目标，不默认追求完整真实业务系统。业务基础按已批准的演示旅程建设，随页面需要补齐，不把生产级底座作为页面开工前置。

- 必须保证关键操作有可观察结果、必要反馈和正确的进入/返回路径；同一旅程中跨页状态与汇总一致，取消不误提交，演示能复位并重复进入关键状态。不能用只切选中样式、无结果按钮或与操作无关的固定数据冒充流程完成。
- 可以使用内存状态、轻量本地保存、模拟服务、确定性 fixture、加速计时或可控时钟。模拟行为和演示数据在设计/实施记录中明确；首次状态与有数据样例分开，不冒充真实历史或外部服务已完成。
- 默认不建设后端、账号权限、云同步、复杂持久化、数据迁移、损坏恢复、完整重试体系、长时间后台精确保障或穷尽罕见异常。仅在这些能力本身是批准的体验验证目标、核心演示必需或用户明确要求时纳入。
- 空态、校验、失败、中断等状态按核心旅程的展示需要选取，可由明确场景触发；不要求为每个状态实现完整生产基础设施。已有可用能力保留，但不因已有实现继续扩展非必要复杂度。
- 设计文档明确必须演示的旅程、状态、模拟范围和不做事项；执行计划按可观察的演示结果验收，测试覆盖关键转换与一致性，避免为低风险演示逻辑构建过量测试。

业务实现的简化不降低视觉与正式交付要求：Token/Flex、共享导航/滚动/Overlay机制、可访问交互、语义节点、确定性Runtime与正式Evidence仍遵守现有门禁。能演示不等于只做静态画面，也不等于完整产品已实现。
