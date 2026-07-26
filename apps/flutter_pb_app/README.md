# flutter_pb_app

pbwork 配套 Flutter 工程：主题 token（`TS`）+ Common 基础/复杂组件 + `AppPop` 弹层封装。

## 结构

```
lib/
  theme/     TS / ThemeService（对齐 pbwork tokens）
  overlay/   AppPop（封装 unified_popups）
  common/    Common* 组件
  demo/      组件对照页
  app/       MaterialApp + Navigator 1.0
```

## 依赖

- `flutter_riverpod` — 状态
- `pull_to_refresh_flutter3` — 下拉刷新
- `unified_popups` — path: `../../../unified_popups`（同级 work 目录）

仅配置 **Android / iOS**。

## 运行

```bash
cd apps/flutter_pb_app
flutter run
```

## Select 两种实现

`CommonSelect` 默认 `DropdownButtonFormField`；将

```dart
implementation: CommonSelectImplementation.dropMenu,
```

或改 `CommonSelect.defaultImplementation` 可切到 `AppPop.dropMenu`（`Pop.dropMenu`）。
