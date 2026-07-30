# flutter_pb_app

独立 Flutter 目标工程示例，用于验证 Coding Agent 如何结合 ProtoBridge Evidence 与目标仓库既有规范完成实现。

该应用不是 Evidence Store，也不参与 PBWork Runtime Capture。ProtoBridge Target Tools 可以只读扫描本目录的路由、Theme、公共组件和验证结果，但扫描内容不会写入 Evidence。

## 架构

```text
lib/
├── app/              MaterialApp and application bootstrap
├── router/           route constants and route registry
├── theme/            semantic tokens and ThemeService
├── common/
│   ├── widgets/      reusable target widgets
│   └── overlay/      shared overlay abstraction
└── features/
    ├── hub/          example entry
    ├── demo/         component gallery
    ├── field_service/
    └── ledger_planet/
```

依赖方向：

```text
features → common / theme / router
```

`common`、`theme` 和 `router` 不依赖业务 feature。

## 路由

| Route | Feature |
| --- | --- |
| `/` | Hub |
| `/demo` | Component gallery |
| `/prototypes/field-service` | Field Service |
| `/prototypes/ledger-planet` | Ledger Planet |

新增页面时：

1. 在 `lib/features/<feature>/` 添加页面；
2. 在 `lib/router/routes.dart` 定义 route；
3. 在 `lib/router/router.dart` 注册；
4. 按需在 Hub 增加入口；
5. 使用目标工程已有 Theme 和 Common widgets；
6. 运行 Flutter analyze/test。

## 依赖

- `flutter_riverpod`：状态管理
- `pull_to_refresh_flutter3`：列表刷新
- `unified_popups`：Overlay

工程配置 Android 和 iOS。

## 运行与验证

```bash
cd apps/flutter_pb_app
flutter pub get
flutter analyze
flutter test
flutter run
```

## Select

`CommonSelect` 默认使用 `DropdownButtonFormField`。通过：

```dart
implementation: CommonSelectImplementation.dropMenu,
```

可以选择共享 `AppPop.dropMenu` 实现。不要在 feature 中创建第三种平行 Select。
