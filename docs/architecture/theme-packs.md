# 主题包解析模型

Core 的 `packages/core/src/v2/theme/` 提供浏览器安全的主题包 Schema、继承解析、引用链、摘要、对比度与作用域校验，通过 `@proto-bridge/core/v2/theme` 和 `@proto-bridge/core/v2` 导出。Core 不读取文件；键目录、常量、包集合和资产字节摘要由调用方提供。

本文描述已经实现的解析模块。当前 PBWork Runtime 仍使用旧 Token/Theme 加载链路；主题包尚未接入 Runtime、Vuetify、Capture 或 Handoff，不能据此宣称交付已固定主题取值。剩余接入工作见[平台升级计划](../roadmap/pbwork-platform-upgrade.md#第-2-步-主题包)。

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

PBWork 的准备数据位于 `src/design-system/theme/` 与 `theme-packs/base/`。`loadBaseThemeSources()` 使用 Core Schema 解析这些 JSON；当前公共间距仍沿用原有 `spacing.*` 刻度 ID 与基础值，旧键去向记录在 legacy-migration.json。

`themeTableToCssVars(table, catalog, constants, assetUrl?)` 按 valueType 输出 `--pb-*`：长度补 px、时长补 ms、字阶与描边展开复合值，输出字阶部件与数字特性变量；资产 URL 由拥有资产的包加载器提供。未知键、变量名碰撞和缺失资产 URL 不会被静默接受。该生成器目前尚未接入可见 Runtime。
