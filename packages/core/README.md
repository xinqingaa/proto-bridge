# @proto-bridge/core

ProtoBridge 的唯一产品语义层，包含：

- Evidence Contract、稳定 ID、状态词汇和引用断言；
- Selection、Preflight、Case Matrix、Capture 与 Handoff；
- 不可变本地 Store、Job 恢复、stale、fork/archive 和安全 clean；
- 浏览器安全 Runtime Capture Protocol；
- 独立 Flutter Target 查询与变更验证。

公共边界：

```text
@proto-bridge/core
@proto-bridge/core/v2
@proto-bridge/core/v2/capture
@proto-bridge/core/v2/store
@proto-bridge/core/v2/runtime-contract
@proto-bridge/core/v2/service-contract
@proto-bridge/core/target/flutter-app/query
@proto-bridge/core/target/flutter-app/validation
```

`/v2` 是持久对象和协议的 schema namespace；仓库不包含旧 Artifact/Planner 产品链。

```bash
pnpm --filter @proto-bridge/core build
pnpm --filter @proto-bridge/core test
```
