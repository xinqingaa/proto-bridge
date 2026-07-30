# ProtoBridge

ProtoBridge（PB）从符合 Authoring Contract 的原型 Runtime 采集语义、状态、交互与截图，保存为不可变 Evidence，并通过 PBWork、CLI 和 MCP 交给 Coding Agent。

```text
PBWork Prototype + Runtime Contract
  → Selection / Preflight / Case Matrix
  → Capture / Store / Snapshot
  → Evidence Review / Handoff
  → MCP fixed read
  → Agent implementation / target validation
```

PBWork 是 PB 的图形工作台、原型生产环境和 instrumented Runtime。PB 证明原型事实；Agent 结合目标仓库自身规范决定具体实现。

## 快速开始

```bash
pnpm install
pnpm build
pnpm pbwork
```

初始化 CLI Workspace：

```bash
node packages/cli/dist/index.js workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

node packages/cli/dist/index.js workspace doctor
```

启动 MCP：

```bash
node packages/mcp-server/dist/index.js \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

完整步骤见 [快速上手](docs/guides/getting-started.md)。

## 仓库组成

| 区域 | 职责 |
| --- | --- |
| `packages/core` | Contract、Capture、Store、Handoff 和 Target 只读边界 |
| `packages/local-service` | PBWork browser 与 Node/Playwright/Store 的本地安全边界 |
| `packages/cli` | 自动化 Evidence Producer 和 Bundle 生命周期 |
| `packages/mcp-server` | 固定 Evidence Consumer 与 Target 查询/验证 |
| `apps/pbwork` | Workbench GUI、Design System、业务原型和 Runtime |
| `apps/flutter_pb_app` | 独立 Flutter 目标工程示例与验证载体 |

## 原型强约束

进入 PB Evidence 闭环的原型必须：

- 只使用 PBWork Token、Theme、组件和共享手势；
- 在唯一 Registry 声明 Screen、Variant、Action 和 Scenario；
- 为 default 与 critical Variant 声明 `requiredFragments`；
- 提供稳定 `data-pb-id`、可选 `data-pb-key` 和合法 `data-pb-role`；
- 能由真实 Runtime 确定性 prepare、readiness、snapshot、scenario 和 reset。

详见 [原型 Authoring Contract](docs/reference/prototype-authoring.md)和 [PBWork 原型手册](apps/pbwork/docs/README.md)。

## 验证

```bash
pnpm verify
```

该门禁覆盖构建、类型检查、Core/Service/CLI/PBWork 测试、Runtime 浏览器采集、MCP、Consumer 和 PBWork → Store → MCP 垂直切片。

## 文档

- [文档总入口](docs/README.md)
- [产品总览](docs/product/overview.md)
- [完整工作流](docs/product/workflow.md)
- [系统架构](docs/architecture/overview.md)
- [PBWork 与 PB](docs/guides/pbwork-and-pb.md)
- [Agent 消费指南](docs/guides/agent-consumption.md)
- [V1 架构转型背景](docs/history/v1-to-evidence-architecture.md)
