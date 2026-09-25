# @proto-bridge/local-service

PBWork browser 与 ProtoBridge Node 能力之间的本地安全边界。

## 职责

- 只监听 loopback；
- 校验 Workbench Origin；
- 创建有期限的 session；
- 通过 Authorization header 验证请求；
- 调用 Core Preflight、Capture JobHost、Store 和 Handoff；
- 提供 PBWork Capture Console 和 Evidence Viewer 所需 View；
- 重启时终结 orphan Job 并使旧 session 失效。

Local Service 不拥有 Selection、Job、Evidence 或风险语义；协议来自 `@proto-bridge/core/v2/service-contract`。仓库仍保留 Flutter MCP Runtime Review 的实验实现和单元测试，但默认 MCP 不注册对应工具，正常 Capture、Delivery 与 Evidence 消费不会创建 provider。代码位置和重新启用条件见 [Flutter MCP 实验记录](../../docs/history/flutter-mcp-experiment-2026-08.md)。

## 开发

```bash
pnpm --filter @proto-bridge/local-service build
pnpm --filter @proto-bridge/local-service typecheck
pnpm --filter @proto-bridge/local-service test
```

安全与配置见 [配置与安全边界](../../docs/reference/configuration.md)。
