# @proto-bridge/cli

ProtoBridge 的终端入口。

CLI 会读取 `proto-bridge.config.json`，调用共享 ProtoBridge core workflow，并写出页面级 artifacts，供人类 review 和 AI-assisted implementation 使用。

`source.root` 和 `url` 不是共同必填项：有源码可跑 source-only，有 URL 可跑 runtime-only，两者都有可跑 hybrid。生成面向客户端的 plan 时通常需要 `target.root`。

## 快速开始

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis
npx @proto-bridge/cli generate \
  --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" \
  --capture
```

## Config

```json
{
  "schemaVersion": 1,
  "source": {
    "adapter": "vue3-prototype",
    "root": "/path/to/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/youfi"
  },
  "runtime": {
    "capture": true
  },
  "output": {
    "root": "./output"
  }
}
```

配置文件只放稳定环境信息。每次通过 CLI 参数或交互输入传 URL；配置了 `source.root` 时会从 URL 推导 route 并自动补源码证据，配置了 `target.root` 时会生成 plan/review。

## Commands

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --url <url>
npx @proto-bridge/cli generate --route <route>
npx @proto-bridge/cli generate --vue <file>
npx @proto-bridge/cli generate
```

常见模式：

```bash
# URL-only：不需要 config
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1"

# target + URL：配置 target.root 或传 --target-root

# source + target + URL：配置 source.root 和 target.root，URL 自动推导 route
npx @proto-bridge/cli generate
```

Options：

- `--config <file>`：config path，默认 `./proto-bridge.config.json`。
- `--url <url>`：主页面输入，自动推导 route。
- `--route <route>`：高级 source route 覆盖。
- `--vue <file>`：高级 Vue SFC 覆盖。
- `--source-root <dir>`：可选 prototype/source 根目录。
- `--target-root <dir>`：可选目标工程根目录。
- `--output <dir>`：本次运行的完整输出目录。
- `--capture`：本次运行执行 runtime capture。
- `--trace`：打印 capability orchestration trace。

## 输出

```text
output/<page>-<timestamp>/
├── page-canonical.json
├── page-debug-index.json
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
    └── full-page.png
```

优先阅读 `ui-build-plan.json`，它是唯一机器契约，重点看 `targetConventions`、`implementationContract`、`sourceSemantics` 和 `visualPlan`。`ui-build-review.md` 是从 plan 渲染的人类可读 brief。深入排查时使用 `page-debug-index.json` 和 `page-canonical.json`。
