# 原型 Authoring Contract

本规范定义怎样制作能被 ProtoBridge 高效、精确、完整采集的原型。所有进入 PB Evidence 闭环的 PBWork Prototype、Screen 和关键状态都必须遵守。

## 1. 只使用 PBWork 设计基础

原型依赖顺序固定为：

```text
PBWork Token / Theme
  → basic components
  → complex components
  → shared gestures and composition recipes
  → Screen / Panel
  → Prototype shell
```

强制规则：

- 有对口 PBWork 组件时必须使用，禁止在页面内重做 Button、Tabs、List、Dialog、Sheet、Snackbar、Navigation 或滚动/手势组件。
- 允许业务局部 UI，但颜色、字体、间距、尺寸、圆角、边框、阴影和动效必须使用 `--pb-*` Token。
- 禁止创建业务命名的共享 Token。
- 禁止组件实例换绑 Token；Theme 只覆盖 Token 值。
- 禁止复制共享手势仲裁。
- Workbench UI 组件不能用于业务 Runtime，Prototype Design System 组件不能用于 Workbench。

组件选择和组合细节见 [PBWork 原型生产者手册](../pbwork/README.md)。

## 2. 稳定身份

| 对象 | 身份 |
| --- | --- |
| Prototype | 稳定 `prototypeId` |
| Screen | `{prototypeId}.{screenSlug}` |
| Variant | Screen 内稳定 slug |
| Fragment | `screenId + data-pb-id + optional data-pb-key` |
| Action | owner Screen 内稳定 slug |
| Scenario | owner Screen 内稳定 slug |
| Checkpoint | owner Scenario 内稳定 slug |

禁止使用：

- DOM path、CSS selector、Vue component instance；
- 数组 index、当前排序位置；
- 生成时间、随机值；
- 可编辑展示文案；
- Workbench 临时 handle；
- 仅在一次浏览器 session 内有效的 ID。

## 3. Screen Registry

每个 Screen 在 `apps/pbwork/src/prototypes/registry.ts` 中声明：

- `prototypeId`；
- 稳定 `screenId` 和 `screenSlug`；
- 唯一 `path`；
- 指向真实 Vue SFC 的 `view`；
- `defaultVariantId`；
- `variants`；
- 按需声明 `actions` 和 `scenarios`。

Registry 是 Router、Workbench、Runtime manifest 和 Capture 的共同权威，不维护第二份 Screen 清单。

每个 Screen 必须能通过 URL 直接打开。关键状态不能只能经过手工点击到达。

## 4. Variant

Variant 表达稳定业务状态，例如：

- `default`
- `loading`
- `empty`
- `error`
- `filtered`
- `sheet-open`
- `dialog-open`
- `validation-error`

Theme、Device、Viewport 和 Fixture 是独立 Case 维度，不得伪装成 Variant。

default Variant 必须声明非空 `requiredFragments`。每个 `critical: true` Variant 也必须声明自己的非空 `requiredFragments`。

## 5. Runtime 标记

| 属性 | 用途 |
| --- | --- |
| `data-pb-id` | Screen 内稳定语义模板身份 |
| `data-pb-key` | 同一模板下重复实例的稳定业务键 |
| `data-pb-role` | PB 语义角色 |
| `data-pb-shell` | `sheet`、`dialog`、`modal`、`drawer` 等叠加层 |
| `data-pb-component` | PBWork Design System 组件身份 |
| `data-pb-action` | authored Action 的稳定执行目标 |

标记放在拥有该语义的实际节点上，不为“方便采集”增加无意义包裹层。

重复列表规则：

- 单个模板可使用一个 `data-pb-id`；
- 同屏重复时，每个实例必须具有唯一稳定 `data-pb-key`；
- key 使用业务身份，不使用循环 index；
- 同一 `pbId + pbKey` 只能出现一次。

## 6. Role

`data-pb-role` 是 PB 语义词表，不等同于 ARIA role。常用角色包括：

- `page`
- `section`
- `app-bar`
- `tab-bar`
- `bottom-bar`
- `list`
- `list-item`
- `scroll-list`
- `filter`
- `search`
- `form`
- `field`
- `button`
- `sheet`
- `dialog`
- `modal`
- `status`

机器闭集以 Core Contract 为准。节点仍需提供正确 HTML/ARIA 语义，不能用 `data-pb-role` 代替可访问性。

## 7. Required Fragment

`requiredFragments` 是 authored semantic completeness boundary。原型作者用它声明：“如果这些语义区域没有全部采集，就不能称该 Case 完整。”

每个 required Fragment 必须：

- 属于当前 Screen；
- 在目标 Variant/Checkpoint 中存在；
- identity 唯一；
- 具有合法 role；
- 实际可见；
- bbox 宽高均大于零；
- 不被错误叠加层遮蔽；
- 在 readiness 后保持稳定。

缺失、重复、不可见或非法节点必须阻止完整性声明，不能降级为无提示成功。

## 8. Action

关键交互通过 Action 声明：

- 稳定 Action ID；
- 受支持的 `kind`；
- 稳定 Fragment target；
- 可验证的执行结果。

Action target 需要 `data-pb-action` 或 Contract 支持的明确语义。禁止让采集器根据按钮文案、DOM 顺序或模糊 selector 猜点击目标。

## 9. Scenario 与 Checkpoint

Scenario 声明：

- owner Screen；
- initial Variant；
- 有序 Action IDs；
- 是否 critical；
- 一个或多个 Checkpoint。

Checkpoint 必须声明实际 Screen、Variant 和非空 required Fragments。Runtime 执行后发现任一维度不匹配，应确定性失败。

会卸载当前 document 且无法保持 Capture Protocol 连续性的导航必须标记 unsupported。不要用延时或忽略窗口伪装成功。

## 10. Readiness 与 Reset

Runtime 在 readiness 成功前必须完成：

- URL 与 Case 维度解析；
- Fixture 注入；
- 异步数据和状态准备；
- Theme 应用；
- Variant/Overlay 打开；
- required Fragment 渲染；
- 语义标记稳定。

每个 Case 必须能回到独立 baseline。reset 不能依赖上一个 Case 的偶然页面状态。

## 11. 页面结构

- 一个页面只有一个主滚动所有者。
- 一级多面板使用 `TabViewport + BottomNavigation`。
- 一级主体面板内禁止再嵌套带 window 的 `Tabs`。
- 列表外观使用 `DataList`，滚动/刷新/分页使用 `ScrollableDataList`。
- 状态页关闭不适用的刷新和分页手势。
- Dialog、Sheet、Snackbar 等 Overlay 与主内容保持清晰语义边界。
- 多 Tab 与栈页使用统一导航辅助，确保深链、返回和跨 Tab 进栈可复现。

## 12. 数据与状态

- 关键列表、选项和 Fixture 应在可维护的源码数据结构中表达。
- 不通过随机数据、系统当前时间或不受控网络请求决定 Capture 结果。
- loading、empty、error、校验和 Overlay 等实现范围内的关键状态必须可由 Variant 或 Scenario 重现。
- Screenshot 与语义 Facts 必须来自同一 Case。

## 13. 证据诚实性

- Runtime 只报告实际观测事实。
- 未声明 required boundary 的结果不能声称语义完整。
- unknown、conflict 和 unsupported 必须可见。
- 源码命名、目标工程模式或截图推测不能补齐 required Fact。
- 手工接受 warning 不改变 Evidence Level。

## 14. 交付门禁

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
```

交付前还应：

- 在浅色和深色 Theme 检查关键表面；
- 用真实浏览器验证 required Fragment 唯一、可见、bbox 非零；
- 验证 default 与所有 critical Variant；
- 验证 Action、Scenario、Checkpoint 和 reset；
- 验证纵滚、横滑、刷新、Overlay 和返回；
- 确认相关 Contract、Registry、测试和文档同步。

