# Screen 与 Variant

## Screen 注册

每条 `prototypeScreens` 记录应具备：

- 稳定 `screenId` / `screenSlug` / `path`  
- `view` 指向真实 Vue 文件  
- `defaultVariantId` + `variants[]`（至少能演示主路径）

## Variant 基线

按页需要注册可复现态。常见种类：

| 种类 | 示例 id | 用途 |
| --- | --- | --- |
| 主路径 | `default` | 正常内容 |
| 异步 | `loading` | 加载中 |
| 空 | `empty` | 无数据 |
| 失败 | `error` | 加载/业务失败 |
| 叠加层 | `sheet-open`、`dialog-open`、`toast-open` | Sheet / Dialog / Snackbar 打开 |
| 校验 | `validation-error` | 表单错误展示 |
| 选择/筛选 | `filtered`、某 tab 预选 | 列表筛选或页内 Tab 预置 |
| 其它业务态 | 按屏命名 | 须仍能经 URL/query 打开 |

规则：

1. Variant 用 query（或页内等价、可外部驱动的机制）打开，**禁止**只能靠点击才能到达的关键态。  
2. **主题不是 Variant**：`theme` 与业务 `variant` 分离（见 [../tokens/themes.md](../tokens/themes.md)）。  
3. 叠加层打开态必须可注册、可 capture，不要用未登记的临时弹层冒充。

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

列表循环与选项集合应在源码中出现（mock / 常量），避免仅运行时字符串拼出整棵 UI，便于 Source 识别与 capture。

## 检查 ID

命名建议：

```text
{prototypeId}.{screenSlug}
{prototypeId}.{screenSlug}.{slot}     # 如 summary、scroll-list、tabs
{prototypeId}.{screenSlug}.app-bar | tab-viewport | bottom-navigation
```

组件支持 `inspectId` 时传入同上字符串。

## 与 conventions

页面结构角色（app-bar、tab-bar、list、bottom-bar、modal、section…）应能被当前识别面看到。详见仓库 `docs/conventions.md`。组装时不要发明引擎认不出的临时包裹层来「美化 DOM」。
