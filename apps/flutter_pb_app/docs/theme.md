# Theme 与 Token

主题采用唯一的类型化 `AppThemePack`，通过 `TS extends ThemeExtension<TS>` 放入 Material Theme。组件从当前 BuildContext 读取，局部 Theme 与弹层不会改写全局主题实例。

```dart
final ts = TS.of(context);
Text('标题', style: ts.textStyle.title);
```

## 主题包

`lib/theme/theme_pack.dart` 声明包身份、明暗颜色、字阶、尺寸、间距、圆角、动效、布局、层级、效果和资源。默认包为 `AppThemePack.base`。新产品在 `lib/theme/` 编写类型化主题包，通过 `themePacksProvider` 注册；`themePackProvider.notifier.select(id)` 切换，`themeModeProvider` 切换明暗。两种选择通过 AppPrefs 持久化到 MMKV。

未注册的存储包 ID 回到注册表首项；空注册表和重复 ID 是配置错误。主题不从 PBWork 当前源码动态加载，也没有旧 Token 或旧主题兼容入口。目标包依据固定 Evidence 的主题取值表维护 Flutter 表达，不复制 CSS。

## Token 职责

`ts.colors`、`ts.textStyle`、`ts.spacing`、`ts.sizing`、`ts.radius`、`ts.opacity`、`ts.motion`、`ts.elevation`、`ts.border`、`ts.layout`、`ts.layer`、`ts.effect`、`ts.assets` 是组件使用入口。具体设计量只放在主题目录；页面和公共组件不得另建平行常量或复制颜色数值。

`protoBridgeTokenSnapshot(ts)` 接收明确的上下文主题，用于调试和映射验证。`proto-bridge.target.json` 维护 153 个可绑定主题键的精确 accessor。映射有效仅说明落点可访问；组件的视觉、状态和实际消费仍需单独验证。

`transparent` / `none` 是绑定字面量，不建立 Token accessor。资源未提供时由组件按 Contract 回退。Flutter 用逻辑像素、比例、Curve、BoxShadow 表达 Web 对应语义。

## 主题切换

Material Theme 和 TS 使用同一主题包。颜色在主题动画中插值；非颜色 Token 在切换中采用对应端点值，避免枚举和资源出现无意义的中间值。组件不得缓存 BuildContext 对应的主题供其它页面使用。

## 同步门禁

主题及映射修改运行 `pnpm ds:theme:verify`。组件仍在迁移时批次保留 pending；完整组件适配后更新 `proto-bridge.sync.json` 并运行 `pnpm ds:target-sync:verify`。只有元数据和实际映射一致才能声明同步。
