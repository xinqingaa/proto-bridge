# {{displayName}}

`{{packageName}}` 是独立的 Flutter 应用。产品定位、功能范围和使用路径见 [产品说明](docs/product.md)。

## 当前实现

初始工程提供公共组件、主题、存储和启动底座，业务功能尚待实现。后续实现状态、待决事项和验证边界统一维护在 [已知缺口](docs/known-gaps.md)。

## 运行

```bash
flutter pub get
flutter devices
flutter run -d <device-id>
```

SDK 与依赖要求以 `pubspec.yaml` 和锁文件为准；完整检查见 [测试与视觉验证](docs/testing.md)。

## 文档

- [产品说明](docs/product.md)
- [逻辑与交互](docs/logic-and-interactions.md)
- [UI 与动效](docs/ui-design.md)
- [文档索引](docs/README.md)
- [协作与工作流](docs/workflow.md)
