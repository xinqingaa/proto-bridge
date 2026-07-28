# ProtoBridge

ProtoBridge 把交互原型、运行时页面、截图证据和目标 Flutter 工程规范整理成页面级上下文，服务于人工开发者与 AI coding agent。

它产出可追溯、可审查、可验证的 artifacts（`page-canonical.json`、`ui-build-plan.json` 等），**不**直接把 Vue / DOM / 截图翻译成生产 Dart，也**不**自己生成生产页面。

```text
source / URL / screenshot / target repo
  -> page-canonical.json
  -> ui-build-plan.json
  -> ui-build-review.md
  -> implementation + validation
```

## 快速开始

```bash
npx @proto-bridge/cli init

npx @proto-bridge/cli generate \
  --url "http://127.0.0.1:5173/prototype/ledger-planet/task-list?variant=default&theme=light" \
  --capture
```

配置示例（稳定环境写进 `proto-bridge.config.json`；页面参数每次传入）：

```json
{
  "schemaVersion": 1,
  "source": {
    "adapter": "vue3-prototype",
    "root": "/path/to/vue3-prototype"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/flutter-project"
  },
  "runtime": { "capture": true },
  "output": { "root": "./output" }
}
```

MCP：

```toml
[mcp_servers.proto-bridge]
command = "npx"
args = ["-y", "@proto-bridge/mcp-server"]
```

主工具：`reconstruct_page_context`、`read_target_conventions`、`find_target_examples`、`validate_ui_build`。

## 文档（产品说明）

| 文档 | 内容 |
| --- | --- |
| [docs/overview.md](docs/overview.md) | 定位、证据分层、扫描边界、包边界、适配器 |
| [docs/artifacts.md](docs/artifacts.md) | 产物权威链与字段契约 |
| [docs/usage.md](docs/usage.md) | 配置、CLI / MCP / Core、开发脚本、npm 发布 |
| [docs/design.md](docs/design.md) | 原型工作台：范围、Vue/Vuetify 栈、三栏与展示标准 |
| [docs/conventions.md](docs/conventions.md) | 当前 Vue 原型的 class/tag 结构与弹层约定 |
| [docs/pbwork](docs/pbwork) | PBWork 生产者手册（Token、组件用法、原型组装；链到 `apps/pbwork/docs`） |

## 工程规范（改本仓库）

| 文件 | 内容 |
| --- | --- |
| [AGENT.md](AGENT.md) | Agent 硬约束与验证矩阵 |
| [skills/proto-bridge](skills/proto-bridge/skill.md) | 改本仓库（Core / CLI / MCP）的操作 skill |
| [skills/pbwork-prototype](skills/pbwork-prototype/skill.md) | 在 pbwork 做/改原型与 DS 组件用法 |

## 仓库结构

```text
packages/
├── core/          # capabilities、workflow、source/snapshot/target
├── cli/           # 终端入口
└── mcp-server/    # MCP server

docs/              # overview · artifacts · usage · design · conventions · pbwork→
skills/            # proto-bridge · pbwork-prototype
apps/pbwork/       # 原型工作台；生产者手册在 apps/pbwork/docs
tests/fixtures/    # CLI / MCP 核心冒烟夹具
```

当前适配重点：`source: vue3-prototype`，`target: flutter-app`。
