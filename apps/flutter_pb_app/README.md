# flutter_pb_app

独立、可运行的 Flutter 目标工程，用于验证页面实现如何遵循既有工程规范并消费固定 ProtoBridge Evidence。本仓库不是 Evidence Store，也不参与 PBWork Runtime Capture。

工程包含组件、主题与启动展示页。业务 feature 不随独立 Target 脚手架复制；产品要求由所选原型的本地文档提供。

## 快速运行

```bash
flutter pub get
flutter run
```

## 文档

- [文档索引](docs/README.md)
- [协作与工作流](docs/workflow.md)
- [测试与视觉验证](docs/testing.md)

SDK 与依赖要求以 `pubspec.yaml` 和锁文件为准。仓库根 `pnpm verify` 包含本工程原生检查、测试及 Producer/Target 同步验证。
