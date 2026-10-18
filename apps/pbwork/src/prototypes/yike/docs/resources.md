# 草稿到正式资源的映射

本文件承接执行方案 A2/A3 与 B1–B3，记录资源规格和归属；进度及验收只看 [implementation.md](./implementation.md)。原始值与来源由 [draft-extraction.md](./draft-extraction.md)生成，产品语义以 [design.md](./design.md) 为准。

## 最新归属决定

2026-10-18 用户批准 [执行批次](./IMPLEMENTATION_PLAN.md#已批准的执行批次2026-10-18)：三主题各浅深模式、共享玻璃容器，直接使用DS玻璃Tabbar，取消纯文字Tabbar变体方案。普通DS props和主题取值不登记独立资源；真正的通用扩展在对应DS组件中展示；表盘等业务内容留在原型。

七项旧独立资源登记已清空，源码/资产/预览/夹具保留。后文的制作存量说明不代表组件大模块仍有独立入口，也不代表所有内容已接入页面。玻璃切换通过公共SegmentedControl的material能力展示，其余归位按执行进度接续。

| 使用区域 | 承接 | 三主题适配范围 |
| --- | --- | --- |
| 根导航 | DS玻璃Tabbar，图标+文字+选中底 | 柿子/苔绿/靛蓝强调，独立玻璃染色与浅深模式 |
| 模式/范围/频率 | SegmentedControl，公共material=glass | 共用单选/键盘/禁用；主题控制材质与字阶 |
| 主次/危险/轻操作 | 优先Button现有glass；确需时扩展有限公开能力 | 主题染色与操作层级，不做平行按钮体系 |
| 图标操作 | IconButton已有glass | 主题前景/焦点与材质 |
| 分组/卡行/概况/当天记录 | GlassSurface与公共列表组合 | 三套边缘/圆角/高光，避免嵌套玻璃 |
| 编辑/配置/确认 | 共享面板+必要玻璃能力 | 焦点/关闭/滚动机制共用，内容可读 |
| 月历/年度图 | MonthCalendar/Heatmap必要展示扩展 | yike提供数据与图形，日期交互复用 |
| 表盘/周图/表单内容 | 原型本地实现 | 保留三套签名与业务行为，逐页接入 |

## Theme binding 与提取边界

正式包为 `yike`，`scope: prototype`，继承 `pbwork-base`；主题为 mechanical/water/sundial，默认 mechanical，各有 light/dark。Runtime/Workbench 已通过真实 Prototype Registry 绑定这个包，不能再描述为 playground 或绑定基础包。跟随系统是偏好，不是第三个主题模式。声明采集时钟见 prototype.ts。

六张正式解析表已补齐页面/次级表面、标题/正文/数字字阶、卡片与控件半径、图形宽度和主题资产，并保留 Tab 映射；尚不能据此认定为完整风格。颜色、形状、字重、间距、图形及材质要共同匹配。公共字体族固定默认系统栈；三套的字重、字号和字距差异保留为提取需求。

| 草稿来源 | 正式承接 | 制作约束与剩余决策 |
| --- | --- | --- |
| `--ys-bg`、`--ys-ink` | color.background、color.on-background / color.on-surface | 本包页面文字应使用自己的墨色；共同引用保留包内主题和深色覆盖 |
| `--ys-surface`、`--ys-sunken` | color.surface、color.surface-recessed | raised/selected/variant 表面仍须逐项审核继承，不能默认基础灰就是一刻 |
| `--ys-muted` | color.on-surface-muted | 原始低对比文字需调整；正式值与草稿差异见下一表 |
| `--ys-accent`、`--ys-on-accent`、`--ys-accent-soft` | color.primary、color.on-primary、color.primary-soft | 核心文字配对遵守 Core 对比度；半透明原值不能直接替代混合实色 soft 的语义 |
| `--ys-danger` | color.error 及相应前景/柔和底 | 只用于危险/错误状态；核对确认层实际表面 |
| `--ys-line`、`--ys-line-strong` | 装饰分隔与交互轮廓分别选 color.divider / color.border / color.outline 及 border 组合键 | 草稿透明细线不应全变成高对比粗轮廓；对比度合规与视觉职责分开核对 |
| `--ys-scrim`、`--ys-lift` | color.scrim、elevation.* 等现有键或已记录的合法扩展 | 需要检查半透明合成、浅深层级，不以固定 CSS 回填 |
| `--ys-radius`、`--ys-radius-sm` | 语义 radius.surface / radius.control-compact 等 | 机械 18/12、水位 22/14、日影 6/4 是原始参考；不同职责的半径不能共用一个键硬凑 |
| `--ys-title-weight`、`--ys-heading-weight`、`--ys-title-spacing` | typography.* 角色与现有可表达的文字控制 | 机械标题较重、水位较轻、日影留字距；字距如缺合法键先记录，不退回基础字阶完成声明 |
| `.y-screen`、`.y-actions`、`.y-habit` 等布局 | spacing.*、size.*、合法布局常量 | 原始 CSS 数值清单已覆盖；须人工按角色归并。24px 侧边距、卡行 12px 间隔等不能因现有代码引用未定义变量就算映射 |
| 三种主物件的大小/数字 | size.plot / size.brand / typography.numeric-* 等现有角色或合法扩展 | 机械 312×312/54px，水位 236×368/76px，日影 316×404/58px（原始参考）；一个方形 size.plot 不能等价承接三者 |
| `--ym-rim`、刻度、扇面、旋钮、握点 | 自有表盘的受控 SVG artwork 与主题配色 | 剩余分钟按真实 60 分钟刻度绘制；不能用会话完成比例反转或拉满扇面；SVG 固定几何进入 artwork，不散落组件脚本 |
| `--yw-water`、`--yw-water-break`、`--yw-wave`、`--yw-submerged` | 自有水位视觉资源及合法主题键/材质 | 深浅水面、休息、波纹与浸没反色均有独立原值；仅把矩形背景设为 primary 不满足草稿 |
| `--yd-shadow`、`--yd-shadow-strong`、纸面/软影 mask | 自有日影视觉资源及合法主题键/材质 | 日影是长方纸面与软影，深色为浅色光晕，不能以机械圆盘加一根线替代 |
| 暂停/休息/完成/打卡反馈与 reduced motion | motion.*、opacity.* 与共享反馈 | 运行派生进度不是固定设计值；暂停冻结图形与数字，减少动态效果直接到结果 |
| `.ys-phone`、状态栏、外壳阴影、`.yk-suite*` | Workbench/设备壳 | 只用于草稿展示，不提升为业务 Token，也不复制到正式页面 |

### 核心品牌色与对比度修正

已用 Core 对比度门禁复核原来的统一加深/提亮处理。三套深色与日影浅色恢复草稿 accent；机械/水位浅色的文字主色仅保留满足 primary-soft 配对的修正。机械扇面与水位填充由主题 SVG 资产保留草稿绘制色，不被文字配色修正带动。

| 主题/模式 | 草稿 accent | 当前 color.primary |
| --- | --- | --- |
| 机械浅色 | #c65a3a | #b1492e |
| 机械深色 | #da6a47 | #da6a47 |
| 水位浅色 | #5c7a5d | #587559 |
| 水位深色 | #86a685 | #86a685 |
| 日影浅色 | #2f4a80 | #2f4a80 |
| 日影深色 | #93a9db | #93a9db |

对比度通过 Core 解析实际确认，不能以「浏览器没有控制台错误」证明。品牌绘制色和文字/操作语义色是否需要分开，应在合法键范围内明确，不把整套图形随修正变色后悄悄算作还原成功。

## Promotion Mapping

这是全页资源决策表，取代旧说明中「根导航、Tab、按钮已经使用 DS」的不准确概括。下列组件名为制作职责，不代表已创建文件或已登记。实际状态在 implementation.md。

| 资源 / 草稿来源 | 使用页面 | 归属与承接方式 | 代表状态与 DS 缺口 |
| --- | --- | --- | --- |
| 品牌物件 / LaunchScreen、Dial | 启动、空态、设置缩略图 | DS LaunchScreen/BrandMark 的公开插槽 + 同一自有签名图形 | 三主题、浅深、静帧/reduced motion；不复制启动/导航机制 |
| YikeDial / Dial.vue | 专注、设置预览、启动 | 原型本地内容；三个视觉分支共享时间语义，允许拆文件，不登记组件大模块 | 待开始/运行/暂停/休息/完成、0/60/>60 分钟；RingProgress 无法承接三种物件形状与反色/软影 |
| 主次操作 / `.y-button` | 专注、编辑、确认内容 | 优先 DS Button 公开能力和合理变体；YikeAction已改为公共Button的配置包装，主操作用accent、次操作用outlined、危险用danger、轻操作用quiet，待页面接入 | 草稿品牌色、不同主题高度/字距、描边次要/危险/轻量动作；DS 主要操作绑定 color.action（中性色），不能把它视作缺一个 primary 覆盖，也不能换绑 DS 实例 |
| 根导航 / TabBar.vue | 三个根页面 | 直接使用 DS 玻璃 Tabbar + 共享 prototypeNavigation / TabViewport；现有局部文件已改为公共Tabbar配置包装，待正式壳接入 | 用户已批准玻璃容器、图标+文字与选中底，替代草稿纯文字基线；不复制路由/保活机制 |
| 局部模式 / `.y-modes`、`.y-segmented` | 专注、回顾、设置、编辑 | 统一优先DS SegmentedControl及公共glass材质；已有局部模式文件已改为DS调用，不继续扩展平行切换组件 | 当前选择、禁用/确认切模式、键盘；不得把无 viewport 的模式选择用一级 Tab 冒充 |
| 轮次与计圈 / `.y-pips`、`.y-laps` | 专注 | 原型自有展示，不持有第二份会话 | 第1轮/当前轮/四轮、无圈/有圈/暂停；列表消费同一模型 |
| 时长与提醒选择 | 专注、设置、编辑 | DS DurationPicker（时长）/ 原生 time 输入（提醒时刻）；设置值选择复用共享 BottomSheet/ActionSheet | 取消/确认、配置上下限、运行中修改后续配置；不能复制草稿 Sheet 的遮罩/手势 |
| 打孔卡行 / CheckInScreen.vue、PunchButton.vue | 打卡 | 原型自有行与标记组件，名称与今日按钮分开；公共星期表头在列表层 | 四习惯、空/部分/全完成、今天/过去/未来、周目标；机械孔、水滴、首字印章；不套通用 ListCell 改成另一套卡布局 |
| 习惯图标 / HabitGlyph | 打卡、详情、编辑 | 优先 DS Icon 的现有稳定资源；确有品牌形状则共用一份自有 artwork | 叶子/书/水杯/脚步/月亮/拉伸；编辑选择保留可读名称和焦点 |
| 分组信息行 / `.y-list*` | 设置、详情 | DS GroupedList + ListCell 公开 props/slots | 普通/危险/选中/带说明；只在公开 API 无法承接时记具体变体 |
| 名称、频率、次数、提醒 | 编辑 | DS TextField、SegmentedControl、Stepper、Switch 公开组合；提醒时刻使用原生 time 输入 | 空白/超长校验、每日/每周1–7、提醒开/关、取消和重复提交；图标组为自有选择内容 |
| 编辑承载 / HabitEditorScreen.vue | 新建/编辑 | DS FlowSheet/BottomSheet 公共机制，业务表单为内容 | 新建/编辑、键盘、滚动到字段和保存、关闭丢弃；禁止复制草稿 `position`/手势层 |
| 归档列表 | 打卡、详情 | DS BottomSheet + GroupedList/ListCell 内容 | 空/非空、恢复、关闭；恢复不产生打卡 |
| 放弃/取消/删除/重置/恢复 | 专注、详情、设置 | DS ConfirmDialog / ActionSheet / BottomSheet 公开容器 + 业务内容 | 取消/确认、危险范围、焦点返回、冻结恢复、后台计时；机制不自造 |
| 撤销与保存失败 | 打卡与全局 | 共享 Toast/TransientNotice 机制 + 业务撤销/重试状态 | 当前操作/替换/过期/换日、持续失败提示；提示只补充真实内容变化 |
| 周/月总结、记录行 | 回顾、详情 | DS Metric 与列表公开组合 | 零/非零、跨日/追加后的同一记录、仅打卡；主题字阶仍需匹配 |
| 周图 / `.y-chart*` | 回顾 | 先核对 DS MiniBars；三主题的块柱/试管/墨线不能公开表达时用自有图形 | 0/选中/今天/未来、分钟尺度与日期一致；不复制只改颜色的通用柱图当作全部风格 |
| 月历 / ReviewScreen.vue | 回顾 | 先核对 DS MonthCalendar；水杯/印点等单元用公开 slot 或自有图形 | 月份边界/前后翻页/今天/选中/未来禁用；共享日历计算，不自造手势 |
| 年度图 / HabitDetailScreen.vue | 详情 | 先核对 DS Heatmap 真实日期 API；主题符号通过合法扩展或自有绘制 | 零历史、创建前、已归档、未来与真实完成日期；不复制草稿随机热力样例 |

## 预览与正式证据边界

- 用现有 Workbench 手机预览选择真实包/主题/模式；主题来源表检查真实值和继承，不自建第二套主题编辑器。
- 原型专属内容可放在本地 `components/`，不要求新增 `previews/` 或 `preview-resources.ts`；DS 变体在对应组件下展示。既有源码、预览与夹具保留，独立登记清空，后续按页面接入整理。原有表盘、打孔卡行、文字导航、模式、品牌操作、习惯表单与周图独立登记现已清空；实现及预览均已存在。screens/focus/YikeDial.vue 仍是旧页面局部实现，页面接入由后续单元处理，不能把资源进展记作页面验收。
- 仅组合 DS 公开 props/slots 不登记为原型新增变体。确需登记的 DS 变体遵守[预览工作流](../../../../docs/workbench-preview.md)。
- 预览通过后，业务实例另加稳定 inspectId / 显式 data-pb-id、role、key 和 Token bindings，页面声明 required boundary 与关键交互场景。预览不进入 Capture/Handoff。

## 已落地资源与剩余适配

- `components/YikeDial.vue`：输入 minutes/total/digits/caption/tone；机械图形以60分钟为固定尺度，水位以会话比例裁切，零值不画扇面，整小时画完整圆，超过一小时按小时余量绘制并补充“另有/已满 N 小时”；数字仍显示实际时长。水位重复读数仅用于反色并 aria-hidden。静态图形与绘制色位于六份 `theme/assets/*.svg`，以 asset.brand-mark 固定包身份和摘要；受控几何位于 dial-artwork.json。
- `components/YikeTextNavigation.vue`：已改为DS Tabbar的目的地配置包装，使用图标和文字；正式壳后续连接共享导航/TabViewport。
- `components/YikeFocusModes.vue`：已改为DS SegmentedControl的模式配置包装，使用material=glass，共享单选、方向键与禁用行为，不拥有viewport；旧mode-artwork.json保留存量。
- `components/YikeHabitCard.vue`：名称与今日按钮各发独立事件；过去/未来记录只读，未来不显示完成。七日数据由调用方提供，不生成历史。六种习惯图标共用 YikeHabitGlyph，来源为 Lucide 公开组件，尺寸/描边从主题读取。
- 五个存量预览文件保留，preview-resources.ts 已清空七项独立登记，状态写入设备 session，支持复位与独立复制；普通 DS Button 仅用于演示工具，不登记业务变体。

尚需闭合：标题/导航/表盘说明已接入通用 tracking 角色；表盘外阴影、日影渐隐边缘/暂停透明度、水波细节及打孔材质仍需对照；主操作最小宽度已接入 size.action-min-inline；图形滤镜接入 effect.artwork-shadow。不能以几项可解析字阶或现有门禁通过宣称全部主题量已映射。周图已有三形态与日期输入实现；月历已组合公共MonthCalendar；年度图已组合公共Heatmap的只读plot插槽，均未完成浏览器视觉验收；B3 已有操作/表单/配置/确认/撤销组合预览，仍待六组合视觉与焦点/滚动验证；上述资源需六组合视觉复验后才能验收。


### 操作与编辑组合

- `YikeAction.vue`已改为DS Button配置包装，不再持有原生按钮样式或Spinner。公共Button的accent/danger/quiet表达品牌、危险与轻操作；次操作使用outlined及glass。等待/禁用/提交由公共Button承接，等待保留操作强调度。
- `YikeHabitForm.vue` 组合 TextField、SegmentedControl、Stepper、SwitchControl 与六种业务图标；名称按可见字素计数（1–30），保存前去首尾空白。提醒时间使用原生 `input[type=time]`，跟随所选主题模式；现有 DurationPicker 表达时长，不能冒充时刻选择器。
- `CompositionPreview.vue` 使用共享 BottomSheet 与 Toast：新建/编辑、每周次数、提醒、保存失败、删除确认、设置时长/轮次和撤销。会话数据属于设备预览，编辑复制已保存值，取消不写回；不是业务持久化或正式页面完成证明。


### 日期与回顾图形

- `YikeWeekChart.vue` 使用公共 calendar 的日期解析/偏移，对齐输入周到周一；接收确定日期及分钟数，未来输入不进入尺度或图形，非有限/负值按零。
- 机械按25分钟分块；水位裁切在试管形状内；日影保留细墨线与渐隐。满量程按本周实际最大值向25分钟取整，最低25分钟，不固化草稿125分钟上限。固定几何归 review-artwork.json，颜色与文字使用正式主题键。
- 每天是可访问按钮，公开日期/分钟数，未来禁用，受控选择同一天可收起；组件不持有记录或日明细。ReviewPreview 提供零值、选择和超过125分钟的确定夹具。
- MiniBars无三形态公开配置，周图保留原型视觉。MonthCalendar现有day插槽/dayLabels；Heatmap现有readonly、dayLabels、只读plot和legend插槽。月历与年度图已改组合公共组件，yike仅提供业务图形与状态，不重新实现选择机制。年度图保留紧凑SVG，绘图区日期排列来自Heatmap；创建前、未来、缺失与归档语义由date-records提供。原有类型错误已修；验收证据与未完成项只记录在implementation.md。


### 玻璃适配取值

六组合已显式补充 color.glass-tint/clear/edge、elevation.glass；每主题分别定义 surface.glass-backdrop。机械为中性清晰边缘，水位略绿且模糊更柔，日影暖灰/墨灰且饱和度克制；所有具体值归theme/semantic.json。全局surface.treatment及tabbar.surface-treatment为glass；tabbar.active使用color.primary。共享GlassMaterial提供降低透明度、强制颜色及无backdrop支持的实色降级。上述为代码与解析事实，视觉验收仍待浏览器验证。
