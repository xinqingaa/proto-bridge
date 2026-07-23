# 账本星球 · 本轮实现踩坑与规范

> 用途：PBWork 原型实现复盘；需求未完全定稿前先放在 `apps/pbwork/src/prototypes/`  
> 关联需求：`requirements.md`

## 1. 踩过的坑 / 犯过的错

### 错 1：一级 Tab 用「假滑动」

- **错法**：在 Shell `main` 上挂 `usePointerSwipe`，松手 `router.push`；BottomNavigation **未开** `showView`，没有 `v-window`。
- **后果**：能滑但无面板动画；跟手位移残缺；体感像宽度溢出 / 闪切。
- **正解**：一级内容放进 `BottomNavigation` 的 `showView` + 具名 slot，滑动/点击都走组件自带过渡。

### 错 2：在主体 Tab 里嵌套 Tabs

- **错法**：记账首页用 `Tabs` 做年/月/周/日，又与一级横滑同方向抢手势。
- **正解**：主体 Tab 子视图内不用带 window 的 Tabs；周期用分段控件（无 window）。

### 错 3：Tabs「只用栏、不用槽」

- **错法**：`<Tabs v-model />` 不填 slot，业务 UI 放在 Tabs **外面**，只改一行标题。
- **后果**：`v-window` 仍渲染空面板（只显示「月」等字），看起来蠢且冲突。
- **正解**：要用 Tabs，内容必须进 `#xxx` slot，Tab 视图包裹整块内容。

### 错 4：把规则「砍过头」

- **错法**：记一笔的支出/收入也改成 Chip，因为「怕 Tabs」。
- **纠正**：二级栈页可以使用 Tabs；禁的是**主体底栏 Tab 内再嵌**。

### 错 5：周期切不动 / 像没切

- **错法**：用 FilterBar 当周期器，且易被父级横滑吞点击；列表 mock 不随周期变，只有文案微变。
- **正解**：`PeriodSegment` + `data-no-swipe`；`recordsForPeriod` 让日/周/月数据可见差异。

### 错 6：路由同步打断动画

- **错法**：滑动切 Tab 时立刻 `router.replace` 换 Screen SFC → 整树重挂，动画被掐断。
- **正解**：三面板同挂在 `TabRoot` 内本地切 `active`；**滑动过程中** URL 不强同步。

### 错 7：进栈前未校正 home → 返回丢 Tab（第二轮）

- **现象**：在 `ledger-home` 滑到「权益/我的」后进二级页，AppBar 返回却落到「记账」；路径不同时表现不稳定。
- **根因**：一级 `active` 只活在 `TabRoot` 本地；URL 仍是进入时的 home slug；进栈卸载 TabRoot 后，`history.back()` 按旧 slug 重挂，`tab` prop 错误。
- **正解**：
  - `pushStack(tab, slug)`：进栈前若 URL 不是该 Tab 的 home，先 `replace` 到对应 home，再 `push` 栈页。
  - `tab-session`：会话记住当前 Tab，深链/工作台打开某一 home 时以 URL 为准覆盖。
  - **仍禁止**滑动中途换 Screen（错 6）。

### 错 8：主题挂在 history → back 回滚主题（第二轮）

- **现象**：设置里切深色后返回，「我的」又变回浅色。
- **根因**：`theme` 写在每条 history 的 query 里；`replace` 只改当前条目，旧条目仍是旧 theme；`back` 整包恢复。
- **正解（原型内）**：
  - `theme-session`：会话偏好；`Settings` / 拼 URL 都读 session。
  - `LedgerPlanetShell` 在路由变化时若 URL theme ≠ session，用 `replace` 校正（不堆新 history）。
  - 主题与业务 `variant` 尽量解耦（深色优先走 `theme`，不要长期占用 `variant=dark`）。

### 错 9：工作壳对 iframe back 再 push → A↔B 死循环（第二轮）

- **现象**：工作壳里返回经常在 A/B 页来回；独立 Runtime 稍好但仍可能因完成流污染栈。
- **根因**：iframe 内 `router.back()`，父层 `applyRuntimeNavigation` 却对每次 route **一律 `push`**，父 history 变成 `A,B,A',B'…`。
- **正解**：
  - Bridge `route` payload 增加 `navigation: "push" | "replace" | "back"`。
  - Runtime 用 `navigation-intent` 钩住 `history.pushState/replaceState/popstate`。
  - 工作壳按 intent 调用 `push` / `replace` / `back`；`ready` 对齐用 `replace`。

### 错 10：完成流 `push(home)` 污染栈（第二轮）

- **错法**：保存记一笔 / 删除流水后再 `router.push(ledger-home)`。
- **后果**：中间页仍留在 history 下，再 back 又进详情/编辑。
- **正解**：结束流程用 `finishToHome`（优先 `back`，否则 `replace`）；分类回灌用 `replace`，禁止再 `push(home)`。

### 错 11：清爽做成「组件拼盘」（第二轮观感）

- **现象**：每页都是 Card / bordered div 堆叠，字段少、交互单一，像 demo 而不是「清爽效率」产品。
- **正解方向**：
  - 一屏一个视觉锚点（金额 Hero / 进行中活动 / 资产数字网格）。
  - 列表用分割线分层，少「每行一个描边盒子」。
  - 允许**小面积**星球感装饰（角落径向光斑、细渐变条、券票形入口）；**禁止**大面积插画铺底、整屏紫渐变淹没内容。

## 2. 应遵守的规范 / 规则

1. **分层**：Token → 基础组件 → 复杂组件 → 页面 → 原型流转；业务名不污染共享 Token。
2. **优先 DS**：有 Contract 的能力先复用；页内私有 UI 仅补缺口，且只吃 Token（装饰可用 `color-mix` / 少量固定 accent，勿新造业务色名 Token）。
3. **BottomNavigation**：items 全外传；无业务写死默认；Playground 示例 ≠ 运行时默认。
4. **滑动职责单一**：谁管横向切换，谁拥有 `v-window`；其它控件用 `data-no-swipe` / 可点击排除。
5. **Tabs 铁律**：要么整视图进 slot，要么别用 Tabs（改 FilterBar/分段/Chip）。
6. **壳与栈**：一级有 TabBar；栈页只有返回 AppBar。
7. **入口克制**：主操作进 AppBar，不堆 FAB。
8. **原型滚动条**：允许 overflow 滚动，禁止露出系统滚动条。
9. **注册表**：新原型只追加；`screenId` / `path` / `view` 公式与校验一致；未决定前不要擅自删旧原型。
10. **本期不做**：刷新/分页等能力等 DS 补齐后再回填，避免页面私造一套列表基建。
11. **一级进栈**：一律走 `nav.pushStack`；禁止面板内手写 `push` 且不校正 home。
12. **主题**：读/写走 `theme-session`；拼 URL 用 `nav.runtimePath` / `themeQuery`。
13. **完成流**：禁止 `push(home)`；用 `finishToHome` 或语义 `replace`。
14. **Bridge 路由同步**：Runtime 必须带 `navigation`；工作壳禁止对 back 再 push。

## 3. 关键文件（第二轮导航 / 主题）

| 文件 | 职责 |
| ---- | ---- |
| `nav.ts` | `pushStack` / `runtimePath` / `finishToHome` / Tab↔home 映射 |
| `tab-session.ts` | 会话级当前 Tab |
| `theme-session.ts` | 会话级主题偏好 |
| `runtime/navigation-intent.ts` | History 钩子 → bridge navigation |
| `runtime/bridge.ts` | `route.navigation` 字段 |
| `RuntimeLayout.vue` | 发 route 时带 intent |
| `PhoneCanvasView.vue` | 按 intent 同步父 history |

## 4. 一句话复盘

交互骨架必须跟通用组件契约对齐（尤其 BottomNavigation / Tabs 的 `v-window`）；一级 Tab 为保动画可以暂时不跟手写 URL，但**进栈前必须把 home 校正对**，主题必须是会话偏好而不是 history 附件，工作壳必须按 bridge 的 push/replace/back 镜像，不能一律 push。
