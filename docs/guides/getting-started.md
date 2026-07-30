# 快速上手

本指南在本地启动 PBWork、初始化 Workspace、采集 Evidence，并为 Agent 启动 MCP。

## 环境

- Node.js 20 或更高版本
- pnpm 10
- Playwright Chromium

安装并构建：

```bash
pnpm install
pnpm build
```

首次安装 Playwright 浏览器时执行：

```bash
pnpm exec playwright install chromium
```

## 启动 PBWork

```bash
pnpm pbwork
```

该命令启动 PBWork Web 应用和 Local Service。终端会输出实际 URL、Workspace 和服务连接信息。Runtime 使用 `/prototype/:prototypeId/:screenSlug`，工作台使用 `/workbench/*`。

## 初始化 CLI Workspace

构建后可直接运行仓库内 CLI：

```bash
node packages/cli/dist/index.js workspace init \
  --workspace pbwork-local \
  --runtime http://127.0.0.1:3977

node packages/cli/dist/index.js workspace doctor
```

默认配置文件是 `proto-bridge.json`，默认 Store 是 `.proto-bridge/store`。端口或 Store 不同，应以 `pnpm pbwork` 输出和实际配置为准。

## 通过 PBWork 采集

1. 在原型树中打开 Screen，并确认 Runtime 可以加载目标 Variant。
2. 打开“证据采集”，选择当前 Screen、Fragment、自定义范围或 Prototype。
3. 查看 Preflight、Case Matrix、warning 和范围。
4. 明确确认后启动 Job。
5. 在任务中心查看进度，在结果页 Review Facts、截图、Coverage 和 Issue。
6. 需要交给 Agent 时创建 Handoff。

详细操作语义见 [PBWork 与 PB 协作](./pbwork-and-pb.md)。

## 通过 CLI 采集

准备一个符合 `SelectionDraft` Schema 的 JSON 文件，然后：

```bash
node packages/cli/dist/index.js preflight \
  --selection selection.json

node packages/cli/dist/index.js capture run \
  --selection selection.json
```

warning 使用可重复的 `--accept-warning <warningId>` 逐项确认。CLI 不提供跳过全部检查的 `--force`。

完整命令以 [CLI README](../../packages/cli/README.md)和实际 `--help` 为准。

## 启动 MCP

```bash
node packages/mcp-server/dist/index.js \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

MCP 必须绑定到 Handoff 所属 Workspace。Agent 的读取顺序见 [Agent 消费指南](./agent-consumption.md)。

## 验证仓库

```bash
pnpm verify
```

完整门禁包含安装锁文件检查、构建、类型检查、Core/Service/CLI/PBWork 测试、真实浏览器 Runtime Capture、MCP、Consumer 和 PBWork → Store → MCP 垂直切片。

