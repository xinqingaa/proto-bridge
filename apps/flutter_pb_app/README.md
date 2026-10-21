# flutter_pb_app

独立、可运行的 Flutter 目标工程，用于验证页面实现如何遵循既有工程规范并消费固定 ProtoBridge Evidence。本仓库不是 Evidence Store，也不参与 PBWork Runtime Capture。

开始修改前先读 [AGENTS.md](AGENTS.md)，再按任务读取：

- [工程架构](docs/architecture.md)
- [公共组件](docs/components.md)
- [Theme 与 Token](docs/theme.md)
- [路由](docs/routing.md)
- [测试与视觉验证](docs/testing.md)
- [ProtoBridge 目标适配](docs/proto-bridge.md)

PBWork DS 同步任务还需读取 `.agents/skills/proto-bridge-ds-target-sync/SKILL.md`；固定 Handoff 页面实现继续使用 Consumer Skill，两条流程不要混用。

## 快速运行

```bash
flutter pub get
flutter analyze
flutter test
flutter run
cd ../.. && pnpm ds:theme:verify && pnpm ds:target-sync:verify
```

当前基线包含 47 个组件与 153 个 Token 的具体映射；主题检查和完整同步门禁均需通过。

仓库不因实验 Flutter MCP 固定 Flutter SDK；目标工程使用当前开发环境中的 Flutter。仓库根 `pnpm verify` 会执行上述 Flutter 静态分析与完整测试，以及 Producer/Target 同步和产品端到端门禁。

当前 Riverpod 3.4.3 要求 Dart 3.12；本轮沿用本机已安装的 Flutter 3.44.0 / Dart 3.12，没有执行 SDK 升级。iOS 使用 CocoaPods 接入 MMKV，见 [测试与工具链](docs/testing.md)。
