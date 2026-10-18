# 草稿到正式资源的映射

本文件承接执行方案 A2/A3 与 B1–B3，记录资源规格和归属；进度及验收只看 [implementation.md](./implementation.md)。原始值与来源由 [draft-extraction.md](./draft-extraction.md)生成，产品语义以 [design.md](./design.md) 为准。

## Theme binding 与提取边界

正式包为 `yike`，`scope: prototype`，继承 `pbwork-base`；主题为 mechanical/water/sundial，默认 mechanical，各有 light/dark。Runtime/Workbench 已通过真实 Prototype Registry 绑定这个包，不能再描述为 playground 或绑定基础包。跟随系统是偏好，不是第三个主题模式。声明采集时钟见 prototype.ts。

六张正式解析表目前覆盖核心颜色与 Tab 激活相关映射；尚不能据此认定为完整风格。颜色、形状、字重、间距、图形及材质要共同匹配。公共字体族固定默认系统栈；三套的字重、字号和字距差异保留为提取需求。

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

### 核心品牌色的已存在差异

下表记录已有主题代码中的实际取值差异，不代表本轮新批准的视觉降级。旧记录以「对比度修正」解释这些差异；必须在 B1 的真实预览中复核其必要性和风格影响。

| 主题/模式 | 草稿 accent | 当前 color.primary |
| --- | --- | --- |
| 机械浅色 | #c65a3a | #a84a2d |
| 机械深色 | #da6a47 | #f0826a |
| 水位浅色 | #5c7a5d | #4a6b4b |
| 水位深色 | #86a685 | #94b794 |
| 日影浅色 | #2f4a80 | #2a3f71 |
| 日影深色 | #93a9db | #a8bfe9 |

对比度通过 Core 解析实际确认，不能以「浏览器没有控制台错误」证明。品牌绘制色和文字/操作语义色是否需要分开，应在合法键范围内明确，不把整套图形随修正变色后悄悄算作还原成功。

## Promotion Mapping

这是全页资源决策表，取代旧说明中「根导航、Tab、按钮已经使用 DS」的不准确概括。下列组件名为制作职责，不代表已创建文件或已登记。实际状态在 implementation.md。

| 资源 / 草稿来源 | 使用页面 | 归属与承接方式 | 代表状态与 DS 缺口 |
| --- | --- | --- | --- |
| 品牌物件 / LaunchScreen、Dial | 启动、空态、设置缩略图 | DS LaunchScreen/BrandMark 的公开插槽 + 同一自有签名图形 | 三主题、浅深、静帧/reduced motion；不复制启动/导航机制 |
| YikeDial / Dial.vue | 专注、设置预览、启动 | 原型自有组件；三个视觉分支共享时间语义，放 components 并显式登记 | 待开始/运行/暂停/休息/完成、0/60/>60 分钟；RingProgress 无法承接三种物件形状与反色/软影 |
| 主次操作 / `.y-button` | 专注、编辑、确认内容 | 先核对 DS Button 公开 kind/size/slot；冲突部分用自有展示组件或真实公开扩展 | 草稿品牌色、不同主题高度/字距、描边次要/危险/轻量动作；DS 主要操作绑定 color.action（中性色），不能把它视作缺一个 primary 覆盖，也不能换绑 DS 实例 |
| 纯文字根导航 / TabBar.vue | 三个根页面 | 自有展示层 + 共享 prototypeNavigation / TabViewport；必要时抽取 DS 公共变体 | 草稿无图标无胶囊。DS Tabbar Contract 固定图标+文字和玻璃选中底，现有 Token 覆盖不能消除结构冲突；不复制路由/保活机制 |
| 局部模式 / `.y-modes`、`.y-segmented` | 专注、回顾、设置、编辑 | 回顾/设置等优先 DS SegmentedControl；专注点/滴/印章指示器为自有视觉组，复用现有输入/键盘能力 | 当前选择、禁用/确认切模式、键盘；不得把无 viewport 的模式选择用一级 Tab 冒充 |
| 轮次与计圈 / `.y-pips`、`.y-laps` | 专注 | 原型自有展示，不持有第二份会话 | 第1轮/当前轮/四轮、无圈/有圈/暂停；列表消费同一模型 |
| 时长与提醒选择 | 专注、设置、编辑 | DS DurationPicker / TimePicker；设置值选择复用共享 BottomSheet/ActionSheet | 取消/确认、配置上下限、运行中修改后续配置；不能复制草稿 Sheet 的遮罩/手势 |
| 打孔卡行 / CheckInScreen.vue、PunchButton.vue | 打卡 | 原型自有行与标记组件，名称与今日按钮分开；公共星期表头在列表层 | 四习惯、空/部分/全完成、今天/过去/未来、周目标；机械孔、水滴、首字印章；不套通用 ListCell 改成另一套卡布局 |
| 习惯图标 / HabitGlyph | 打卡、详情、编辑 | 优先 DS Icon 的现有稳定资源；确有品牌形状则共用一份自有 artwork | 叶子/书/水杯/脚步/月亮/拉伸；编辑选择保留可读名称和焦点 |
| 分组信息行 / `.y-list*` | 设置、详情 | DS GroupedList + ListCell 公开 props/slots | 普通/危险/选中/带说明；只在公开 API 无法承接时记具体变体 |
| 名称、频率、次数、提醒 | 编辑 | DS TextField、SegmentedControl、Stepper、Switch、TimePicker 公开组合 | 空白/超长校验、每日/每周1–7、提醒开/关、取消和重复提交；图标组为自有选择内容 |
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
- 自有组件完成后才放入 `components/`、`previews/` 和 `preview-resources.ts`，声明 owner、真实实现/演示路径、代表状态与合法 Token 范围。当前 screens/focus/YikeDial.vue 是局部尝试，不等于完成组件登记。
- 仅组合 DS 公开 props/slots 不登记为原型新增变体。自有资源和真正扩展遵守[预览工作流](../../../../docs/workbench-preview.md)。
- 预览通过后，业务实例另加稳定 inspectId / 显式 data-pb-id、role、key 和 Token bindings，页面声明 required boundary 与关键交互场景。预览不进入 Capture/Handoff。
