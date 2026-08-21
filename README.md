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

PBWork 的 Token、组件、原型和工作壳都是代码资产；产品、设计和开发人员通过 Cursor、Codex 等 Coding Agent 遵守同一套仓库规范进行维护。

新原型先完成产品设计与视觉探索，再将获批方向通过 Promotion Gate 映射为 PBWork Token、DS、业务局部 UI 和资产契约。独立探索页不进入 Evidence 闭环。

## 快速开始

Producer 安装面是 clone 本仓库后启动 PBWork。首次使用时初始化 Workspace；已有 `proto-bridge.json` 时跳过 `workspace init`：

```bash
pnpm install
pnpm build
pnpm pb -- workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

pnpm pb:doctor
pnpm pb:up
```

在 Workbench 把原型从待确定转为定稿：系统会采集整个原型并写出唯一 Agent 提示词。提示词指向 `proto-bridge.json` 的 `delivery.targetRoot`（本仓库示例为 `apps/flutter_pb_app`；真实 Target 可以在仓库外）。产物在 `.proto-bridge/deliveries/`（提示词 + receipt；MCP 仍读 Store）。

生成 Cursor/Codex 的 MCP 配置：

```bash
pnpm pb:mcp -- --print-config
```

CLI `deliver` 是非正式诊断，不改变 PBWork 生命周期。非交互使用必须加 `--acknowledge-unofficial-capture`：

```bash
pnpm pb -- deliver \
  --prototype cold-chain-ops \
  --acknowledge-unofficial-capture
```

`--target` 只覆盖这一次命令；省略时使用 Workspace `delivery.targetRoot`。

完整步骤见 [快速上手](docs/guides/getting-started.md)和[本地操作脚本](docs/guides/operator-scripts.md)。分发边界见 [ADR 0011](docs/decisions/0011-producer-git-and-npm-tooling.md)。

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
- 为 strict Screen 的 default Variant 声明 `requiredFragments`；
- 提供稳定 `data-pb-id`、可选 `data-pb-key` 和合法 `data-pb-role`；
- 为需要独立实现或验收的业务局部节点显式提供 `data-pb-token-*`，不得只依赖 CSS Token；
- 能由真实 Runtime 确定性 prepare、readiness、snapshot、scenario 和 reset。

详见 [原型 Authoring Contract](docs/reference/prototype-authoring.md)和 [PBWork 原型手册](apps/pbwork/docs/README.md)。
节点 identity、role、component、Token Evidence 和阻断等级见[语义标记与证据门禁](docs/reference/semantic-authoring.md)。

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
