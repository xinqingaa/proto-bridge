# Roadmap：官方 Flutter MCP 与分级 Target 验收

状态：Deferred

日期：2026-08-19

优先级：P2；当前不投入

## 当前结论

本轮真实页面实施与人工验收没有依赖官方 Flutter MCP，仅依靠固定 Evidence、Source Screenshot、目标工程规范、Target resolver/validation、目标原生测试和五维复查，已经获得约 90 分的主观还原效果。现阶段 Flutter MCP 带来的额外验证收益不足以覆盖协议波动、运行协调和目标工程侵入，因此不进入默认产品链路。

当前默认链路保持：

```text
PBWork Runtime
  -> Core/Playwright Capture
  -> immutable Store/Snapshot
  -> fixed Handoff
  -> ProtoBridge MCP progressive Evidence consumption
  -> Agent implementation
  -> target-native checks + Target validation
  -> five-dimensional Reconstruction Obligations + consumer summary
```

五维 `structure`、`components`、`tokens`、`states`、`interactions` 没有被删除。缺少机器 authority 的维度保持未验证或附人工/测试依据，不通过补 Runtime Harness 强行制造 authority。

## 默认隔离边界

- Agent Prompt 不包含 `review.version: 3`、DTD attach、Driver Bridge、Flutter Driver extension 或 App/build identity 要求；
- 默认 MCP `tools/list` 不注册 Target Runtime Review Tools；
- 默认 MCP handshake 不声明 `target-review-authoritative` capability；
- Flutter 目标工程不包含 Review Control route、Driver Bridge、Review delegate、Case/Scenario Runtime contract 或 build identity dart-defines；
- `.codex/config.toml` 与 `.cursor/mcp.json` 只配置 ProtoBridge Evidence MCP，不配置 Dart/Flutter MCP；
- Local Service 保留实验 Review endpoint/provider 实现，但正常 Capture、Delivery 和默认 MCP Consumer 不调用它；
- CLI 的相关实现只视为实验入口，不进入默认 Agent 工作流。

代码存在不代表当前产品支持。任何调用方不得猜测未注册 Tool 名、直接调用内部 Service endpoint，或把实验 receipt 写成现行验收结果。

## 保留的实验代码

### Core Review 与 Target 验证实验

- `packages/core/src/review/contracts.ts`
- `packages/core/src/review/profile.ts`
- `packages/core/src/review/reducer.ts`
- `packages/core/src/review/projection.ts`
- `packages/core/src/target/claims.ts`
- `packages/core/src/target/flutter-app/claims.ts`
- `packages/core/src/target/flutter-app/review.ts`
- `packages/core/src/target/flutter-app/resolver.ts` 中可选 Flutter Review Contract parser

这些代码保存 L1/L2/L3 Profile、append-only event reducer、provider-neutral receipt、Target content digest、精确 Dart occurrence/named-slot verifier、Structure/State/Scenario typed comparison 和 PNG diff/overlay 探索。

### Local Service 实验

- `packages/local-service/src/flutter-mcp-provider.ts`
- `packages/local-service/src/flutter-review-runtime.ts`
- `packages/local-service/src/review-repository.ts`
- `packages/local-service/src/service.ts` 中 Review endpoint 与 lazy provider 编排

这些代码保存 stdio MCP client、initialize/tools-list、DTD attach、capability fingerprint、最多三次尝试、session invalidation、Runtime observation、artifact persistence 和 Review event log。

### MCP 与 CLI 实验

- `packages/mcp-server/src/tools/target-review.ts`
- `packages/mcp-server/src/services/review-service-client.ts`
- `packages/cli/src/service-client.ts` 与 `packages/cli/src/cli.ts` 中 Review 调试入口

默认 MCP registry 不 import 或注册 `target-review.ts` 中的 Tools。保留实现用于隔离单测与未来重新评估。

### 保留测试

- `packages/core/test/review/**`
- `packages/core/test/target/target-claims.test.ts`
- `packages/local-service/test/flutter-mcp-provider.test.ts`
- `packages/local-service/test/flutter-review-runtime.test.ts`
- `packages/local-service/test/review-repository.test.ts`
- Local Service 中覆盖 Review endpoint 的隔离测试

Fake/unit 测试只证明内部 Contract 和 reducer 没有腐烂，不证明官方 Flutter MCP 的当前协议兼容性或真实业务收益。

## 已移除的目标工程侵入

- `flutter_driver` dependency 与 `enableFlutterDriverExtension`；
- `PB_REVIEW_MODE`、隐藏 Review Control route 和透明 finder 节点；
- Demo/冷链 Review delegate；
- `proto-bridge.target.json` 中 `review`、Case 和 Scenario Runtime 副本；
- `PB_TARGET_COMMIT`、`PB_TARGET_CONTENT_DIGEST`、`PB_APP_BUILD_DIGEST`；
- `pb:flutter-review-env` 与 build identity 生成脚本。

Flutter App 不再为该实验保留 FVM SDK 锁；业务页面、业务路由、Riverpod state、Component/Token mapping 和目标原生测试均独立保留。

## 本次踩坑复盘

### 1. Flutter SDK 与 MCP Tool 表面耦合

仓库实验 provider 最初对接聚合式 `dtd`、`widget_inspector`、`flutter_driver_command` 和 `vm_service`。Flutter 3.38.5/3.41.9 的实际 server 使用 `connect_dart_tooling_daemon`、`get_widget_tree`、`flutter_driver` 和 `get_runtime_errors`；Flutter 3.44 又暴露不同的聚合 Tool 表面。相同 provider 代码不能跨这些 SDK 版本稳定工作。

结论：目标工程 Flutter 版本不能为了实验 MCP 协议被动固定；官方 server 真实 `tools/list` 必须先于产品 Contract。

### 2. DTD attach 造成运行交接

attach-only 需要用户或 IDE 先启动 App、取得当前 DTD URI，再把 URI交给 Local Service。App 重启、build 变化或 session 漂移都可能要求新的 URI 和 Service/provider session。

结论：不拥有 App 生命周期却要求权威 Runtime receipt，会把复杂度转移给操作者。

### 3. 官方 MCP 不等于 PB 语义 inspector

Widget tree、Screenshot 和 Driver action 不能直接表达 PB Region identity、scroll owner、固定 Case state、keyed collection 或 Scenario checkpoint。为满足五维比较，目标工程仍需自定义 Driver Bridge 和 typed observation。

结论：官方 MCP 只解决传输与部分操作，不能消除 ProtoBridge 专属 Runtime Contract。

### 4. 目标工程侵入与重复维护

Harness 引入隐藏 route、finder、build identity、Case prepare、Scenario action 和 observation delegate。Target JSON 又复制固定 Handoff 的 Case/Scenario 绑定，业务变更需要同步 Source Evidence、Target contract 和 App delegate。

结论：验证设施不能比页面实现本身更难维护。

### 5. 协议回归不等于产品 E2E

真实 initialize/tools-list 测试、Fake Provider 测试和 reducer 测试能够验证协议形状，但不能证明一个真实 Handoff 的 Screenshot、interaction 和五维结果会显著优于现有 Evidence 工作流。

结论：实验能力必须先做独立 go/no-go spike，再进入 Agent Prompt 和现行文档。

### 6. 提示词过早绑定实验能力

Flutter MCP Harness 被写入 `inspect_target_readiness` 后续要求、Target Contract 和 Verification Prompt，导致正常页面实施被迫处理 DTD、Driver、App identity 和 Review Session。

结论：实验 provider 不得成为默认 consumer capability 或缺失时的实施 blocker。

## 真机截图的可选边界

Source Evidence Screenshot 仍是默认链路必须查看的固定证据。Target 真机运行截图属于用户主动提供的追加诊断：只有最终视觉仍有明显不确定性时，Agent 才在最终报告末尾提示可以补充；未提供不阻止实现交付，也不写入固定 Evidence 或冒充自动化 Review receipt。

## 重新启用条件

重新评估前必须同时满足：

1. 选定的 Flutter 支持范围内，官方 MCP Tool contract 有可验证的稳定性或明确版本协商；
2. 不再要求操作者频繁复制 DTD URI、重启 Service 或手工同步 App build identity；
3. Runtime provider 不要求目标业务工程维护 PB 专属 Case/Scenario 副本和 Driver Bridge；
4. provider 可以在不增加工作流人工接力的情况下完成 attach、Screenshot、interaction 和 runtime-error observation；
5. 先用一个隔离分支和一个真实固定 Handoff 完成 go/no-go spike；
6. 对照验收能够证明它发现了现有 Evidence + Target validation + 原生测试无法发现的显著缺陷；
7. spike 通过后再分别评审 MCP Tool 注册、Local Service public Contract、目标工程 Harness 和 Agent Prompt，不允许一次性整体升级为默认能力。

任一条件不满足，实验代码继续保留但不注册。

## 实验验证命令边界

默认 `pnpm verify` 只验证当前产品链路和实验代码的确定性 unit/fake tests。需要真实启动官方 `dart mcp-server` 的兼容性测试必须使用单独的 opt-in 命令，并显式记录 Flutter/Dart SDK 版本；它的失败不应阻断与 Flutter MCP 无关的 Evidence 产品验证。

## 相关资料

- [产品工作流](../product/workflow.md)
- [ProtoBridge 实现](../architecture/proto-bridge.md)
- [Agent 消费指南](../guides/agent-consumption.md)
- [ADR 0007：高保真重建使用独立 Acceptance Contract](../decisions/0007-reconstruction-acceptance-contract.md)
- [ADR 0009：Flutter 官方 MCP 使用操作者 DTD URI与 Driver Bridge](../decisions/0009-flutter-official-mcp-driver-bridge.md)
- [ADR 0010：Flutter MCP 保留为未注册的实验实现](../decisions/0010-flutter-mcp-remains-experimental.md)
