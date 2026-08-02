# flutter_pb_app

独立、可运行的 Flutter 目标工程，用于验证页面实现如何遵循既有工程规范并消费固定 ProtoBridge Evidence。本仓库不是 Evidence Store，也不参与 PBWork Runtime Capture。

开始修改前先读 [AGENTS.md](AGENTS.md)，再按任务读取：

- [工程架构](docs/architecture.md)
- [公共组件](docs/components.md)
- [Theme 与 Token](docs/theme.md)
- [路由](docs/routing.md)
- [测试与视觉验证](docs/testing.md)
- [ProtoBridge 目标适配](docs/proto-bridge.md)

## 快速运行

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```
