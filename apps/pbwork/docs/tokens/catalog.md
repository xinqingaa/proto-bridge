# 主题键目录

共 159 项：132 个语义键与 27 个组件键；153 项可绑定，6 项 enum 不可绑定。字阶另派生 64 个不可绑定部件；37 项实现常量不属于 Catalog。

权威源为 `src/design-system/theme/key-catalog.json` 和各组件 Contract 的 `componentTokens`，由 `loadThemeKeyCatalog()` 汇总；取值由主题包解析，本文不复制基础值。模型见[主题包解析模型](../../../../docs/architecture/theme-packs.md)，154 个旧键的去向保存在 `theme/legacy-migration.json` 并由等价测试覆盖。

| 键                                      | 类型       | 层级      | 可绑定 | 来源/说明                                                                                |
| --------------------------------------- | ---------- | --------- | ------ | ---------------------------------------------------------------------------------------- |
| `color.background`                      | color      | semantic  | 是     | 页面背景色                                                                               |
| `color.on-background`                   | color      | semantic  | 是     | 页面背景上的文字与图标                                                                   |
| `color.surface`                         | color      | semantic  | 是     | 卡片与面板表面色                                                                         |
| `color.on-surface`                      | color      | semantic  | 是     | 表面上的文字与图标                                                                       |
| `color.on-surface-muted`                | color      | semantic  | 是     | 表面上文字约 62% 透明度，用于副标题与提示                                                |
| `color.surface-variant`                 | color      | semantic  | 是     | 弱分区、表格表头与次级容器                                                               |
| `color.surface-recessed`                | color      | semantic  | 是     | 承托页内选择态与最简输入的中性内凹背景；浅色须明显低于页面背景                           |
| `color.surface-selected`                | color      | semantic  | 是     | 中性浅灰选中层，用于分段、Tab 等非主色选择态                                             |
| `color.surface-raised`                  | color      | semantic  | 是     | 菜单、Dialog 与悬浮工具栏                                                                |
| `color.inverse-surface`                 | color      | semantic  | 是     | 半透明纯黑，用于 Toast 等短提示浮层背景（原 color.toast）                                |
| `color.on-inverse-surface`              | color      | semantic  | 是     | 反色表面上的文字与图标（原 color.on-toast）                                              |
| `color.primary`                         | color      | semantic  | 是     | 克制强调色，仅用于选择、焦点、链接与进度                                                 |
| `color.primary-soft`                    | color      | semantic  | 是     | 主色混合实色软底（非 alpha），用于 Chip / tonal                                          |
| `color.on-primary`                      | color      | semantic  | 是     | 主色上的文字与图标                                                                       |
| `color.action`                          | color      | semantic  | 是     | 实心主按钮使用的中性色，不复用强调色                                                     |
| `color.action-soft`                     | color      | semantic  | 是     | 主操作混合实色软底，用于次要类型按钮                                                     |
| `color.on-action`                       | color      | semantic  | 是     | 主操作色上的文字与图标                                                                   |
| `color.secondary`                       | color      | semantic  | 是     | 次要强调色，用于次级操作与辅助图标                                                       |
| `color.secondary-soft`                  | color      | semantic  | 是     | 次色混合实色软底                                                                         |
| `color.on-secondary`                    | color      | semantic  | 是     | 次色上的文字与图标                                                                       |
| `color.error`                           | color      | semantic  | 是     | 错误与危险状态色                                                                         |
| `color.error-soft`                      | color      | semantic  | 是     | 错误色混合实色软底                                                                       |
| `color.on-error`                        | color      | semantic  | 是     | 错误色上的文字与图标                                                                     |
| `color.success`                         | color      | semantic  | 是     | 成功状态色                                                                               |
| `color.success-soft`                    | color      | semantic  | 是     | 成功色混合实色软底                                                                       |
| `color.on-success`                      | color      | semantic  | 是     | 成功色上的文字与图标                                                                     |
| `color.warning`                         | color      | semantic  | 是     | 警告状态色                                                                               |
| `color.warning-soft`                    | color      | semantic  | 是     | 警告色混合实色软底                                                                       |
| `color.on-warning`                      | color      | semantic  | 是     | 警告色上的文字与图标                                                                     |
| `color.info`                            | color      | semantic  | 是     | 信息色：比主色更冷、更灰，避免与品牌色撞车                                               |
| `color.on-info`                         | color      | semantic  | 是     | 信息色上的文字与图标                                                                     |
| `color.border`                          | color      | semantic  | 是     | 标准边框与分隔描边色                                                                     |
| `color.outline`                         | color      | semantic  | 是     | 控件轮廓与未选中描边色                                                                   |
| `color.divider`                         | color      | semantic  | 是     | 列表与区块分割线色                                                                       |
| `color.disabled`                        | color      | semantic  | 是     | 禁用状态下的内容色                                                                       |
| `color.scrim`                           | color      | semantic  | 是     | 模态遮罩色                                                                               |
| `typography.display`                    | typography | semantic  | 是     | 展示标题字阶角色（字体、字重、字号、行高）                                               |
| `typography.headline`                   | typography | semantic  | 是     | 页面标题字阶角色（字体、字重、字号、行高）                                               |
| `typography.title-lg`                   | typography | semantic  | 是     | 大标题字阶角色（字体、字重、字号、行高）                                                 |
| `typography.title`                      | typography | semantic  | 是     | 标题字阶角色（字体、字重、字号、行高）                                                   |
| `typography.title-sm`                   | typography | semantic  | 是     | 小标题字阶角色（字体、字重、字号、行高）                                                 |
| `typography.subtitle`                   | typography | semantic  | 是     | 副标题字阶角色（字体、字重、字号、行高）                                                 |
| `typography.body-lg`                    | typography | semantic  | 是     | 大正文字阶角色（字体、字重、字号、行高）                                                 |
| `typography.content`                    | typography | semantic  | 是     | 正文字阶角色（字体、字重、字号、行高）                                                   |
| `typography.body-sm`                    | typography | semantic  | 是     | 小正文字阶角色（字体、字重、字号、行高）                                                 |
| `typography.label`                      | typography | semantic  | 是     | 控件标签字阶角色（字体、字重、字号、行高）                                               |
| `typography.caption`                    | typography | semantic  | 是     | 辅助说明字阶角色（字体、字重、字号、行高）                                               |
| `typography.caption-strong`             | typography | semantic  | 是     | 强调说明字阶角色（字体、字重、字号、行高）                                               |
| `typography.micro`                      | typography | semantic  | 是     | 流程步骤等空间受限的状态标签                                                             |
| `typography.numeric-display`            | typography | semantic  | 是     | 大号展示数字字阶，沿用展示标题的字重、字号与行高                                         |
| `typography.numeric-title`              | typography | semantic  | 是     | 标题级数字字阶，沿用标题的字重、字号与行高                                               |
| `typography.numeric-content`            | typography | semantic  | 是     | 正文级数字字阶，沿用正文的字重、字号与行高                                               |
| `tracking.display` | length | semantic | 是 | 展示数字字距，独立于字体大小 |
| `tracking.heading` | length | semantic | 是 | 页面与局部模式标题字距 |
| `tracking.label` | length | semantic | 是 | 主次操作标签字距 |
| `tracking.caption` | length | semantic | 是 | 说明与标注字距 |
| `size.action-min-inline` | length | semantic | 是 | 主次操作最小行内尺寸，基础包为零，不强制通用控件宽度 |
| `effect.artwork-shadow` | filter | semantic | 是 | 物件轮廓投影，消费于 filter，与玻璃 backdrop-filter 分离 |
| `radius.mark`                           | length     | semantic  | 是     | 徽标、小标记                                                                             |
| `radius.control-compact`                | length     | semantic  | 是     | 紧凑控件、标签                                                                           |
| `radius.control`                        | length     | semantic  | 是     | 按钮、输入框、Tab                                                                        |
| `radius.surface`                        | length     | semantic  | 是     | 卡片、列表容器                                                                           |
| `radius.overlay`                        | length     | semantic  | 是     | Sheet、Dialog                                                                            |
| `radius.pill`                           | length     | semantic  | 是     | 胶囊形状                                                                                 |
| `size.control-compact`                  | length     | semantic  | 是     | 紧凑控件高度（原 sizing.control-sm，随 density 取值）                                    |
| `size.control`                          | length     | semantic  | 是     | 标准控件高度（原 sizing.control-md，随 density 取值）                                    |
| `size.control-large`                    | length     | semantic  | 是     | 大控件高度（原 sizing.control-lg，随 density 取值）                                      |
| `size.touch`                            | length     | semantic  | 是     | 最小触控目标尺寸                                                                         |
| `size.icon-inline`                      | length     | semantic  | 是     | 小图标（原 sizing.icon-sm）                                                              |
| `size.icon-compact`                     | length     | semantic  | 是     | 表单尾部、搜索等紧凑控件内的图标尺寸                                                     |
| `size.icon`                             | length     | semantic  | 是     | 标准图标（原 sizing.icon-md）                                                            |
| `size.icon-prominent`                   | length     | semantic  | 是     | 大图标（原 sizing.icon-lg）                                                              |
| `size.avatar-compact`                   | length     | semantic  | 是     | 小头像（原 sizing.avatar-sm）                                                            |
| `size.avatar`                           | length     | semantic  | 是     | 标准头像（原 sizing.avatar-md）                                                          |
| `size.avatar-large`                     | length     | semantic  | 是     | 大头像（原 sizing.avatar-lg）                                                            |
| `size.navigation-bar`                   | length     | semantic  | 是     | 底部导航栏高度（原 sizing.bottom-navigation）                                            |
| `size.stroke`                           | length     | semantic  | 是     | 环形加载与进度反馈的标准描边宽度                                                         |
| `size.indicator`                        | length     | semantic  | 是     | 页签等线性定位指示器的标准厚度                                                           |
| `size.caret`                            | length     | semantic  | 是     | 页签与菜单的小三角指示器尺寸                                                             |
| `size.marker`                           | length     | semantic  | 是     | 步骤、流程等紧凑圆点的标准尺寸（原 sizing.step-dot）                                     |
| `size.panel-medium`                     | length     | semantic  | 是     | 临时面板中等高度                                                                         |
| `size.panel-large`                      | length     | semantic  | 是     | 临时面板展开高度                                                                         |
| `border.width`                          | length     | semantic  | 是     | 细线宽度（原 border.width-hairline），不含线型与颜色                                     |
| `border.width-strong`                   | length     | semantic  | 是     | 较粗描边宽度（焦点边框等），不含线型与颜色                                               |
| `border.width-accent`                   | length     | semantic  | 是     | 强调边宽度（原 border.accent-width），用于状态消息等动态组合边框                         |
| `border.hairline`                       | border     | semantic  | 是     | 分割线描边：宽度、线型与颜色的复合值                                                     |
| `border.default`                        | border     | semantic  | 是     | 标准边框：宽度、线型与颜色的复合值                                                       |
| `border.focus`                          | border     | semantic  | 是     | 焦点环：宽度、线型与颜色的复合值                                                         |
| `elevation.surface`                     | shadow     | semantic  | 是     | 卡片阴影（原 elevation.card）                                                            |
| `elevation.raised`                      | shadow     | semantic  | 是     | 浮起阴影（原 elevation.raised）                                                          |
| `elevation.floating`                    | shadow     | semantic  | 是     | 低浓度、宽扩散的单层悬浮阴影，用于半透明中性表面（原 elevation.glass）                   |
| `elevation.menu`                        | shadow     | semantic  | 是     | 菜单与弹出层阴影（原 elevation.level-3）                                                 |
| `elevation.overlay`                     | shadow     | semantic  | 是     | Dialog 与最高层浮层阴影（原 elevation.level-5）                                          |
| `opacity.disabled`                      | number     | semantic  | 是     | 禁用状态的内容透明度                                                                     |
| `opacity.translucent`                   | number     | semantic  | 是     | 半透明中性表面的填充强度，用于 Tab 等玻璃质感选择态（原 opacity.glass）                  |
| `opacity.hover`                         | number     | semantic  | 是     | 悬停状态的叠加透明度                                                                     |
| `opacity.pressed`                       | number     | semantic  | 是     | 按下状态的叠加透明度                                                                     |
| `motion.personality`                    | enum       | semantic  | 否     | 动效性格：calm 舒缓、standard 标准、lively 活泼；时长与按压缩放由主题包按此键取值        |
| `motion.duration-short`                 | duration   | semantic  | 是     | 快速反馈时长（原 motion.duration-fast）                                                  |
| `motion.duration-medium`                | duration   | semantic  | 是     | 标准过渡时长（原 motion.duration-normal）                                                |
| `motion.duration-long`                  | duration   | semantic  | 是     | 缓慢过渡时长（原 motion.duration-slow）                                                  |
| `motion.easing-standard`                | easing     | semantic  | 是     | 标准缓动曲线                                                                             |
| `motion.easing-emphasized`              | easing     | semantic  | 是     | 强调缓动曲线                                                                             |
| `motion.easing-gentle`                  | easing     | semantic  | 是     | 柔和缓动曲线                                                                             |
| `motion.press-scale`                    | number     | semantic  | 是     | 常规按下缩放比例（原 motion.scale-pressed）                                              |
| `motion.press-scale-strong`             | number     | semantic  | 是     | 明显按下缩放比例（原 motion.scale-pressed-strong）                                       |
| `surface.treatment`                     | enum       | semantic  | 否     | 表面材质处理：solid 实色、outlined 描边、glass 玻璃；由组件层 *-treatment 键默认引用     |
| `surface.glass-backdrop`                | filter     | semantic  | 是     | 半透明玻璃表面的背景模糊与饱和度（原 effect.glass-backdrop）                             |
| `density`                               | enum       | semantic  | 否     | 界面密度：compact 紧凑、regular 常规、comfortable 宽松；间距与控件高度由主题包按此键取值 |
| `asset.brand-mark`                      | asset      | semantic  | 是     | 品牌标记图形资产，none 表示不提供                                                        |
| `asset.brand-wordmark`                  | asset      | semantic  | 是     | 品牌字标资产，none 表示不提供                                                            |
| `asset.launch-image`                    | asset      | semantic  | 是     | 启动与欢迎页图像资产，none 表示不提供                                                    |
| `asset.empty-illustration`              | asset      | semantic  | 是     | 空状态插画资产，none 表示不提供                                                          |
| `spacing.xs`                            | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `spacing.sm`                            | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `spacing.md`                            | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `spacing.lg`                            | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `spacing.xxs`                           | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `spacing.sm-plus`                       | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `spacing.lg-plus`                       | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `spacing.2xl`                           | length     | semantic  | 是     | 通用间距刻度；按布局所需档位选用，基础值沿用现有刻度。                                   |
| `app-bar.surface-treatment`             | enum       | component | 否     | app-bar                                                                                  |
| `badge.label-size`                      | length     | component | 是     | 紧凑徽标字号；保持既有默认外观，不受依赖样式加载顺序影响                                 |
| `bottom-sheet.duration`                 | duration   | component | 是     | bottom-sheet                                                                             |
| `flow-sheet.gap`                        | length     | component | 是     | flow-sheet                                                                               |
| `flow-sheet.duration`                   | duration   | component | 是     | flow-sheet                                                                               |
| `menu.menu-item-height`                 | length     | component | 是     | menu                                                                                     |
| `menu.offset`                           | length     | component | 是     | menu                                                                                     |
| `primary-tabs.active-color`             | color      | component | 是     | primary-tabs                                                                             |
| `primary-tabs.selection-treatment`      | enum       | component | 否     | primary-tabs                                                                             |
| `progress.gap`                          | length     | component | 是     | progress                                                                                 |
| `progress.track-height`                 | length     | component | 是     | progress                                                                                 |
| `scrollable-data-list.action-min-width` | length     | component | 是     | scrollable-data-list                                                                     |
| `scrollable-data-list.action-height`    | length     | component | 是     | scrollable-data-list                                                                     |
| `secondary-tabs.active-color`           | color      | component | 是     | secondary-tabs                                                                           |
| `secondary-tabs.indicator`              | color      | component | 是     | secondary-tabs                                                                           |
| `tab-viewport.duration`                 | duration   | component | 是     | tab-viewport                                                                             |
| `tabbar.active`                         | color      | component | 是     | tabbar                                                                                   |
| `tabbar.surface-treatment`              | enum       | component | 否     | tabbar                                                                                   |
| `textarea.rows`                         | number     | component | 是     | textarea                                                                                 |
| `toast.gap`                             | length     | component | 是     | toast                                                                                    |
| `toast.duration`                        | duration   | component | 是     | toast                                                                                    |

## 材质与数据展示语义键

| Key                 | 类型   | 用途                 |
| ------------------- | ------ | -------------------- |
| `color.glass-tint`  | color  | 常规玻璃底色         |
| `color.glass-clear` | color  | 清透玻璃底色         |
| `color.glass-edge`  | color  | 随模式变化的边缘高光 |
| `border.glass`      | border | 引用玻璃高光的描边   |
| `elevation.glass`   | shadow | 内外玻璃光影         |
| `size.plot`         | length | 图表高度             |
| `size.brand`        | length | 品牌图形尺寸         |
| `size.ring`         | length | 环形数据直径         |

`layout.wheel-mask` 为只读遮罩常量，不进入绑定池；SVG 图形几何集中于受控 artwork 资产。

## 玻璃控件组件键

| 键                               | 类型  | 层级      | 可绑定 | 来源/说明            |
| -------------------------------- | ----- | --------- | ------ | -------------------- |
| `tabbar.selection-tint`          | color | component | 是     | 主导航选中玻璃底色   |
| `primary-tabs.selection-tint`    | color | component | 是     | 页内导航选中玻璃底色 |
| `button.glass-primary-tint`      | color | component | 是     | 主要按钮玻璃底色     |
| `icon-button.glass-primary-tint` | color | component | 是     | 主要图标按钮玻璃底色 |

数据强度新增 `opacity.data-low`、`opacity.data-medium`、`opacity.data-high`：可绑定、随明暗模式变化的语义 number，用于离散三级数据填充；零值单独表达。`segmented-control.compact-height`、`segmented-control.compact-selection-height` 是组件 length 键，分别控制紧凑轨道/选中底板，不缩小触控范围。


## 数据强度与紧凑选择

| 键 | 类型 | 层级 | 可绑定 | 来源/说明 |
| --- | --- | --- | --- | --- |
| `opacity.data-low` | number | semantic | 是 | 离散数据低档填充强度 |
| `opacity.data-medium` | number | semantic | 是 | 离散数据中档填充强度 |
| `opacity.data-high` | number | semantic | 是 | 离散数据高档填充强度 |
| `segmented-control.compact-height` | length | component | 是 | 紧凑选择轨道的可见高度 |
| `segmented-control.compact-selection-height` | length | component | 是 | 紧凑选择底板的可见高度 |
