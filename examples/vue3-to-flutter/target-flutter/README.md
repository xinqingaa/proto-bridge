# ProtoBridge Target Flutter App

这是 `examples/vue3-to-flutter` 的 Flutter target 工程，用于展示目标客户端的工程规范，而不是展示自动代码翻译结果。

## 结构

```text
lib/app/
├── common/widgets
├── modules/account
│   ├── application
│   ├── data
│   ├── domain
│   └── presentation
├── routes
├── theme
└── translations
```

## 命令

```bash
flutter pub get
flutter analyze
flutter test
flutter run -d chrome
```

状态管理使用 `flutter_bloc`。页面实现保留了 route、theme、common widgets、feature 分层和 mock repository，方便 ProtoBridge 的 target inspector 读取真实约定。
