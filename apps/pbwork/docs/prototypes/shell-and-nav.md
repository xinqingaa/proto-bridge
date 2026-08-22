# 壳与导航

## 推荐壳结构

### 一级 Tab 根

```text
Shell
├─ （可选）AppBar — 需要统一标题/全局操作时再加
├─ TabViewport（items + v-model + keepMounted；根目的地默认关闭横滑）
│   └─ #item → 各面板
└─ Tabbar（同一当前位置）
```

`AppBar` **不是必须**：一级最大导航页可以没有顶栏。

### 栈页（二级）

```text
Shell
├─ AppBar（showBack / 返回）
└─ main（或直接 ScrollableDataList）
```

无 Tabbar。返回走统一 nav 辅助，不要各页手写 `router.back()` 猜历史。栈页通常需要 AppBar 提供返回。

## 滚动

- Shell 固定高度（如 `100dvh`），内部 `minmax(0,1fr)`。
- 默认 panel 可 `overflow: auto`。
- 内含 `.pb-scrollable-data-list` 时父级改为 `overflow: hidden`，把纵滚交给列表。
- 原型表面**默认隐藏滚动条**，内容仍可滚动。页面明确需要可见滚动条时再露出。Workbench 不在此列。

## 职责拆分

| 组件        | 做                                               | 不做             |
| ----------- | ------------------------------------------------ | ---------------- |
| Tabbar      | 发当前目的地                                     | 面板、动画、手势 |
| TabViewport | 横滑、过渡、保活                                 | 业务路由语义     |
| ScreenTransition | 换 Screen 的 push / replace 进入、back 返回 | 手势、路由表、同屏 Variant |
| AppBar      | 标题、返回、append（**一级可选**；栈页通常需要） | 全局路由表       |

## Tab 状态与 URL

- Tabbar 与 TabViewport **共用**同一当前位置。
- **手势 / 点击先更新 UI**；再由 nav **节流后** `replace` 同步 URL（建议短 debounce，避免动画中狂刷 history）。
- Tab 切换：路由 **replace**，写入当前 Tab 身份（home slug）。共用壳时已加载 view 不变，`ScreenTransition` 不播放，面板在 TabViewport 即时切换。
- 二级进栈：路由 **push**，并记录可返回的 parent。
- 栈页转场由 Runtime `ScreenTransition` 播放：已加载 view / `screenKey` 变化时，`push` 与换 view 的 `replace` 播进入，`back` 播返回。同屏 Variant、首次挂载和 `prefers-reduced-motion` 瞬间切换。默认 iOS 左右侧滑，可选 Android 淡入缩放。本轮不提供边缘返回手势。
- 嵌入 Runtime 的返回若走 `replace(parent)`，须先 `announceBackNavigation()`，否则会当成进入切页。
- 二级页禁止直接拼业务路径字符串；统一走 nav 辅助（名称可自定，语义须覆盖下列能力）。

## History 身份（通用契约）

多 Tab + 栈页原型须在 `history.state`（或等价处）携带可恢复身份，至少包括：

| 字段（示意名） | 含义                                        |
| -------------- | ------------------------------------------- |
| 作用域         | 标明属于本原型，避免与其它 history 条目混淆 |
| 当前 Tab       | 一级目的地身份                              |
| 返回父路径     | 二级页的 `pbParent` 类字段                  |
| 根位置         | 一级根在 history 栈中的位置，供完成流折叠   |
| 条目 id        | 可选；区分同 path 的多次进入                |

字段名可按原型约定，**语义不能缺**。

## Nav 辅助语义（必须具备）

| 能力         | 规则                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 切换 Tab     | `replace` 到该 Tab 的 home，写入 Tab 身份                                                                                                                 |
| 进栈         | `push` 二级；写入 parent = 当前 fullPath（见跨 Tab）                                                                                                      |
| 跨 Tab 进栈  | 若当前停在**另一 Tab 的 home**，先把 parent 规范为**目标 Tab 的 home**（必要时先 replace），再 push。禁止把错误 Tab 的 home 当作返回落点                  |
| 替换当前屏   | `replace` 同级屏，保留既有 parent                                                                                                                         |
| 返回         | 有 parent 时：嵌入 Runtime（iframe / `parent !== window`）用 **replace(parent)**；独立窗口可用 `history.back()`。无 parent 时 **replace 到所属 Tab home**。恢复 Screen / `variant` / 业务 query 时把 `theme` 规范为当前会话偏好，Workbench 父页 `router.back()` 后同样盖 theme |
| 完成流回首页 | 保存/提交/删除等结束后回到 Tab home：优先折叠到根位置；需要丢弃中间栈时允许强制 `replace` home（如 `preferBack: false`）                                  |
| 深链兜底     | 任意二级深链打开后，返回必须能落到所属 Tab home，不能依赖「用户曾经点过底栏」                                                                             |

产品离开拦截写在 `onBeforeRouteLeave` 时，先认 `isForcedRuntimeNavigation()`：为真则放行并打开目标页。Workbench 树、画布顶栏和 Capture 换页由 Runtime `runForcedRuntimeNavigation` 执行。手机内返回和页内离开继续走产品确认。

## 共享 Tab 根

有 2–5 个底栏根目的地时：

1. 每个根目的地注册独立 Screen，Capture 按 Screen 采集。
2. 这些 Screen 的 `view` 指向**同一个壳文件**。
3. 壳内使用 `Tabbar` + `TabViewport`：`keepMounted`，关闭横滑，`transitionDuration` 为 `motion.duration-instant`。
4. 切 Tab 时 `replace` 更新 home slug。Runtime 发现已加载 view 不变，保持 `screenKey`，只切换可见面板。
5. 栈页（登录、会话、设置、二级任务）使用自己的 view。view 变化时 Runtime 播放 `ScreenTransition`。
6. 保活面板只消费自己 home 的 `variant`（见 [screens-and-variants.md](./screens-and-variants.md)）。
