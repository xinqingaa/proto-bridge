# 2026-07-31 人工 Evidence 闭环验收

状态：待执行。本文是一次性验收记录，不是产品规范；完成后保留结果和问题，稳定操作归并到正式指南。

## 目标

人工验证以下链路确实可理解、可操作、可复现：

```text
PBWork 原型
  → GUI/CLI Capture
  → Store/Snapshot
  → Handoff
  → MCP fixed read
  → Cursor 或 Codex
  → apps/flutter_pb_app
  → Flutter 原生验证
```

本次包含两个原型范围：

1. 账本星球任务列表及领奖任务 Scenario；
2. 新制作的 2–3 页面原型。

Cursor 与 Codex 分别执行，结果不要互相覆盖。建议为每个 Agent/原型组合使用独立 Git 分支或 worktree。

## 验收原则

- 所有 Evidence 写入配置声明的真实 `.proto-bridge/store`，不使用测试临时 Store。
- 每次记录 Workspace、Bundle、Run、Snapshot、Handoff 和 revision ID。
- warning 与 risk 逐项确认；不使用全局跳过。
- Agent 编辑前先报告 `mandatoryRiskReport`。
- Agent 只能读取 Handoff 固定引用，不用 active/latest 替换。
- Agent 必须先读取目标工程约定，再决定 Flutter 实现。
- Cursor 与 Codex 使用相同 Handoff 时，应从相同 Evidence 事实开始；实现可以不同。
- 问题按“脚本摩擦、GUI 摩擦、Evidence 缺失、Agent 行为、目标工程问题”分类记录。

## 0. 准备

在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm pb:doctor
git status --short
```

预期：

- Doctor 没有 blocking issue；
- Runtime/Service 未启动只显示 info；
- `service.allowedOrigins` 包含 `http://127.0.0.1:3977`；
- Playwright Chromium 可用；
- 开始前明确记录现有 Git 变更，不覆盖无关修改。

记录：

| 项目 | 结果 |
| --- | --- |
| 基线 commit |  |
| 初始 worktree 状态 |  |
| Doctor |  |
| 环境问题 |  |

## 1. 启动产品

终端 A：

```bash
pnpm pb:up
```

终端 B：

```bash
pnpm pb:doctor -- --require-running
pnpm pb -- workspace doctor
pnpm pb -- bundle list
```

预期：

- Workbench 为 `http://127.0.0.1:3977/workbench/prototypes/all`；
- Local Service 为 `127.0.0.1:3988`；
- GUI 与 CLI 报告同一个 `pbwork-local` Workspace；
- `workspace doctor` 在 Service 持锁时仍可读（只读开 Store）；
- 写操作（`capture run` / `handoff create` / `deliver`）在 Service 可达时自动经 Local Service，不必先停 `pb:up`；
- `bundle list` 能看到后续 GUI/CLI 创建的 Bundle。

## 2. 账本星球：GUI Producer

1. 打开账本星球「任务列表」default Variant。
2. 确认页面、主题和设备状态正确。
3. 点击「交付到 Agent」（当前页）。
4. 在 Deliver FlowSheet 中核对：
   - **范围检查**（Preflight）与 **将采集 N 项**（Case Matrix）；
   - **交互场景**（Scenario，应包含 `open-claimable-task`）；
   - **需要确认的事项**（warning）：逐项勾选「我已了解并继续」。
5. 点击「开始交付」，在同一 Sheet 内等待采集完成。
6. 查看结果摘要与风险提醒；生成交接与 Agent 提示词。
7. 记录已写入的 `.proto-bridge/deliveries/*/agent-prompt.md`，复制提示词或记下 Handoff ID。
8. 可选：打开「采集结果」核对截图、页面区域、Facts、覆盖情况、检查说明。

必须记录：

| 字段 | 值 |
| --- | --- |
| Bundle ID |  |
| Run ID |  |
| Snapshot ID |  |
| Handoff ID |  |
| Delivery 路径 |  |
| Case 数 |  |
| Screenshot 数 |  |
| Coverage |  |
| mandatory risks |  |
| GUI 摩擦 |  |

用 CLI 交叉检查 GUI 产物：

```bash
pnpm pb -- bundle list --json
pnpm pb -- bundle inspect --bundle <bundleId> --json
pnpm pb -- snapshot inspect \
  --bundle <bundleId> \
  --snapshot <snapshotId> \
  --json
pnpm pb -- handoff show --handoff <handoffId> --json
```

## 3. 账本星球：CLI Producer 与 MCP 检查

终端 A 保持 `pnpm pb:up`。终端 B 执行：

```bash
pnpm pb -- deliver \
  --prototype ledger-planet \
  --screen task-list \
  --target apps/flutter_pb_app
```

也可使用 Selection 文件：

```text
examples/selections/ledger-planet-task-list.json
```

逐项确认所有 warning/risk。完成后打开：

```text
.proto-bridge/deliveries/<timestamp>/
├── receipt.json
└── agent-prompt.md
```

检查 Receipt 是否包含：

- Workspace、Bundle、Run、Snapshot、Handoff；
- warning/risk 确认记录；
- `agent-prompt.md` 路径。

记录 Delivery 路径：

```text

```

## 4. 配置 Cursor

仓库已提供项目级 MCP 配置：

```text
.cursor/mcp.json
```

在 Cursor **Settings → MCP** 刷新或重启窗口，确认 `proto-bridge` 以及
`inspect_evidence_workspace`、`read_agent_handoff` 可见。也可运行
`pnpm pb:mcp -- --print-config` 对照命令；不要把带生命周期日志的包管理器
命令登记为 stdio server。

可选：将同一 `mcpServers` 片段合并到用户级 `~/.cursor/mcp.json`（跨仓库复用）。
项目级与用户级均可配置 stdio
server：[Cursor MCP 文档](https://docs.cursor.com/context/model-context-protocol)。

### Cursor 只读轮

把 Journey 生成的 `agent-prompt.md` 交给 Cursor，保留“先只读、等待确认”要求。

通过标准：

- 主动读取 Consumer Guide；
- MCP Workspace 与 Handoff Workspace 一致；
- 编辑前逐项报告 mandatory risks；
- 报告固定 Snapshot 和 revision；
- 能读取 Screenshot/Fragment；
- 调用 Target conventions/examples；
- 未修改任何文件。

### Cursor 实现轮

确认只读摘要后，允许 Cursor 在独立分支/worktree 中还原到
`apps/flutter_pb_app`。

通过标准：

- 只修改 Handoff 范围；
- 复用 Flutter 工程现有 Theme、路由和 Common widgets；
- `flutter analyze` 通过；
- `flutter test` 通过；
- 调用 `validate_target_changes`；
- 最终报告固定引用、修改文件、测试和剩余风险。

## 5. 配置 Codex

运行：

```bash
pnpm pb:mcp -- --print-config
```

执行输出中的 Codex 命令，等价形式为：

```bash
codex mcp add proto-bridge -- \
  /absolute/path/to/node \
  /Users/lrq/work/proto-bridge/scripts/pb-mcp.mjs
```

随后：

```bash
codex mcp list
```

在 Codex App、CLI 或 IDE 中重启/新开任务，并用 MCP 列表确认连接。
Codex 的本地客户端共享 MCP 配置，也可以使用项目级
`.codex/config.toml`：[Codex MCP 文档](https://learn.chatgpt.com/docs/extend/mcp)。

### Codex 只读轮

把同一个 `agent-prompt.md` 交给 Codex。使用与 Cursor 只读轮完全相同的通过标准，并比较两者：

| 对比项 | Cursor | Codex |
| --- | --- | --- |
| 固定 ID 是否准确 |  |  |
| mandatory risks 是否完整 |  |  |
| Screenshot/Fragment 理解 |  |  |
| Target 既有模式识别 |  |  |
| 是否擅自读 active/latest |  |  |
| 需要补充提示的次数 |  |  |

### Codex 实现轮

在独立分支/worktree 中执行，使用与 Cursor 实现轮相同的通过标准。不要让 Codex 直接接续 Cursor 的未提交实现，否则无法比较 Evidence 消费结果。

## 6. 固定引用回归

保留第一份 Handoff，然后在 PBWork 中修改一个可见但明确的小状态，重新采集并产生新 Snapshot。

分别要求 Cursor 或 Codex：

1. 重新读取旧 Handoff；
2. 报告旧 Snapshot/revision 的原事实；
3. 不调用 `list_evidence_bundles` 后自行改用 active；
4. 再读取新 Handoff并说明变化。

通过标准：

- 旧 Handoff 仍指向旧 Snapshot/revision；
- 新采集没有改写旧对象；
- Agent 能明确区分两个 Handoff；
- Staleness/风险没有被隐藏。

## 7. 新原型：2–3 页面

制作前阅读：

- [原型 Authoring Contract](../reference/prototype-authoring.md)
- [PBWork 原型手册](../pbwork/README.md)
- [PBWork 开发规范](../pbwork/development.md)
- [原型制作 Skill](../../skills/pbwork-prototype-authoring/SKILL.md)
- [Design System Skill](../../skills/pbwork-design-system/SKILL.md)

原型最低范围：

- 2–3 个 Screen；
- 每个 Screen 有 default Variant；
- 至少一个 critical Variant；
- 至少一个跨页面或状态 Scenario；
- default/critical 都声明 `requiredFragments`；
- 只使用 PBWork Token、Theme、组件和共享手势；
- 稳定 `data-pb-id`，重复实体使用稳定 `data-pb-key`；
- Registry、路由、导航和 reset 完整。

采集前执行：

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
pnpm docs:verify
```

先用 PBWork 对整个 Prototype 做 GUI Capture 和 Review。随后复制账本星球
Selection 示例，替换为新原型的 Screen、Variant、Scenario 和
required scope：

```bash
cp examples/selections/ledger-planet-task-list.json \
  .proto-bridge/new-prototype-selection.json
```

编辑后运行：

```bash
pnpm pb -- deliver \
  --selection .proto-bridge/new-prototype-selection.json \
  --target apps/flutter_pb_app \
  --intent "在 Flutter 示例工程还原新原型的 2–3 个页面"
```

用生成的新 `agent-prompt.md` 分别执行 Cursor/Codex 的只读轮和实现轮。

特别检查：

- 缺少 PBWork 组件时是否先扩展 Design System，而不是在原型里复制组件；
- 组件、Token、Theme 或共享手势变化是否同步 Contract、Registry、文档和测试；
- Scenario Checkpoint 是否采到目标页面；
- 2–3 页面是否都进入 Handoff 实现范围；
- Agent 是否能从 Evidence 准确恢复导航和状态，而非仅按截图猜测。

## 8. 最终记录

| 分类 | 发现 | 严重度 | 是否阻塞闭环 | 后续动作 |
| --- | --- | --- | --- | --- |
| 脚本 |  |  |  |  |
| PBWork GUI |  |  |  |  |
| CLI |  |  |  |  |
| MCP |  |  |  |  |
| Cursor | V2 Tabs 被 `IgnorePointer` 降级为不可交互 | High | 是 | [PB-ACCEPT-001](./2026-07-31-ledger-planet-tab-evidence-gap.md) |
| Codex |  |  |  |  |
| Evidence 质量 | 缺少“待完成 / 已完成”切换后的 Action、Scenario 与固定状态 | High | 是 | [PB-ACCEPT-001](./2026-07-31-ledger-planet-tab-evidence-gap.md) |
| Flutter Target |  |  |  |  |
| 新原型规范 |  |  |  |  |

完成判定：

- [ ] 账本星球 GUI Producer 闭环完成
- [ ] 账本星球 CLI Producer 闭环完成
- [ ] Cursor 只读与实现完成
- [ ] Codex 只读与实现完成
- [ ] 旧 Handoff 固定引用回归完成
- [ ] 新原型 2–3 页面符合 PBWork 规范
- [ ] 新原型 GUI/CLI Capture 完成
- [ ] 新原型 Cursor/Codex 消费完成
- [ ] 所有问题已分类并决定后续动作
