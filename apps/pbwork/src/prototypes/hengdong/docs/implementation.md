---
prototypeId: hengdong
---

# 恒动实现说明

产品与体验基线见 `design.md`。本文件只记录正式 PBWork 转译、交付状态和原型局部实现决定。

## 页面交付状态

| 页面       | 页面设计 | Delivery Gate | Experience Review |
| ---------- | -------- | ------------- | ----------------- |
| 今天       | approved | passed        | accepted          |
| 训练执行   | approved | passed        | accepted          |
| 训练总结   | approved | passed        | accepted          |
| 活动记录   | approved | passed        | accepted          |
| 计划       | approved | passed        | accepted          |
| 计划详情   | approved | passed        | accepted          |
| 进度       | approved | passed        | accepted          |
| 设置与目标 | pending  | legacy-draft  | pending           |
| 登录       | approved | passed        | accepted          |
| 注册       | approved | passed        | accepted          |

`legacy-draft` 表示现有代码可以保留用于后续调整，但不代表页面设计或体验已经通过。

## 通用实现基线

- 注册 10 个 Screen：登录、注册、今天、活动记录、计划、进度、计划详情、训练执行、训练总结、设置与目标。
- 根目的地切换使用 `replace`，二级任务使用 `push` 和可恢复 parent。
- 三个根页面只通过底部 Tabbar 切换；活动记录归属今天任务栈。
- 本地状态统一保存在 `hengdong.app.v2`；账号、目标、当前计划、训练会话、活动记录和主题共享同一数据源。
- 正式训练与快速记录写入同一记录集合；今天、活动记录和进度从同一记录事实派生。
- 计划编辑和快速记录使用 FlowSheet；记录详情与筛选使用 BottomSheet；退出、删除和重置使用确认组件。
- 关键页面状态使用 Variant 或确定 fixture 准备，不依赖上一次浏览器会话。

## Promotion Mapping

| 视觉或交互元素     | 分类                    | 正式转译                                                        |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| 周目标环           | Token 驱动的业务局部 UI | 真实主路径热区，声明状态、Token Evidence 和 reduced-motion 行为 |
| 七日节奏           | Token 驱动的业务局部 UI | 每日为稳定业务热区，与活动记录同源                              |
| 活动类型图标       | 现有 PBWork Icon        | 使用稳定 Lucide id，不引入第二套图标                            |
| 主次按钮、设置入口 | 现有 PBWork DS          | 使用 Button / IconButton 公开 Contract                          |
| 最近记录列表       | 现有 DS 组合            | ScrollableDataList + DataList；今天只展示最近五次               |
| 活动类型二级 Tab   | 现有 PBWork DS          | SecondaryTabs；五个具名列表面板拥有独立滚动状态                 |
| 活动记录列表       | 现有 DS 组合            | ScrollableDataList + DataList；开启刷新与分页                   |
| 活动日期时间线     | Token 驱动的业务局部 UI | 月份与日期形成稳定结构节点，不使用逐行 Card                     |
| 进度周期 Tab       | 现有 PBWork DS          | PrimaryTabs；本周、本月、本年及按需自定义拥有完整内容面板       |
| 活动节奏图与日历   | Token 驱动的业务局部 UI | 周/月/年共享节奏语法，显式声明图表和日期 Token Evidence         |
| 当前计划摘要       | 现有 DS 组合            | 当前计划事实、Progress、Button 和局部事实行，不新增通用 Card    |
| 计划库分类与列表   | 现有 DS 组合            | SecondaryTabs + DataList；四个具名面板支持点击、横滑与统一过渡  |
| 计划动作序列       | Token 驱动的业务局部 UI | 使用真实动作顺序和稳定 exercise key，不承担训练执行状态         |
| 计划编辑流程       | DS 原子升级 + 现有组合  | FlowSheet 使用 X 图标关闭；TextField / RadioGroup / Checkbox 组成紧凑表单 |
| 快速记录           | 现有 PBWork DS          | FlowSheet + 表单组件；结果在相关内容区持续反馈                  |
| 记录详情           | 现有 PBWork DS          | BottomSheet；今天与进度只读，活动记录页负责删除与历史管理       |
| 动作序列           | Token 驱动的业务局部 UI | 只表达已完成、当前和待进行，不承担随机跳转                      |
| 动作舞台           | Token 驱动的业务局部 UI | 以当前姿态、目标和单条提示形成训练首屏焦点                      |
| 姿态资产           | 原型局部 SVG 资产       | 默认动作映射关键姿态；未知动作使用中性姿态，文字提示保持权威    |
| 训练退出选择       | 现有 PBWork DS          | BottomSheet 承载继续、稍后继续、部分保存和放弃                  |
| 完成结果环         | Token 驱动的业务局部 UI | 从身体舞台收束为保存前的完成结果，不作为可点击控件              |
| 训练体感与备注     | 现有 PBWork DS          | RadioGroup + Textarea；无体感时保存不可用                       |
| 认证 Logo          | Token 驱动的业务局部 UI | 抽象运动轨迹 H；使用 action/on-action Token 适配浅深主题        |
| 账号与密码字段     | 扩展 PBWork TextField   | 增加有限密码、显隐、autocomplete 与字段错误能力                 |
| 初始周目标         | 现有 PBWork DS          | Menu 在同一注册表单选择每周 2–5 次                              |
| 替换本地身份确认   | 现有 PBWork DS          | Confirm 明确旧凭据失效且设备训练数据保留                        |

## 登录与注册正式调整

### 确定状态

- 登录：`default`、`ready`、`validation-error`、`invalid-credentials`、`no-identity`；
- 注册：`default`、`ready`、`validation-error`、`replace-identity`、`replace-confirm-open`；
- 登录默认空表单，不展示演示密码；关键输入由 Action Scenario 确定填写；
- 注册默认每周 3 次，替换身份只改变本地身份与目标，不删除计划和活动记录；
- 当前设备保持登录直到设置页退出，不保留无实际行为的 remember 字段。

### 独立验收节点

- 登录根、品牌起步环、表单、账号字段、密码字段、主操作、身份切换入口和无身份状态；
- 注册根、品牌起步环、表单、称呼/账号/密码字段、初始目标、本地数据说明、主操作和替换身份确认；
- `TextField` 的密码显隐、字段错误和 autocomplete 作为共享 DS 状态进入 Contract、Registry、场景、文档和 Target 同步；
- 登录、打开注册、返回登录、注册和确认替换分别使用稳定 Action target。

### 关键 Action 与 Scenario

- 填写正确凭据并登录后进入今天；错误凭据留在登录并显示字段反馈；
- 登录与注册使用 replace 往返，不形成历史循环；
- 注册保存规范化账号、称呼和初始周目标，今天立即显示新称呼；
- 替换身份提交先打开 Confirm，取消不写入，确认后保留计划与活动记录；
- 设置退出后进入登录，再次登录仍使用同一设备事实。

### Experience Gate 目标

- 本批执行 L2 Focused Experience Gate，目标结果为 `accepted`；
- 检查登录浅色默认、登录窄屏错误与密码显隐、注册浅色默认、注册深色错误或替换确认、桌面有限宽度；
- 检查键盘焦点、字段错误、图标可访问名称、Overlay 完整性、单一主操作和无多余 Card；
- 任一已知文字溢出、键盘遮挡、表单过宽、虚假交互或数据边界问题阻止记录 `accepted`。

### L2 验收结果

- Delivery Gate：Token-only、DS-first、Flex-only、10 Screen Registry、127 个 PBWork 测试、生产构建、4 项 Runtime Capture e2e、文档校验、DS Target 同步、Flutter 静态分析与测试通过；
- Experience Review：在真实浏览器中检查 `390 × 844` 登录浅色默认、注册浅色默认和注册深色替换确认，检查 `390 × 667` 登录错误与密码显隐，并在 `1280 × 800` 检查表单有限宽度；结果为 `accepted`；
- 登录默认保持空表单，密码默认隐藏且显隐按钮具有可访问名称；正确凭据进入今天，错误凭据停留原页并提供字段反馈；
- 注册保存规范化账号、称呼和每周 2–5 次初始目标，首次创建与替换身份均进入今天并立即显示新称呼；替换确认取消不写入，确认后保留计划和活动记录；
- 登录与注册互相替换路由，不形成返回循环；身份成功后替换为今天，仍维持 10 个正式 Screen，不新增 onboarding 层级；
- 本轮 Experience 修正了认证次操作按钮过重、Confirm 两个动作强调度相同，以及确认替换时 Dialog 关闭与成功导航竞争的问题；修正后重新通过受影响交互与门禁。

### 视觉重设计增量

- 按用户反馈移除“恒”字目标环和上下两端分散构图，改为紧凑 Logo/字标、任务标题、plain 输入组和连续操作层级；
- Logo 作为原型局部矢量资产实现，继续使用稳定 `brand-mark` Evidence identity，不改变 Screen、Variant、Action 或 Scenario；
- 登录与注册复用 TextField 的最简无描边形态；plain 字段以 `label` 提供可访问名称，页面不复制输入组件；
- 本增量继续执行 L2 Focused Experience Gate，重点复核表单首屏重心、Logo 识别、plain 输入可用性、窄屏键盘、深色主题和替换确认。

## 今天页正式调整

### 确定状态

- `default`：存在当前计划，无进行中会话，当天未完成。
- `in-progress`：存在可恢复会话。
- `completed`：当天已有活动记录，主路径降低强调。
- `no-plan`：没有当前计划，主路径进入计划页。
- `recent-empty`：最近记录为空，主行动不受影响。
- `quick-record-open`：快速记录流程打开。
- `record-detail-open`：今天页记录详情打开。
- `record-detail-quick`：快捷记录且无备注的详情打开。
- `record-detail-long-note`：正式训练的长备注详情打开。
- `day-empty-feedback`：无记录节奏日反馈可见。
- `recent-five`：最近记录展示五条并提供活动记录二级页入口。

### 独立验收节点

- 今天页根、工具行、主行动摘要、周目标环、主行动区、本周节奏、最近记录；
- 每个节奏日使用日期作为稳定 key；
- 最近记录行使用记录 id 作为稳定 key；
- 快速记录 Sheet、记录详情的结果头部、关键事实、动作/活动内容、备注和页内状态反馈；
- 主按钮与环分别作为同一业务结果的 Action target。

### 关键 Action 与 Scenario

- 主按钮开始/继续训练；
- 环开始/继续训练；
- 无计划时主按钮或环进入计划；
- 有记录日期打开今天页记录详情；
- 无记录日期显示轻量反馈；
- 最近记录打开今天页记录详情；
- “查看全部”进入活动记录二级页，返回恢复今天局部状态；
- 快速记录保存后更新今天和本周数据。

### Experience Gate 基线

- 目标视口 `390 × 844`；
- 默认浅色与深色；
- 进行中、完成、无计划、最近为空；
- 环、主按钮、七个日期和最近记录逐项验证；
- 检查首屏焦点、阅读顺序、分割线、重复元素基线、文字适配、键盘焦点和底栏遮挡。

### 双门禁验收结果

- Delivery Gate：Token-only、DS-first、Flex-only、Registry、类型检查、组件与 Registry 测试、Runtime e2e 和文档验证通过；
- Experience Gate：在 `390 × 844` 实际浏览器中检查浅色、深色、进行中、完成、无计划、最近为空、两种 Overlay 和页内日期反馈；记录详情另检查正式训练、快捷记录、无备注与长备注；
- 环与主按钮实际进入同一训练会话；有记录日期与最近记录在今天页打开详情；无记录日期显示不遮挡底栏的反馈；
- 记录详情按完成结果、关键事实、动作内容和备注阅读；快捷记录移除重复说明，不伪造动作序列；
- 长备注在 `390 × 667` 窄屏形成 Sheet 内部滚动，关闭入口持续可见，内容可以滚动到底；BottomSheet 已落实既有可滚动内容边界；
- 七个标记的尺寸与纵向位置一致，日期保留原生按钮语义和可见焦点；完成态主按钮降低强调，区块与列表只保留表达结构所需的分隔。

## 活动记录与进度正式调整

### 确定状态

- 活动记录：`default`、`training`、`refreshing`、`loading-more`、`filtered-empty`、`empty`、`record-detail-open`、`record-detail-long-note`、`delete-confirm-open`、`undo-visible`；
- 进度：`default`、`month`、`year`、`custom-range-open`、`custom`、`selected-date`、`filter-open`、`empty`、`record-detail-open`；
- 活动记录的二级 Tab、滚动位置、分页和刷新状态由各面板拥有；进度的一级 Tab 拥有周期内容与横滑；
- 自定义日期范围使用原型局部 FlowSheet 组合，不新增共享日期组件；
- 刷新重新读取 `hengdong.app.v2` 的持久记录，不用固定延时伪造网络请求。

### 独立验收节点

- 活动记录根、App Bar、二级 Tab、五个列表面板、月份分组、日期分组、记录行、刷新和分页反馈；
- 活动记录详情、删除确认和撤销反馈；记录行使用记录 id，月份和日期使用稳定日期 key；
- 进度根、App Bar、一级 Tab、日期范围、周期摘要、活动节奏、日期视图、当前选择、筛选和自定义范围；
- 趋势刻度使用稳定时间片 key，日期和月份使用 ISO 日期 key；
- 今天的“查看全部”、活动记录删除、进度周期切换和自定义范围分别作为 Action target。

### 关键 Action 与 Scenario

- 今天“查看全部”进栈活动记录，返回后恢复今天；
- 活动记录点击或横滑切换分类，纵滚不误触横滑，下拉刷新不触发 Tab；
- 活动记录加载更早记录，打开详情，删除并撤销后三个页面同步；
- 进度点击或横滑切换周、月、年，前后周期按钮改变对应数据；
- 自定义范围取消、非法输入和成功应用具有不同结果；
- 趋势和日期焦点互斥，活动类型筛选同步影响所有派生数据；
- 根 Tab 只经 Tabbar 切换，今天、活动记录和进度内容不互相跳根页面。

### Experience Gate 目标

- 本批执行 L2 Focused Experience Gate，目标结果为 `accepted`；
- 活动记录重点检查 SecondaryTabs、独立列表滚动、刷新/分页、长内容、删除 Overlay 和窄屏；
- 进度重点检查 PrimaryTabs、周期横滑、节奏图、日期视图、自定义范围、深色和 reduced motion；
- 今天按本批旅程复核最近五次、进栈/返回和保存后的即时更新；
- 任一已知实质视觉、遮挡、手势或状态问题阻止记录 `accepted`。

### L2 验收结果

- Delivery Gate：Token-only、DS-first、Flex-only、10 Screen Registry、126 个 PBWork 测试、生产构建、4 项 Runtime Capture e2e、文档校验和 DS Target 同步检查通过；
- Experience Review：在 `390 × 844` 实际浏览器中复核今天默认态与最近五次入口、活动记录浅色时间线、活动记录深色长备注和 `390 × 667` 窄屏、进度周/月切换、本年深色态与自定义日期浮层；结果为 `accepted`；
- 今天“查看全部”进入活动记录二级页，不切换底部根 Tab；返回使用今天任务栈，三个根页面仍只通过 Tabbar 切换；
- 活动记录五个二级 Tab 在目标视口完整可见，分类内容拥有独立横滑与纵滚边界；月份、日期和记录形成连续账本，长备注 Sheet 的关闭入口持续可见；
- 进度使用 PrimaryTabs 的选中动画与水平面板切换；周、月、年按日、周、月使用同一节奏尺，柱高按当前时间片最大值归一，本年超出一屏时横向浏览且月份标签不重叠；
- 自定义范围作为临时 Tab 出现，关闭、取消和应用保持明确主次；进度详情只读，删除、撤销和完整历史继续由活动记录页承担；
- 本轮 Experience 修正了 SecondaryTabs `grow + fill` 高度异常、五分类溢出、节奏柱错误等高、周期导航文字挤压、本年月标签重叠和 FlowSheet 关闭按钮强调度错误；修正后重新通过受影响测试与 Runtime Gate。

## 计划与计划详情正式调整

### 确定状态

- 计划：`default`、`filtered`、`empty`、`plan-editor-open`、`plan-editor-validation`；计划详情：`default`、`candidate`、`adopted-feedback`、`invalid-plan`、`plan-editor-open`、`plan-editor-validation`。
- 计划页不增加“我的计划 / 推荐”Tab；“全部 / 唤醒 / 力量 / 舒缓”改为二级 SecondaryTabs，每项拥有具名计划面板。
- 当前计划位于二级 Tab 之上且不在面板中重复；计划列表与详情采用训练处方视觉，减少卡片和行内标签竞争。
- FlowSheet 共享关闭入口升级为 X 图标按钮；业务步骤使用“返回”和语义化继续动作，最终保存为底部全宽主操作。
- 新建计划 FlowSheet 保存后设为当前计划；编辑当前计划保留当前身份；编辑候选计划保存但不自动采用。
- 候选详情使用“设为当前计划 / 只开始一次”双路径；当前详情只使用“开始这次训练”。

### 独立验收节点

- 计划根、App Bar、当前计划摘要、当前计划事实行、当前进度、开始/查看动作、计划库二级 Tab、具名面板、计划列表、空态和编辑 FlowSheet；
- 计划详情根、状态标签、计划身份、执行成本、本周状态、动作处方序列、采用/只开始一次/开始训练动作、撤销反馈和编辑 FlowSheet；
- 计划行使用分类 identity + plan id，动作行使用 exercise id 作为稳定 key；
- 计划变化、今天页上下文和训练入口使用同一份本地状态，不生成虚假活动记录。

### 关键 Action 与 Scenario

- 计划打开当前详情、开始当前训练、点击或横滑切换计划分类；
- 计划详情采用候选计划、只开始一次、开始当前计划和打开编辑；
- 新建保存、编辑保存、无效计划回退和更换计划撤销均须有可观察结果；
- 计划页不跨根页面打开进度，返回保留计划任务栈。

### Experience Gate 目标

- 本批执行 L2 Focused Experience Gate，目标结果为 `accepted`；
- 重点检查计划默认/分类空态、SecondaryTabs 点击与横滑、候选/当前详情、FlowSheet 校验与保存、深色、窄屏长动作列表、键盘焦点和 reduced motion；
- 任一采用语义混淆、今天状态未同步、主操作重复强调、文字溢出、底部遮挡或假交互阻止记录 `accepted`。

### L2 验收结果

- Delivery Gate：Token-only、DS-first、Flex-only、10 Screen Registry、131 个 PBWork 测试、生产构建、4 项 Runtime Capture e2e、113 份文档校验和 DS Target 31/31 组件、154/154 Token 同步检查通过；
- Experience Review：在真实浏览器中检查 `390 × 844` 计划浅色默认态、`390 × 844` 候选详情、`390 × 667` FlowSheet 首步与校验态，以及 `1280 × 800` 深色桌面；桌面无横向溢出，结果为 `accepted`；
- “全部 / 唤醒 / 力量 / 舒缓”使用二级 SecondaryTabs；点击和真实左滑都切换具名面板，过渡时长使用 DS Token，纵滚不被误触；默认 Variant 确定回到“全部”；
- 详情页以计划承诺、执行成本、编号动作处方和本周状态形成阅读主线；推荐状态、目标、难度和频率分层对齐，不再挤在松散行内标签中；
- FlowSheet 使用带可访问名称的 X 图标关闭；短选项改为 RadioGroup，动作 Checkbox 使用真实名称和剂量；“返回”、语义化继续动作和底部全宽保存成立，reduced motion 降级为 instant；
- 无效计划详情只显示明确恢复结果，不静默展示另一套计划；新建、编辑和采用不生成活动记录；计划、今天和训练入口继续读取同一份本地事实；
- 本轮 Experience 修正了默认分类受持久状态干扰、文字关闭按钮、短选项大框、通用上一步/下一步、详情身份错位和动作序列焦点不足；修正后重新通过完整 Delivery Gate 与浏览器复核。

## 训练执行与训练总结正式调整

### 确定状态

- 训练执行：`default`、`paused`、`resumed`、`exit-confirm-open`、`exit-confirm-empty`、`last-exercise`、`invalid-session`；
- 训练总结：`default`、`partial`、`ready-to-save`、`leave-confirm-open`、`invalid-summary`；
- 会话的运行、暂停、完成部分、待保存总结、体感和备注统一写入同一持久状态；刷新和返回今天不会伪造新会话；
- 最后一个动作只生成待保存总结，选择体感并保存后才写入活动记录并清除会话。

### 独立验收节点

- 训练执行根、焦点头部、动作序列、当前动作、身体舞台、提示、下一动作、底部行动区、恢复反馈和退出 Sheet；
- 动作序列项使用动作 id 作为稳定 key，动作舞台姿态是局部资产，文本目标与提示保持权威；
- 训练总结根、结果摘要、完成结果环、关键事实、动作列表、周节奏影响、体感与备注、保存区、恢复态和离开确认；
- 已完成动作使用动作 id 作为稳定 key；保存、暂停、继续、稍后继续和部分保存均具有独立 Action target。

### 关键 Action 与 Scenario

- 暂停冻结计时并切换为单一主行动，继续后恢复计时；
- 完成当前动作推进序列，最后一个动作进入完整总结；
- 退出时可继续、稍后继续、保存已完成部分或放弃；未完成动作时部分保存不可用；
- 稍后继续返回今天，今天以恢复入口重新进入暂停会话；
- 总结页要求先选择体感，备注和体感刷新后保留；保存写入一条记录并更新今天；
- 浏览器返回与页面返回不会静默丢失训练进度或未保存结果，分别打开退出 Sheet 和离开确认。

### L2 验收结果

- Delivery Gate：Token-only、DS-first、Flex-only、Registry、类型检查、121 个 PBWork 测试、Runtime e2e、生产构建和文档验证通过；
- Experience Review：在 `390 × 844` 实际浏览器中检查训练默认态、暂停与退出 Sheet、完整总结浅色态、部分总结深色态，并用一次诊断截图修正计数重叠、舞台留白和确定 fixture；
- 训练页无横向溢出和多余内部滚动，动作舞台、提示与底部行动保持稳定阅读顺序；暂停态计时冻结，退出 Sheet 在首屏内可操作；
- 完整与部分总结使用不同中性文案和结果表达；体感未选时保存不可用，体感与备注刷新后仍在；
- 真实路径已验证暂停、恢复、稍后继续、部分保存、完整完成、保存回今天，以及两类浏览器返回保护；
- 本批达到截图上限后，其余确定性和交互检查使用 DOM 与状态验证完成，没有继续扩大截图数量。

今天、训练执行和训练总结已完成核心闭环并通过对应验收；其余页面按 `design.md` 的旅程顺序推进。
