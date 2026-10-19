# 2026-10-19 返工前记录（已撤回的验收与首轮扫描）

本文件保存返工前的批次记录与 R01–R24 发现时事实，包含当时已撤回的 `accepted` 和误判 R03。它不是当前进度或验收依据；当前事实只看 [实施与验收记录](../implementation.md)。

## 页面对照与 Experience 记录

| 页面 | 已验收 Variant | 草稿/正式对照 | Delivery | Experience |
| --- | --- | --- | --- | --- |
| 启动 | 品牌静帧 | 三物件、浅深、居中、减少动态效果；不增加启动等待 | 通过 | accepted |
| 设置 | 默认、配置、重置确认 | 六组合与配置面板/窄屏，保留既有共享控件 | 通过 | accepted |
| 专注 | 全部21个已声明状态 | 数字/物件、完成/休息/计圈/追加/确认、自定义与窄屏操作 | 通过 | accepted |
| 打卡 | 默认、部分/全部完成、空、归档 | 星期与孔位对齐，独立名称/今日操作，撤销与空态 | 通过 | accepted |
| 习惯详情 | 默认、有记录、每周、归档、对象缺失 | 图标/名称/三项概况/真实年度图与删除确认 | 通过 | accepted |
| 新建/编辑 | 新建、编辑、空名称校验 | 默认空输入、校验、真实编辑与窄屏长表单 | 通过 | accepted |
| 回顾 | 周/月、历史、有记录、仅打卡、仅专注 | 汇总/分布/日明细、周期边界与六组合图形 | 通过 | accepted |

以上为本轮正式页面的 Focused Experience 结论，详见文末逐页对照。主题资源预览、页面体验与固定 Evidence 分别验收；没有宣称全矩阵体验审计或整原型定稿。

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

## 资源优先首批收口（2026-10-19）

按用户最新顺序，先收口 A2/A3、B1–B3，再推进 C/D。已有共享业务和页面保留，本批不扩展业务流程。独立核对对象与退出规格已补入 resources.md；不另建进度表或独立资源登记。

- 审计明确：主题/表盘、导航/模式、操作/图标、打孔卡、周图、月历、年度图、表单、信息组合与面板分别验收；28 个草稿展示态仍不是完整业务 Variant 清单。
- 打孔卡资源已用公共 GlassSurface 承接单层材质，稳定 inspectId + habit key 传入 DS；内容布局继续本地持有，移除原实色底。共享降级机制未复制，正式 CheckIn 尚未改用该资源。
- 月历 day 插槽开始消费 selected。选中日期使用 color.on-primary，并隐藏重叠图形以保留清晰读数；取消选中恢复图形。日期文字补显式 identity/key、typography.caption 和随状态变化的 color Evidence。日期禁用、键盘、月份切换仍由公共 MonthCalendar 管理。
- 表单频率选择接入现有公开 material=glass；未引入新 DS props、Token、Contract 或 Registry 变更。
- 当前公共 BottomSheet/FlowSheet/ConfirmDialog 仍明确使用实色表面，ActionSheet依赖BottomSheet；共享面板玻璃适配是后续 B3 的具体缺口，不能仅凭全局 surface.treatment=glass 宣称已经完成。
- 校正旧汇总中的“表单已登记”和“休息/计圈未实现”等滞后措辞，resources.md 的旧导航/表盘接入说明与现有源码对齐。

浏览器观察：正式回顾机械浅色切月视图，选中2026-10-19，日期以强调底和浅色数字显示，日明细为“这一天还没有记录”，未来日期不可用。此观察使用本机真实日期和空记录，不是固定时钟 Capture，也不替代六组合/390×844草稿对照。卡行资源尚无正式页面入口，本批不把单测当浏览器视觉验收。

本批检查：

- PBWork typecheck（含Core build、authoring lint）通过。
- 主题、资源、表单、周图、月历、年度图、Flex与Registry共8文件47项测试通过。新增月历组合回归覆盖选中前景Evidence、空日收起、闰日未来禁用、不让未来大值影响尺度及非法日期；初次断言误写图形尺寸，改为验证满量程高度等于宽度后复跑通过。
- 草稿提取新鲜度通过：28状态、314组CSS属性/值；docs:verify通过155份Markdown；git diff --check通过。
- DS→Target gate未通过：components/tokenCatalog/themes/bindPool与既有baseline漂移，点名button、heatmap、month-calendar、segmented-control；本批没有改公共Contract/Token或刷新baseline。该结果更新I11事实，不宣称Target已同步。
- 浏览器截图保存在 `output/yike-resource-check/month-selected.png`（不提交）；截图是当前浏览器视口的局部资源检查，未声明390×844或六组合体验通过。

A2/A3、B1–B3继续保持未全部验收。下一资源顺序：六组合主题与表盘对照 → 卡行/日期图形代表状态 → 公共面板材质及焦点/滚动。面板公共变更需同批同步Contract、Registry、预览、手册、测试和Target pending；资源稳定后才回到业务批次。

## 签名资源继续制作（2026-10-19）

当前优先级按用户最新指令收敛：保留所有已完成适配，不撤回、不再扩大玻璃；重点继续三主题表盘、打孔卡和日期图形。设计基线与执行方案已同步此范围，更多区域铺玻璃不再是A/B退出条件。

### 实际改动

- 表盘：日影补16度末端渐隐，径向软边与深色光晕继续使用主题资产；暂停/休息绘图透明度使用受控artwork，不借用disabled语义。水波image铺满容器宽度，消除默认SVG保持比例产生的左右留空。数字/说明的暂停与完成前景、字距和滤镜Evidence与实际显示一致。
- 打孔卡：标题与说明拆出实际字阶/颜色Evidence，机械今日完成前景/底色、过去与今日标记颜色分别对齐显示；继续保留原有独立名称/今日热区和未来只读。
- 日期图形：月历高强度标记不再固定普通墨色，使用Core颜色合成/对比度在现有主题前景间选取；六组合最大量日期的前景回归通过。年度图轴从365天窗口首日开始，周列补齐留白保留，不再把补齐日期当作统计起点。周图重复节点统一.day + day-日期key，避免数字开头key；数值和星期标签分别记录选中/今天字阶与颜色，今天标签恢复品牌强调。
- 已做好的公共材质：BottomSheet、FlowSheet、Confirm的solid/glass与ActionSheet透传保留，复用共享GlassMaterial；各自Contract/Registry/预览/手册和Target pending已同步。Confirm未传showCancel/contained时的Vue布尔默认值与Contract不一致，已修为明确true。没有继续扩展其它容器或新材质类型。
- 全量测试暴露此前主题迁移测试的新增键清单漏了tracking四键、主操作最小宽度和artwork-shadow；仅补齐已存在目录的明确断言，未改迁移规则或放宽检查。

### 资源级视觉观察

使用临时390px宽夹具直接挂载现有资源及真实Core解析表；夹具不登记Screen/组件、不连接业务存储、不进入Capture，检查源码与截图留在output/yike-resource-check，不提交。它只用于未接页资源的最小上下文检查，未新建正式展台或业务组件库。

- 表盘覆盖机械浅色运行/深色90分钟、水位浅色运行/深色暂停半浸、日影浅深运行，观察真实物件比例、数字、反色和末端渐隐；0/60/>60等边界另有行为回归，未声称每个状态×六组合均做视觉验收。
- 卡行观察三主题浅深模式，包含长名称换行、过去/今天/未来、未完成/完成及独立点击反馈；打卡发生在临时内存夹具，不写本机业务历史。
- 日期图形观察机械块柱、试管、日影墨线，以及月历零值/大值/今天/未来和年度创建前/完成/缺失/归档；月历高强度日期修正后复看浅深代表态。年度轴边界与闰日由回归测试验证。
- BottomSheet已有六组合观察、换主题保态与关闭后焦点返回；已实现的三类面板浏览器回归覆盖实色降级。此处只保留既有结果，不再据此展开更多玻璃适配。

### 验证与边界

本批最终验证：

- `pnpm --filter @proto-bridge/pbwork typecheck`通过，包含Core build、authoring lint；`git diff --check`通过。
- PBWork全量59文件418项测试通过，包含六组合主题、月历最大量前景、周图身份/选择、年度轴、表单、组件Contract与布局检查。
- `pnpm test:e2e:runtime`通过9项，验证通用Runtime/Authoring与现有固定回归样本；不表示yike缺少的业务Variant已补齐或正式采集完成。
- 既有玻璃面板浏览器回归3项通过：背景透明、内容层级、降低透明度时切换实色、关闭及BottomSheet焦点返回；只完成已有能力验证，未增加适配范围。
- 草稿提取新鲜度通过（28状态/314组属性值）；`pnpm docs:verify`通过155份Markdown。
- `pnpm ds:target-sync:verify`仍未通过，当批8个组件及components/tokenCatalog/themes/bindPool漂移详见I11；pending原因已按实际变化同步，没有刷新baseline伪造同步。

资源检查不是七页逐页等状态草稿验收，也不是正式Capture/Handoff。Experience页面状态继续保持needs-focused-review/deferred，D/E不推进完成声明。

剩余资源重点：绘图使用primary与草稿独立水色/墨影色的差异仍需在固定资产承接中收口；日期/列表等业务组合需随正式页面核对布局。A2合法值归并与B1/B2尚未全部验收，不能用大量玻璃适配替代这些工作。

### A2/B1/B2 资源收口（2026-10-19）

本批依据用户“草稿只是方向、按具体情况实现”的明确授权验收资源，不再将逐像素偏差作为欠项。正式规格补入resources.md：统计图统一primary、保留三种形状语言；表盘仍用独立资产绘色；公共系统字体/触控尺寸/间距节奏主动继承。水位月历非空数字增加surface底片，解决水面穿过数字导致的背景对比不稳，选中仍复用DS选择态。

- A2：九类设计量已逐类归并到合法键、主题资产、受控artwork或共享基础；原始提取保留314组声明/28状态及来源指纹。手机壳、工具UI与随机历史明确排除。无未决资源映射。
- B1：六组合Core解析、资产与对比度门禁通过；资源实际消费的所有CSS主题变量可解析，间距/动效/禁用透明度与基础包一致的主动继承有回归测试；Workbench与Runtime均由同一真实Registry绑定yike包。
- B2：三表盘、三主题卡行及周/月/年度图完成六组合资源检查；机械0/60/90分钟、水位反色/暂停、日影休息/完成、长名称及今日独立反馈、未来禁用、500分钟尺度、闰日/缺失/归档/创建前等边界由浏览器代表状态与行为测试共同覆盖。DS导航/单选/按钮及既有面板能力保留，不扩大玻璃范围。

浏览器采用真实资源和Core主题表的390px宽临时夹具；截图保存在忽略目录output/yike-resource-check，closed-dial-*、closed-card-*、closed-dates-*、closed-year-*为本批复核；较早完整面板/控件检查见上批记录。夹具根入口已删除，不新增组件登记、不写业务历史、不参与Capture。截图是资源复核记录，不能作为固定Evidence或七页完成证明。

本批同步design.md的授权差异、resources.md的正式规格与继承决定，以及本文件当前进度/问题；公共面板Contract、Registry、示例、组件手册和Target pending的既有同步保留。A2/B1/B2按资源范围验收；B3、C、D、E保持各自状态。下一工作主线为共享业务闭环和页面接入，而非继续扩展资源体系。

本批最终验证：

| 检查 | 结果与范围 |
| --- | --- |
| PBWork typecheck / authoring lint | 通过 |
| PBWork 全量单测 | 59文件、420项通过，包含新增六组合变量解析与主动继承检查 |
| Runtime E2E | 9项通过（28.8秒）；验证公共Runtime/采集回归，不声称七页业务均完成 |
| 面板材质 E2E | 3项通过（5.0秒），检查已有BottomSheet/FlowSheet/Confirm玻璃与降低透明度降级 |
| 草稿提取新鲜度 | 通过，28状态/314组属性值 |
| docs:verify | 通过，155份Markdown |
| git diff --check | 通过 |
| DS→Target同步门禁 | 未通过，已记录I11：8组件及components/tokenCatalog/themes/bindPool漂移；Target保持pending，不刷新baseline伪造同步 |

### 后续范围调整：可演示原型（2026-10-19 用户确认）

通用规范见PBWork principles「原型业务实现尺度」，yike设计已同步实施边界。既有业务规则约束演示结果，不再推导为完整生产级底座要求；历史条目中版本迁移、损坏恢复、完整重试、长后台/时区/换日等穷尽边界不作为本轮未完成退出项。已有实现保留，按页面需要复用，不主动撤回或继续扩建。

后续按IMPLEMENTATION_PLAN的P1–P4执行：先习惯主链（打卡/详情/新建编辑及最小共享状态），再专注与设置，随后回顾/启动和整体演示收口。两条旅程跨页一致、反馈可见、进入返回正确、关键状态可重复演示是业务退出标准；B3随页面完成。正式视觉、语义、Runtime与Evidence门禁保持，当前没有新增页面完成声明。本次只更新规范、设计与计划，未实施P1代码。

### B3 有限组合验收（2026-10-19）

用户要求先完成B3再推进C1–C3，本条替代上一记录「B3随页面完成」的安排。B3验收现有资源组合的可演示行为，不接完整业务存储，不扩大玻璃或资源登记；正式页面接入后的业务结果仍在C/D检查，不重复将资源标为未完成。

- 新建/编辑：空名称就近校验，合法保存去首尾空格；修改后Esc或关闭不污染已保存值，重开恢复原值，关闭返回触发按钮；提醒时刻和周频率字段可展示。
- 配置/确认/反馈：长休间隔修改后确认写入演示状态，越界校验由既有单测覆盖；删除取消不产生确认结果，确认有可见反馈；保存失败状态保留输入且可重试；打卡撤销恢复前值。
- 键盘/滚动：Tab可进入面板字段、Esc可关闭；390px窄屏及480px可用容器高度下，周频率与提醒形成长表单，保存按钮可滚动到视区并成功提交。该缩短高度检查不等于真机软键盘验收，页面接入仍关注键盘遮挡。
- 实例隔离：A/B使用独立设备session和Overlay host；A保存不影响B，B另存后A编辑值不变，Overlay不会挂到另一个host。复位后回到初始演示数据。

新增测试夹具仅位于e2e/fixtures，不进入Prototype/组件Registry、Capture或业务存储；复用真实CompositionPreview与Core主题表。布局将滚动内容和Overlay host分开，与手机预览的机制边界保持一致。没有发现需要修改正式资源或公共Contract的缺陷，现有代码与玻璃能力保留。

复跑入口：`pnpm --filter @proto-bridge/pbwork exec playwright test --config=e2e/yike-composition.config.ts --workers=1`。专用browser测试不加入默认生产构建的路由检查；需先具备Core构建产物。截图位于忽略目录output/yike-b3；本批通过资源视觉复核，未新增正式Screen的Experience或固定Evidence完成声明。

本批检查：专用浏览器测试7项通过（35.1秒，六组合+窄屏）；相关单测3文件17项通过；PBWork typecheck与authoring lint通过；docs:verify通过155份Markdown；git diff --check通过。浏览器检查期间曾因并行Core重建导致临时模块解析失败，重建结束后顺序重跑全部7项通过，最终结果采用该次复跑。公共Contract/Token未变，本批不重复运行未受影响的整原型Capture或刷新Target baseline；I11的跨端pending仍保留。

B阶段资源到此全部收口。下一步为C1–C3的最小演示状态、计时与共享导航接线，接续P1习惯主链；不先建设生产级业务系统。

### C1–C3 最小演示共享业务收口（2026-10-19）

本条为当前 C 阶段结论，替代先前各批次的「未完成」判断；不把 C 的业务接线等同于 D/E 全部完成。

- C1：真实新建 → 打卡/撤销 → 详情 → 取消编辑/保存编辑 → 归档/恢复 → 删除 → 回顾及刷新贯通。所有页面消费同一数据源，取消只丢弃草稿；首次四个习惯零历史。有数据 Variant 仅准备内存样例，不污染本机保存。
- C2：共享会话命令覆盖番茄、倒计时、正计时、短长休、轮次、计圈、追加、模式切换确认和恢复。暂停不计时、结束幂等入账、跨午夜180/120秒归属由可控时钟验证；配置只影响后续阶段。根Tab及管理栈页间计时连续。
- C3：六个正式Screen复用公共导航、TabViewport与Overlay；栈页进入返回、缺失对象回退、主题/浅深/系统偏好及根页局部选择保留完成。修复同URL reset只改路由不清事实、倒计时到点被误识别为番茄、编辑关闭双重返回、重置时主题写入覆盖目的地四项缺陷。
- Runtime新增可选Case准备hook与`usePrototypeCaseReset`，prepare/reset在路由稳定检查前显式通知页面准备；产品Variant更新在fixture准备时抑制，避免样例别名被覆盖。未改变Core协议、Store、生命周期或Handoff。
- 资源归属：管理页使用既有DS Button、BottomSheet、Confirm、GroupedList、DurationPicker、Stepper和既有YikeHabitForm/年度图；主题选择缩略图直接使用已有资产。新增布局为业务组合，不新增DS组件或私有手势/导航实现，无新增DS API缺口。
- Focused Experience（管理页C范围）：详情检查`detail-default.png`、`habit-detail.png`、`detail-dark-delete.png`；编辑检查`editor-default.png`、`habit-editor.png`、`editor-dark-long.png`；设置检查`settings-default.png`、`settings-dark.png`、`settings-dark-config.png`。截图在本地`output/yike-c/`，未纳入Git。390×844及360×640风险面检查阅读顺序、空态、真实记录、主题、删除确认、键盘/滚动保存、文字和遮挡；本范围记为`accepted`。完整七页与批准草稿等状态对照仍归D，未宣称`fully-audited`。
- 检查：PBWork完整单元测试60文件427项通过；`vue-tsc --noEmit`及authoring lint通过。专用浏览器18项全部通过，覆盖全部已声明Variant的prepare/readiness/semantic-snapshot/reset、14条Action/Scenario/Checkpoint、真实跨页CRUD、设置配置、主题、计时和恢复。
- B3键盘回归将Tab检查起点显式设为表单输入，并等待进出动画结束，避免将Overlay容器自动焦点的时序误当作表单控件焦点；关闭后回到触发按钮的断言继续保留。
- 范围边界：不增加生产级存储迁移/完整损坏恢复/后台时区可靠性；D1启动、D阶段完整页面草稿对照、E固定Evidence与跨端Target交付继续保留。I11 drift不通过伪造baseline消除。
- 最终回归：`pnpm test:e2e:runtime` 9项全部通过，含Core Playwright真实采集回归；其前置PBWork构建、类型检查、authoring lint、主题键/边界生成均通过。`pnpm docs:verify` 155份Markdown通过，`git diff --check`通过。
- `pnpm verify` 已实际执行：依赖冻结安装、文档校验及Core/Local Service/CLI/MCP构建通过，随后停在既有I11 DS→Target同步门禁（components/tokenCatalog/themes/bindPool），后续全产品步骤未执行；不宣称仓库总校验通过。此欠项属于E3，不撤销本批C范围已通过的实现与回归结果。

### 详情默认工作台入口修复（2026-10-19）

默认详情Variant原先声明必填`habit`，工作台无对象参数的页面入口因此报`INVALID_QUERY：missing declared habit`。默认Variant改为使用既有页面的默认习惯处理，`habit`继续作为可选业务参数保留；明确对象深链与missing场景声明不变。路由/Registry回归27项通过；真实浏览器验证3977工作台原链接与刷新均显示默认习惯。此改动不改变页面视觉，沿用本批Experience结果。

## D1–D7 原收口记录（2026-10-19，验收结论已撤回）

本条替代先前记录中 D 阶段尚未制作/未对照的判断。按既定设计闭合七页，不逐像素复制草稿，不用生产级业务建设代替页面。所有检查使用正式Runtime、真实DS/本地业务组合与共享模型。

### 实际变更与同步

- 启动新增`launch` Screen及显式root/object/name/promise边界；DS LaunchScreen承接现有三物件。独立Screen固定瞬时品牌帧供Workbench/Capture检查，实际根壳冷启动复用同一Brand内容，本机同步读取完成即显示专注；不设品牌计时器，减少动态效果跳过此瞬时内容，栈页返回不重复启动。水位物件的居中缺陷已修复并以真实bbox回归。
- 打卡补共用星期表头，与卡行七孔和今日按钮对齐；概况减少体积，名称与今日操作继续独立。机械空按钮增加可见加号，无进行中习惯时增加明确的新建按钮。完成数、总数与剩余说明分别声明实际字阶/颜色Evidence。
- 详情补图标和最近一年总计；DS Metric只有大数字字阶且无公开紧凑尺寸，故三列改用本地dl摘要，逐项显式Evidence，不覆盖DS私有样式。年度计数与图形取同一真实365天范围；相关归属已同步resources.md。
- 专注补公共DurationPicker + BottomSheet的1–180分钟自定义时长，确认应用、越界就近提示、取消不改值；补代表性确认/自定义Variant和Scenario。暂停、休息、计圈、追加与恢复继续使用共享会话；完成时不再把下一轮也点亮，预设按钮Evidence随选中前景更新。
- 回顾增加可翻页history fixture与往返Scenario；汇总、周期、日明细及类型文字补显式Evidence。公共MonthCalendar新增默认true的showHeader开关，回顾设false复用外层周期导航，避免可点击但无结果的重复翻月入口。Contract、Vue、Registry、场景/预览状态、组件手册、四个基础/样例包浅深回归和Target pending原因同批同步；没有新增主题键或刷新Target baseline。
- 共享Runtime修复两项实页问题：稳定等待包含有限进退场动画，防止关Sheet后残留遮罩被当作稳定结果；外层文档在独立/嵌入模式均裁切，防止聚焦滑入控件时整屏被滚动并露白。滚动仍由Screen/公共Overlay持有，不复制手势。通用手册同步；截图后检查Runtime顶边仍为0，窄屏主操作可滚动到视区。
- Registry当前7Screen/44Variant/18Scenario；默认边界已重生成。详情、编辑、回顾增加真实记录/周目标/归档、空名称、历史周期等确定性fixture，真实首次仍是四个预置习惯与零历史，样例不污染保存。既有C阶段CRUD、跨页连续计时、主题、重置及回顾同步继续复验。

### 逐页对照与体验证据

截图位于忽略目录`output/yike-d/`，管理页补充截图在`output/yike-c/`；不提交。草稿参考截图为`draft-{页面}-{主题}.png`，取styles gallery真实手机画面并取消缩放、移除边框阴影；保留其原有模拟状态行作为来源事实，正式页安全区由Runtime负责。正式六组合默认截图为`{页面}-{主题}-{模式}.png`。基准为390×844、Asia/Shanghai、2026-10-16 10:24参考时钟；交互计时允许受控时钟推进，窄屏为360×640并启用reduced motion。

草稿有历史画面与正式默认零历史不强行对齐数字；有数据对照使用具名fixture。共同五项结论：结构按批准职责与阅读顺序组织，组件遵循Promotion Mapping，Token/比例/材质形成一致层级，业务状态真实且可重复，操作/反馈/返回可观察。玻璃导航替代草稿文字导航、系统触控尺寸和安全区属已批准差异。

| 页面 / fixture | 选取的风险截图 | 差异、修正与复验结论 |
| --- | --- | --- |
| D1 品牌静帧 | launch机械/水位/日影浅色、日影深色、launch-narrow-reduced | 复用物件而不另造Logo；不显示计时数字或假入口，品牌组居中；修复水位横向偏移，六组合bbox对齐通过。静帧和实际冷启动让路分别检查。 |
| D2 默认/配置 | settings-mechanical-light、settings-sundial-dark、settings-narrow-reduced；yike-c/settings-dark-config | 使用共享AppBar/分组与面板，主题/模式独立；深色配置可读、取消焦点返回，底部重置可滚到且危险确认可取消。提示音为明确的可见意图反馈，不宣称发送通知或播放外部声音。 |
| D3 完成/休息/确认/暂停 | focus-mechanical-light、focus-long-break、focus-countdown-due、focus-abandon-confirm、focus-narrow-controls | 三表盘为首屏焦点；轮次点纠正，短长休不入账；窄屏操作在页内滚动后完整可达。自定义校验面板曾使外层移位，修复后focus-custom-validation背景完整、顶边为0；计圈/追加/模式确认/恢复均有真实操作回归。 |
| D4 默认/完成/空/归档 | checkin-mechanical-light、checkin-completed、checkin-empty、checkin-archived-sheet、checkin-sundial-dark-bottom | 首次不造历史；压缩概况、补星期表头和机械加号。三主题保持同一行结构与独立热区；空态有新建，列表可滚到最后一行及归档入口，撤销后详情/回顾同步。 |
| D5 记录/每周/删除 | habit-detail-mechanical-light、detail-weekly、detail-delete、habit-detail-narrow-reduced | 图标、名称和频率先于紧凑三项摘要，年度图创建前留空而非填随机点；周目标由真实次数计算，删除取消返回原按钮，归档/恢复/缺失对象可退出。 |
| D6 新建/编辑/校验 | habit-editor-mechanical-light、editor-validation、editor-narrow-long；yike-c/habit-editor | 保留公共面板关闭/焦点/滚动，默认空名称；校验提示就近且修正即消失。编辑填入真实值，取消不污染，窄屏周频率+提醒长表单能滚到保存并返回列表。 |
| D7 历史/选中/月/仅打卡 | review-mechanical-light、review-previous、review-selected、review-month、review-only-checkins | 不复制草稿假总数；周月、翻页、日明细真正更新。移除重复月历头，当前周期下一期禁用，未来日期禁用；仅打卡仍显示4次，专注为0，类型只统计专注。 |

【已撤回的原判断】各页最终均为`accepted`（Focused），六组合默认与窄屏/reduced-motion是补充整体探针；不声称所有主题×视口×状态已做完整审计。早期移位、未居中截图只保留诊断用途，结论采用修正后复拍。

### 验证与交付边界

- PBWork typecheck/vue-tsc、authoring lint、边界生成与新鲜度检查通过；全量60文件432项单测通过。
- 专用完整浏览器回归24项通过（2.5分钟），包含B3、共享旅程、全部44个Variant的prepare/readiness/snapshot/reset、18条Scenario/Checkpoint，以及D页面六组合/关键状态/窄屏检查。早期Escape测试抢在面板进入前触发，已等待真实进场稳定再验证；没有移除关闭或焦点断言。
- 末次证据与预览默认样例纠偏后，受影响的8项浏览器复验全部通过（1.3分钟）；品牌居中修正后，六组合七页与窄屏/reduced-motion两项再通过（21.3秒），含居中bbox、外层不移位、窄屏主操作可达断言。
- `pnpm test:e2e:runtime`通过10项（32.2秒），包括Core真实采集回归；它是通用隔离样板验证，不代表已经生成一刻固定交付产物。
- 公共月历真实Workbench预览已观察默认头部与external-month-navigation样例，截图month-calendar-public-preview.png；基础包/样例包浅深四组合单测通过。只新增普通公开组合开关，不新增原型资源登记。
- 草稿提取新鲜度通过（28状态/314组声明）；最终`pnpm docs:verify`通过155份Markdown，`git diff --check`通过。
- `pnpm verify`已执行，冻结安装、docs及Core/Local Service/CLI/MCP构建通过后停在I11，后续全产品步骤未执行。当前9组件及components/tokenCatalog/themes/bindPool漂移如实保留；没有通过修改baseline伪造Target同步。

D1–D7页面制作与验收到此完成。E仍需处理完整产品门禁，以及正常生命周期定稿触发的整原型Capture、固定引用与Handoff/Delivery；本批不改变一刻生命周期，不写入实际Store、不宣称final。


## 短时记录确认增量（2026-10-19）

- 按用户明确要求撤销旧的固定一分钟门槛。默认确认阈值10秒，设置提供5秒、10秒、1分钟、3分钟、5分钟、10分钟和自定义整数秒数（1–86399秒）；设置保存后立即用于后续记录决定，旧存档缺字段时补入10秒，不丢历史。
- 少于阈值使用共享Confirm询问「仍然记录 / 暂不结束」；确认可保存实际秒数，取消或Esc保留会话。达到阈值直接记录。三种模式的主动结束、恢复结束、模式切换及自动到点使用同一逻辑；等待确认不增加时长，休息不记录，已有倒计时记录追加不重复记账。
- 实际秒数进入持久化与统计，低于一分钟的专注在今日汇总和回顾显示秒数。新增short-record和record-threshold确定性Variant及confirm-short-record Scenario；Runtime现为7Screen/46Variant/19Scenario，默认边界已重生成。
- 使用现有Confirm、BottomSheet、Button、Stepper和主题Token，没有新增共享组件机制或DS缺口。实际390×844明/暗页面检查设置与确认面板的阅读顺序、热区、取消、记录后反馈；属于本次增量的Quick Experience Check（quick-checked），不扩大此前D批次验收范围。截图在忽略目录output/yike-d/record-threshold-custom.png与short-record-confirm-dark.png。
- 验证：PBWork完整单元回归434项通过，追加旧存档兼容测试所在文件7项通过（新增1项）；类型检查、authoring:lint、docs:verify、diff检查通过。专用浏览器既有24项通过，新增短记录流程在修正测试定位歧义后单独复验通过（合计25项覆盖）；全部46Variant及19Scenario/Checkpoint通过。没有新增共享DS改动，先前Target drift与E阶段待办保持原有状态。


## 用户驳回后的现状扫描（2026-10-19）

### 结论与检查范围

D1–D7不通过。允许非一比一并不允许丢掉信息、状态区别、页面层级、动作稳定性或DS已有导航能力。此前没有充分执行按全部草稿逐状态对照的体验验收；通过测试不能证明视觉合格，截图生成不能证明截图审查充分。

参考入口是用户指定的 `http://127.0.0.1:3977/workbench/drafts/yike` 的「全部页面」，不是「可交互A」。已读取运行目录全部28帧、六组页面源码与正式七页/共用壳/操作和导航实现，并在实际浏览器查看草稿总览、三主题专注、打卡、详情、编辑、回顾、设置、启动的代表画面，查看正式专注、设置、打卡、编辑、回顾、详情手机预览。这里是首轮差异扫描，不声称已逐帧完成三主题×浅深模式的全体验审计。

实测布局位移来自独立Runtime浏览器1280×720：默认到运行，timer的y从188变155.5，primary-action的y从570.5变538，均上移32.5px。此数值只对应该视口，不外推为390×844测量；手机风险由同一居中布局与条件操作插入共同解释，后续需在主视口记录切换前、中、后位置。

### 全部草稿状态与正式映射

| 草稿组 | 全部状态（28帧） | 正式对象 / 扫描结论 |
| --- | --- | --- |
| 启动 1 | 冷启动品牌静帧 | D1 launch；存在底部本机保存说明缺失，瞬时实际启动的可见性仍需复核 |
| 专注 12 | 待开始、进行中、暂停、短休、长休、本轮完成、放弃确认、中断恢复、正计时计圈、倒计时设置/进行中/到点 | D3 focus及具名Variant；轮次形状、提示、操作区、模式导航和动态布局存在实质问题 |
| 打卡 4 | 部分完成、撤销提示、全部完成、无习惯 | D4 checkin；标题/进度/新建编排、卡片密度与撤销提示对象需恢复清楚表达 |
| 详情/编辑 5 | 每天详情、每周详情、删除确认、新建、校验错误 | D5 habit-detail、D6 habit-editor；导航层级、周目标、操作形式与面板背景上下文偏离 |
| 回顾 4 | 周、选中某天、月、无记录 | D7 review；周期栏、三项统计与空态层级偏离，不能因数据正确而通过 |
| 设置 2 | 表盘选择默认、重置确认 | D2 settings；页标题/分组、预览、列表密度和危险操作均需返工 |

### 差异清单（全部未关闭）

P1表示核心体验/结构问题，P2表示信息与视觉一致性问题；代码依据均为本原型相对路径，DS依据标出全仓相对路径。

| ID | 优先级 / 对象 | 已确认的现状与原因 | 修复验收信号 |
| --- | --- | --- | --- |
| R01 | P1 专注动态布局 | Focus.vue中表盘、轮次和条件按钮全在justify-content:center的同一列；运行、暂停、完成时节点增减导致整组重排，已实测位移 | 主视口开始/暂停/继续前中后表盘和主操作锚点稳定；次操作有布局责任区，长内容仍可滚动 |
| R02 | P1 三模式导航 | components/YikeFocusModes.vue接SegmentedControl（radio/filter），没有PrimaryTabs或模式内容分页；Focus.vue直接更换同一主内容 | 用共享一级Tab/分页能力，点击与滑动方向一致、选中轨迹连续；会话切换确认与取消保持原模式 |
| R03 | P1 根导航动效 | screens/YikeRoot.vue将TabViewport时长设为motion.duration-instant，常量值0；swipe和mouse-swipe均false | 恢复合理的公共导航过渡；是否支持根页面手势按导航职责明确，不能以0ms替代正常动画，reduced motion单独降级 |
| R04 | P1 主按钮形状 | YikeAction仅包装公共Button，未表达草稿胶囊形；运行读取圆角12px，草稿54px高/27px圆角 | 通过公开变体、必要DS扩展或合规局部外观恢复胶囊签名，不改公共Button默认值波及全仓 |
| R05 | P1 轮次图形 | Focus.vue把done/current都画成同一种实心小圆，且三主题没有轮次图形区别；草稿机械短条、水位水滴、日影斜方块，并区分完成/当前/未来 | 三主题分别保留签名与状态区别，按真实已完成轮数/休息显示，不照搬草稿固定第3轮 |
| R06 | P1 专注信息遗漏 | 待开始没有渲染「专注25分钟·短休5分钟」；旧yike-primary/yike-modes样式仍在但无对应实际节点，不能认为CSS存在即实现 | 待开始显示实际配置摘要，设置返回同步；运行时同一区域承接次操作而非推挤全页 |
| R07 | P2 阶段说明 | 休息轮次仅回显caption，未保留草稿「第N轮已完成·休息一下/全部完成」；非番茄在表盘外再次输出caption | 让轮次行表达阶段事实；移除无信息增量的重复caption，保持表盘为主焦点 |
| R08 | P1 计圈操作编排 | Focus.vue将暂停、计圈、放弃和圈列表依次堆入同列；草稿紧凑表盘+当前圈置顶+成对操作 | 在相同计圈数据下审查首屏密度、按钮主次、当前圈顺序和列表滚动，不用按钮可点击代替构图验收 |
| R09 | P2 专注文案 | 日期为ISO；待开始也称「第N轮专注」，放弃统一称「放弃本次」；与阶段和草稿语气不一致 | 按本地日期/主题表达、待开始/运行/休息分别给出清楚文案，三模式操作语义一致 |
| R10 | P1 设置层级 | Settings.vue以AppBar「设置」加大标题「选一件桌上的物件」，代替草稿返回/设置/表盘/外观/番茄的阅读顺序；缺显式外观分组标题 | 恢复工具型设置页层级；新增阈值归入清楚分组，不遮盖原有设置结构 |
| R11 | P2 设置预览 | 静态assets图没有展示与草稿相同的带时间状态迷你物件；正式机械预览无彩色扇面、水位近似整块色形，不能充分预览所选主题 | 主题选择看得出真实机械扇面/水位/日影效果；预览与实际表盘一致，使用合规资源或共享绘图 |
| R12 | P1 设置密度 | GroupedList现有布局使名称和值分成上下错开的阅读位置、行高显著扩大；主视口可见配置项减少 | 同行名称/值/箭头对齐、组间距适当，默认主要设置无需被宣传型标题挤出首屏 |
| R13 | P2 设置危险操作 | 正式为独立danger Button，草稿是独立危险列表行+底部本机说明；现还混入提醒实现说明 | 重置与配置组有清晰间隔、视觉克制，底部文案面向用户；确认覆盖范围准确 |
| R14 | P1 打卡标题编排 | CheckIn.vue用日期+「今天的习惯」+单独大进度区，草稿是「打卡」+今日小进度+同行新建；首屏重心被改写 | 标题/进度/新建紧凑协调，优先展示卡片，不用多层标题或独立大统计抢焦点 |
| R15 | P2 打卡卡片密度 | 正式玻璃卡片留白、间距和描边明显增加；草稿紧凑打孔卡在首屏呈现更完整习惯列表 | 相同数据/视口对照卡片高度、四卡可见范围、星期与孔位对齐，保留已批准玻璃但不让材质主导密度 |
| R16 | P2 撤销提示 | CheckIn.vue提示仅「今天已打卡/取消」，丢掉草稿中的具体习惯名 | 连续给不同习惯打卡时提示明确对象，撤销对应最近事实 |
| R17 | P1 详情层级 | HabitDetail.vue是通用居中AppBar「习惯详情」+内容里的编辑按钮；草稿顶部返回打卡/右侧编辑，下面才是习惯对象 | 页面以习惯对象为主，编辑位于清楚导航层，返回保持来源与状态 |
| R18 | P2 详情目标/操作 | 三项统计只给次数，daily未呈现本周完成/应有天数；weekly仅文字，没有目标孔位；归档/删除改为大按钮且弱化保留记录说明 | 用真实数据表达daily目标和weekly目标图形，归档/删除以克制分组表达且解释后果 |
| R19 | P1 编辑背景上下文 | HabitEditor.vue进入独立PrototypeShell后再开expanded BottomSheet；实际是同名AppBar+同名Sheet两层标题，背景不再是草稿中的打卡/详情上下文 | 共享Overlay保留来源页面上下文，标题/关闭仅各一处有效责任；直达URL有合理底页且不复制Overlay机制 |
| R20 | P2 编辑字段节奏 | 正式频率缺独立可见标题，提醒是另一种左侧控件编排，保存按钮非草稿胶囊；字段间距/面板占比不同 | 名称/图标/频率/目标/提醒阅读顺序清楚，统一开关位置，键盘出现后保存可达且背景不跳 |
| R21 | P1 回顾信息层级 | Review.vue新增「时间去了哪里」大标题，全宽范围控件和独立周期栏，大卡片取代草稿紧凑三列统计 | 恢复「回顾」任务标题、范围与周期的清楚关系、三项同级统计，图形不被上方层层区块挤出首屏 |
| R22 | P2 回顾空态 | 零记录仍渲染周图骨架/刻度，草稿是三项零统计后以小物件和去专注组成明确空态 | 零历史、仅打卡、有专注分别审查；有信息则展示，无专注时有明确解释与入口，不堆空图 |
| R23 | P2 启动承诺 | Brand.vue未实现草稿底部「只在本机保存」；实际冷启动onMounted立即移除品牌，其是否真实可见未有充分证据 | 独立静帧保留完整承诺；实际启动不人为等待，但不以独立Screen截图冒充真实启动可见性验证 |
| R24 | P1 验收方法 | 既有浏览器测试多断言可见/路由/无横溢/Runtime顶边为0；没有模式分页动效、表盘和操作锚点、信息不遗漏、草稿三主题轮次签名等断言 | 行为、布局、动效、信息和视觉对照分别验证；截图必须指出差异和接受依据，不能只生成后归档 |

### DS能力判断与本次欠缺

目前证据首先指向错误选型和主动关闭能力，不支持笼统宣称DS整体退化：DS的PrimaryTabs仍有useSlidingSelection与横向窗口过渡，TabViewport仍有公共滑动/过渡能力；原型却选了SegmentedControl代替一级Tab，并把根分页时长设成0。公共Button现有形状是否需公开变体、分组列表是否需紧凑布局，要在组件独立预览与原型接入两侧分别核对，尚未验证的项不得写成DS缺陷。

我的主要欠缺是：把非一比一授权解释得过宽；没有以全部28帧建立逐状态差异与信息清单；把组件复用当成视觉符合，未优先保住草稿签名；重功能终点、轻状态变化过程；用通过测试和生成截图替代设计判断；在已知页面差异未充分审查时过早写accepted。此前批准玻璃导航等局部方向不等于批准任意标题、密度、形状或关闭动效。

### 返工顺序与退出条件

1. 先完成D3+共享导航/操作：R01–R09、R24。固定草稿12态与正式变体对应，恢复一级Tab/分页和操作稳定性；再检查三主题各自轮次、按钮及摘要，不先大面积美化。
2. D2设置：R10–R13。以草稿默认/重置两帧恢复层级与紧凑分组，保留新授权的10秒确认阈值及全部选项。
3. D4–D6：R14–R20。对齐打孔卡信息密度和详情目标、导航动作，修复编辑上下文及字段节奏，继续保留已验证CRUD行为。
4. D7+D1：R21–R23。回顾四态及启动承诺，区分真实零历史与有数据fixture，不复制草稿假数字。
5. 每批将问题从未关闭改为已修/复验通过，至少做L2 Focused Review；全批按28帧映射记录覆盖，主视口390×844及窄屏风险、三主题浅深模式、正常动画与reduced motion分别检查。不得把静态截图当作动效证据；不得把功能测试通过写成用户已验收。

本轮只修正文档和交付判断，没有改业务UI或共享DS。后续必须先修复并出具对照结果，再进入E，不在本次扫描里重新授予accepted。


