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
```

组件 build 内可调用 `TS.of(context)` 同步当前亮度；应用根节点由 `ThemeService` 创建 Material Theme，主题切换由 `themeModeProvider` 管理。

## 尺寸 token

| 类别 | 关键值 |
| --- | --- |
| 间距 | `xxs=2`、`xs=4`、`sm=8`、`smPlus=12`、`md=16`、`lg=24`、`xl=32` |
| 控件 | `controlSm=32`、`controlMd=40`、`controlLg=48`、`touch=44` |
| 圆角 | `xs=4`、`sm=8`、`md=12`、`lg=16`、`xl=24`、`full=999` |
| 图标 | `iconSm=16`、`iconMd=20`、`iconLg=24` |
| 动效 | `fast=120ms`、`normal=200ms`、`slow=320ms` |

完整定义见 `lib/theme/app_tokens.dart`，不要在文档中复制第二份可变配置。

## 颜色和文字

`AppColors.light` 与 `AppColors.dark` 分别定义背景、surface、primary、secondary、error、warning、success、border、divider 和对应的 on-color。文字角色包括 `display`、`headline`、`title`、`subtitle`、`content`、`label`、`caption`。

优先使用语义角色，而不是直接读取底层色值。例如错误状态使用 `TS.colors.error` 和 `TS.colors.errorSoft`，次要说明使用 `TS.textStyle.caption`。

## 布局规则

- Screenshot 对尺寸、间距、圆角或边框有约束时，页面必须显式绑定对应 token。
- 固定格式控件必须稳定尺寸，避免状态或文案变化导致布局跳动。
- Evidence 未给出的布局敏感值先对照 Screenshot；仍不确定时记录风险。
- Material 默认值只有在没有更具体的项目或 Evidence 约束时才可使用。
