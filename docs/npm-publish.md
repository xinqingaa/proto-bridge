# npm 发布指南

本文档只回答一件事：ProtoBridge 的 npm 包应该怎样发布，以及更新包时需要改什么。它不承担项目总览职责，也不展开 workflow 设计。

## 1. 发布包清单

当前发布三个 npm 包：

- `@proto-bridge/core`
- `@proto-bridge/cli`
- `@proto-bridge/mcp-server`

不发布：

- monorepo 根项目 `proto-bridge`

用户入口：

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --route /prototype/trade
npx -y @proto-bridge/mcp-server
```

## 2. 新包首次发布

首次发布前确认：

- npm registry 使用官方源
- 当前账号已登录 npm
- `@proto-bridge` organization 已存在且当前账号有发布权限
- 包名还未被占用，或你明确知道当前状态

推荐检查：

```bash
npm config get registry
npm whoami
npm org ls proto-bridge
npm view @proto-bridge/core version
npm view @proto-bridge/cli version
npm view @proto-bridge/mcp-server version
```

发布前构建和打包检查：

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @proto-bridge/core pack --dry-run
pnpm --filter @proto-bridge/cli pack --dry-run
pnpm --filter @proto-bridge/mcp-server pack --dry-run
```

首次发布顺序：

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/cli publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/mcp-server publish --access public --registry=https://registry.npmjs.org/
```

如果账号开启 2FA，发布时追加 `--otp=<6位验证码>`。

## 3. 已有包更新发布

后续更新时，先做常规检查：

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @proto-bridge/core pack --dry-run
pnpm --filter @proto-bridge/cli pack --dry-run
pnpm --filter @proto-bridge/mcp-server pack --dry-run
```

然后按变更影响范围决定需要更新哪些包。

### 3.1 版本调整规则

- `patch`：兼容 bug fix、文档调整、小改动
- `minor`：兼容的新功能
- `major`：破坏性变更

### 3.2 更新包时需要修改什么

更新发布时，重点确认这些内容：

- 需要发布的包版本号是否已调整
- 包之间的依赖关系是否与本次变更一致
- `workspace:*` 依赖会在 pack/publish 时转换为当前发布版本
- `bin`、`exports`、`files`、`README.md`、`dist/**` 是否与产物匹配

### 3.3 哪些包需要一起发

按规则判断，不按临时案例判断：

- 如果某个包依赖另一个包的新能力，需要同时发布依赖链上的相关包。
- 如果改动只影响单个包，且没有引入其它包的新依赖能力，可以只发布该包。
- 如果多个包对外接口或行为需要保持一致，优先同步升级版本。

发布顺序仍然保持：

```text
core -> cli -> mcp-server
```

需要发布时：

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/cli publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/mcp-server publish --access public --registry=https://registry.npmjs.org/
```

## 4. 发布后验证

先检查 npm 上的版本：

```bash
npm view @proto-bridge/core version
npm view @proto-bridge/cli version
npm view @proto-bridge/mcp-server version
```

然后在临时目录验证用户入口，避免 workspace 干扰：

```bash
cd /tmp
npx @proto-bridge/cli@latest --help
npx -y @proto-bridge/mcp-server@latest
```

如果必须在 monorepo 内验证，使用带版本或显式 package 的命令：

```bash
npm exec --package @proto-bridge/cli@latest -- proto-bridge --help
npm exec --package @proto-bridge/mcp-server@latest -- proto-bridge-mcp
```

## 5. 常见发布约束

- `packages/cli` 内的 `bin.proto-bridge` 必须指向 `dist/index.js`。
- `packages/mcp-server` 内的 `bin.proto-bridge-mcp` 必须指向 `dist/index.js`。
- `packages/*/package.json` 中的 `prepack` 会在 pack/publish 前自动 build。
- 正式发布前建议保持 git 工作区干净。
- 默认 `capture: false` 不要求 CLI 用户预先安装和配置运行中的 prototype capture 环境。

## 6. 发布后的接入确认

发布完成后，如果需要确认 CLI 或 MCP server 的外部接入方式，统一查看 [integration.md](integration.md)。
