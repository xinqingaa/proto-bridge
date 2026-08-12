# Theme 与 Token

页面和公共组件通过 `TS` 读取当前 Theme。不要在 feature 中直接写颜色、字号、圆角或间距常量。

## 入口

```dart
TS.colors
TS.textStyle
TS.spacing
TS.sizing
TS.radius
TS.opacity
TS.motion
TS.elevation
TS.border
TS.layout
TS.layer
TS.effect
```

组件 build 内可调用 `TS.of(context)` 同步当前亮度；应用根节点由 `ThemeService` 创建 Material Theme，主题切换由 `themeModeProvider` 管理。

## Token 职责

- `spacing` / `sizing` / `radius` 分别负责间距、控件/图标尺寸与轮廓圆角；业务代码按语义 accessor 消费，不复制具体数值。
- `opacity` / `motion` / `elevation` 负责交互状态、转场和材质层级；平台近似由公共 Theme 层统一翻译。
- `border` / `layout` / `layer` / `effect` 负责边界、比例/约束、叠放层级与玻璃等效果；不能在 feature 中创建平行常量。

具体值和类型只以 `lib/theme/app_tokens.dart` 及 Theme 实现为准，本文不复制第二份可变配置。PBWork 当前全部 153 个 Token 都在工程根目录 `proto-bridge.target.json` 映射到上述 accessor，并由 `lib/theme/proto_bridge_tokens.dart` 提供可执行检查点；组件只消费与自身语义相关的部分。

## 颜色和文字

`AppColors.light` 与 `AppColors.dark` 分别定义背景、surface、primary、secondary、error、warning、success、border、divider 和对应的 on-color。文字角色包括 `display`、`headline`、`title`、`subtitle`、`content`、`label`、`caption`。

优先使用语义角色，而不是直接读取底层色值。例如错误状态使用 `TS.colors.error` 和 `TS.colors.errorSoft`，次要说明使用 `TS.textStyle.caption`。

`transparent` / `none` 是绑定字面量，不是 Token，不创建 `TS.*` 字段。Web 百分比、shadow、filter 和 easing 在 Flutter 分别翻译为比例/逻辑像素、elevation、effect 参数和 `Curve`，不复制 CSS 字符串。

## 同步门禁

工程根目录的 `proto-bridge.target.json` 是精确 id → accessor 表，`proto-bridge.sync.json` 固定最后一次已确认的 PBWork surface。修改协议 Schema、Theme、Token accessor 或映射后从仓库根运行 `pnpm ds:target-sync:verify`；只有所有映射均为 `resolved` 且完整 fingerprint 元数据匹配才算同步。

## 布局规则

- Screenshot 对尺寸、间距、圆角或边框有约束时，页面必须显式绑定对应 token。
- 固定格式控件必须稳定尺寸，避免状态或文案变化导致布局跳动。
- Evidence 未给出的布局敏感值先对照 Screenshot；仍不确定时记录风险。
- Material 默认值只有在没有更具体的项目或 Evidence 约束时才可使用。
