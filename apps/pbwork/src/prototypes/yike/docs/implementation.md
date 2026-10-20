---
prototypeId: yike
---

# 一刻实施与验收记录

> 唯一执行进度与问题记录。核实日期：2026-10-19。完整顺序见 [执行方案](./IMPLEMENTATION_PLAN.md)，主题/组件 Promotion Mapping 见 [resources.md](./resources.md)。

## 当前交付判断

**最新批次：2026-10-19 正计时完整表盘占比修订，结果见文末同名章节。带汉字徽章的方案已撤回。此前数字下划线、水位数字底板和实心日影点的方案已被本批取代。上一轮把按钮留白误解为整页留白、机械日期改成方块的判断已撤回。此前回顾/习惯体验优化：用户再次指出 D7 与 D6 的问题后，旧 R19/R21/R22 的关闭结论不足以覆盖连续交互，已按新评估重做；本批实测结果见文末「回顾与习惯体验优化」，优先于下方旧截图与旧验收措辞。仍停留在 D 阶段，待用户复核。**

产品设计与三套风格草稿已批准，平台升级由用户确认完成。现有正式包可注册并解析三主题×浅深模式，七个正式 Screen 已接通共享业务与品牌启动静帧。**旧 D1–D7 验收结论仍已撤回。本次按批准草稿完成七页返工，当前为 Agent L2 复验完成、待用户复核；不等于用户已验收，也不据此推进 E 阶段定稿。当前没有正式 Capture/Handoff 完成结论。** 生命周期存量为 active、idle、无绑定产物，允许接续制作；本轮不改变生命周期或 Store。

原先「三页已完成 Quick Check」「ready-for-review」的概括无法代表当前完整交付：它未覆盖批准契约、真实业务数据与状态、共享壳、图形还原和确定性 Runtime。本轮改为以下逐项事实；必要的业务决定保存在[制作沿革](./history/2026-10-18-before-consolidation.md)，重复说明已移除；已有代码保留，旧完成勾选不作为验收。

## 当前执行：D1–D7 验收撤回，按全部草稿返工（2026-10-19）

用户明确指出正式页与全部页面草稿差距过大，不能视为D1–D7已验收。此前将功能、语义和截图存在误作体验通过，结论不成立。本次已完成扫描后的返工与针对性复验，当前事实以本文件进度表、R 台账及逐页对照为准。旧验收表、逐批测试日志、首轮差异扫描移至[返工前记录](./history/2026-10-19-before-rework.md)，其中的 accepted 不再有效。
Runtime 当前登记 7 个 Screen、19 条 Scenario；三档日期新增 intensity-levels Variant，状态集合以当前 manifest 为准；全部已声明状态的 prepare/readiness/semantic-snapshot/reset 和 Scenario/Checkpoint 已复验。正式固定采集和生命周期定稿仍属 E4–E5；整体产品校验仍有 I11。下表保留 G1–G5 的资源与页面归位事实，最新截图和验证记录见文末 D 批次。

| 单元 | 当前事实 | 未完成退出项 |
| --- | --- | --- |
| G1 归位 | 年度图类型错误已修；preview-resources.ts七项独立登记清空，所有局部源码、五份预览、资产与测试保留；导航/模式局部文件组合DS Tabbar/PrimaryTabs/SegmentedControl；月历和年度图均组合公共组件 | 正式页面接入与公共预览已复核；局部图形仍留原型，不登记为Workbench组件；固定Evidence归E4 |
| G2 主题与控件 | 三主题六组合显式玻璃染色/边缘/高光/模糊；DS玻璃Tabbar为根导航目标；SegmentedControl公开glass材质；Button现有primary语义保留，新增accent/danger/quiet固定类型，YikeAction已改公共Button包装 | Button六类型样例和玻璃材质状态完成同步；资源六组合与材质降级已检查；页面接入的功能回归保留，D阶段旧视觉判断已撤回，本次Agent复验见下表；Target pending仍归E3 |
| G3 容器/日期 | 已有GlassSurface、公共列表/面板/日期组件；MonthCalendar开放day插槽/dayLabels；Heatmap开放只读绘图与legend插槽，Yike年度图以DS UTC周列为布局数据 | 已有BottomSheet/FlowSheet/Confirm/ActionSheet有限材质能力保留；不继续扩大玻璃适配。日期图形六组合资源检查通过，D阶段旧体验验收已撤回，本次Agent复验待用户复核，固定采集归E4 |
| G4 页面接入 | 三个根Screen已共用YikeRoot + DS TabViewport/玻璃Tabbar；专注接入新表盘、DS模式和操作包装，打卡接共享事实，回顾接真实统计与既有周图/月历 | 详情/编辑/设置已接入，C 范围 Runtime 已验证；七页返工及草稿28帧映射已复验，待用户复核；固定交付归E |
| G5 验证 | Button/Heatmap/MonthCalendar/SegmentedControl及Yike局部组合有针对性测试；Target映射保持pending | C 范围业务 Runtime 已验证；逐页Agent L2复验与用户验收分开记录，Target同步与定稿仍归E |

工作区保留未提交改动与未跟踪文件，无Git提交或Store变更。通用主题六个键、公共预览同步、资产和之前各测试文件均保留；Flutter仅更新pending事实，不宣称还原实现。先前批次通过不覆盖当前后续改动。

## 唯一进度表

| 单元 | 状态 | 已有产出 / 下一退出条件 |
| --- | --- | --- |
| A1 基线与文档收敛 | 已验收 | 一刻旧路线图、总计划、主题计划、色值与检查记录收敛到本目录；入口/职责/旧记录明确；当前文档链接校验见本批验证 |
| A2 主题资源提取 | 已验收 | 原始314组CSS声明与28状态可重复提取；颜色/字阶/间距/尺寸/圆角/描边/阴影/透明度/动效均有正式归属，主动继承、固定绘图与草稿专用排除项见resources.md；不存在本阶段未决资源映射 |
| A3 组件盘点 | 已验收 | 七页依赖与资源归属已逐项复核：DS公共能力、本地签名绘图、共享导航/滚动/Overlay来源明确；独立资源登记仍为空，资源行为及Registry检查通过。此项只验收盘点，不表示各组件/页面已验收 |
| B1 主题制作 | 已验收 | 六张真实解析表、资产与Core对比度通过；显式覆盖与主动继承已核对，实际消费变量六组合解析通过；系统字体、三主题比例与代表视觉检查通过。Flutter Target drift作为E3交付欠项保留，不虚报同步 |
| B2 DS 适配与专属内容 | 返工复验通过 | 导航/切换/操作复用公共DS；三表盘、卡行、周图/月历/年度图六组合代表状态与行为检查通过，日期数字可读性与365天轴已修；旧独立登记为空，资源直接服务页面。正式逐页业务接入属于D阶段 |
| B3 公共组合资源 | 已验收 | 复用现有公共输入、BottomSheet、配置列表、确认与Toast；六组合新建校验/保存/取消、失败保留、配置确认、删除取消/确认、打卡撤销、关闭焦点返回和A/B实例数据隔离通过；窄屏缩短高度的键盘/滚动/保存/复位通过。正式业务接线归C/D，不扩大玻璃适配 |
| C1 业务状态与保存 | 已验收 | 共享习惯/打卡/记录/会话/配置与轻量本机保存；新建、编辑、归档恢复、删除、撤销、重置已接入真实跨页旅程，取消不污染，刷新沿用保存；首次零历史与内存样例分离。不扩展生产级迁移/损坏恢复。 |
| C2 计时与统计 | 已验收 | 开始/暂停/继续/结束、短长休、轮次、正计时计圈、倒计时按原时长再计及切模式确认接通；同一会话幂等入账，记录驱动回顾。可控时钟验证暂停、跨日180/120秒切分、恢复及再计，不承诺生产级后台/时区可靠性。 |
| C3 共享壳/导航/主题偏好 | 导航职责复核通过 | 共享根壳/TabViewport与公共导航/Overlay；详情、编辑、设置进入返回和缺失对象回退可用；跨Tab和栈页计时/局部状态连续，三主题与浅深/系统偏好生效；七Screen全部46个Variant的prepare/readiness/snapshot/reset及19条Scenario通过；根导航保持规范instant/无横滑，专注页内模式使用公共分页动效。 |
| D1 启动 | 返工已复验，待用户复核 | 品牌组居中、底部本机保存说明及required boundary已修；真实冷启动单独检查，不保证同步加载时品牌帧能被看见，详见R23。 |
| D2 设置 | 返工已复验，待用户复核 | 任务标题、三枚真实表盘预览、紧凑分组、左标签开关和独立重置行已恢复；六组合、配置确认、焦点返回和窄屏滚动通过。 |
| D3 专注 | 返工已复验，待用户复核 | PrimaryTabs具名分页、稳定表盘/操作锚点、胶囊按钮、三主题轮次与真实摘要已修；计圈当前行置顶，恢复/休息读数及长内容操作复验通过。 |
| D4 打卡 | 返工已复验，待用户复核 | 打卡标题/进度/新建同层，四卡密度与孔位对齐；提示带习惯名，部分/全完成/空态与撤销、归档旅程通过。 |
| D5 习惯详情 | 返工已复验，待用户复核 | 返回/编辑归导航层；每日真实分母、每周目标孔位及低强调管理行已修；年度图保留真实创建前留白，管理/缺失对象旅程通过。 |
| D6 新建/编辑 | 返工已复验，待用户复核 | 共享BottomSheet保留来源底页、单一标题、频率标签和可见提醒开关；保存位于公共actions footer，校验/取消/失败/窄屏滚动通过。 |
| D7 回顾 | 返工已复验，待用户复核 | 恢复回顾标题、同行范围/周期及紧凑三项统计；空态与有记录图形分开，周/月、明细、历史翻页及未来禁用通过。 |
| E1–E3 整体旅程与验收 | 制作中 | 两条旅程、六组合、窄屏、减少动态效果及Runtime已验证；完整pnpm verify仍停在DS→Target同步门禁，未声明仓库总校验通过。 |
| E4–E5 定稿与固定交付 | 待制作 | 无本轮固定 Evidence/Handoff/Delivery 结果；通过正常生命周期工作流推进 |

## 现有代码审计与问题

| ID | 可复核事实 | 处理单元 / 解决标准 |
| --- | --- | --- |
| I01 | 路线图称主题/页面未开始，总计划和主题子计划重复维护，旧实现说明却宣称三页已检查；主题检查仍称 playground / 绑定基础包，与 pack.json 和 prototype.ts 不符 | A1 已解决：当前状态仅在本文件；重复记录和旧进度入口已移除 |
| I02 | 主题只显式覆盖部分颜色及 Tab 语义，圆角/字阶/材质等沿用基础；组件颜色调整不等于还原完成；页面前景原先也继承基础包 | B1 已解决：表面别名、字阶/半径/材质/资产均显式覆盖，间距/动效等主动继承已记录并测试；六组合资源检查通过 |
| I03 | Focus.start() 原先设 startedAt = Date.now() - accumulated，而 elapsed 再加 accumulated，暂停继续会重复累计；计时仅倒计时触发 finished，番茄不完成；无全局保存与真实记录 | C1/C2 已解决：统一会话累计与幂等入账；可控时钟、跨日切分、暂停继续、恢复和追加已有单元/浏览器验证。 |
| I04 | YikeDial 的 progress 是完成比例，机械草稿是剩余分钟/60；水位仅低透明矩形，无浸没反色；日影复用机械圆盘加直线；数字/物件比例也不同 | B2 资源已解决：三物件、0/60/>60、水位反色/波纹、日影软边与深色光晕通过代表状态检查；完整页面业务验收归D3 |
| I05 | Focus 固定「50分钟/第3轮」；CheckIn 固定3个非批准初始习惯及历史；Review 固定数组/月历，跨页操作不更新 | C1/C2 已解决：四个预置习惯与首次零历史；回顾消费共享事实，样例仅由明确Variant准备到内存。 |
| I06 | 设置、新建未绑定操作；打卡设置入口违反只从专注进入的契约；模式禁用取代了切换确认，缺放弃/休息/恢复等主要操作 | C1–C3 已解决：仅专注进入设置；新建/管理、切模式确认、放弃/休息/恢复均有实际操作和反馈。完整页面视觉仍归D。 |
| I07 | 三个根 Screen 的 view 不同，组件与导航散在各页；当前 mapping 却写「使用 DS」 | A3/C3 已解决：共用YikeRoot、DS TabViewport/Tabbar、公共栈导航与Overlay；Registry已包含七个正式Screen。 |
| I08 | Focus 只有 default/running/paused 声明，初始 paused 没有对应初始化；运行数值随真实时间变化；Review default 的 chart 节点只在周视图，切月缺少相应 Variant；其余关键 Action/Scenario 缺失 | C3 已解决：所有现有Variant均有确定性fixture；同URL prepare/reset重置业务与局部状态；全部46个Variant、19条Scenario及Checkpoints已验证。固定Capture/Handoff仍归E。 |
| I09 | 先前因默认外观不同而过早选择独立文字导航/模式/操作组件，偏离优先复用DS的方向 | A3/B2 已解决：导航/模式/操作为公共DS配置包装，新增公共能力有Contract/Registry/示例；B3继续核对实际编辑组合 |
| I10 | 草稿中的水波/日影等需要的设计值，不是随意新增业务 Token 就可进入现行 Schema；SVG 固定绘制量也不应散落脚本 | A2/B2 已解决：固定绘图归六份SVG及受控artwork，实际CSS主题变量六组合均可解析；映射取舍见resources.md |
| I11 | 本次单独运行`pnpm ds:target-sync:verify`仍失败：components/tokenCatalog/themes/bindPool漂移；当前点名action-sheet、bottom-sheet、button、confirm、flow-sheet、grouped-list、heatmap、list-cell、month-calendar、segmented-control、switch、toast共12组件。月历showHeader、按钮pill、列表compact、Switch布局及轨道绑定均已同步pending原因，未刷新baseline | E3：保留可见 drift，不将 Target 映射标为 synced 或伪造同步；本次PBWork资源验收不包含Flutter还原；最终跨端交付及 pnpm verify 前必须解决 |

## 返工执行台账（2026-10-19）

本节是 R01–R24 的当前修复进度。已关闭表示对应代码、行为与所选风险画面已复验，不表示用户已验收 D1–D7。问题发现时的完整原因及原退出标准保留在[返工前扫描](./history/2026-10-19-before-rework.md#差异清单全部未关闭)。

| ID | 当前状态 | 实施与复验依据 |
| --- | --- | --- |
| R01 | 已关闭 | FocusPanel 将表盘/轮次、主操作、次操作分区；主视口开始/暂停的连续 RAF 轨迹及前后 bbox 位移均小于1px，条件动作不再推挤表盘。 |
| R02 | 已关闭 | YikeFocusModes 使用 PrimaryTabs，三种模式各有具名 FocusPanel；真实时钟下采样选中底中间位置、确认分页过渡、横滑、取消切换和 reduced motion。没有复制手势机制。 |
| R03 | 已关闭（原扫描误判） | `shell-and-nav.md` 规定根 Tabbar + TabViewport 为 keepMounted、无横滑、motion.duration-instant。保留规范行为；页内模式动画属于R02。 |
| R04 | 已关闭 | DS Button 新增公开 shape=rounded/pill，YikeAction 使用 pill；实测圆角至少为按钮高度的一半，默认 DS 外观不变。Contract/Registry/手册/测试/Target pending 已同步。 |
| R05 | 已关闭 | round-artwork 集中机械短条、水滴、日影斜方块；完成/当前/未来分别填充/描边/弱化，三形状与当前标记有浏览器断言；轮次来自会话事实。 |
| R06 | 已关闭 | 待开始显示实际专注/短休配置摘要，运行同一区域承接次操作；设置修改后返回与后续阶段生效由旅程回归覆盖。 |
| R07 | 已关闭 | 短休说明已完成轮次，长休说明全部完成；非番茄不再在表盘外重复caption。完成、短休、长休均有映射画面。 |
| R08 | 已关闭 | 正计时使用紧凑表盘、当前圈置顶、倒序历史圈及成对主操作；暂停当前圈显示已暂停；有圈与零圈、暂停/继续由计时回归覆盖。 |
| R09 | 已关闭 | 日期使用本地月日/星期，待开始与运行轮次文案区分，番茄用放弃本轮，其他模式用取消计时；恢复标题缩短为计时已暂停，避免截断。 |
| R10 | 已关闭 | 设置保留单一任务标题，按表盘/外观/番茄/结束确认组织；移除宣传型大标题，保留已授权的全部配置选项。 |
| R11 | 已关闭 | YikeFacePreview 复用实际 YikeDial 的扇面、水位、日影与12:34读数；三个预览与实际选择的主题一致。 |
| R12 | 已关闭 | GroupedList/ListCell 公开 density=compact，名称/值/箭头同排；Switch 公开 labelPosition=start；紧凑分组由截图与组件回归核对。 |
| R13 | 已关闭 | 重置为独立低强调危险行并保留本机说明；修复栈页子项被 flex 压成零高度的问题。实际点击重置、取消、焦点返回及确认清空旅程通过。 |
| R14 | 已关闭 | 打卡标题、今日小进度、新建同层，移除独立大统计；默认四习惯与部分/完成/空态均核对。 |
| R15 | 已关闭 | 卡行减少内外留白，公共星期表头与孔位对齐；保留单层玻璃和独立名称/打卡热区，主视口四卡可见。 |
| R16 | 已关闭 | 成功/取消提示带具体习惯名；连续打卡与撤销仍绑定真实最近操作，28帧映射中的撤销态由实际点击生成。 |
| R17 | 已关闭 | 详情以习惯对象为标题内容，返回与编辑归导航层；来源/返回状态与缺失对象回退由浏览器旅程验证。 |
| R18 | 已关闭 | daily 显示实际本周完成/应有天数，weekly 使用目标孔位；归档/删除为低强调操作行并解释后果。YikeActionRows 分离操作名和说明，读屏名称不再混入长说明。 |
| R19 | 已关闭 | 编辑保留打卡/详情来源底页并设 inert；仅公共 BottomSheet 承担标题、关闭、滚动与焦点；直达URL有合理底页，取消返回原上下文。 |
| R20 | 已关闭 | 增加频率可见标签，提醒左标签/右开关；off轨道与滑块有明确颜色绑定。保存位于公共 actions footer，通过原生 form 提交；表单独立预览默认仍有保存。窄屏长表单、校验、取消与失败保留通过。 |
| R21 | 已关闭 | 回顾恢复任务标题，范围/周期同排、日期省略重复月份，三项汇总同级紧凑；公共 IconButton 负责前后翻页。 |
| R22 | 已关闭 | 无专注记录用小物件/说明/去专注入口，不堆空周图；仅打卡保留真实统计。有记录、日明细和月历分别核对，零值类型余量使用弱表面色。 |
| R23 | 已关闭（保留启动可见性边界） | 独立品牌静帧已修复高度/居中，补只在本机保存并纳入required boundary。正常/减少动态效果各在新浏览器上下文测试：采样品牌帧均为0，直接进入专注，根Tab和设置返回不重复启动。同步读取快于首个绘制帧，不能声称用户必然看见启动品牌；未增加人为停留。 |
| R24 | 已关闭 | 功能、布局锚点、真实动画、主题轮次签名、28帧映射分别验证；下表记录实际画面判断与差异理由。截图文件存在本身不作为通过依据。 |

本轮附加修正：启动组原先超出视口顶部；设置重置行可能被压为零高度；编辑默认保存布尔值与面板footer不一致；水位休息读数反白对比不足；日影暂停次操作底缘裁切。分别修复并做对应几何/旅程/截图复验。水位休息读数使用既有 `color.on-surface`，资产绘色与普通态水下反色不变；CSS与显式Evidence绑定一致。

## 页面对照与 Experience 记录

七页均完成 **Agent L2 Focused Experience Gate（accepted）**，用户状态统一为 **待复核**。这里的 accepted 仅指本轮选定风险范围通过，不恢复旧用户验收，也不是 L3 全矩阵审计或定稿。主要视口390×844；另覆盖窄屏/缩短高度、三主题浅深、正常动画与reduced motion。下列截图均已实际查看；资源/Runtime和正式固定Evidence分别判断。

| 页面 | 本次实际审查画面 | 判断与保留差异 |
| --- | --- | --- |
| D1 启动 | 三主题浅色、日影深色、窄屏减少动态效果 | 品牌物件/名称/承诺居中，底部本机说明完整；使用公开LaunchScreen，物件保留真实比例。独立静帧不代表实际冷启动可见，边界见R23。 |
| D2 设置 | 默认、重置确认、日影深色底部、窄屏配置 | 工具型层级与同行值恢复，三枚预览可辨；重置行可点且取消焦点回到原入口。保留新增结束确认配置和公开触控高度，因此不照搬草稿的总行数与高度。 |
| D3 专注 | 12态机械对照、三主题深色暂停、水位长休/完成/正计时/倒计时 | 表盘与主操作稳定，轮次三签名可辨；机械保留剩余分钟扇面，水位休息读数清楚，日影暂停三个操作均完整可见。六组合其他默认画面亦已查看。计时和轮次使用真实fixture，未复制草稿固定第3轮/50分钟。 |
| D4 打卡 | 部分完成、实际撤销、全完成、空态及六组合默认 | 标题/小进度/新建紧凑，四卡与星期对齐，习惯名提示可识别。初始四习惯/零历史来自产品契约，允许与草稿样例数量和日期不同；保留批准的单层玻璃。 |
| D5 详情 | 每日、每周、删除确认及长内容管理 | 对象优先，编辑归导航层，daily分母/weekly孔位使用真实目标；管理动作克制且后果明确。年度图创建前大量空白是真实数据边界，不用随机打卡填满图。 |
| D6 编辑 | 新建、校验、来源详情/打卡、窄屏长表单 | 单一标题和关闭，来源底页可辨且不可交互；频率标签/开关清楚，footer保存可见，长内容只滚动公共body。草稿内联保存调整为共享footer，以保留键盘与窄屏操作可达性。 |
| D7 回顾 | 历史周、选中某天、月、零记录及六组合默认 | 顶部层级压缩，三项汇总不抢图形；无记录有明确入口，有记录才展开周图/类型，日明细与月历没有重复周期栏。系统字体、公共触控尺寸和真实汇总为明确取舍。 |

截图在本地 `output/yike-rework/`，不提交；`review-overview.jpg` 是七页总览，`draft-comparison.jpg` 上排为批准草稿、下排为正式返工，`audit-*.jpg` 是本轮状态联系表。六组合/窄屏在 `output/yike-d/`，管理长表单在 `output/yike-c/`。它们是浏览器审查材料，不是固定Snapshot或Capture Evidence。

### 全部28帧的可复现映射

统一入口 `/prototype/yike/{slug}?variant={variant}&theme=mechanical&mode=light`；对照时钟固定为 `2026-10-16T10:24:00+08:00`、时区Asia/Shanghai。真实动效测试单独使用正常RAF时钟。对应文件位于 `output/yike-rework/mapped/`，不是随机截图。

| 草稿组 | 数量 | 正式状态 / 补充操作 |
| --- | --- | --- |
| 启动 | 1 | launch/default |
| 专注 | 12 | focus/default、running、paused、short-break、long-break、finished、abandon-confirm、recovery、stopwatch-running、countdown-setup、countdown-running、countdown-due |
| 打卡 | 4 | checkin/partial；partial点击读20页书生成undo；completed；empty |
| 详情 | 3 | habit-detail/habit-records + habit=habit-water；weekly + habit=habit-running；habit-records实际点击删除生成确认 |
| 编辑 | 2 | habit-editor/default、invalid-name |
| 回顾 | 4 | review/history；history点击2026-10-14生成日明细；month；default零记录 |
| 设置 | 2 | settings/default、reset-confirm |

### 公共能力与文档同步

- Button `shape=rounded/pill`、GroupedList/ListCell `density=regular/compact`、Switch `labelPosition=end/start` 及 off 轨道/滑块 Token：实现、Contract、Registry/Inspector、公共组件手册、针对性测试和 Target pending 同步。没有修改基础组件默认形状。
- 原型 Promotion Mapping 已更新至 PrimaryTabs具名分页、胶囊操作、紧凑设置、真实缩略表盘与来源上下文编辑；局部轮次图形和动作行仍归原型，不增加共享手势/Overlay实现。
- 启动 privacy 纳入显式默认完整性边界，已重新生成 `default-boundaries.json`；没有新增 Evidence 例外或修改 Store。

### 本批验证

最终命令结果在本节记录；验证期间不把截图或代码完成等同于用户验收。I11保留为E阶段明确欠项。

| 检查 | 结果 | 实际范围 / 限制 |
| --- | --- | --- |
| `pnpm --filter @proto-bridge/pbwork typecheck` | 通过 | Core build、authoring:lint、vue-tsc；正式节点Role和类型检查通过 |
| `pnpm --filter @proto-bridge/pbwork exec vitest run` | 60文件 / 435测试通过 | 含Flex/Token规则、组件Contract/Inspector、Registry、表单、主题、Runtime和业务模型 |
| `pnpm --filter @proto-bridge/pbwork exec playwright test --config=e2e/yike-composition.config.ts --workers=1` | 本批31测试通过 | 7资源组合、11业务/Runtime、7页面、6返工；46 Variant与19 Scenario、六组合/窄屏/真实旅程覆盖 |
| 同配置 `e2e/yike-rework.browser.ts --workers=1` | 最终7测试通过 | 在最后的恢复标题/休息读数/间距修正后复跑，新增冷启动；包括28帧重拍、三主题暂停操作完整可见、真实分页动画与连续布局轨迹 |
| `pnpm test:e2e:runtime` | 10测试通过 | 含生产构建、公共Runtime/authoring/隔离临时Store的Core采集回归；不写入用户Store，不产生一刻正式交付 |
| `pnpm docs:verify` | 156份Markdown通过 | 当前资源映射、组件手册、返工台账与历史迁移链接 |
| `git diff --check` | 通过 | 无空白错误 |
| `pnpm ds:target-sync:verify` | 未通过，见I11 | 12组件及components/tokenCatalog/themes/bindPool漂移仍显式保留；不刷baseline掩盖未做的Flutter适配 |

生产构建成功；Vite仍提示既有大chunk/混合静动态导入，未作为本轮视觉返工扩大构建优化范围。完整 `pnpm verify` 未重复运行：已知 I11 未解决，不能报告全仓通过。

本轮没有Git提交，没有改用户生命周期/Store，没有固定一刻Capture/Handoff。下一步是用户复核本次D阶段结果；E阶段Target适配、定稿与固定交付仍待后续执行。


## 回顾与习惯体验优化（2026-10-19）

用户授权评估后的优化，保留三主题与业务边界；草稿和既有设计文档均为参考。独立实施/验收对象为：历史周期导航、周/月图形与日期状态、日明细与类型分布、习惯列表反馈、新建/编辑来源与表单伸缩。

| 对象 | 本批修正 | 可复核检查 |
| --- | --- | --- |
| 周/月导航 | 解除最早记录/初始化边界；下一期仍最多至当前周期；固定标题行中的SVG返回图标；周月切换保留当前/选中锚点 | 连翻8周、4月空记录并回到本月，统计位置不变；未来仍禁用 |
| 图形与日期 | 月历去除内外触控尺寸叠加；机械色块、水位小杯、日影印点；今天点与选中下划线独立，选中不隐藏原数据；周图最低125分钟量程，超出时按25分钟扩展并显示量程 | 390×844机械月历默认/选中、360×640水位深色/月周；单元高度不超过48，空日/未来/键盘机制保留 |
| 日明细/类型 | 日明细伸缩展开，类型不再被替换；每类名称/时长与轨道分行、轨道同宽；只有打卡的周保留可点日期 | 选中日不改变数据前景，类型三轨道等宽；仅打卡日能看到4个已完成习惯 |
| 新建/编辑 | Screen身份保留，view共用YikeRoot；编辑持续挂载为BottomSheet，来源实例与滚动不替换；真正详情进入/退出复用ScreenTransition | DOM实例身份、来源几何/滚动、关闭焦点、新建取消后重开默认值、保存仅新增一次；编辑取消/保存、归档恢复/删除连续旅程 |
| 习惯与反馈 | 列表新项与打卡颜色短过渡；成功消息改公共Toast，不插入正文推挤；Toast通过公开attach位于根导航上方 | 保存前后第一张卡位置一致，提示不遮挡导航且提示期间能切换Tab |
| 动效与降级 | 图表高度仅由真实DOM测量后过渡，周期内容淡入；频率/提醒与日明细使用公共展开过渡；减少动态效果时关闭这些过渡 | 正常/减少动态效果、窄屏长表单、保存footer与滚动检查；不复制导航、Overlay、焦点或手势机制 |

### 公共同步与边界

MonthCalendar增加有限公开dayAppearance=default/custom，默认不变；custom由插槽提供今天与选中状态，组件保留触控、ARIA、禁用和键盘。已同步Vue、Contract、Inspector的customRowGap绑定、Registry控制/状态、组件手册和基础/样例浅深主题测试。此项是DS公开能力采用，不新增yike资源展台或主题Token。Flutter month-calendar仍为pending，原因已更新；未刷新同步baseline。

截图位于本地output/yike-experience/：month.png、month-selected.png、editor-expanded.png、habit-saved.png、month-water-dark-narrow.png、week-water-dark-narrow.png。它们是体验审查材料，不是固定Evidence或正式Capture。未改用户Store、生命周期，也未创建Git提交。

### 本批验证结果

- PBWork：全量61文件/441单测通过；最后公共绑定、月历、表单与Flex检查143测试通过；vue-tsc及authoring:lint通过，default boundary生成后无差异。
- 新增8条浏览器体验回归通过：空历史翻阅、月历/选中/轨道、来源实例和保存几何、详情滚动、窄屏深色与减少动态效果、仅打卡日期、长表单保存可达、真实RAF面板进入。动态采样确认只有面板移动，来源位置变化小于1像素且不发生页面进入转场；动态测试使用真实时钟，静态业务截图使用可控时钟。
- 既有七页回归7条通过；共享业务11条按范围验证（包括全部已声明Variant的prepare/readiness/snapshot/reset、Scenario/Checkpoint）。首次完整旅程暴露成功Toast遮挡导航，修复attach后重跑该旅程与新增几何断言通过；不通过强制点击绕过遮挡。
- pnpm test:e2e:runtime：生产构建与10条公共Runtime/Capture回归通过，产物使用隔离测试Store，不产生一刻正式Capture/Handoff。
- pnpm docs:verify及git diff --check通过。
- pnpm ds:target-sync:verify仍未通过：既有components/tokenCatalog/themes/bindPool与13组件漂移保留，month-calendar原因更新，未刷新baseline；pnpm verify不声明通过。

**Experience：本批D4/D6/D7范围为L2 Focused accepted、待用户复核。** 实际查看机械月历默认/选中/空历史、水位深色窄屏周月，以及浅色展开表单、水位深色编辑、窄屏提醒/周次数和保存后的习惯列表。审查结构、独立状态、材质/比例、反馈与连续操作；不是全主题全状态L3，不恢复其它页面的用户验收，也不推进E定稿。


## 周/月按钮与三主题日期修订（2026-10-19）

本批用户明确「周/月」为回顾左上角按钮，授权按机械、水位、日影各自草稿修订。该局部修订优先于上一批机械方块与日期行距的体验判断；本批不以压缩正文代替按钮留白修正。

| 独立验收对象 | 本批结果与证据 |
| --- | --- |
| 周/月按钮 | 公共density=compact：可见轨道36px、选中底板30px、点击范围至少44px；正文实例不改私有DS样式。三主题使用主题圆角12/14/4与各自材质，标签垂直居中；其它SegmentedControl实例默认不变。 |
| 三主题日期图形 | 机械恢复柿色圆形；水位保留圆形杯壁/水平水面；日影保留方印与靛蓝圆点。选中沿原图形描边，不抹去数据，不额外套外圈；今天用数字强调。 |
| 三档规则 | 有效日分钟数0–30（不含0）、30–90（不含30）、超过90分别为low/medium/high；空值/零/未来独立。强度取自opacity.data-*，由主题包持有浅深值；加入1000分钟记录不重染已有25分钟日期。 |
| Theme/Evidence/展示 | 新增3个通用强度语义键、2个紧凑组件长度键；Catalog/基础包/yike/生成键/绑定、Contract、Inspector、Registry、组件与Token手册、Target pending同步。日期mark显式绑定颜色和强度，日期数字记录实际前景/今天字重。新增intensity-levels显式fixture，不改变首次零历史。 |
| 浏览器体验 | 已实际查看三主题各浅深月视图（6张）、三主题周视图（3张）与选中机械日期；14条体验回归通过，覆盖轨道/底板/点击几何、三级数据、主题图形、选中保留数据及原习惯旅程。截图位于output/yike-experience/tiers-{theme}-{mode}.png、compact-week-{theme}.png。 |

验证：62文件/449单测通过；生产构建（含vue-tsc、authoring lint、生成键/边界）与10条公共Runtime/Capture回归通过；全部已声明Variant的prepare/readiness/snapshot/reset及既有Scenario检查按当前manifest复验。文档156份检查、git diff --check通过。DS→Target同步门禁仍报告既有13组件与components/tokenCatalog/themes/bindPool漂移；新增5键及紧凑组件能力均明确pending，未刷新baseline。

Experience记录为本批D7 L2 Focused accepted、待用户复核；不等于用户验收，不推进E定稿。未提交Git，不改用户Store或生命周期。构建清理Core临时产物曾影响一轮并行浏览器检查，相关检查在构建完成后独立重跑，结果以重跑为准。


## 三主题「今」与日期材质修订（2026-10-19）

用户已确认实施：今日标记适应机械/水位/日影，顶部回到当前周期不能使用刷新语义，水位数字需浸入连续水面，日影随档位加深高斯模糊。

| 独立实现/验收节点 | 当前实现 |
| --- | --- |
| yike.review.today | 沿用共享IconButton，用新增calendar-current（日历与中心定位靶心）SVG替换refresh-cw；周/月标签与行为不变。 |
| 月历today-mark | 一天仅一个主题容器：机械圆徽与刻度、水位水滴、日影方印；共享手绘「今」笔画。位于日期右上角，移除下划线；与选中边界、数据填充独立。 |
| 月历number/submerged-number | 移除不透明底板。SVG同基线双层文字，水中层按水面裁切，水面上下各自选择可读颜色；无新增动画、布局跳动或交互机制。 |
| 月历mark | 日影低/中/高逐档加深高斯模糊和透明度；滤镜仅施于影子，数字和选中框保持清晰。参数与三种今日路径集中date-artwork.json。 |

Promotion Mapping：顶部图标为共享DS资产增补（Contract/动态Registry清单/手册已同步）；其余是既有自有月历图形的资产修订，无新组件或主题扩展登记，既有preview-resources空列表保持真实。未新增Token。Flutter仍pending，不刷新同步基线；D阶段保持不变，不执行正式采集或生命周期变更。

验证结果：typecheck、生产构建、62文件453项单测、14项体验回归、10项公共Runtime/Capture回归通过；一刻全部已声明Variant的prepare/readiness/snapshot/reset通过（44.7秒）。一次运行被同时格式化源码触发的Vite重载打断，固定源码后重跑通过。docs:verify 156份Markdown通过，git diff --check通过。复用了已构建Core直接运行DS→Target验证，仍按预期报告components/iconAssets/tokenCatalog/themes/bindPool漂移；本次新增icon资产漂移明确保留pending，未写入synced基线。

Experience：accepted（Focused）。实际查看三主题浅/深6张月历截图，检查今日与非今日/低中高档/未来日期、文字水面裁切、影子与清晰数字层、可见轨道与触控尺寸；既有日期选择、历史翻页、键盘和习惯旅程由体验回归验证。右上角使用有圆心的定位靶心，避免把回到当前日期误读为日历新增。最后仅修改该图标路径，定向重查三主题截图；不重复与路径无关的完整状态矩阵。最终效果待用户复核，不代表E阶段或正式交付完成。


## 纯图形今日指针修订（2026-10-19）

用户否决带汉字徽章并批准「今日指针」方案。独立实现/验收节点仍为月历today-mark：改为上缘中央、尖端朝向日期的单路径SVG；机械切角短针、水位圆润水滴、日影斜切楔形。填充沿用primary，页面底色描边将其与有数据的色块分开。固定资产尺寸12、笔画1.2和位置归date-artwork.json；不改变触控区域或布局，不增加Token/共享组件API。数字、选中边界、水位裁切和日影滤镜沿用既有实现。日期按钮ARIA保留「今天」。

Promotion Mapping：既有自有月历资产修订，无新增资源登记或Target API；右上角calendar-current保持日期导航职责。设计与resources已同步当前方案，前节带字徽章记录仅代表已被替代的实现。

验证：typecheck（含Core构建与authoring lint）、相关2文件23项单测（month-calendar-slot/flex-layout-policy）、14项体验浏览器回归、docs:verify（156份Markdown）及git diff --check通过。本轮为SVG路径与绘色替换，既有Runtime语义/状态/API保持不变；比例复验覆盖真实Runtime路由中日期选择、今日ARIA、图形与数字不重叠、选中后指针保留及原旅程，不重复上一批与路径无关的完整Capture回归。

Experience：accepted（Focused，待用户复核）。实看机械浅色选中、水位浅色有记录、日影浅色选中、水位深色选中、机械深色空记录5张截图。三主题浅深均自动覆盖今日无记录/有记录/选中状态，指针包围盒位于数字上方并与数字水平对齐。截图为output/yike-experience/tiers-{theme}-{mode}.png、today-recorded-{theme}-{mode}.png、today-selected-{theme}-{mode}.png。仍停留D阶段，不操作Store、Capture或生命周期。


## 专注三主题视觉评估与回顾文案清理（2026-10-19）

用户要求直接删除回顾「完成或提前结束的专注会出现在这里；放弃的不会。」并使用frontend-design评估专注三模式的尺寸差异。本批仅实施文案删除（正式回顾与草稿各一处、正式空状态移除整个说明段落），专注页面保持现状以完成评估；以下建议不代表已获批准或已实施的新版视觉。

评估依据：按frontend-design检查专注页的单一焦点、数字层级、物件辨识、留白分配、主题一致性与浅深/矮屏可读性。390×844下实际查看机械/水位/日影 × 番茄待开始/正计时有圈/倒计时设置九张截图，补水位运行、倒计时运行、正计时深色与360×640矮屏；测量保存在output/yike-focus-audit/measurements.json。计时数字的CSS字号还会受到SVG视框变换，因此下面记录实际变换后的有效字号，而非仅引用Token声明值。

| 主题 | 番茄钟有效字号 | 正计时有效字号 | 倒计时有效字号 | 主要现象 |
| --- | --- | --- | --- | --- |
| 机械 | 54px | 41.5px | 41.5px | 表盘312缩到240，读数缩小约23%；物件仍清楚，但模式切换时主视觉分量明显变化。 |
| 水位 | 76px | 33.9px | 52.8px | 竖长杯在正方形容器内二次等比缩小，实际杯宽约105、高164；正计时读数比番茄缩小约55%，细字重进一步减弱视觉分量。 |
| 日影 | 55.9px | 35px | 44.8px | 正计时同样受方形高度约束，竖长含读数资产整体缩小；影子主体、数字和状态一起退成次要信息。 |

首要问题：FocusPanel对所有非番茄模式启用compact；YikeDial按size.plot减三个spacing.lg算宽度。相同减量使水位236→164（-31%），机械312→240（-23%）、日影316→244（-23%），缩放比例已不一致。正计时额外把stage高度设成这个宽度，并强制SVG高度填满，水位236×368和日影316×404被塞进正方形。SVG默认meet保留宽高比，水位最终按164/368缩放，容器表面宽164但杯实际仅105。水位在360×640上stage进一步被Flex压到128高，数字有效字号仅26.4px。

视觉判断：needs-focused-review（专注D3的旧通过记录不足以覆盖本次跨主题/跨模式比例问题）。主读数应是三种计时的首要焦点；当前正计时被缩小后，计圈区域又占有较大空白，图形和信息量失配。水位细字与低对比空杯在深色下进一步弱化。开始/暂停按钮在同一主题各模式中的纵向位置基本稳定，各主题仅约612/616/620px的轻微差异，是应保留的布局基础。

建议的局部修订方向：

1. 三主题保留不同物件与颜色，以相近的视觉分量和主读数尺度统一；不把三种不同纵横比资产强行做同宽或同高。
2. 先解除「非番茄统一减宽 + 正计时方形高度」的叠加缩放，按主题实际纵横比安排舞台。正计时应拥有可辨识的主体，计圈列表使用剩余空间滚动；增加圈数不应继续缩小主读数。
3. 将数字与状态的阅读尺度从整张SVG无条件缩放中解耦。390宽下先以主数字约50–56px、状态约12–14px作为光学对齐的试验范围，水位细字可适度补偿；这是待视觉验证的建议值，未写入Token或正式设计基线。
4. 用相近的主视觉高度、读数位置和稳定的底部动作承接三模式；紧凑屏优先压缩非必要留白及列表展示量，保住主读数。几何修正后再检查水位深色杯壁与细字对比度，避免仅靠加粗/放大掩盖布局问题。

文案删除已在真实浏览器确认：保留空状态标题与「去专注」，说明段落不存在。截图output/yike-focus-audit/review-copy-removed.png。审查脚本属于本次临时截图/测量工具，运行后移除，不给可逆文案变化新增永久测试。本批vue-tsc、docs:verify（156份Markdown）、git diff --check通过；浏览器截图/测量与文案断言通过。正式页与草稿源码均已无该说明文案。


## 正计时完整表盘占比修订（2026-10-19）

用户用红框明确指出三个主题待开始状态的整个正计时表盘过小，批准放大主体、合理居中，并保持开始和计圈后主体稳定。本批以前节源码/实测评估为依据，修订的是完整图形占比，而非单独放大数字。

| 独立实现/验收节点 | 修订 |
| --- | --- |
| yike.focus.timer | 正计时不再启用compact；保留机械312×312、水位236×368、日影316×404的源资产纵横比。去掉stage的方形高度，主体按完整主题尺寸与可用高度中的约束等比显示。 |
| 正计时舞台 | 使用主操作区、计圈槽以外的剩余高度，纵向居中。收紧正计时外围留白；SVG不再被作为可随列表增长压缩的Flex内容。 |
| yike.focus.lap-scroll | 使用已有ScrollableDataList，按剩余空间把列表展示量限制在size.touch至两个size.control之间。增加圈数只增加滚动内容；矮屏减少可见行数，保留主次动作。 |
| 待开始计圈占位 | 与运行列表使用同一槽位尺寸，纯装饰且aria-hidden；开始前后不因列表插入而改变主体的尺寸、位置或主操作位置。 |
| yike.focus.primary-action | 沿用YikeAction/共享Button，开始、计圈、暂停、继续、结束与取消逻辑不变；按钮与底部导航不被表盘覆盖。 |

Promotion Mapping：既有原型布局修正，YikeDial使用既有公开compact配置，不新增DS能力、Token、资产或资源登记；图形、主题与手势复用原实现。倒计时仍沿用compact，番茄钟保持原有尺寸。全部设计量由现有主题Token表达，父区可用高度通过正常Flex/百分比约束分配，不引入固定CSS数值或DOM测量算法。

验证：typecheck、生产构建（含authoring lint、生成键与边界）、62文件453项单测、10项针对性浏览器体验回归、10项公共Runtime/Capture回归通过；一刻全部已声明Variant的prepare/readiness/snapshot/reset通过（44.4秒）。docs:verify 156份Markdown与git diff --check通过。本批未更改DS/Token/Theme API，因此未扩展既有Target pending范围，也未刷新baseline。

Focused Experience：accepted（待用户复核）。实看三主题390×844待开始、水位360×640深色多圈、日影390×844多圈共5张截图。主体明显放大、完整造型与数字/状态可读、纵向留白更合理、操作区与导航不遮挡。三主题各在390×844浅色与360×640深色测试真实「开始→12次计圈→列表滚动→暂停」旅程，SVG实际绘制区域的位置/尺寸变化小于1px；常规屏实际主体高度至少300px（机械全宽312），矮屏至少170px。原24次计圈独立滚动回归在两种视口均通过。截图为output/yike-experience/stopwatch-idle-{theme}-{width}.png与stopwatch-laps-{theme}-{width}.png。

D阶段保持不变，未进行正式采集、Store或生命周期修改；前节旧比例评估保留作为本批修正依据，不再代表当前正计时实现。


### 2026-10-20 图标归位纠正

用户明确图标为一刻专属纯 SVG，统一放在 `theme/assets/`；本轮 DS Icon、Contract、基础预览与 Target 扩展已撤回，未来 DS 整理由用户另行处理。三主题低/中/高专注度资源保留，模式图标以文末通用三枚方案为准，机械使用圆形腕表表圈、十二刻度与细指针，取消齿轮。原有六份完整表盘 SVG 保留。回顾类型行直接使用资产，月历机械恢复圆形并使用独立腕表刻度资产；其余动态绘图恢复原位置。保留此前专注布局与日明细修改，D 阶段继续复核。

最高档补正：机械月历取消整圆实心填充，三档均保留空心读数区和腕表刻度，以内圈描边深浅表达强度；日期前景按空心底色使用 on-surface，避免最高档吞没刻度或反白数字失去对比。


## 一套通用实物图标（2026-10-20）

用户明确要求开始制作、只保留一套且不随主题切换。本批正式制作三份SVG：番茄厨房计时器、金属手持秒表、木架玻璃沙漏。物件体积来自克制渐变、少量明暗面与高光；固定配色归资产本身，三主题/浅深模式共用完全相同src。此前九枚主题模式图标已移除，不保留另一套备用选择。

Review中的类型分布与记录图标改为直接img，移除主题mask及color.primary依赖；尺寸由size.icon改为已有size.icon-prominent（20→24），显式image绑定同步。sheet标题、日期、合计、列对齐与前后一天沿用既有实现。本批不调整三档强度、主表盘、其它页面、DS或Target。

局部验证与真实截图仅覆盖本批图标及其所在记录行，待用户视觉复核；不据此宣布D阶段完成。当前正式复核入口为回顾day-detail Variant，四条记录同时展示三种模式；生产首次状态不注入样例历史。

本批检查结果：类型检查、authoring lint、docs:verify、diff空白检查通过；3项浏览器回归通过，包含三主题/水位深色窄屏、24px真实图片载入、四条记录、前后日及周月标题。额外比较机械浅色与水位深色的三枚src完全相同，确认不随主题切换。已查看三张真实截图output/yike-universal-icons/sheet-{mechanical,water,sundial}.png，待用户视觉复核。


## 对照DS预览修正日明细调用（2026-10-20）

用户明确不修改BottomSheet。已在实际DS预览打开玻璃样板，对照其默认正文/actions组合；此前判断“需要修改公共组件紧凑能力”撤回，本批只改一刻调用。

- Review补material=glass；去掉本地满高容器与嵌套ScrollableDataList，恢复面板自身正文滚动。日期/总量直接接记录列表，局部间隔16→8；前后一天进入固定actions，复用Button公开图标槽。未改共享标题、padding、面板高度或DS文件。
- 顶部到第一条记录的空间由约155降至约123逻辑像素。玻璃只使用共享一层，空/有记录换日保持面板高度及背景布局稳定；窄屏可滚到最后一条，换日回到正文顶部。
- 同一套三枚24px实物SVG收敛到克制中性色与轻微明暗，固定配色、路径与src均不随主题切换。彩色插画方案的视觉判断撤回。其它表盘、专注度与页面保持原状。
- 实看output/yike-sheet-usage/sheet-{mechanical,water,sundial}.png，机械/日影390×844浅色与水位360×640深色，检查玻璃一致性、信息密度、列对齐、固定操作、长内容可达与图标分量。仅为本批Agent检查，仍待用户视觉复核，不恢复D阶段验收结论。
- 6项局部浏览器回归通过：背景及sheet几何稳定、空日/边界/未来禁用、焦点返回、prepare/reset、三主题真实24px图标与相同src、玻璃材质、首记录位置、窄屏最后一条可滚达及周月标题。类型检查通过；最终authoring lint与docs检查见本轮结果。

本批git diff在apps/pbwork/src/design-system下为空，没有修改BottomSheet、SheetHeader、Contract或Registry，不推进E或生命周期定稿。


## 模式图标回归现有规范（2026-10-20）

用户否决实物感并要求读取现有规范。已核对Icon手册/共享SVG定义/renderer和一刻design.md第275行的“线性、细笔画、不作装饰”，采用24视框、1.7统一描边、圆端圆角、无填充重画番茄/秒表/沙漏。仍只有theme/assets中的三份通用资源，不改DS注册。

删除全部渐变、明暗面、高光、底影与多色，渲染改为中性文字色Token的alpha mask；三主题使用相同asset URL，浅深背景只由合法中性Token提供可读性，不使用主题品牌色。size.icon-prominent与color.on-surface-muted显式绑定同步。此前拟物及中性色材质方案的视觉结论撤回，sheet使用及其它页面未改。

类型检查和3项针对性浏览器回归通过，验证实际24px图标载入、跨主题相同资源、玻璃sheet、日期与周月标题、长内容可达及翻日。实看output/yike-linear-icons/sheet-mechanical.png与sheet-water.png，核对线条、透明背景、与功能图标一致性和浅深可读；仍待用户复核，不据此完成D阶段。最终authoring lint/docs检查见本轮结果。


### 模式名称仅显示文字（2026-10-20，当前决定）

用户决定停止渲染番茄钟、正计时、倒计时图标。回顾类型分布与日明细仅保留模式文字，移除前端图标节点、资源导入、着色辅助函数与专用样式；theme/assets中的三份SVG原样保留，不删除资产。玻璃sheet、日期合计、列表及前后一天保持现状。本决定取代此前模式图标展示约定。


## 控件主题遗漏清单修正（2026-10-20）

用户批准上一轮六项清单，本批独立实现/验收节点为：focus.preset/custom、review.previous/next/today与settings.threshold-custom、checkin.empty-create/归档restore、habit-detail.return与habit-editor.return、checkin.storage-reset/storage-retry、checkin.corrupt-reset及取消操作。

倒计时保留既有局部节点，修复主题轻选中、紧凑圆角、触控和焦点；不复制单选键盘机制，原生按钮按Tab及Enter/空格操作。主操作胶囊与既有布局保持。其它节点通过公开Button props、BottomSheet材质参数和一刻secondary主题别名补齐。secondary采用on-surface保证次级表面上的文字对比度，不添加对比度豁免。

未改DS源码/Contract/Registry、未新增扩展登记、未改导航和会话逻辑；三份模式SVG不改不删且不恢复渲染。新增检查覆盖六组合预设、键盘/自定义/启动、空归档/失效对象返回以及存储失败与损坏确认的取消和焦点。验证结果见下文；D阶段继续待用户复核。

### 本批验证结果

- `vue-tsc -p tsconfig.json --noEmit`、静态authoring lint通过。主题与Flex门禁共11项通过；Core验证六组合真实资产/颜色配对无block，未添加对比度豁免。
- `yike-controls.browser.ts`共9项通过（10秒），覆盖六主题模式组合、390×844/360×640、真实选中色/半径/44触控范围、键盘焦点与选择、自定义11分钟后回选3分钟启动、归档恢复/失效对象返回、损坏确认取消保持原数据并返回焦点、保存失败重试。
- 实看`output/yike-controls/countdown-mechanical-light.png`、`countdown-water-dark.png`、`countdown-sundial-light.png`及`corrupt-confirm-sundial-dark.png`，预设不抢主操作、窄屏单行可达、确认面板沿用玻璃与固定操作。Experience为quick-checked，仅代表本批局部复查，未代替D阶段用户复核。
- `pnpm docs:verify`通过156份Markdown。`pnpm ds:target-sync:verify`仍未通过，报告components/iconAssets/tokenCatalog/themes/bindPool漂移，保留原有Target pending及基线，不把本批Web适配描述成Flutter同步完成。
- 本批仅更改一刻现有主题与业务调用、对应测试和三份原型文档；DS实现、SVG、Capture/Store和生命周期未修改，无Git提交。


## 秒级计时四项增量（2026-10-20）

用户批准四项范围，独立实现/验收节点为：focus.custom-duration/custom-save及primary-action、settings.threshold-duration/threshold-save、review.record/day-total、倒计时到点记录与提前结束确认。既有Screen/Variant、节点ID、Actions与准备入口复用，不新增页面或计时模式。

- 已有YikeDurationPicker局部包装增加second精度，调用共享WheelPicker的三列能力；番茄配置仍用默认分钟。既有局部实现直接维护，不登记新的DS组件或扩展。
- 倒计时草稿改为整数秒；预设、读数与主操作文案同步换算，模型仍使用原毫秒会话/秒数记录。自然完整完成倒计时在保存及确认两处共享判断，提前结束仍按阈值确认；追加不拆分记录。
- 阈值自定义直接读写整数秒，修复向上取整分钟的实现遗漏。回顾精确格式只用于当日记录和合计，概览与图表保持现状。
- 三份模式SVG与DS BottomSheet实现不变；未新增Token、公共Contract、Schema或更改Capture/Store和生命周期。验证结果随后记录；D阶段仍待用户复核。

### 本批验证

- 类型检查与静态authoring lint通过；计时引擎/会话/模型/统计/秒级选择器相关30项检查通过，既有资源及Flex门禁8项通过，共38项。包括1秒边界、5秒完整完成、提前结束确认与取消、追加合并去重、跨午夜0.5秒分配、分钟步长与上下限。
- 新增4项浏览器流程通过：机械浅色390×844、水位深色360×640、日影浅色390×844下，设置5秒→自然完成→再次设置95秒→回顾显示两条记录和1分40秒合计；15秒自定义阈值重开/刷新保持。
- 另11项既有浏览器回归通过：六主题模式组合的分钟预设、键盘/自定义；原有分钟配置边界、倒计时取消/启动、阈值分钟设置、短记录取消保留会话、FlowSheet浅深草稿/焦点/底部稳定性。共15项浏览器检查，未扩大为全仓库回归。
- 实看`output/yike-seconds/picker-water-dark.png`和`records-sundial-light.png`，三列滚轮在360宽度下可读，确认入口可达；秒数明细列对齐、合计与记录一致，沿用原sheet结构。Experience=quick-checked，仅为本批局部检查，D阶段仍待用户复核。
- `pnpm docs:verify`通过156份Markdown，`git diff --check`通过。同步design/resources/implementation；DS、主题、公共Schema未变，既有Target漂移不在本批处理，未刷新同步基线，无Git提交。


## 专注操作区排版修订（2026-10-20）

用户确认后修正局部布局。独立验收节点：focus.primary-action、append、finish/abandon、skip-break、completion-feedback。主操作维持既有位置与强调胶囊；append用公开quiet类型，在下方居中。提示音说明迁到support区域的显式status节点，底部不再重复到点或将提示与按钮拼在同排。暂停/番茄完成沿用居中轻操作组，休息结束隐藏不适用的跳过入口。

仅修改FocusPanel使用处与对应文档/检查，不修改DS、主题、表盘资产、导航、计时或记录算法；前一批秒级改动保留。验证结果随后记录，D阶段继续待用户复核。

### 本批验证结果

- 类型检查和静态authoring lint通过。3项针对性浏览器检查通过（7.7秒），每项覆盖倒计时运行/暂停/到点、番茄完成与休息结束；机械/日影390×844浅色、水位360×640深色，共15个代表态。五态间主按钮纵向偏差小于1逻辑像素，全部居中，次操作均为quiet且触控高度不小于44，追加后主按钮位置保持，休息结束可进入下一轮。
- 实看`output/yike-focus-actions/`中的三主题due截图、日影paused及水位break-finished共5张，核对单个最高强调、轻操作轴线、状态提示分离、窄屏和根导航无遮挡。Experience=accepted（本批Focused Experience Gate的Agent局部复查通过），不代表用户已完成D阶段复核或原型已定稿。
- 同步design/resources/implementation，未改公共组件、Token/Theme、表盘绘制或SVG。类型/语义及实际Runtime启动验证无新增阻断；本批未运行完整仓库回归，未刷新Target同步基线、未提交Git。


## 表盘量程统一与运行节奏（2026-10-20，用户批准）

用户确认「一圈 = 60 分钟、三主题共用」、接受短计时小比例，并要求运行中每秒微反馈、每分钟略重反馈。本批取代此前的双量程实现，产品口径见 design.md 文末同名结论。

### 独立实现/验收节点

| 节点 | 本批事实 |
| --- | --- |
| 量程 | `timer-readout.ts` 成为唯一读数来源：剩余类 `min(剩余/60, 1)`，正计时从 0 累加满圈回绕；>60 分钟显示满圈 + 「另有 X」/「已满 N 小时」。`YikeDial` 只接收 `fraction`，三主题不再各自计算比例。 |
| 读数 | `formatClock` 在一小时处切换 `h:mm:ss`；`design.md:204` 的小时位要求补齐。 |
| 尺寸 | 水位 236→228、日影 316→278，按各自纵横比在舞台内 1:1 渲染，消除此前的隐藏缩水；机械保持 312。 |
| 水位对比 | 浅色水体由 `#7e977d` 改为 `#5b755c → #4a6350` 竖向渐变，白色读数由 2.9:1 提升到 4.7–6.0:1；深色同步加渐变。 |
| 日影影子 | `#shadow` 由「渐变灰环」改为从晷针投出的连续软影；环形渐变的两端透明停止点移除，影子不再呈甜甜圈并盖住刻度。 |
| 运行节奏 | 新增共享帧时钟 `frame-clock.ts`（约 30fps、`document.hidden` 暂停、仅运行中订阅）；表盘逐帧更新。每秒钟级反馈：机械指针末端轻跳、水面微光、日影轻呼吸；每分钟级：指针回弹、水面涟漪、晷针微光圈；阶段结束：整体落定脉冲。减少动态效果时帧时钟与三级反馈全部停用，只保留数字变化。 |
| 状态过渡 | 机械三段扇面改为图层交叉淡入（`motion.duration-medium`），水位在水体/休息色之间交叉淡入，日影 `opacity` 过渡；不再硬切。 |
| 动效性格 | 主题包设 `motion.personality: calm`（160/260/400ms、按压 0.99），全站含 DS 组件同步变柔和。 |
| 写库与时钟 | 引擎 `tick` 只在阶段边界写库（不再每秒写 localStorage）；`useClock` 改为共享单例秒时钟，7 个独立 interval 收敛为 1 个。 |

### 同步范围

只改一刻原型：`YikeDial`、`FocusPanel`、`timer-readout`、`frame-clock`、`session.tick`、`useClock`、`previews/DialPreview`、`Brand`、`Review` 表盘调用、一秒主题值与水位/日影资产。未改 DS 组件、Contract、Registry、Schema、Capture/Store 与生命周期；`motion.personality` 是既有语义键，不新增 Token。

### 本批验证

| 检查 | 结果 | 范围/限制 |
| --- | --- | --- |
| `pnpm --filter @proto-bridge/pbwork typecheck` | 通过 | Core build、authoring lint、vue-tsc |
| `vitest run test/yike` | 11 文件 / 56 测试通过 | 新增 `yike-timer-readout.test.ts`（5 项）覆盖 25/5/90/120 分钟与正计时 61 分钟；同步修订表盘与主题测试 |
| `playwright yike-composition` | 7 通过 | 六组合 B3 旅程与窄屏 |
| `playwright yike-foundation/experience/controls/review-sheet` | 49 通过 / 3 失败 | 3 项失败均为 `path.outline` 旧选择器（组件已改为圆形），改选择器后 `yike-experience` 20 项全部通过 |
| `playwright yike-rework` | 20 通过 / 1 失败 | 失败项断言 `.editor-context`，该节点在当前实现中不存在，属既有陈旧用例，本批未改编辑面板 |
| 像素采样 | 通过 | 运行两帧机械 195–270px、水位 985px、日影 701px 有变化；暂停后 3 秒 0 变化；reduced motion 下不订阅帧时钟 |
| 截图 | `output/yike-scale-motion/` | 三主题 × 浅深 × 待开始/运行/5 分钟；对照条 `after-25min.png`、`after-5min.png`、`after-running.png` |

Experience：quick-checked（本批局部复查）。正式固定采集、D 阶段用户复核与 P3（打卡/回顾/设置反馈）仍待后续；`yike-rework` 的陈旧用例保留并记录，不伪造全绿。


### 追加：水杯材质、轮次标记与清理（同日）

- 水位资产增加 `#glass` 图层：左侧受光、右侧背光、杯沿高光三种软渐变，由组件在液体与水波之上叠加；空杯和半杯都能看出杯壁，深色同步。
- 轮次标记的"当前"态描边改为 `border-width-strong`，深色水位下可辨。
- 打卡：今日孔位与打卡按钮在完成时播放一次 400ms 落定（`motion.duration-long` + `emphasized`），撤销时同样触发；减少动态效果时关闭。先做三主题共用的落定，机械打孔/水滴/盖章的专属形变留待后续。
- 删除已停用的 `screens/focus/YikeDial.vue` 与 `components/mode-artwork.json`；`YikeFocusModes` 去掉未使用的 `face` 参数；`resources.md` 同步。

验证补充：`vitest run test/yike` 仍为 11 文件 / 56 项通过；`yike-pages`、`yike-rework`、`yike-controls` 共 22 项通过、1 项既有陈旧用例失败（`.editor-context`）；`docs:verify` 156 份通过。截图：`output/yike-scale-motion/glass-*.png`。

### P3 页面反馈与最终验证（2026-10-20）

- 回顾周图：七列柱体在范围或周期切换时从基线长起（`motion.duration-medium` + emphasized，260ms）；减少动态效果时直接呈现结果。柱体仍按 125 分钟量程与三档规则绘制，不改数据口径。
- 设置：切换表盘或外观时，该页在 260ms 内过渡背景、文字、边框与图形描边（`is-theming` 只在设置页生效），不再瞬间换色；减少动态效果时关闭。表盘预览各自持有独立主题表，切换时不重绘。
- 启动页顶部横带经核实来自 Runtime 手机外壳的安全区，不是页面背景错误；不改应用层。
- 打卡完成/撤销的落定见上一节；机械打孔、水滴落下、印章盖下的专属形变仍作为后续可选批次，不在本批承诺。

### 最终验证（P4）

| 检查 | 结果 | 范围/限制 |
| --- | --- | --- |
| `typecheck`（含 Core build、authoring lint、vue-tsc） | 通过 | 原型与测试类型 |
| `vitest run test/yike` | 11 文件 / 56 项通过 | 含新增读数测试与更新后的表盘/主题断言 |
| 全量 `playwright e2e/yike-composition.config.ts` | 95 项，94 通过 | 唯一失败为既有 `.editor-context` 陈旧选择器，与编辑面板无关，本批未改且不掩盖 |
| `pnpm docs:verify` | 157 份通过 | design/implementation/resources 已同步 |
| 控制台 | 七页 × 三主题无 error/warning | 真实 Router 页面 |
| 动效采样 | 运行中逐帧有变化；暂停后零变化；reduced motion 关闭帧时钟与三级反馈 | 机械/水位/日影各测 |

截图（`output/yike-scale-motion/`）：`after-25min.png`、`after-5min.png`、`after-25min-dark.png`、`after-5min-dark.png`、`after-running.png`、`after-running-dark.png`、`glass3-light.png`、`glass3-dark.png`、`checkin-done.png`。

**Experience：accepted（局部，待用户复核）。** 本批覆盖 P0–P3 的表盘量程、读数、资产、运行节奏与三页反馈；固定 Capture/Handoff、Flutter 同步（I11）与用户最终验收不在本批范围。

## 倒计时量程与常用项（2026-10-20，用户批准）

用户确认倒计时一圈 = 所选时长，并把固定 3 / 5 / 10 / 20 分钟改为四个可编辑的常用槽位；不兼容旧存档，反馈强度与声音本轮不做。

### 独立实现/验收节点

| 节点 | 本批事实 |
| --- | --- |
| 量程 | `timer-readout` 新增 countdown 分支：`fraction = 剩余 / 所选时长`，满圈起、倒空止，超过一小时也不改用「另有」。番茄、休息、正计时保持 60 分钟一圈。 |
| 机械表盘 | 新增 `mechanical-{light,dark}-plain.svg`：从原资产移除 6 个数字文本，其余刻度与三帧不变。`YikeDial` 新增 `scale`，`session` 时按文件名约定加载无数字版本；专注页只在倒计时传入。 |
| 数据 | 偏好新增 `countdownPresets`（4 槽位，秒或 `null`），默认 `[180, 300, 600, 1200]`；校验数量、1–86399 范围与非空去重。`YIKE_SCHEMA_VERSION` 升到 3，删除 v1/v2 兼容分支：旧存档按损坏提示重置。 |
| 设置 | 新增「倒计时」分组与「常用倒计时」FlowSheet：列表与专注页快捷项共用带单位时长标签，逐项进入时间选择、可清空、可恢复默认，重复与越界就近报错；留空槽位不出现，最多四项。 |
| 专注页 | 快捷项来自非空槽位，带单位标签（`45秒` / `5分` / `1分30秒` / `1小时30分`）；默认仍选中 5 分钟（不在常用项时取第一个非空项）；自定义入口保留。 |
| 会话 | 打开会话时按常用项选择初始倒计时；修改常用项不影响正在使用的自定义时长。 |

### 本批验证

| 检查 | 结果 |
| --- | --- |
| `typecheck`（Core build、authoring lint、vue-tsc） | 通过 |
| `vitest run test/yike` | 11 文件 / 59 项通过（新增倒计时读数、HH:MM:SS 与紧凑标签、槽位默认/清空/去重/越界/不兼容用例） |
| 全量 `playwright e2e/yike-composition.config.ts` | 96 项，95 通过；唯一失败仍是 `.editor-context` 陈旧用例 |
| 新增浏览器用例 | 「常用倒计时可改、可清空，并出现在专注页」通过（45 秒写入、第 4 项清空、专注页剩三项） |
| `pnpm docs:verify` | 156 份通过 |
| 截图 | `output/yike-countdown/`：scales-{mechanical,water,sundial}-light、run5s-themes-{light,dark}、5s/1min/5min × 三主题 × 浅深 |

Experience：quick-checked（本批局部复查）。倒计时的秒级动效强度与声音仍按用户要求暂缓。

## 常用时长、设置文案与 FlowSheet 修正（2026-10-20）

- 独立检查节点：常用项四行/空槽位、秒/分/小时标签、时长编辑滚轮、公共步骤指示器、固定操作区、专注页长标签换行。
- 设置列表与专注页快捷项共用 `formatDurationLabel`，省略零值单位；数字计时读数和时长数据规则不变。快捷项区域按内容最小高度撑开，四个长标签在窄屏换行时不再压到表盘。
- 去除常用项面板的操作说明、设置页表盘影响范围说明，提示音状态反馈简化；保留本机保存说明、错误反馈。
- 公共 FlowSheet 指示器移到内容下方、操作区上方；新增不可横滚的裁剪层，隔离主体纵滚，修复切步动画期间滚轮聚焦使父容器横滚、回列表后页面错位。Vue、Contract、Registry、组件手册、Flutter pending 原因同步。
- 相关单测 13 文件 / 118 项通过（yike、组件 Inspector Contract、Prototype Runtime）；类型检查、静态 authoring lint 与 Vite 构建通过。
- 浏览器：六主题模式组合的倒计时快捷项/键盘/自定义、常用项修改与清空、浅深模式的阈值草稿/返回焦点/底栏稳定性共 9 项通过；新增 360×640 浅深两项通过，覆盖四个跨小时长标签、两步指示器位置、滚轮焦点、返回列表对齐和表盘无遮挡。Runtime Capture 与 Overlay 材质回归另 11 项通过。
- Experience：`quick-checked`（局部维护）。实看 `output/yike-controls/preset-list-light.png`、`preset-edit-dark.png`、`preset-long-focus-light.png`、`preset-long-focus-dark.png`、`preset-list-dark.png`，确认无说明文案、指示器底置、滚轮完整，长标签可读且与表盘分离；不代表全原型重新验收。
- 交付门禁仍有既存未通过项：Flex/Token 原型检查报告 14 处，来自 YikeDial/YikeHabitCard/YikeWeekChart 既有动效及 Settings 的 `260ms` 注释；本批修改的 DS 样式检查通过。DS→Target 基线在本批前已存在多组件、资产、Token 和主题漂移，本批不重写其它组件基线；FlowSheet 标记待 Flutter 适配，批次状态如实改为 `pending`。完整 Delivery Gate 尚未通过。

## 倒计时按上次时长再计（2026-10-20，用户批准）

- 验收节点：`yike.focus.repeat`、刚结束会话的目标时长、新会话身份与零进度、上一轮独立记录、连续点击保护与新一轮取消。
- 到点保留完成主按钮，轻操作显示带单位的上次时长（如「再计5分」「再计1分30秒」）。引擎用 `repeatCountdown` 创建新会话；命令先幂等结算上一轮，再以其 `targetMs` 开始新一轮。旧追加一分钟 API 移除。
- Action/Scenario 更名为 `repeat` / `repeat-countdown`，到点 Variant 的 required boundary 加入再计按钮；Registry 断言与既有浏览器回归同步。历史章节中的追加合并描述以本节及当前 design.md 为准。
- 单测 12 文件 / 93 项通过，覆盖 1秒、90秒、5分、90分、23小时59分59秒；验证等待时间不入账、常用项改变不影响再计时长、重复点击不生成新身份、两次完成各记一条、第三次取消保留前两条。模型回归覆盖新一轮取消和刷新暂停恢复。
- 7 项浏览器检查通过，覆盖三主题操作层级、到点跨 Tab/刷新、5分钟及自定义90秒独立再计后回顾两条记录；另 2 项全原型 Runtime 回归通过，遍历已声明 Variant 的 prepare/readiness/semantic-snapshot/reset，并执行所有已声明交互 Scenario 与 Checkpoint（含 repeat-countdown）。类型检查、authoring lint、docs:verify 通过。
- Experience=`quick-checked`：实看 `output/yike-repeat/due-mechanical-light.png` 与 `due-water-dark.png`，完成/再计层级和位置保持，文字完整。水位材质未修改。完整 Delivery Gate 的既存 Flex/Token 违规与 DS→Target pending 边界见上一批记录，本批未扩大验收声明。
