# ProtoBridge Target Flutter App

这是 `examples/vue3-to-flutter` 的 Flutter target 工程，用于展示目标客户端的工程规范，而不是展示自动代码翻译结果。

## 结构

```text
lib/app/
├── common/widgets
├── modules/account
│   └── _proto      # pnpm run example 生成，git ignored
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

稳定工程保留 route、theme、common widgets 和兜底页面，方便 ProtoBridge 的 target inspector 读取真实约定。运行仓库根目录的 `pnpm run example` 后，会生成 `_proto` 页面、route registry 和 `main_proto.dart`；这些生成内容默认不提交。
