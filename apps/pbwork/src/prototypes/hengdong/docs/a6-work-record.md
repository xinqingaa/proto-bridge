# Roadmap A.6 工作记录

## 固定诊断输入

- Job：`job-2026-09-25t023544713-85c5c734`
- Bundle：`bundle-2026-09-25t023544713-85c9699f`
- Run：`run-2026-09-25t023544714-b53a4153`
- Store 文件：`.proto-bridge/store/bundles/bundle-2026-09-25t023544713-85c9699f/runs/run-2026-09-25t023544714-b53a4153.json`
- 原始 Coverage：101 selected、91 captured、10 failed。

以下逐项抄录该 Run 中 `result=failed` 的 `caseId` 与原始 `reason`；记录完成后才修改 authored 原型。

| # | caseId | 原始 reason |
| --- | --- | --- |
| 1 | `hengdong.activity-history::default::light::iphone-14::scenario=hengdong.activity-history.delete-and-undo-history@history-record-restored` | `Fragment hengdong.activity-history.delete-record/ is missing.` |
| 2 | `hengdong.activity-history::month-picker-open::light::iphone-14` | `Required Fragment hengdong.activity-history.open-month/ is occluded at its center point.` |
| 3 | `hengdong.progress::custom::light::iphone-14::scenario=hengdong.progress.apply-progress-custom-range@custom-progress-visible` | `Fragment hengdong.progress.apply-custom-range/ is missing.` |
| 4 | `hengdong.progress::default::light::iphone-14::scenario=hengdong.progress.focus-progress-date@recorded-date-focused` | `Required Fragment hengdong.progress.date-view.week.day/date-2026-08-12 has data-pb-id without data-pb-role.` |
| 5 | `hengdong.progress::filter-open::light::iphone-14` | `payload.nodes.[88].fragment.pbKey: pbKey must be a stable lowercase identifier (letters, digits, '.', '-', '_'); CSS selectors, DOM paths, and array indices are not allowed (got "全部"); payload.nodes.[89].fragment.pbKey: pbKey must be a stable lowercase identifier (letters, digits, '.', '-', '_'); CSS selectors, DOM paths, and array indices are not allowed (got "训练"); payload.nodes.[90].fragment.pbKey: pbKey must be a stable lowercase identifier (letters, digits, '.', '-', '_'); CSS selectors, DOM paths, and array indices are not allowed (got "步行"); payload.nodes.[91].fragment.pbKey: pbKey must be a stable lowercase identifier (letters, digits, '.', '-', '_'); CSS selectors, DOM paths, and array indices are not allowed (got "拉伸"); payload.nodes.[92].fragment.pbKey: pbKey must be a stable lowercase identifier (letters, digits, '.', '-', '_'); CSS selectors, DOM paths, and array indices are not allowed (got "自由活动")` |
| 6 | `hengdong.progress::month::light::iphone-14` | `Required Fragment hengdong.progress.date-view.month/ is occluded at its center point.` |
| 7 | `hengdong.progress::selected-date::light::iphone-14` | `Required Fragment hengdong.progress.date-view.week.day/date-2026-08-12 has data-pb-id without data-pb-role.` |
| 8 | `hengdong.today::default::light::iphone-14` | `Required Fragment hengdong.today.recent/ is occluded at its center point.` |
| 9 | `hengdong.workout-complete::default::light::iphone-14` | `Required Fragment hengdong.workout-complete.save/ is occluded at its center point.` |
| 10 | `hengdong.workout-complete::partial::light::iphone-14` | `Required Fragment hengdong.workout-complete.reflection/ is occluded at its center point.` |

## 根因与修复

1. `history-record-restored`：Run 的 missing 发生在 Scenario **初始** readiness。Core Driver 错将全部四步 Action target 都要求在打开记录前出现；`delete-record` 正确地只在详情 Sheet 中渲染。初始 readiness 改查第一步 target，Runtime 在每一步点击前检查对应 target 的身份、role、可见性和遮挡。场景顺序与 checkpoint 边界未删减。
2. `month-picker-open`：`open-month` 按产品行为被已打开的 BottomSheet scrim 覆盖。默认 Variant 仍要求该触发按钮；打开态的 required boundary 改查 Sheet 内真实可操作的 `month-sheet.close`，并继续要求 Sheet 和月份选项。
3. `custom-progress-visible`：同第 1 项；`apply-custom-range` 只在前一步打开的 FlowSheet 中渲染。动作按实际步骤检查后可完成应用，checkpoint 仍要求自定义摘要。
4. `recorded-date-focused`：日期按钮有 `data-pb-id` 和稳定 ISO key，却没有 role。补 `button` role 和背景、文字、字阶、尺寸、圆角 Token Evidence。
5. `filter-open`：筛选行直接把中文展示文案用作 `pbKey`。改为 `all`、`training`、`walking`、`stretching`、`free`，文案保留中文。
6. `progress::month`：月日历整体高于当前滚动视口，**整个元素**的几何中心落在根 Tabbar 下方；日历上半部分实际可见，没有任何 Overlay 盖住它。
7. `progress::selected-date`：同第 4 项。
8. `today::default`：最近五条记录的长 section 几何中心在底栏下方，但标题和首条记录实际已在首屏。
9. `workout-complete::default`：保存按钮正确禁用；Vuetify 禁用样式的 `pointer-events: none` 让中心命中父 footer，按钮本身完整可见。
10. `workout-complete::partial`：反思表单几何中心在固定保存 footer 下方，表单上半部分可见。

第 6、8、10 项是“长内容滚到固定底栏下”，第 9 项是“节点自身不参与命中测试”，都不是 Overlay 遮挡，而是 Runtime 遮挡门禁对 [Semantic Authoring §6](../../../../../../docs/reference/semantic-authoring.md) 的误判：旧实现对整个元素 bbox 的几何中心做 `elementFromPoint`。修复落在门禁本身（`apps/pbwork/src/runtime/capture-protocol.ts`），不改原型：

- 先按视口和祖先滚动/裁剪容器求节点可见矩形，对可见部分中心做命中测试；
- 节点自身 `pointer-events: none` 且命中祖先时豁免；被 scrim、Sheet 或其它非祖先层覆盖时仍阻断。

E2E `runtime-capture.spec.ts` 的 “Runtime occlusion blocks painted overlays but not scrolled or hit-test-exempt content” 同时断言：滚到固定底栏下的长节点、命中豁免节点通过；被半透明层覆盖的节点、以及被覆盖的命中豁免节点都返回 `fragment-occluded`。该修复对所有原型生效。

曾有一版做法通过移动 `today.recent` 标记、为月日历和部分完成态加自动滚动、局部恢复禁用按钮的 `pointer-events` 来让门禁通过；这些改动已全部撤回，原型的 `recent` 边界、滚动位置和禁用按钮行为与失败 Run 时一致。

## 遮挡截图与层级核对

截图来自真实 Runtime 的 `390 × 844`、light、`iphone-14` 视口，即失败 Run 时的页面；除第 2 项的 Contract 修正外，页面未改动。

| 失败项 | 截图 | 层级核对 | 结论 |
| --- | --- | --- | --- |
| 2 月份选择 | [截图](a6-screenshots/history-month.png) | `v-overlay__scrim` 按设计覆盖背景触发器 | 真遮挡；打开态 boundary 改为 Sheet 内真实内容 |
| 6 进度月日历 | [截图](a6-screenshots/progress-month.png) | 元素中心命中根 Tabbar，日历上半部分无覆盖 | 门禁误判；可见部分中心命中日历自身 |
| 8 今天最近记录 | [截图](a6-screenshots/today-default.png) | 长 section 中心命中根 Tabbar，标题与首条记录在首屏 | 门禁误判；可见部分中心命中列表自身 |
| 9 训练完成保存 | [截图](a6-screenshots/complete-default.png) | 禁用按钮 `pointer-events: none`，命中父 footer | 门禁误判；命中测试豁免 |
| 10 部分完成反思 | [截图](a6-screenshots/complete-partial.png) | 表单中心在固定 footer 下，上半部分无覆盖 | 门禁误判；可见部分中心命中表单自身 |

## 正式定稿

门禁修复后在 PBWork 中对恒动执行整原型定稿（lifecycle 绑定，`review → final`）：

- Job：`job-2026-09-26t032417211-40e6830f`，`completed`，101/101 Case `captured`
- Bundle：`bundle-2026-09-26t032417208-15f95d42`；Run：`run-2026-09-26t032417221-86dca3d2`
- Snapshot：`snapshot-2026-09-26t033131378-19c4d268`；Handoff：`handoff-2026-09-26t035226855-98e574a5`
- Delivery：`operation-47c8739fc2ba433c3607c6b7`，Coverage `complete`、freshness `fresh`

由用户逐项接受的 Preflight warning：登录、注册、训练执行、训练总结 4 个 strict Screen 未声明 `shellFragments` 或 `shellPolicy=replace`。由用户确认的 mandatory risk：`reconstruction-readiness`（同一缺壳声明，32 项 revision）与 `required-unknown`（登录、注册、今天的 `runtime.semantic-coverage` 共 6 项）。这些是原型已有的声明缺口，不属于本批 10 项，留待后续 authoring。
