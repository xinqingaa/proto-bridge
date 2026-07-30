# ProtoBridge

ProtoBridge 是本地原型证据基础设施：从符合 PB Contract 的 Runtime 确定性采集语义、状态、交互与截图，保存为不可变 Evidence，再通过 PBWork、CLI 和 MCP 交给 Coding Agent。

```text
PBWork Runtime Contract
  → Selection / Preflight / Case Matrix
  → Capture Job / Evidence Store / Snapshot
  → Agent Handoff
  → MCP fixed Evidence
  → Target implementation / validation
```

ProtoBridge 不生成目标工程计划，不自动翻译 Vue/DOM，也不替代 Coding Agent 决定文件、组件、路由、状态管理或 Token。

## 快速开始

```bash
pnpm install
pnpm build

node packages/cli/dist/index.js workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

node packages/cli/dist/index.js workspace doctor
```

默认配置为 `proto-bridge.json`，Store 默认为 `.proto-bridge/store`。

PBWork：

```bash
pnpm pbwork
```

MCP：

```bash
node packages/mcp-server/dist/index.js \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

## 产品边界

- Core：Contract、Capture、Store、Handoff 与 Target 只读边界。
- PBWork：原型 Runtime、采集控制面和 Evidence Review。
- CLI：自动化 Producer 与 Bundle 生命周期入口。
- MCP：固定 Snapshot/revision 的正式消费边界。
- Target：独立查询和验证，不写回 Evidence。

未来 PBWork Screen 默认执行严格 Evidence 门禁；现有未迁移页面由明确 legacy allowlist 隔离。详见 [原型规范](docs/conventions.md)和 [PBWork checklist](apps/pbwork/docs/checklist.md)。

## 验证

```bash
pnpm verify
```

该门禁覆盖 build/typecheck、Core/Service/CLI/PBWork tests、三页 Runtime Capture、MCP、Consumer 和 PBWork → Store → MCP 垂直切片。

更多文档：

- [架构总览](docs/overview.md)
- [使用方式](docs/usage.md)
- [Evidence 对象](docs/artifacts.md)
- [Handoff Consumer](docs/agent-handoff-consumer.md)
- [V2 核心规范](docs/plans/pb-v2-spec.md)
