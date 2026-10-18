---
prototypeId: yike
---

# 一刻实施与验收记录

> 唯一执行进度与问题记录。核实日期：2026-10-18。完整顺序见 [执行方案](./IMPLEMENTATION_PLAN.md)，主题/组件 Promotion Mapping 见 [resources.md](./resources.md)。

## 当前交付判断

产品设计与三套风格草稿已批准，平台升级由用户确认完成。现有正式包可注册并解析三主题×浅深模式，三个核心 Screen 已有局部实现。**七个业务页面均未完成本次逐页对照验收；当前没有正式 Capture/Handoff 完成结论。** 生命周期存量为 active、idle、无绑定产物，允许接续制作；本轮不改变生命周期或 Store。

原先「三页已完成 Quick Check」「ready-for-review」的概括无法代表当前完整交付：它未覆盖批准契约、真实业务数据与状态、共享壳、图形还原和确定性 Runtime。本轮改为以下逐项事实；必要的业务决定保存在[制作沿革](./history/2026-10-18-before-consolidation.md)，重复说明已移除；已有代码保留，旧完成勾选不作为验收。

## 当前执行：批准的玻璃与DS归位批次（2026-10-18）

用户已批准开始实施完整清单。前次“仅记录、不开发”的限制结束；本批以IMPLEMENTATION_PLAN的G1–G5为准。目标仍未完成，不以资源登记或局部测试替代页面接入与六组合视觉。

| 单元 | 当前事实 | 未完成退出项 |
| --- | --- | --- |
| G1 归位 | 年度图类型错误已修；preview-resources.ts七项独立登记清空，所有局部源码、五份预览、资产与测试保留；导航/模式局部文件组合DS Tabbar/SegmentedControl；月历和年度图均组合公共组件 | 在正式页面接入并核对公共组件预览；局部图形仍留原型，不登记为Workbench组件 |
| G2 主题与控件 | 三主题六组合显式玻璃染色/边缘/高光/模糊；DS玻璃Tabbar为根导航目标；SegmentedControl公开glass材质；Button现有primary语义保留，新增accent/danger/quiet固定类型，YikeAction已改公共Button包装 | Button六类型样例和玻璃材质状态完成同步；需浏览器检查六组合对比度/降级、页面实际接入及组件预览 |
| G3 容器/日期 | 已有GlassSurface、公共列表/面板/日期组件；MonthCalendar开放day插槽/dayLabels；Heatmap开放只读绘图与legend插槽，Yike年度图以DS UTC周列为布局数据 | 玻璃组合与共享面板材质仍待制作；月历/年度图对应DS示例、浏览器视觉及正式页面接入待验收 |
| G4 页面接入 | 三个根Screen已共用YikeRoot + DS TabViewport/玻璃Tabbar；专注接入新表盘、DS模式和操作包装，打卡接共享事实，回顾接真实统计与既有周图/月历 | 业务边界、管理页面、完整Runtime与逐页草稿对照尚未完成 |
| G5 验证 | Button/Heatmap/MonthCalendar/SegmentedControl及Yike局部组合有针对性测试；Target映射保持pending | 完整Runtime、六组合视觉与Target baseline收口仍未完成 |

工作区保留未提交改动与未跟踪文件，无Git提交或Store变更。通用主题六个键、公共预览同步、资产和之前各测试文件均保留；Flutter仅更新pending事实，不宣称还原实现。先前批次通过不覆盖当前后续改动。

## 唯一进度表

| 单元 | 状态 | 已有产出 / 下一退出条件 |
| --- | --- | --- |
| A1 基线与文档收敛 | 已验收 | 一刻旧路线图、总计划、主题计划、色值与检查记录收敛到本目录；入口/职责/旧记录明确；当前文档链接校验见本批验证 |
| A2 主题资源提取 | 制作中 | 可重复提取三主题浅深变量、314 组 CSS 属性/值和动态样式/SVG 入口；resources.md 已列完整资源类别与初步映射；数值归并、合法键缺口与图形承接仍需落实 |
| A3 组件盘点 | 待验收 | 已有七页清单；按最新方向复核 DS 变体承接，纠正过早转为自有资源的决定 |
| B1 主题制作 | 制作中 | 六张解析表已补齐表面/字阶/半径/图形宽度及主题资产；Core 资产与对比度已有分批检查；字距/操作尺寸/图形滤镜已有代码。完整六组合视觉及 Target drift 仍未闭合 |
| B2 DS 适配与专属内容 | 制作中 | 七项局部实现保留、独立登记已清空；已有表盘/卡行/周图等，月历/年度图为未验证初稿，先前类型错误已修。导航/切换/操作需优先 DS 变体承接；专属内容直接用于原型，不再要求独立登记 |
| B3 公共组合资源 | 制作中 | 品牌操作与习惯表单已登记；配置、确认、撤销与编辑面板复用公共组件。已有针对性行为测试与机械浅色表单浏览器检查；年度图类型错误已修，后续改动继续检查。六组合视觉、焦点返回/滚动与双机 Overlay 仍待验收 |
| C1 业务状态与保存 | 制作中 | `yike/model.ts` 建立版本化单例状态、四个准确首次习惯、记录/轮次/会话/偏好边界、本机保存、重试与显式损坏数据重置；打卡页已改为消费共享习惯/打卡事实。模型测试覆盖初始化、toggle撤销、删除后不补种、损坏和保存失败。习惯增删改归档撤销、跨页全部接入、存储时钟与Runtime恢复语义仍待完成 |
| C2 计时与统计 | 制作中 | timer-engine覆盖开始/暂停/继续/到点/追加/结束与计圈，按本地午夜切分有效区间；Focus按会话ID幂等入账。完整轮次、阶段开始时固定休息类型、短长休、恢复面板已有首批接入及模型测试；配置设置链路、模式切换确认、边界审计和浏览器旅程仍待完成 |
| C3 共享壳/导航/主题偏好 | 制作中 | 三个根Screen共用`yike/screens/YikeRoot.vue`，DS TabViewport保活、关闭横滑、即时切换，DS玻璃Tabbar经公共tab导航replace；浏览器复现跨Tab计时继续。栈页、恢复/主题偏好/Runtime确定性接线仍待完成 |
| D1 启动 | 待制作 | 尚无正式 Screen；草稿已有品牌静帧 |
| D2 设置 | 待制作 | 尚无正式 Screen，现有设置按钮未接通 |
| D3 专注 | 制作中 | 已接新签名表盘、DS模式/按钮、真实日期/分钟及共享计时，开始/暂停/继续/提前结束/放弃确认/倒计时追加已有入口；休息、轮次、计圈、模式切换确认、设置与恢复等仍未闭环，不能作为页面验收 |
| D4 打卡 | 制作中 | 初始列表现消费共享模型并按真实本地日期派生七天孔位与进度；打卡 toggle 实际写入单一本机数据源；不再展示假历史。撤销提示/Undo、管理流、归档、详情及草稿视觉仍待闭环 |
| D5 习惯详情 | 待制作 | 尚无正式 Screen |
| D6 新建/编辑 | 待制作 | 尚无正式业务表单/承载 |
| D7 回顾 | 制作中 | 已移除固定周值与月标记，按共享记录派生周/月范围、汇总/类型/日明细，接既有周图与DS月历组合，空态不造历史；真实有数据浏览器旅程、跨日/追加展示、日期边界和六主题草稿对照仍待验收 |
| E1–E3 整体旅程与验收 | 待制作 | 按方案完成页面后执行；不以资源单测替代 |
| E4–E5 定稿与固定交付 | 待制作 | 无本轮固定 Evidence/Handoff/Delivery 结果；通过正常生命周期工作流推进 |

## 现有代码审计与问题

| ID | 可复核事实 | 处理单元 / 解决标准 |
| --- | --- | --- |
| I01 | 路线图称主题/页面未开始，总计划和主题子计划重复维护，旧实现说明却宣称三页已检查；主题检查仍称 playground / 绑定基础包，与 pack.json 和 prototype.ts 不符 | A1 已解决：当前状态仅在本文件；重复记录和旧进度入口已移除 |
| I02 | 主题只显式覆盖部分颜色及 Tab 语义，圆角/字阶/材质等沿用基础；组件颜色调整不等于还原完成；页面前景原先也继承基础包 | B1：本轮只修正 color.on-background 引用；六种解析组合的回归检查通过。剩余逐值/视觉验证继续 |
| I03 | Focus.start() 原先设 startedAt = Date.now() - accumulated，而 elapsed 再加 accumulated，暂停继续会重复累计；计时仅倒计时触发 finished，番茄不完成；无全局保存与真实记录 | C1/C2：统一会话转换及累计口径，以可控时钟复现暂停继续、后台、刷新恢复和追加合并后关闭 |
| I04 | YikeDial 的 progress 是完成比例，机械草稿是剩余分钟/60；水位仅低透明矩形，无浸没反色；日影复用机械圆盘加直线；数字/物件比例也不同 | B2：分别还原三物件和0/60/>60语义；真实预览和正式页面各自验证 |
| I05 | Focus 固定「50分钟/第3轮」；CheckIn 固定3个非批准初始习惯及历史；Review 固定数组/月历，跨页操作不更新 | C1/D3/D4/D7：真实首次零历史和四个预置习惯；有数据 fixture 只供明确的 Variant |
| I06 | 设置、新建未绑定操作；打卡设置入口违反只从专注进入的契约；模式禁用取代了切换确认，缺放弃/休息/恢复等主要操作 | D2–D6：按设计补真实热区、动作和反馈 |
| I07 | 三个根 Screen 的 view 不同，组件与导航散在各页；当前 mapping 却写「使用 DS」 | A3/C3：资源分类已纠正；后续改成共享壳与共用机制，按实际实现同步 Registry |
| I08 | Focus 只有 default/running/paused 声明，初始 paused 没有对应初始化；运行数值随真实时间变化；Review default 的 chart 节点只在周视图，切月缺少相应 Variant；其余关键 Action/Scenario 缺失 | D/E：实现独立 deterministic prepare/reset，冻结 fixture 与节点边界，逐个 Scenario 验证；不将 query 更新当成状态准备已完成 |
| I09 | 先前因默认外观不同而过早选择独立文字导航/模式/操作组件，偏离优先复用DS的方向 | A3/B2/B3：优先对应DS的合理变体/微调并在该组件下展示；现有实现保留用于原型，不撤回重做，共享机制保留 |
| I10 | 草稿中的水波/日影等需要的设计值，不是随意新增业务 Token 就可进入现行 Schema；SVG 固定绘制量也不应散落脚本 | A2/B2：把每项映射到合法键、主题包资产/受控 artwork 或有依据的通用扩展；缺口未解决前不宣称 Token 合规 |
| I11 | `pnpm ds:target-sync:verify` 报告现有同步基线的 themes 指纹漂移，components 无漂移；本轮新增主题修正也属于该迭代表面 | B/E3：保留可见 drift，不更新 Target 映射或伪造 synced；资源稳定批次按实际 Target 承接情况收口，最终 pnpm verify 前必须解决 |

## 页面对照与 Experience 记录

| 页面 | 已验收 Variant | 草稿/正式对照 | Delivery | Experience |
| --- | --- | --- | --- | --- |
| 启动 | 无 | 待实现后逐页记录 | 未通过 | deferred：尚无正式实现 |
| 设置 | 无 | 待实现后逐页记录 | 未通过 | deferred：尚无正式实现 |
| 专注 | 无 | 本轮只审阅草稿及源码差异，尚未完成正式等状态截图对照 | 未通过 | needs-focused-review：核心旅程及签名图形存在已知缺口 |
| 打卡 | 无 | 同上，当前数据与布局不等价 | 未通过 | needs-focused-review：核心交互和打孔卡待还原 |
| 习惯详情 | 无 | 待实现后逐页记录 | 未通过 | deferred：尚无正式实现 |
| 新建/编辑 | 无 | 待实现后逐页记录 | 未通过 | deferred：尚无正式实现 |
| 回顾 | 无 | 本轮源码审计，尚无正式等状态截图对照 | 未通过 | needs-focused-review：三主题图形与真实数据待闭环 |

后续每页在本节追加方案规定的对比模板，记录实际截图与修正；此表不把旧记录的模糊声明当作新的 Quick Check。主题资源预览、正式页面体验和固定 Evidence 分别验收。

## 先前批次检查记录

以下为各批次当时的事实；其中自有组件登记策略已由最新指令纠正，不能作为后续执行要求，检查通过也不代表最新未完成源码通过。

### Button 扩展类型同步（2026-10-18）

- DS Button 保留 `primary` 中性操作语义，新增固定 `accent`、`danger`、`quiet`；YikeAction 映射品牌强调、危险、轻量操作到公共类型，不在包装层维护色彩或按钮样式。
- Button Contract、Registry、六类操作 Scenario、Workbench 组件预览、公共手册、Inspector Token 清单和Yike资源归属已同步。玻璃材质预览并置全部六类操作。
- 验证：`pnpm --filter @proto-bridge/pbwork typecheck`通过（含authoring:lint）；`test/button-hierarchy.test.ts`、`test/component-scenarios.test.ts`、`test/yike-habit-form.test.ts`、`test/yike-resources.test.ts`、`test/registries.test.ts`、`test/flex-layout-policy.test.ts`、`test/heatmap-readonly.test.ts`、`test/month-calendar-slot.test.ts`、`test/segmented-glass.test.ts` 共9文件49测试通过；`pnpm docs:verify` 155份Markdown通过；`git diff --check`通过。
- 此记录不表示按钮已接入七页或六主题视觉已验收。

## 2026-10-18 基线收敛批次

- 已完成计划收敛，移除 theme/ 下三份平行文档和仓库路线图里的一刻执行正文；必要业务决定归制作沿革，原始批准设计与草稿不改视觉方向。
- 已生成草稿资源事实索引：3 套主题/浅深、28 个展示状态、314 组 CSS 属性/值、全部 styles 源指纹与动态绘制入口。脚本仅做文档提取，不参与 Runtime/Theme 解析。
- 已建立全页 Promotion Mapping，明确纯文字导航、品牌操作与 DS Contract 的冲突；不通过私有样式或实例换绑解决。
- 已接续一项确定的主题修复：页面文字 color.on-background 引用本包 color.on-surface，避免机械/水位/日影浅深模式继承基础包墨色；主题矩阵回归覆盖六种组合。其余风格缺口保留为制作任务。
- 浏览器读取用户给出的草稿入口，确认全部页面、三种主题选项、浅深切换与「共28屏」，查看机械浅色草稿截图；这仅支持基线盘点，不是正式页面验收。

### 本批验证

| 检查 | 结果 | 范围 / 限制 |
| --- | --- | --- |
| `node apps/pbwork/src/prototypes/yike/scripts/extract-draft-resources.mjs --check` | 通过 | 28 状态、314 组 CSS 属性/值，与当前 sources 一致 |
| `pnpm docs:verify` | 通过 | 本批文档、迁移链接与 Skill 结构校验 |
| `pnpm --filter @proto-bridge/pbwork typecheck` | 通过 | 包括前置 Core build、authoring:lint 和 vue-tsc |
| `pnpm --filter @proto-bridge/pbwork exec vitest run test/yike-theme.test.ts test/registries.test.ts test/workbench-navigation-tree.test.ts test/flex-layout-policy.test.ts test/theme-consumers.test.ts test/runtime-theme-pack.test.ts` | 6 文件、42 测试通过 | 六主题组合解析、包/页面注册、导航树、Flex/设计值与主题消费者。初次与 Core clean 并行导致依赖暂缺，构建结束后重跑通过 |
| `pnpm ds:target-sync:verify` | 未通过，已记录 I11 | 仅报告 themes 漂移；不等于主题解析失败，也不宣称 Target 已同步 |
| Runtime 截图对照 / Capture / `pnpm verify` | 未执行 | 本批尚未交付页面；正式业务状态和整体门禁留在对应工作单元，已知 Target drift 未掩盖 |

本批不修改 Screen/Variant/共享 Contract，不重生成边界，不运行正式 Capture，不冒称整原型验收。

### 下一工作单元

按上方G1–G5执行批准的玻璃与DS归位方案；旧的全局资源逐个登记路线已被替代。

## 文档边界与清理

- 一刻的设计、主题取值、业务组件、制作方案、进度和必要沿革统一在本目录。平台记录中的业务背景和旧交接已迁入制作沿革；过时排期、重复计划和完成勾选移除。
- 仓库只保留一份精简的关键平台升级记录，涵盖六项通用投入；附属主题设计长文和重复批次日志已移除，现行机制直接查权威手册。
- roadmap 仅保留关键平台升级入口，未立项的发散议题移除；不再包含一刻入口、状态、前置门禁或制作说明。业务执行与平台历史分别维护，不互相充当待办。
- 本次仅清理文档结构与引用，不改业务代码、主题或此前的 Target drift 状态。验证：`pnpm docs:verify`（155 份 Markdown）与 `git diff --check` 通过；边界审计确认仓库 `docs/` 与 PBWork 公共手册无一刻内容、附属设计草案无残留链接。

## A→B 资源实施批次（2026-10-18）

本批接续资源制作，不推进 C/D 页面完成状态。

- 主题：每套浅色38项显式值、深色16项覆盖及9项共同映射；新增六份受控 SVG 主题资产。完整16个字阶保留默认系统字族，三套主数字为54/76/58；表面半径18/22/6。恢复不必要地被修改的草稿色，只保留真实门禁要求的少量文字色修正，实际值见 resources.md。
- 实际资源：components、previews、preview-resources.ts 已建立，登记表盘/打孔卡/文字导航/局部模式四项。资源不连接业务存储，不替代正式 Runtime prepare 或页面验收；旧三个页面暂未改动。
- 已纠正：初版预览的 session 初始化返回原始对象导致单选值不刷新，已改为先初始化再从响应式设备读取；原生方向键交互及首个会话即时更新回归通过。预览不再依赖隐藏 legend 的浏览器最小宽度行为。
- 浏览器已观察机械运行与水位运行的完整物件，确认水位裁切、独立今日按钮与名称入口；未把这些检查记为全部主题/材质/状态的视觉通过。
- 公共预览手册、平台架构及 Skill 仅同步“真实扩展由显式登记加载”的通用事实，不写入业务进度。

验证：PBWork typecheck/authoring lint 通过；6份相关单测、53项通过（主题/真实资源/Registry/Flex/预览扩展/Runtime主题包）。后续修改仍需重跑相应检查。Target themes drift 继续如实保留，未刷新基线冒充同步。

下一步先闭合字距、主操作尺寸及材质的合法表达，修正表盘/打孔卡视觉，再搭建回顾图形、年度图和 B3 表单/确认/提示/编辑承载的真实预览。A2、B1、B2均未验收，B3已进入制作；不据此推进页面或定稿。


### B3 组合资源接续

- 新增品牌操作、受控习惯表单及共享面板/配置/撤销演示，Workbench 当前登记六项自有资源。修复向 DS 传入可选 boolean 的类型错误，清除设置行继承的示例文字。
- 表单使用可见字素长度校验与合法本地时间；等待中阻止重复保存。原生时刻输入是现有 DS 缺口的局部承接，不把 DurationPicker 的时长语义改成时刻。
- 机械表盘超小时改为余量加小时说明；整小时保持满圈。资源说明已纠正旧的“60及以上满圈”错误。
- 验证：vue-tsc 通过；5 文件28项单测通过，覆盖实际登记、表盘小时语义、主题、布局、扩展及名称/时间/受控保存边界。浏览器机械浅色已复现空名称错误、合法名称保存与结果提示；尚未据此验收 B3 全部主题或 Overlay 行为。
- 剩余主线：A2 全量映射、B1 六组合视觉与 Target drift、B2 回顾/日期图形及材质、B3 焦点/滚动/独立会话。A→B 未完成。


### B2 回顾周图接续

- 新增并登记 `YikeWeekChart` 与 `ReviewPreview`，三主题分别为25分钟块柱、裁切试管和渐隐墨线；尺度来自真实周数据，支持500分钟夹具，不沿用草稿固定125上限。
- 日期计算复用公共 calendar；无效日期可见反馈，未来日期禁用且不渲染异常输入。公开受控日期选择，再次选择收起；零/负数/非有限输入不伪造正值。
- 浏览器观察机械块柱与完整水位试管，确认大数据切换后的500分钟尺度。尚未完成三主题浅深视觉验收，月历与年度图继续待制作。当前为七项登记资源，不代表页面接入。
- 类型检查、authoring lint 通过。行为测试覆盖日期对齐、25分钟分块、真实尺度、未来/非法输入、选择收起、水位裁切与日影渐隐；布局首次检查发现SVG渐变端点仍为固定模板值，已迁入受控 artwork 后重跑；4文件23项测试通过，文档校验155份通过，草稿提取检查与 git diff --check 通过。


## 批准方案首批验证（2026-10-18）

- G1：七项独立资源登记清空，文件/资产/五份预览保留；YikeTextNavigation、YikeFocusModes改为DS配置包装，不再复制导航/单选结构。
- G2：六组合玻璃参数已写入yike主题包；SegmentedControl公共material=glass接入共享GlassMaterial，Contract/Registry/状态预览/手册同步。浏览器已在公共SegmentedControl页看到yike机械浅色和玻璃/玻璃禁用样本，尚未验收六组合视觉。
- G3：MonthCalendar新增day slot（date/selected/today/disabled）与dayLabels；YikeMonthCalendar保留绘制，日期、禁用、键盘、月份事件改由公共组件承接。
- 验证：首批6文件87测试通过；导航/模式归位后4文件20测试再次通过；vue-tsc与authoring lint通过。后续月历新增检查单独记录，不借用前批结论。文档校验155份通过。
- Target gate已重跑，未通过：components/tokenCatalog/themes/bindPool与同步基线漂移，点名segmented-control；之后月历亦新增公开扩展，Target条目保持pending并写明原因。未刷新baseline或声称Target已实现。
- 本批当时尚未完成G1–G5；Button后续扩展见上方「Button 扩展类型同步」，其余资源与正式页面仍按当前进度表跟进。

### Button 扩展复核（2026-10-18）

- 用户确认按钮扩展色直接修改DS基础组件。沿用已实现的有限语义类型：accent读取当前主题品牌色，danger读取危险色，quiet读取弱化前景；不在Yike另建配色按钮。三主题浅深模式通过同一主题绑定取值。
- 本次复核：Button行为、组件Scenario、Inspector契约、Registry共4文件73项测试通过；vue-tsc与authoring lint通过。六组合浏览器视觉和Flutter Target适配仍未完成，不能据此宣称整原型完成。

### C1 首批共享状态与打卡接入（2026-10-18）

- 新增 `model.ts`：共享版本化本机状态包括习惯、打卡、专注记录、完整轮数、活动会话及主题/计时偏好。首次初始化严格使用批准的四习惯（喝够8杯水、读20页书、每周跑步3次、23点前睡），历史为空；已保存空列表不会补种。打卡以本地自然日与习惯 id 唯一，重复操作撤销。
- CheckIn 停用三条硬编码样例，改为读取共享习惯与打卡记录，按真实日期派生星期孔位、本周进度和完成数，并接入已有习惯图标；存储失败提供重试，损坏数据不覆盖并提供明确重置入口。
- 验证：`yike-model` 4项测试通过；`yike-habit-form` 3项通过；注册与Flex门禁及模型3文件27项通过；PBWork typecheck（包含 Core build、authoring lint）通过。模型测试验证种子值、去重/撤销、删除所有后重载、损坏数据保护、保存失败保留操作。
- 未完成：模型目前不是完整业务仓库，缺习惯 CRUD/归档、撤销操作记录/换日失效、数据迁移策略和Capture prepare/reset接线；另两页仍有独立演示数据，Timer尚未接模型。存储状态恢复后跨午夜更新及浏览器页面检查尚未验收。此批不推进 C1 完成声明。

### C2/C3 计时、根壳与真实回顾接续（2026-10-18）

- `timer-engine.ts`为显式时钟输入的转换函数，暂停/继续不重复累计；后台只校准当前阶段、到点封顶；每秒checkpoint保存有效区间，跨本地午夜切分日期，重载从最后保存点暂停。倒计时追加沿用会话id，结算/取消追加只更新原记录。Focus使用Runtime useClock、新版YikeDial和DS模式/按钮，今天分钟来自真实记录。
- 根Screen的view统一到`yike/screens/YikeRoot.vue`，复用PrototypeShell、DS TabViewport/Tabbar与公共tab导航；保活、无横滑、即时切换。各旧页面移除自制底栏与独立Shell，导航required节点使用当前Screen的DS inspectId。首次尝试壳放在screens外未被Registry视图发现，已移至正式screens目录并复验。
- 回顾改为真实周期、汇总、类型与日明细；`statistics.ts`按日期区间聚合有效秒数，并按会话id去重。已有周图/月历直接接入正式页，摘要和日明细用GlassSurface；无记录时明确从底部开始，不填样例。模型补初始化日期和v1→v2迁移，为最早可查看周期提供事实来源。
- 浏览器实测：机械浅色下四习惯为0/4；打卡后1/4及孔位/进度变化，再次取消回0/4；开始专注→切打卡→切回，仍运行并显示24:26；暂停后54秒按不足一分钟结束，不生成记录。回顾显示0分钟/0次/0打卡和真实空态。测试操作已撤回打卡并结束短会话，无虚构历史留在本机。截图仅为当前浏览器视口观察，未作为390×844草稿对照证据。
- 发现旧页面失效`space-*`/heading等Token造成排版塌缩，已更正使用中的公开spacing/typography键；专注旧局部YikeDial源码保留但已停用。页面仍需完整Token Evidence审计与逐页视觉复验。
- 验证：7文件43项测试通过（模型/计时/统计/资源/周图/Registry/Flex）；vue-tsc、authoring lint、`pb:screens:generate`通过。先前并行运行Core clean/build与Vitest曾造成临时入口缺失，已改顺序并重跑通过；不将该次失败掩盖为业务测试通过。
- 未完成/下一步：共享存储错误可见策略应归入现有Runtime storage能力，避免原型长期另维护存储机制；进一步严格校验会话区间/总秒数与损坏恢复。补番茄休息/完整轮次、计圈、恢复面板、配置固定、模式切换确认；完成习惯管理和设置栈页。当前Variant/Scenario仍不完整，切回focus的URL可能为default而会话仍running，需Runtime fixture/状态同步收口；不能用query替代prepare。Experience为`needs-focused-review`，Delivery与Capture/Handoff未完成，整体目标保持未完成。

### C2 番茄休息、计圈与恢复面板接续（2026-10-18）

- Session新增阶段、开始时固定的后续休息类型和累计计圈点；完整番茄仅首次入账时增加轮数，重复结算不重复增加。完成后提供开始短/长休与跳过；休息不生成专注记录，到点后等待用户操作；离开长休恢复第1轮待开始。修改长休间隔不会改写当前轮已固定的休息决定，休息时长在该休息实际开始时读取配置。
- 正计时运行时可计圈，按有效累计时间派生单圈/累计时间；暂停不能计圈，相同时刻重复触发不生成零时长圈。计圈操作同时checkpoint，保证即时重载时保存的累计时长覆盖最后计圈点。
- 从运行中重开会话时保存暂停状态并展示DS BottomSheet恢复面板，提供继续、结束并记录/不足一分钟不记录或放弃；休息恢复提供继续或跳过。已暂停状态再次重开不重复提示，关闭期间不补计。恢复面板及放弃确认均复用DS Overlay能力。
- 验证：模型/计时/统计/Registry/Flex共5文件37项测试通过；vue-tsc通过。新增测试证明完整第4轮仅计一次、已固定长休不因间隔修改而变化、长休不入账/结束后轮次复位、计圈排除暂停、恢复暂停持久化后不重复提示。
- 未验收：本批新增休息、计圈与恢复面板未做浏览器/焦点/窄屏检查，不能标页面或Experience通过。设置与配置编辑、模式切换确认、自定义倒计时、提示音、存储机制归位、确定性Runtime Variant/Scenario仍待完成；沿用上批`needs-focused-review`，不改变整体未完成结论。
