# ProtoBridge

ProtoBridge 把交互原型、运行时页面、截图证据和目标 Flutter 工程规范整理成页面级上下文，服务于人工开发者与 AI coding agent。

它产出可追溯、可审查、可验证的 artifacts（`page-canonical.json`、`ui-build-plan.json` 等），**不**直接把 Vue / DOM / 截图翻译成生产 Dart，也**不**自己生成生产页面。

```text
source / URL / screenshot / target repo
  -> page-canonical.json
  -> page-debug-index.json
  -> ui-build-plan.json
  -> ui-build-review.md
  -> implementation + validation
```

## 快速开始

```bash
npx @proto-bridge/cli init

npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"
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
| [docs/overview.md](docs/overview.md) | 定位、证据分层、扫描边界、包边界 |
| [docs/artifacts.md](docs/artifacts.md) | 产物权威链与字段契约 |
| [docs/usage.md](docs/usage.md) | 配置、CLI / MCP / Core、开发脚本、npm 发布 |

## 工程规范（改本仓库）

| 文件 | 内容 |
| --- | --- |
| [AGENT.md](AGENT.md) | Agent 硬约束与验证矩阵 |
| [skills/proto-bridge](skills/proto-bridge/skill.md) | 改本仓库的操作 skill |

## 仓库结构

```text
packages/
├── core/          # capabilities、workflow、source/snapshot/target
├── cli/           # 终端入口
└── mcp-server/    # MCP server

docs/              # overview · artifacts · usage
skills/            # proto-bridge 本仓开发规范
examples/vue3-to-flutter/   # Vue3 source → Flutter target 示例
```

当前适配重点：`source: vue3-prototype`，`target: flutter-app`。

## 开源示例

```bash
pnpm install
pnpm run build
pnpm run example
pnpm run example:dev
```

说明：[examples/vue3-to-flutter/README.md](examples/vue3-to-flutter/README.md)。

```text
Vue prototype:  http://127.0.0.1:5173/
Flutter target: http://127.0.0.1:5599/
```

端口占用时脚本会顺延，以终端输出为准。`output/` 与 `_proto` 生成代码不入库。

效果预览：

| Prototype | Generated Flutter page |
| --- | --- |
| ![Prototype simple](examples/vue3-to-flutter/screenshots/prototype-simple.png) | ![Flutter simple](examples/vue3-to-flutter/screenshots/flutter-simple.png) |
