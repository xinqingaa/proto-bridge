# npm 发布流程

ProtoBridge 使用 pnpm workspace 开发，但 npm 用户通过 npx 使用 CLI。

## 发布包

当前计划发布两个包：

- `@proto-bridge/core`：核心 adapter、capture、generator。
- `@proto-bridge/cli`：命令行入口，依赖 `@proto-bridge/core`。

根目录 `proto-bridge` 保持 `private: true`，不发布。`@proto-bridge/mcp-server` 暂不发布。

## 用户命令

```bash
npx @proto-bridge/cli init
npx @proto-bridge/cli generate --url "http://localhost:5173/#/prototype/etf-detail"
npx @proto-bridge/cli generate
```

## 发布前检查

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
- 必要 README 或文档

## 发布顺序

先发布 core，再发布 cli：

```bash
pnpm --filter @proto-bridge/core publish --access public
pnpm --filter @proto-bridge/cli publish --access public
```

如果是私有 scope，需要按 npm 组织权限选择 publish 参数。

## 注意事项

- `packages/cli` 内的 `bin.proto-bridge` 指向 `dist/index.js`。
- `@proto-bridge/cli` 使用 `workspace:*` 依赖 `@proto-bridge/core`，pnpm publish/pack 会转换为当前版本。
- 默认 `capture: false`，因此普通生成不要求用户预先安装 Playwright 浏览器。
- 开发脚本 `pnpm run generate` 只服务本仓库，不是 npm 用户入口。
