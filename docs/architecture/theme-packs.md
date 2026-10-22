# 主题包解析模型

Core 的 `packages/core/src/v2/theme/` 提供浏览器安全的主题包 Schema、继承解析、引用链、摘要、对比度与作用域校验，通过 `@proto-bridge/core/v2/theme` 和 `@proto-bridge/core/v2` 导出。Core 不读取文件；键目录、常量、包集合和资产字节摘要由调用方提供。

本文描述已经实现的解析、Runtime 接入与采集固定。PBWork Runtime 已按原型主题包提供响应式表、CSS、Vuetify 与偏好管理。DS/冷链已使用新键与响应式读取。Capture 把包摘要、键目录摘要、声明时钟和每个「主题 × 模式」的解析表固定进 Evidence；Handoff 指向其中的默认主题与模式。

## 输入与所有权

- `ThemeKeyCatalog` 声明语义键和组件键：`id`、`tier`、`valueType`、`bindable`、`modeVariant`，以及可选的 enum 值域、标签、说明、来源和组件默认表达式。PBWork 拥有键名，Core 不内置 PBWork 的键目录。
- `ThemeConstantTable` 单独保存实现常量。常量不可被包覆盖，不可在包表达式中引用，也不成为可绑定主题键。
- `ThemePackSource` 包含 manifest、可选的 Primitive、semantic/component 层，以及调用方提供的资产文件摘要和原型所有者。
- Primitive 名只在包内及其继承链可见，不进入键目录。原型包 ID 必须等于所属 prototypeId；Playground 包不能绑定正式原型。

类型决定解析和 CSS 单位，不能根据键前缀猜测。支持 color、length、number、duration、easing、shadow、border、filter、enum、asset、typography。只有 color、shadow、number、filter、asset 类型的键可以声明 `modeVariant: true`；其它类型不可按模式直接覆盖。

## 一个包，多套主题

manifest 必须声明主题列表、默认主题、模式列表与默认模式：

```json
{
  "schemaVersion": 1,
  "id": "example",
  "label": "示例包",
  "extends": "pbwork-base",
  "scope": "prototype",
  "themes": [
    { "id": "default", "label": "默认" },
    { "id": "alternate", "label": "另一套主题" }
  ],
  "defaultTheme": "default",
  "modes": ["light", "dark"],
  "defaultMode": "light"
}
```

列表不能重复，默认项必须在列表中；可选的主题 `default` 标记必须与 `defaultTheme` 一致。基础包不继承；其它包的继承链必须终止于基础包。

semantic 和 component 使用同一种层结构：

```json
{
  "values": { "radius.control": 12 },
  "modes": { "dark": { "color.primary": "#83b2f2" } },
  "themes": {
    "alternate": { "values": { "radius.control": 20 } }
  },
  "themeModes": {
    "alternate": { "dark": { "color.primary": "#7fb197" } }
  }
}
```

每个包内按 `themeModes` → `themes` → `modes` → `values` 取值，然后才查祖先包。子包的公共值因此可以覆盖祖先的主题专属值。主题与模式的覆盖不能引入未声明的键或维度；模式覆盖只能修改 `modeVariant` 键。

主题身份为 `ThemeIdentity { packId, packDigest, theme, mode }`，格式化为 `packId@sha1:<hex>/theme/mode`。`formatThemeIdentity` 和 `parseThemeIdentity` 提供往返转换。

## 表达式与字阶

值可以是字面量、整串 `{key}` 引用、覆盖 enum 全部值的 `$switch`，或 typography/border/asset 复合对象。不支持字符串内插与颜色运算。

Primitive 只能引用 Primitive；语义键不能引用组件键。引用 Primitive 时固定表达式所属包的作用域，避免子包同名 Primitive 误改祖先表达式。语义键和组件键保持晚绑定，因此祖先组件默认值会消费子包覆盖后的语义值。循环引用会报告完整路径。

字阶角色声明字重、字号与行高：

```json
{ "weight": 650, "size": 20, "lineHeight": 1.3 }
```

可选 `family` 只接受 `$default` 占位。字族固定为系统字体栈；包不声明字体文件、字体许可证或 `font.*` 键。解析结果生成 `.family`、`.weight`、`.size`、`.line-height` 部件，均不可绑定，其中 `.family` 只读。`typography.numeric-*` 角色保持系统字族并输出等宽数字特性。

border 包含 width/style/color，各字段允许表达式；asset 为 `none` 或 file/mediaType/alt。资产必须存在于表达式所属包的 files 摘要表中，结果携带该 packId，避免从另一个包解析同名文件。

## 解析与校验入口

- `resolveThemePack({ keyCatalog, constants, packs, packId, theme?, mode })`：不指定主题时取包的默认主题，返回 table 或 null 与 diagnostics。
- `resolveAllThemeTables({ keyCatalog, constants, packs, packId })`：解析该包声明的全部主题 × 模式，返回 digest、tables、diagnostics；存在阻断时 digest 为 null，tables 为空。
- `validateThemePacks({ keyCatalog, constants, packs, prototypeBindings?, includeInfo? })`：校验 Schema、全部包与维度、基础包完整性、引用、类型、资产、对比度及原型绑定。无效祖先不会被后续解析静默忽略。

结果表包括 identity、values、provenance 和 constants。每个键的 provenance 保留 sourcePackId、引用 chain、是否 inherited。角色部件与常量的输出不改变键目录的可绑定范围。

对比度配对由键目录提供。文本要求 4.5:1，UI 要求 3:1；带 alpha 的颜色先合成到配对指定的 backdrop（缺省背景色）。未豁免的失败阻断；有非空理由的 contrastWaiver 为 warning，可限制主题和模式。祖先豁免只在前景与背景解析值均未变化时继承；任一侧变化即失效。未命中的豁免单独警告。

## 摘要

键目录摘要覆盖键定义与对比度配对，忽略标签、说明和来源文字。包摘要覆盖包身份、继承链、键目录摘要、主题和模式列表与默认项、全部解析值、继承链资产摘要。对象键顺序、Primitive 名、表达式写法和标签不影响等价结果的摘要。

任何主题或模式的取值变化都会改变包摘要，即使该组合不是当前请求的组合。Runtime manifest 的 `inputVersion` 覆盖包摘要、键目录摘要和声明时钟，因此取值、键目录或时钟变化都会使已有 Evidence 过期。Handoff 必填 `themePack`，并固定对应的 theme-pack Catalog 修订。

## PBWork 基础数据与 CSS 生成

PBWork 的数据位于 `src/design-system/theme/` 与 `theme-packs/base/`。`loadBaseThemeSources()` 使用 Core Schema 解析这些 JSON；当前公共间距仍沿用原有 `spacing.*` 刻度 ID 与基础值，旧键去向记录在 legacy-migration.json。

`themeTableToCssVars(table, catalog, constants, assetUrl?)` 按 valueType 输出 `--pb-*`：长度补 px、时长补 ms、字阶与描边展开复合值，输出字阶部件与数字特性变量；资产 URL 由拥有资产的包加载器提供。未知键、变量名碰撞和缺失资产 URL 不会被静默接受。RuntimeLayout 已消费这些变量，并提供密度、表面与动效的 data 属性。

## Runtime 接入

`design-system/theme/runtime-theme.ts` 提供以下接口，RuntimeLayout 已使用 registry 和响应式表；组件内 JS 已通过 computed 读取：

- `createRuntimeThemeRegistry(sources, assetUrl?)` 为一组来源建立解析缓存；`resolve(packId, theme, mode)` 经 Core 解析全部组合并保留阻断诊断，未知组合直接报错，不回退默认主题。来源更新时创建新 registry。`cssVars(table)` 缓存按类型生成的 CSS。
- `resolveRuntimeTheme(packId, theme, mode)` 使用当前加载的全部包。`loadThemeSources()` 通过 Vite glob 读取 `theme-packs/*/` 与 `prototypes/*/theme/` 的 pack/primitives/semantic/component JSON；原型目录提供 ownerPrototypeId，重复包 ID 报错。Vite 插件按资产原始字节计算 sha1，经虚拟模块提供 files；`?url` 导入构建后的 URL，`themeAssetUrl` 按拥有资产的 packId 与相对路径查找。主题 SVG 的物理文件统一位于 PBWork DS 的 `components/_shared/glyphs/`；主题包 `artwork.json` 的 `file` 保留逻辑资产标识，`sourceFile` 指向相对 glyphs/ 的文件。PBWork 加载层把原始字节摘要与 URL 映射到逻辑标识，Core 仍只消费 files 摘要表，不读取物理目录。资源制作与同步规则见 [Icon 规范](../../apps/pbwork/docs/components/action/icon.md)。
- `useRuntimeTheme(selection, registry?)` 接受响应式包/主题/模式选择，返回 computed 的 table、CSS 变量、根节点 enum 属性、Vuetify 主题与密度。CSS 与 Vuetify 消费同一张表；不会修改 Workbench 主题。
- `ThemeTableKey` 用于根节点 provide 响应式表；组件内 `useToken(key)` 和 `useTokenNumber(key)` 返回 computed，缺失 provider、未知键或数字读取类型不符时抛错。JS 响应式读取器在运行时校验键；`v-pb` / `pbStyle()` 的槽键使用生成的键族类型，生成命令与新鲜度检查见 [制作工具](../../apps/pbwork/docs/prototypes/authoring-tools.md)。

`theme/vuetify-theme.ts` 将表转换成 Vuetify ThemeDefinition。模式只接受 light/dark；tooltip 使用 inverse-surface 配对。密度 compact/regular/comfortable 分别映射为 Vuetify compact/comfortable/default。Runtime 按包/主题/模式/摘要动态注册名称，通过 VApp 局部选择主题并通过 VDefaultsProvider 提供表单密度；不修改 Workbench 全局主题。Playground 的静态名称目前也从 Core 表生成，并按包、主题与模式动态注册。预览可选择真实登记的基础包与原型主题包。

`runtime/theme-pack-preference.ts` 提供独立的 v2 存储接口，键为 `pbwork.runtime.theme.v2`，值为 `{ [prototypeId]: { theme, mode } }`；mode 接受 light/dark/system，theme 使用 Core 的 ID 格式。它不读取 v1，不影响其它原型的偏好，损坏或不可用的存储不阻断操作。`useSystemThemeMode()` 响应系统颜色方案并在 Vue scope 销毁时释放监听；`concreteThemeMode()` 将 system 转为具体模式。包内主题是否存在由 registry 判定。Runtime 与画布均已接入 v2，同文档写入与跨 iframe 的 storage 事件会触发响应式刷新。同步策略和组件迁移边界见 [PBWork Theme 手册](../../apps/pbwork/docs/tokens/themes.md)。


## 原型绑定与 Capture 边界

PrototypeRecord 的 themePackId 取代 defaultThemeId。Registry 调用 Core validateThemePacks 检查包存在、作用域、继承与全部组合；任何 block 阻断启动。当前 Web Runtime 支持 light/dark 模式，system 只用于偏好。

Runtime URL 使用 variant/theme/mode；缺省主题/模式取 manifest 默认值。Core Case URL 只写 mode；`CaseKey.themeId` 只表示模式。Playwright 的 `colorScheme` 取该模式，只接受 `light` / `dark`。业务 routeQuery 禁止覆盖 `variant` 与 `mode`。Selection 携带 `themePack`（包 ID、包摘要、默认主题、默认模式）；actual 与 Selection 的身份不一致时阻断为 `environment.theme-digest-mismatch`。内部 Workbench bridge 的 `themeId` 仍是模式字符串，不进入严格 Capture 响应。

DS 与冷链消费者已完成迁移，Runtime 仅生成新表的变量。原有 154 项值作为测试夹具保留：102 项迁入语义层、11 项进入组件层、9 项成为包私有 Primitive、32 项对应 31 个实现常量。所有等价断言均已落地，不再保留 todo。

组件键由 Contract.componentTokens 声明 id 后缀、valueType/default/modeVariant/bindable/enumValues；loadThemeKeyCatalog 汇总为完整的 Core ThemeKeyCatalog。当前 129 个语义键 + 25 个组件键，其中 148 可绑定，6 个 enum 不可绑定；另有 64 个字阶派生部件和 37 个实现常量。Registry 同时校验组件声明与基础包默认值。SurfaceMaterial 负责共享材质；primary-tabs.selection-treatment 在基础包为 glass，AppBar/Tabbar 跟随 surface.treatment。组件 CSS 与 Inspector 绑定使用新键，常量不进入 Evidence/Target；JS 用 computed 读取主题值，以纯常量读取器读取手势阈值等不变值。

Capture 的 token Catalog 只含键定义（类型、是否可绑定、是否随模式变化、说明与来源），不含取值，常量不进入 Catalog。theme-pack Catalog 的 `inputDigest` 等于包摘要：一条包清单，外加每个「主题 × 模式」的解析值与 provenance。新清单的 assets 只固定 packId、逻辑 file、sha1 与 mediaType，不提供独立归档 URL，不保存 SVG body。DS 同步负责原始图形与 Target PNG；正常 Capture 不遍历清单下载资产，也不调用 Catalog 资产专用暂存。已有 Catalog 和 theme-asset Blob 保持历史读取兼容。没有归档字节的新交付不承诺任意历史 SVG 原稿可离线恢复。

PBWork 在既有 RuntimeSemanticNode.props 中保留 name 及语义节点所属装饰图标的 icons（名称、owner、sourceFile、颜色策略、尺寸档位和 tone）。大型表盘用显式 data-pb-artwork 声明 packId、assetId、逻辑 file、源文件标识、sessionAsset/layerAsset、views 与受控状态；Runtime 校验逻辑文件在源包 files 中存在、子 image 实际 URL 与声明资源一致且 fragment view 已登记，再输出 props.artwork 的 declared、sourceDigest 和实际 image view/可见性。声明与图像观测分别保留，不推导 Target 路径或动态绘图算法。这是现有 props 的增量数据，不是新的通用资产 Contract 或 resolver。

本批 Runtime inputVersion 含 resourceUsageVersion、所选包图形元数据及公共/当前原型图标源输入摘要，避免复用缺少新使用信息或资源输入已变的旧 Case；不改写历史输入、Case identity 或 scope hash。新输出沿用协议 3 的可扩展 props 通道，旧固定 Handoff 不补造资源使用信息。图标逐项源摘要与 Target 真实使用校验仍是后续范围，不能将当前信息宣称为通用精确资源解析。Workbench 展示记录仍是主题表生成的展示数据，不是第二份 Token 语义源。

PBWork 的主题资产加载器使用 `?url&no-inline` 提供资源 URL，在开发与构建环境中均保留源文件字节，避免 SVG 内联优化改写空白和引号后与清单摘要不一致。

Runtime 协议版本为 3。清单必填 `theme` 与 `clock`。`clock` 声明采集用的当前时刻和时区；Playwright 安装该时钟，交互模式仍走真实时间。`useClock()` 读取 `Date`。Preflight 在采集前对每个 Screen 的 default Variant、每个主题和每个模式比较语义树（节点身份、role、可见性、bbox 是否非零、componentId、排序后的 tokenBindings、语义父节点）。分叉是 Authoring Diagnostic `theme.mode-divergence`，不写入 Evidence。MCP `read_theme_pack` 只读 Handoff 固定的 theme-pack Catalog：默认组合 `captured: true`，其它组合返回该表并标注 `captured: false`。`read_screen_packet` 的 token 清单在该 Catalog 存在时附带默认主题与模式的 `resolvedValue`、`chain` 和 `tier`。CLI 不再接受 `--theme`；`snapshot inspect` 打印 `packId@digest/theme/mode`。

声明时钟随原型元信息存入固定的 prototype Catalog。`read_handoff_index.captureClock` 由 Core 从同 Workspace、Bundle 且被该 Handoff 的 `prototype-catalog` resource ref 精确固定的修订中读取，只接受与 Catalog 原型身份一致的唯一条目及合法时钟；返回 `now`、`timeZone`、`catalogRevisionId`。缺失、非法或有歧义时返回 `null`，不猜默认时刻、不回退更新修订或当前 Runtime。该字段是消费投影，不新增 Handoff 持久字段或时钟语义。
