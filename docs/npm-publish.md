# npm 发布与维护流程

ProtoBridge 使用 pnpm workspace 开发，但 npm 用户通过 npx 使用 CLI。

## 包结构

当前发布两个 npm 包：

- `@proto-bridge/core`：核心 adapter、capture、generator。
- `@proto-bridge/cli`：命令行入口，依赖 `@proto-bridge/core`。

不发布：

- 根目录 `proto-bridge`：保持 `private: true`，只作为 monorepo 根项目。
- `@proto-bridge/mcp-server`：暂不发布，等 MCP 模式稳定后再处理。

用户使用命令：

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
npx @proto-bridge/cli generate
```

## 首次发布前准备

### 1. 确认 npm registry

发布必须使用 npm 官方 registry，不要使用镜像源。

```bash
npm config get registry
```

期望输出：

```text
https://registry.npmjs.org/
```

如果不是，执行：

```bash
npm config set registry https://registry.npmjs.org/
```

### 2. 登录 npm

```bash
npm login
npm whoami
```

`npm whoami` 应输出当前 npm 用户名。

### 3. 确认 organization 权限

当前 scope 是 `@proto-bridge`，需要 npm organization `proto-bridge` 存在，并且当前账号有发布权限。

```bash
npm org ls proto-bridge
```

期望能看到当前用户，例如：

```text
rq_lin - owner
```

如果 organization 不存在，需要先在 npm 网站创建 `proto-bridge` organization。

### 4. 确认包名状态

首次发布前可以确认包是否已存在：

```bash
npm view @proto-bridge/core version
npm view @proto-bridge/cli version
```

首次发布时如果返回 404，说明包还没有发布，是正常情况。

## 发布前检查

每次发布前都执行：

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @proto-bridge/core pack --dry-run
pnpm --filter @proto-bridge/cli pack --dry-run
```

确认 dry-run 输出包含：

- `dist/**/*.js`
- `dist/**/*.d.ts`
- `package.json`
- `README.md`

`packages/*/package.json` 中的 `prepack` 会在打包和发布前自动 build。

## 首次发布

发布顺序必须是 core 先、cli 后，因为 CLI 依赖 core。

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/cli publish --access public --registry=https://registry.npmjs.org/
```

如果 npm 账号开启了 2FA，发布时需要 OTP。

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/ --otp=123456
pnpm --filter @proto-bridge/cli publish --access public --registry=https://registry.npmjs.org/ --otp=123456
```

OTP 是认证器 App 中 npm 账号对应的 6 位验证码。常见 App 包括 Google Authenticator、Microsoft Authenticator、1Password、Authy、Apple 密码、Bitwarden 等。

## 如果遇到 2FA 报错

错误示例：

```text
Two-factor authentication or granular access token with bypass 2fa enabled is required to publish packages.
```

说明发布请求已经到达 npm，但缺少 OTP 或可绕过 2FA 的 granular access token。

解决方式：

1. 打开认证器 App，找到 npm / npmjs.com / 当前用户名对应的 6 位验证码。
2. 重新发布并加 `--otp=<验证码>`。
3. 如果 build 时间较长导致验证码过期，可以先 pack，再发布 tarball。

```bash
pnpm --filter @proto-bridge/core pack
pnpm --filter @proto-bridge/cli pack

npm publish ./proto-bridge-core-0.1.0.tgz --access public --registry=https://registry.npmjs.org/ --otp=123456
npm publish ./proto-bridge-cli-0.1.0.tgz --access public --registry=https://registry.npmjs.org/ --otp=123456
```

## 如果遇到 unclean working tree

错误示例：

```text
ERR_PNPM_GIT_UNCLEAN Unclean working tree. Commit or stash changes first.
```

这是 pnpm publish 的保护机制，表示当前 git 工作区有未提交改动。

推荐做法：

```bash
git status
```

确认变更后先提交，再发布。

不推荐但可用的临时方式：

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/ --no-git-checks
```

正式发布建议保持工作区干净。

## 发布后验证

```bash
npm view @proto-bridge/core version
npm view @proto-bridge/cli version
```

不要在 monorepo 根目录验证 npx，因为 npm 可能优先识别本地 workspace 包。建议切到临时目录：

```bash
cd /tmp
npx @proto-bridge/cli --help
npx @proto-bridge/cli generate
```

如果必须在 monorepo 里验证，使用带版本或显式 package 的命令：

```bash
npx @proto-bridge/cli@latest --help
npm exec --package @proto-bridge/cli@latest -- proto-bridge --help
```

## 后续更新发布

### 1. 修改代码后检查

```bash
pnpm run typecheck
pnpm run build
```

### 2. 升级版本

根据变更类型选择版本：

- `patch`：bug fix 或文档/小改动，例如 `0.1.0 -> 0.1.1`。
- `minor`：新增兼容功能，例如 `0.1.0 -> 0.2.0`。
- `major`：破坏性变更，例如 `1.0.0 -> 2.0.0`。

core 和 cli 目前保持同版本发布：

```bash
pnpm --filter @proto-bridge/core version patch
pnpm --filter @proto-bridge/cli version patch
```

如果 CLI 依赖 core 的新能力，确认 `packages/cli/package.json` 中 `@proto-bridge/core` 依赖版本会在 pack/publish 时转换为当前版本。

### 3. 发布前 dry-run

```bash
pnpm --filter @proto-bridge/core pack --dry-run
pnpm --filter @proto-bridge/cli pack --dry-run
```

### 4. 按顺序发布

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/
pnpm --filter @proto-bridge/cli publish --access public --registry=https://registry.npmjs.org/
```

如需 OTP：

```bash
pnpm --filter @proto-bridge/core publish --access public --registry=https://registry.npmjs.org/ --otp=123456
pnpm --filter @proto-bridge/cli publish --access public --registry=https://registry.npmjs.org/ --otp=123456
```

### 5. 验证 latest

```bash
npm view @proto-bridge/core version
npm view @proto-bridge/cli version
cd /tmp
npx @proto-bridge/cli@latest --help
```

## 维护注意事项

- `packages/cli` 内的 `bin.proto-bridge` 必须指向 `dist/index.js`。
- `@proto-bridge/cli` 使用 `workspace:*` 依赖 `@proto-bridge/core`，pnpm pack/publish 会转换为当前版本。
- 默认 `capture: false`，因此普通生成不要求用户预先安装 Playwright 浏览器。
- 开发脚本 `pnpm run generate` 只服务本仓库，不是 npm 用户入口。
- 发布前检查 `npm config get registry`，避免误用镜像源发布。
