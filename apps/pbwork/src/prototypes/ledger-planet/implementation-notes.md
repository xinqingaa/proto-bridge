# 账本星球 · 实施说明与回归基线

> 关联需求：`requirements.md`
> 本文记录当前采用的实现，不再把上一轮草稿方案当作规范。

## 1. 本轮问题根因

1. 一级 Tab、业务路由、浏览器 history 三者都在维护“当前页”，返回时互相覆盖，导致权益/我的二级页回退后 Tab 乱跳。
2. 主题只存在于 history query；切换主题后回到旧条目，旧 query 又把主题覆盖回去。
3. 工作壳把 iframe 的每次导航都近似当作父路由 push，并依赖 50ms 回退和 400–800ms 忽略窗口，快速操作时会形成 A/B 循环或吞掉合法导航。
4. `BottomNavigation` 同时承担导航栏、面板容器和手势，职责过重；`DataList` 则反过来理解了过多业务字段，难以容纳异构 item。
5. 页面大量重复“圆角卡片 + 两行字”，主题色、信息密度、状态反馈和连续操作都不足。

## 2. 当前架构

### 导航

- `BottomNavigation`：纯导航控件，只发出当前 value。
- `TabViewport`：纯面板切换控件，统一横滑、轴向锁、动画和保活。
- `TabRoot`：三个一级面板使用同一个 Screen 组件实例；home slug 变化不再卸载整棵视图。
- `nav.ts`：所有进栈、替换、完成流和返回都写入 `pbScope / pbTab / pbParent / pbRootPosition`。Tab 切换使用 replace，二级页使用 push，完成流回到根或 replace。
- 二级页禁止直接拼业务路由；使用 `pushStack`、`replaceScreen`、`goBack`、`finishToHome`。

### 主题

- `theme-session.ts` 以 localStorage 偏好为权威，并用事件通知 Runtime。
- URL 中的 theme 用于分享和预览，但独立 Runtime 会把旧 history 条目规范化为当前偏好。
- 切换主题使用 replace，不增加 history 条目，也不占用业务 variant。

### 工作壳与 Runtime

- iframe 的启动 `src` 在本次预览期间保持不变，父路由变化通过 bridge `navigate` 指令同步，避免 iframe 重载。
- Runtime 的内部导航通过 bridge `route` 回报 push / replace / back 语义；父层按同一语义镜像。
- 同步以规范化 URL 是否一致为准，不再使用时间窗口或 50ms 回退猜测。

### 列表

- `DataList` 只提供 surface、圆角、阴影、inset 和相邻项分隔；默认 slot 可放任意业务结构，并保留按钮等原生语义。
- `ScrollableDataList` 负责滚动手势和异步触发：`pullRefresh`、`loadMore` 均可布尔开启或传配置；`refreshing / loadingMore / hasMore` 由业务受控。
- 触底请求有重复锁，加载完成后解锁；下拉手势做横纵轴锁定，不与一级横滑竞争。

## 3. 视觉执行规则

- 一屏至少有一个明确视觉锚点：金额、进度、资产或权益票券；不用装饰性渐变堆料。
- 主题色用于关键数字、状态、边框和小面积半透明表面。
- 层次主要由边框、分隔线、阴影、透明叠加和轻量 backdrop blur 建立。
- 列表优先连续排版，避免每行都变成独立卡片；卡片仅用于真正独立的信息模块。
- 页面必须提供足够字段、状态和后续动作，不能停留在“标题 + 描述 + 一个按钮”。

## 4. 必测回归

1. 记账 → 权益 → 券包 → 返回：仍在权益 Tab。
2. 记账 → 我的 → 钱包 → 返回：仍在我的 Tab。
3. 设置切深色 → AppBar 返回 → 浏览器后退/前进：主题不回滚。
4. Runtime 与工作壳分别执行 A → B → 返回，不出现 A/B 循环。
5. 一级点击与横滑使用同一状态，快速切换不吞点击；纵向滚动不误触横滑。
6. 下拉刷新只在滚动顶部触发；横向动作不触发刷新；加载更多不会并发重复触发。
7. 直接打开任意二级深链时，返回使用所属 Tab 的 home 作为稳定兜底。
