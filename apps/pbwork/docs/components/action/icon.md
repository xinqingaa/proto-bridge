# Icon

> 组件 id：`icon` · 分类：`action`
> 实现：[Icon.vue](../../../src/design-system/components/action/Icon.vue)
> 契约：[icon.json](../../../src/design-system/components/contracts/icon.json)

按稳定 PBWork 自绘 SVG id 渲染策展图标；尺寸与颜色只消费语义 Token。

## 职责与边界

- Icon 只绘制图形，不承担点击、提交或导航；可交互入口使用 Icon Button。
- 图标包固定为 PBWork 自绘 SVG，缺少图标时扩展共享策展清单，不在业务页复制 SVG 或换包。
- Contract 为 decorative policy；无可访问标签时使用装饰语义，默认不形成独立 Evidence 节点。

## 行为要点

- `name` 只接受 Contract 策展清单中的稳定 id。
- 尺寸使用受控语义档位，颜色使用 Token-ref，不接受固定数字或固定色。
- 需要表达独立业务含义时由调用方提供可访问标签和真实上下文，不把文件名当作产品语义。

## 图形源与制作规范

独立 SVG 文件是唯一图形源，统一位于 `src/design-system/components/_shared/glyphs/`：通用图形进入 `shared/`，原型专属图形进入 `<prototypeId>/`。图标与大型主题图形都遵循这一物理存放规则；禁止在原型 `theme/assets/` 或 Flutter 中保留 SVG 副本。`glyph-artwork.json` 只登记稳定 id、owner、file 与 colorMode，不保存绘图路径或 SVG body。公开名称、预览与导出从同一登记和源文件派生。

- 原型新增 icon 进入 DS 策展集合；通用语义不带业务前缀，原型专属图形使用 `<prototypeId>-<meaning>`。已有原型图标直接移动原 SVG 文件，保留文件内容，不重绘、不简化路径、不统一描边、不删除颜色或滤镜。
- 新制通用图标直接编写独立原生 SVG，精修轮廓、圆角、光学留白和小尺寸识别度；不通过 PNG 描摹或 JSON 重建图形。原生矢量可使用路径、填充、透明度、裁剪、渐变与滤镜，禁止内嵌位图、字体文字、脚本和外部资源。
- `colorMode: intrinsic` 保留原稿的颜色、渐变及透明度，预览与 Flutter 不覆盖颜色。只有原稿以 currentColor 表达主题墨色的图形使用 `colorMode: theme`，不得将彩色原稿强制归为单色。
- 重复实例仅为内部 defs 加实例前缀以隔离引用；不改几何和颜色。下载默认 SVG 直接返回原始文件字节，不重新序列化或优化。
- 大型表盘、主题容器与分层图形在所属主题包的 `theme/artwork.json` 登记，在“主题图形”分类展示，不混入界面图标枚举。登记只存元数据：`sourceFile` 是相对 `glyphs/` 的真实文件路径，`file` 是主题包内的稳定逻辑标识（如 `assets/mechanical-light.svg`），不代表原型目录下还有同名文件。
- Runtime URL、源摘要、预览与 Flutter 导出均按登记查找同一个 SVG；移动原稿时同步登记和引用，不能靠复制文件维持旧路径。图形形状、颜色与滤镜只存在于 SVG，JSON 不保存 SVG body 或重建原稿的路径。

## 预览与下载

Icon 入口使用手机框外的图形目录：按图标/主题图形、归属和名称筛选；选择后在侧栏放大显示，可切换预览底色。SVG、PNG 提供直接下载按钮。PNG 可选 1/2/3/5/8 倍；图标默认 3 倍，主题图形默认 1 倍（原始画布尺寸）；只改变像素密度，保留图形比例、颜色和透明度，预览底色不导出。主题图形可显式选择原稿内部图层，导出该 viewBox；默认视图仍下载原始 SVG。

## Flutter 同步

仓库根运行 `node scripts/export-flutter-icons.mjs`，默认导出全部公共及原型图标；`--prototype <id>` 只导出公共集合和该原型所属图标，`--target <dir>` 指定目标工程。脚手架按相同原型范围执行导出。

直接从原始 SVG 生成单份 3 倍 PNG，不经过 JSON 绘图中间件。`proto-bridge.icons.json` 记录归属、颜色策略、逻辑尺寸和实际倍率；Dart 名称及颜色策略同步生成。Flutter 使用 Image.asset，高质量缩放；自带颜色的图形禁用主题染色。`--check` 检查范围、源摘要、Dart 名称和像素尺寸；完整 DS→Target 门禁包含该检查。

主题资源同步读取显式 `theme/artwork.json`：将已登记的原始 SVG 转换为默认视图和交互分层的 PNG（按原始画布与主题 size.plot 中较大的宽度、3 倍像素密度计算），在 `proto-bridge.themes.json.artwork` 记录路径、viewBox、尺寸及专注过程依赖。相同状态图层可用 `layerAsset` 指向同一目录中的图形条目，Flutter 共用其 PNG；SVG 唯一源保留在 PBWork，Target 只接收 `asset/<归属>/artwork/` 下的 PNG；元数据的 `source` 仅记录 PBWork 来源标识和摘要，不指向 Target 文件。需要单个原稿时从 PBWork 预览手动下载。未制作业务动画时不声称位图已实现完整动态表盘。

## States

| id | label | kind |
| --- | --- | --- |
| `more` | more | `variant` |
| `plus` | plus | `variant` |
| `search` | search | `variant` |
| `settings` | settings | `variant` |
| `home` | home | `variant` |
| `list` | list | `variant` |
| `user` | user | `variant` |
| `inbox` | inbox | `variant` |
| `check` | check | `variant` |
| `chevron-down` | chevron-down | `variant` |
| `chevron-left` | chevron-left | `variant` |
| `chevron-right` | chevron-right | `variant` |
| `alert-triangle` | alert-triangle | `variant` |
| `alert-circle` | alert-circle | `variant` |
| `clock` | clock | `variant` |
| `refresh-cw` | refresh-cw | `variant` |
| `clipboard-check` | clipboard-check | `variant` |
| `shield-check` | shield-check | `variant` |
| `folder-open` | folder-open | `variant` |
| `thermometer` | thermometer | `variant` |
| `snowflake` | snowflake | `variant` |
| `copy` | copy | `variant` |
| `file-text` | file-text | `variant` |
| `sliders-horizontal` | sliders-horizontal | `variant` |
| `map-pin` | map-pin | `variant` |
| `radio` | radio | `variant` |
| `truck` | truck | `variant` |
| `dumbbell` | dumbbell | `variant` |
| `eye` | eye | `variant` |
| `eye-off` | eye-off | `variant` |
| `footprints` | footprints | `variant` |
| `person-standing` | person-standing | `variant` |
| `sparkles` | sparkles | `variant` |
| `x` | x | `variant` |
| `calendar-current` | calendar-current | `variant` |
| `yike-mechanical-calendar` | yike-mechanical-calendar | `variant` |
| `yike-mechanical-focus-high` | yike-mechanical-focus-high | `variant` |
| `yike-mechanical-focus-low` | yike-mechanical-focus-low | `variant` |
| `yike-mechanical-focus-medium` | yike-mechanical-focus-medium | `variant` |
| `yike-mode-countdown` | yike-mode-countdown | `variant` |
| `yike-mode-pomodoro` | yike-mode-pomodoro | `variant` |
| `yike-mode-stopwatch` | yike-mode-stopwatch | `variant` |
| `yike-sundial-focus-high` | yike-sundial-focus-high | `variant` |
| `yike-sundial-focus-low` | yike-sundial-focus-low | `variant` |
| `yike-sundial-focus-medium` | yike-sundial-focus-medium | `variant` |
| `yike-water-focus-high` | yike-water-focus-high | `variant` |
| `yike-water-focus-low` | yike-water-focus-low | `variant` |
| `yike-water-focus-medium` | yike-water-focus-medium | `variant` |
| `circle-check` | circle-check | `variant` |
| `chart-column` | chart-column | `variant` |
| `book-open` | book-open | `variant` |
| `glass-water` | glass-water | `variant` |
| `leaf` | leaf | `variant` |
| `moon` | moon | `variant` |
| `stretch-horizontal` | stretch-horizontal | `variant` |

## 用法与反例

- Playground 使用 gallery 对照策展图标；业务页面只选择实际需要的稳定 id。
- 不给 Icon 添加 `@click` 来绕过 Icon Button 的焦点、命名和状态契约。
- Props、Slots、Events、默认值与 Token 槽以 [Icon Contract](../../../src/design-system/components/contracts/icon.json) 为准。

运行时 Icon 保持纯图形职责，不包含资源浏览或下载交互。图形几何只由原始 SVG 拥有，不从页面随意注入。

`calendar-current` 用日历与中心定位靶心表达回到当前日期所在周期；不要用刷新图标表示日期导航。


## 页面采集与资源复用

正常 Capture 固定资源身份和页面使用，不再独立下载、归档 DS SVG。Icon 的 name 及最近语义节点所属装饰图标的信息保留在现有 props 通道；大型表盘的显式声明与实际 image view 也进入页面 props，详见 [主题包采集边界](../../../../../docs/architecture/theme-packs.md#原型绑定与-capture-边界)。装饰图标仍不增加独立 Fragment。缺失或失败的可见 HTML/SVG 图像使对应 Case 失败，不因取消归档而忽略。

Target 继续复用 DS 生成清单与 PNG；通用资产 resolver、逐图标源摘要和 Target 实际使用的自动核验不属于当前能力。新引用交付不提供历史原稿离线恢复保证；历史 theme-asset Blob 保持固定读取兼容。
