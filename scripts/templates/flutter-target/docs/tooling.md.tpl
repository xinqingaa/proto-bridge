# 工程工具

## MCP 与交付目标

`.cursor/mcp.json`、`.codex/config.toml`、`.mcp.json` 和 `.agents/mcp.json` 使用项目内 `tool/mcp.mjs`。入口从 `.pb-scaffold.json` 读取 Producer 路径与 Workspace 配置。Codex 需要 trust 项目目录才能加载项目级配置。

在工程根目录检查连接与目标绑定：

```bash
node tool/target.mjs --show
node tool/target.mjs --check
```

切换交付目标时执行：

```bash
node tool/target.mjs --bind
```

绑定会修改 Producer 的 Workspace 配置；随后重启相关 Producer/MCP 客户端并重新生成交付提示词。Producer 路径只在 `.pb-scaffold.json` 的 `protoBridgeRoot` 维护，相对本工程解析。

## 检查入口

`node tool/verify.mjs` 执行依赖安装、格式检查、Flutter analyze/test 和完整 DS 同步检查；`node tool/ds-theme.mjs` 只验证 Token，`node tool/ds-sync.mjs` 验证完整组件、Token 与 DS surface。适用范围和视觉检查以 [测试规范](testing.md) 为准。

## 维护来源

本工程由 `pnpm pb:new:flutter` 初始化。基线的工程规范来自 `apps/flutter_pb_app/docs/`，生成入口模板来自 `scripts/templates/flutter-target/`。已生成工程独立维护，不因 Producer 更新自动覆盖本地文档或代码。
