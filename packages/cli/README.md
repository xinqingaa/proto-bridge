# @proto-bridge/cli

ProtoBridge 的终端入口。

CLI 会读取 `proto-bridge.config.json`，调用共享 ProtoBridge core workflow，并写出页面级 artifacts，供人类 review 和 AI-assisted implementation 使用。

## V2 Evidence Producer

阶段七前，V1 `init/generate` 保持可用；V2 使用独立命令和
`proto-bridge.v2.json`：

```bash
proto-bridge v2 workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

proto-bridge v2 workspace doctor
proto-bridge v2 preflight --selection selection.json
proto-bridge v2 capture run --selection selection.json
```

V2 配置只拥有 Producer Workspace：

```json
{
  "schemaVersion": 1,
  "workspaceId": "pbwork-local",
  "runtime": {
    "baseUrl": "http://127.0.0.1:3977",
    "allowedOrigins": []
  },
  "store": {
    "root": ".proto-bridge/v2-store",
    "retainArchivedSnapshots": 1
  },
  "capture": {
    "maxCases": 100
  },
  "service": {
    "host": "127.0.0.1",
    "port": 3988,
    "allowedOrigins": ["http://127.0.0.1:3977"]
  }
}
```

V2 命令族：

- `workspace init/doctor`
- `preflight`
- `capture run`
- `job status/cancel/retry`
- `bundle list/inspect/fork/archive/clean`
- `snapshot/run/case inspect`
- `stale check`
- `handoff create/show/export`
- `service start`

复杂范围使用 Core `SelectionDraft` Schema 校验的 JSON 文件。没有
instrumented discovery 时，generic-runtime/screenshot-only 可以显式传
`--manifest <file>`；本地 Screenshot 必须通过 `--screenshot <png|jpg>`
转换为受控 Blob。

交互和自动化都必须使用可审计的 `--accept-warning <id>` 与
`--ack-risk <kind>`；可以重复传入。不存在 `--force`。使用 `--json`
获得稳定机器输出。partial、cancelled、interrupted、failed、stale 和
blocked 使用不同退出码。

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
    "root": "/path/to/vue3-prototype"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "/path/to/flutter-project"
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

项目架构无需写进 config。CLI 会让 core 扫描 source / target；无法识别的项目事实会留作 warning 或人工确认项。

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
├── ui-build-plan.json
├── ui-build-review.md
└── screenshots/
    └── full-page.png
```

优先阅读 `ui-build-review.md` 和截图理解页面，并必读 `ui-build-plan.json` 的 `canonicalReadPolicy`、`implementationContract`、`sourceSemantics`、`visualPlan` 与 `stylePlan`。`canonicalReadPolicy.required=true` 时必须按 refs 读取 `page-canonical.json`；否则仅在证据冲突或采集异常时深入读取。

完整用法与发布说明见仓库根目录 `docs/usage.md`；产物字段见 `docs/artifacts.md`。
