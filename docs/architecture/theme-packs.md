# 主题包解析模型

Core 的 `packages/core/src/v2/theme/` 提供浏览器安全的主题包 Schema、继承解析、引用链、摘要、对比度与作用域校验，通过 `@proto-bridge/core/v2/theme` 和 `@proto-bridge/core/v2` 导出。Core 不读取文件；键目录、常量、包集合和资产字节摘要由调用方提供。

本文描述已经实现的解析与 Runtime 接入。PBWork Runtime 已按原型主题包提供响应式表、CSS、Vuetify 与偏好管理。DS/冷链已使用新键与响应式读取。样例包 `pbwork-sample` 只供 Gallery 与 Playground 对照，不能绑定正式原型。Capture/Handoff 尚未固定包摘要与完整取值表。后续范围见[平台升级计划](../roadmap/pbwork-platform-upgrade.md#第-3-步-采集质量)。

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

任何主题或模式的取值变化都会改变包摘要，即使该组合不是当前请求的组合。摘要接入 Capture inputVersion 与 Handoff 属于后续接入工作。

## PBWork 基础数据与 CSS 生成

PBWork 的数据位于 `src/design-system/theme/` 与 `theme-packs/base/`。`loadBaseThemeSources()` 使用 Core Schema 解析这些 JSON；当前公共间距仍沿用原有 `spacing.*` 刻度 ID 与基础值，旧键去向记录在 legacy-migration.json。

`themeTableToCssVars(table, catalog, constants, assetUrl?)` 按 valueType 输出 `--pb-*`：长度补 px、时长补 ms、字阶与描边展开复合值，输出字阶部件与数字特性变量；资产 URL 由拥有资产的包加载器提供。未知键、变量名碰撞和缺失资产 URL 不会被静默接受。RuntimeLayout 已消费这些变量，并提供密度、表面与动效的 data 属性。

## Runtime 接入

`design-system/theme/runtime-theme.ts` 提供以下接口，RuntimeLayout 已使用 registry 和响应式表；组件内 JS 已通过 computed 读取：

- `createRuntimeThemeRegistry(sources, assetUrl?)` 为一组来源建立解析缓存；`resolve(packId, theme, mode)` 经 Core 解析全部组合并保留阻断诊断，未知组合直接报错，不回退默认主题。来源更新时创建新 registry。`cssVars(table)` 缓存按类型生成的 CSS。
- `resolveRuntimeTheme(packId, theme, mode)` 使用当前加载的全部包。`loadThemeSources()` 通过 Vite glob 读取 `theme-packs/*/` 与 `prototypes/*/theme/` 的 pack/primitives/semantic/component JSON；原型目录提供 ownerPrototypeId，重复包 ID 报错。Vite 插件按资产原始字节计算 sha1，经虚拟模块提供 files；`?url` 导入构建后的 URL，`themeAssetUrl` 按拥有资产的 packId 与相对路径查找。
- `useRuntimeTheme(selection, registry?)` 接受响应式包/主题/模式选择，返回 computed 的 table、CSS 变量、根节点 enum 属性、Vuetify 主题与密度。CSS 与 Vuetify 消费同一张表；不会修改 Workbench 主题。
- `ThemeTableKey` 用于根节点 provide 响应式表；组件内 `useToken(key)` 和 `useTokenNumber(key)` 返回 computed，缺失 provider、未知键或数字读取类型不符时抛错。当前键参数仍为 string，生成键类型属于后续创作工具步骤。

`theme/vuetify-theme.ts` 将表转换成 Vuetify ThemeDefinition。模式只接受 light/dark；tooltip 使用 inverse-surface 配对。密度 compact/regular/comfortable 分别映射为 Vuetify compact/comfortable/default。Runtime 按包/主题/模式/摘要动态注册名称，通过 VApp 局部选择主题并通过 VDefaultsProvider 提供表单密度；不修改 Workbench 全局主题。Playground 的静态名称目前也从 Core 表生成，并按包、主题与模式动态注册。`pbwork-sample` 只出现在 Gallery 与 Playground。

`runtime/theme-pack-preference.ts` 提供独立的 v2 存储接口，键为 `pbwork.runtime.theme.v2`，值为 `{ [prototypeId]: { theme, mode } }`；mode 接受 light/dark/system，theme 使用 Core 的 ID 格式。它不读取 v1，不影响其它原型的偏好，损坏或不可用的存储不阻断操作。`useSystemThemeMode()` 响应系统颜色方案并在 Vue scope 销毁时释放监听；`concreteThemeMode()` 将 system 转为具体模式。包内主题是否存在由 registry 判定。Runtime 与画布均已接入 v2，同文档写入与跨 iframe 的 storage 事件会触发响应式刷新。同步策略和组件迁移边界见 [PBWork Theme 手册](../../apps/pbwork/docs/tokens/themes.md)。


## 原型绑定与 Capture 边界

PrototypeRecord 的 themePackId 取代 defaultThemeId。Registry 调用 Core validateThemePacks 检查包存在、作用域、继承与全部组合；任何 block 阻断启动。当前 Web Runtime 支持 light/dark 模式，system 只用于偏好。

Runtime URL 使用 variant/theme/mode；缺省主题/模式取 manifest 默认值。Core Case URL 构造器写 mode，Playwright 环境验证也读取 mode；业务 routeQuery 禁止覆盖这三个键。当前 Capture 的 themeId 字段仍传具体模式，prepare 使用原型包默认主题。内部 Workbench bridge 另带 themeName；该字段不会泄漏进现有严格 Capture 响应。Capture 协议升级、主题摘要/inputVersion、Catalog 与 Handoff 取值表属于平台升级第 3 步。

DS 与冷链消费者已完成迁移，Runtime 仅生成新表的变量。原有 154 项值作为测试夹具保留：102 项迁入语义层、11 项进入组件层、9 项成为包私有 Primitive、32 项对应 31 个实现常量。所有等价断言均已落地，不再保留 todo。

组件键由 Contract.componentTokens 声明 id 后缀、valueType/default/modeVariant/bindable/enumValues；loadThemeKeyCatalog 汇总为完整的 Core ThemeKeyCatalog。当前 113 个语义键 + 20 个组件键，其中 127 可绑定，6 个 enum 不可绑定；另有 64 个字阶派生部件和 31 个实现常量。Registry 同时校验组件声明与基础包默认值。SurfaceMaterial 负责共享材质；primary-tabs.selection-treatment 在基础包为 glass，AppBar/Tabbar 跟随 surface.treatment。组件 CSS 与 Inspector 绑定使用新键，常量不进入 Evidence/Target；JS 用 computed 读取主题值，以纯常量读取器读取手势阈值等不变值。

Capture 的 token Catalog 已随生产绑定改为新键定义，inputVersion 加入 keyCatalogDigest，避免使用旧绑定的 Evidence 被误认为当前输入；完整包摘要与 theme-pack Catalog 固定仍属于平台升级第 3 步。Workbench 展示记录只是主题表生成的展示数据，不是第二份 Token 语义源。Gallery 与 Playground 可以选择基础包或样例包、包内主题和模式，并对照解析值。样例包改变品牌色、圆角、紧凑密度、玻璃表面、活泼动效和一个品牌标记，另有柑色主题。
