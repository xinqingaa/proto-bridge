# Screen 与 Variant

## Screen 注册

每条 `prototypeScreens` 记录应具备：

- 稳定 `screenId` / `screenSlug` / `path`
- `view` 指向真实 Vue 文件
- `defaultVariantId` + `variants[]`（至少能演示主路径）

## Variant 基线

按页需要注册可复现态。常见种类：

| 种类       | 示例 id                                   | 用途                           |
| ---------- | ----------------------------------------- | ------------------------------ |
| 主路径     | `default`                                 | 正常内容                       |
| 异步       | `loading`                                 | 加载中                         |
| 空         | `empty`                                   | 无数据                         |
| 失败       | `error`                                   | 加载/业务失败                  |
| 叠加层     | `sheet-open`、`dialog-open`、`toast-open` | Sheet / Dialog / Toast 打开 |
| 校验       | `validation-error`                        | 表单错误展示                   |
| 选择/筛选  | `filtered`、某 tab 预选                   | 列表筛选或页内 Tab 预置        |
| 其它业务态 | 按屏命名                                  | 须仍能经 URL/query 打开        |

规则：

1. Variant 用 query（或页内等价、可外部驱动的机制）打开，**禁止**只能靠点击才能到达的关键态。
2. **主题不是 Variant**：`theme` 与业务 `variant` 分离（见 [../tokens/themes.md](../tokens/themes.md)）。
3. 叠加层打开态必须可注册、可 capture，不要用未登记的临时弹层冒充。
4. Variant 声明了业务 `query` 时，Workbench、Runtime Manifest/reset 和 Capture 会共同使用这份 canonical route input；不要在页面或入口层维护第二份默认值。
5. 工作台侧边栏只列出 Screen。Variant 必须仍可经 URL、画布顶栏和 Capture 打开，但不能再作为导航树目的地。

## PB Evidence Contract

进入 Evidence 闭环的 Screen：

1. default Variant 必须声明非空 `requiredFragments`；
2. 严格 Screen 的 default Variant 必须声明非空 `requiredFragments`；其它 Variant 可以在证据未完整声明时产生可见覆盖风险；
3. Fragment identity 使用稳定 `screenId + pbId + optional pbKey`；
4. 对应 Runtime 节点必须提供合法 `data-pb-role`，可见且具有非零 bbox；
5. DS required Fragment 使用业务 `inspectId`，业务局部 required Fragment 显式声明实现所需 `data-pb-token-*`；
6. 关键路径使用 Action、Scenario 和 Checkpoint，不以无边界自动点击代替；
7. Runtime 必须能 prepare、readiness、semantic snapshot 和 reset；
8. 不得通过 `LEGACY_EVIDENCE_SCREEN_IDS` 为新工作创建例外。

提交前运行 `pnpm --filter @proto-bridge/pbwork test` 和
`pnpm test:e2e:runtime`。

## keepMounted 下的 Variant 所有权

一级多面板共用 Screen 且面板保活时：

- 全局 `route.query.variant` 只应由**当前 home 对应的面板**消费。
- 其它已挂载面板必须忽略该 variant（视为 `default`），否则一个 Tab 的 `empty`/`error` 会污染兄弟面板。
- 判定方式：`screenSlug === 本面板 home slug`（或等价 owns 标志）为真才读 variant。

## 错误与空态展示

- **空数据** → `EmptyState`（或约定的空态布局）。
- **加载中** → `Spinner` 或页级 loading 布局。
- **失败** → 优先独立错误布局（如 `role="alert"` 区块）；不要默认把失败塞进 EmptyState，除非该屏明确把「不可用」表现成空态文案。

## 数据可见性

列表循环与选项集合应使用稳定 mock/fixture 表达，避免随机值、系统时间或不受控网络请求改变 Capture 结果。

## 检查 ID

命名建议：

```text
{prototypeId}.{screenSlug}
{prototypeId}.{screenSlug}.{slot}     # 如 summary、scroll-list、primary-tabs
{prototypeId}.{screenSlug}.app-bar | tab-viewport | tabbar
```

业务 Evidence 中组件支持 `inspectId` 时必须传入同上字符串。业务局部证据节点的 id、role、key 和 Token binding 规则见[语义标记与证据门禁](../../../../docs/reference/semantic-authoring.md)。

## 与 conventions

页面结构角色（app-bar、tab-bar、list、bottom-bar、modal、section…）应落在拥有真实语义的节点。详见根 [Authoring Contract](../../../../docs/reference/prototype-authoring.md)。不要为采集创建没有产品语义的临时包裹层。
