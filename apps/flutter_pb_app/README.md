# flutter_pb_app

pbwork 配套 Flutter 工程：主题 token（`TS`）+ `common` 可复用层 + feature 落页载体。

## 结构

```
lib/
  app/              MaterialApp（主题 / Pop.host / 挂路由）
  router/           Navigator 1.0：routes 常量 + appRoutes 注册表
  theme/            TS / ThemeService（对齐 pbwork tokens）
  common/
    widgets/        Common* 可复用控件
    overlay/        AppPop（封装 unified_popups）
  features/         页面与原型入口（pb 落页目标）
    hub/            总入口（Demo + 各原型）
    demo/           组件对照画廊
    field_service / ledger_planet / project  原型占位
```

依赖方向：`features` → `common` / `theme` / `router`（反向禁止）。

## 路由（Navigator 1.0）

| Route | Feature |
| --- | --- |
| `/` | Hub |
| `/demo` | Demo 对照 |
| `/prototypes/field-service` | Field Service |
| `/prototypes/ledger-planet` | Ledger Planet |
| `/prototypes/project` | Project |

新增原型页：

1. 在 `lib/features/<name>/` 下加 page
2. 在 `lib/router/routes.dart` 增加 path 常量
3. 在 `lib/router/router.dart` 的 `appRoutes` 注册
4. 在 `HubPage` 增加入口

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
