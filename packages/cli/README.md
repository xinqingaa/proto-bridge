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
  "source": {
    "adapter": "vue3-prototype",
    "root": "/path/to/TradeAppPrd"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/youfi"
  },
  "outputRoot": "./output",
  "capture": false
}
```

Runtime-only 场景可以只配置 `target`，然后在命令中传 `--url --capture`。

## Commands

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --url <prototype-url>
npx @proto-bridge/cli generate --route <route>
npx @proto-bridge/cli generate --vue <file>
npx @proto-bridge/cli generate
```

常见模式：

```bash
# source-only：需要 source.root + target.root
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis

# runtime-only：需要 target.root + url，不需要 source.root
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" --capture

# hybrid：需要 source.root + target.root + url
npx @proto-bridge/cli generate --route /prototype/asset/pnl-analysis --url "http://localhost:5173/#/prototype/asset/pnl-analysis?is_mobile=1" --capture
```

Options：

- `--config <file>`：config path，默认 `./proto-bridge.config.json`。
- `--url <url>`：运行中的 prototype URL。
- `--route <route>`：source route。
- `--vue <file>`：Vue SFC path。
- `--prototype-url <url>`：capture URL 与 source identity 不同时使用。
- `--output <dir>`：本次运行的完整输出目录。
- `--capture`：本次运行执行 runtime capture。
- `--source-brief`：额外输出可选 `migration-spec.md`。
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

优先阅读 `ui-build-review.md`，再读 `ui-build-plan.json`。深入排查时使用 `page-debug-index.json` 和 `page-canonical.json`。
