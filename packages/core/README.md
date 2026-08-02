# @proto-bridge/core

ProtoBridge 的唯一产品语义层，包含可执行 Evidence Contract、Capture、Store、Handoff 和独立 Target 查询/验证。

## 职责

- Workspace、Bundle、Case、Run、Attempt、revision、Snapshot、Coverage、Issue、Staleness、Handoff 和 Blob Schema；
- 稳定 ID、状态词汇、风险、错误和引用断言；
- Selection、Preflight、Case Matrix、Playwright Capture 和 JobHost；
- Runtime/Service browser-safe protocol；
- 不可变本地 Store、active activation、防降级、fork/archive/clean；
- Evidence Read Model；
- Target adapter conventions、examples 和 change validation；当前内置 Flutter adapter。

## 公共导出

```text
@proto-bridge/core
@proto-bridge/core/v2
@proto-bridge/core/v2/capture
@proto-bridge/core/v2/store
@proto-bridge/core/v2/runtime-contract
@proto-bridge/core/v2/service-contract
@proto-bridge/core/target/flutter-app/query
@proto-bridge/core/target/flutter-app/validation
@proto-bridge/core/target
```

`/v2` 是持久对象和协议的 major namespace。具体公共面以 `package.json#exports` 为准。

入口包不得复制 Core Schema、状态、Case identity、risk 或 active-ref 解析。

## 开发

```bash
pnpm --filter @proto-bridge/core build
pnpm --filter @proto-bridge/core typecheck
pnpm --filter @proto-bridge/core test
```

架构说明见 [ProtoBridge 实现](../../docs/architecture/proto-bridge.md)和 [Evidence 模型](../../docs/architecture/evidence-model.md)。
