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
cd ../.. && pnpm ds:target-sync:verify
```

仓库根 `pnpm verify` 会执行上述 Flutter 静态分析与完整测试，以及 Producer/Target 同步和产品端到端门禁。
