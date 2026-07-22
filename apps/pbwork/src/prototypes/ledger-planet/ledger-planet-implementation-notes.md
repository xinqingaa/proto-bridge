# 账本星球 · 本轮实现踩坑与规范

> 用途：PBWork 原型实现复盘；需求未完全定稿前先放在 `apps/pbwork/src/prototypes/`  
> 关联需求：`ledger-planet-requirements.md`

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
- **正解**：三面板同挂在 `TabRoot` 内本地切 `active`；URL 不必每次强同步（或以后用 query，勿拆组件树）。

## 2. 应遵守的规范 / 规则

1. **分层**：Token → 基础组件 → 复杂组件 → 页面 → 原型流转；业务名不污染共享 Token。
2. **优先 DS**：有 Contract 的能力先复用；页内私有 UI 仅补缺口，且只吃 Token。
3. **BottomNavigation**：items 全外传；无业务写死默认；Playground 示例 ≠ 运行时默认。
4. **滑动职责单一**：谁管横向切换，谁拥有 `v-window`；其它控件用 `data-no-swipe` / 可点击排除。
5. **Tabs 铁律**：要么整视图进 slot，要么别用 Tabs（改 FilterBar/分段/Chip）。
6. **壳与栈**：一级有 TabBar；栈页只有返回 AppBar。
7. **入口克制**：主操作进 AppBar，不堆 FAB。
8. **原型滚动条**：允许 overflow 滚动，禁止露出系统滚动条。
9. **注册表**：新原型只追加；`screenId` / `path` / `view` 公式与校验一致；未决定前不要擅自删旧原型。
10. **本期不做**：刷新/分页等能力等 DS 补齐后再回填，避免页面私造一套列表基建。

## 3. 一句话复盘

交互骨架必须跟通用组件契约对齐（尤其 BottomNavigation / Tabs 的 `v-window`），不能「看起来像 Tab」却自己造半套手势；规则要按导航层级裁剪，不能一刀切把二级页的 Tabs 也砍掉。
