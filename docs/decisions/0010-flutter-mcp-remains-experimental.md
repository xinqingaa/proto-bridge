# ADR 0010：Flutter MCP 保留为未注册的实验实现

- 状态：Accepted
- 日期：2026-08-19

## 决策

官方 Flutter MCP Runtime Review 不进入 ProtoBridge 默认工作流：

- 默认 Agent Prompt 不要求 DTD、Driver Bridge、Flutter Driver 或 App/build identity；
- 默认 ProtoBridge MCP registry 不注册 Target Runtime Review Tools，也不声明 authoritative Review capability；
- Flutter 目标工程不携带 ProtoBridge 专属 Runtime Harness、Case/Scenario 副本或 build identity；
- 当前验收继续使用固定 Evidence Screenshot、五维 Reconstruction Obligations、Target resolver/validation、目标原生测试和 consumer-reported summary；
- 已实现的 Core Review、Local Service provider/runtime 和 MCP Review tool 代码继续保留并接受隔离单测，但不代表现行产品能力；
- 未来只有先完成独立真实 Handoff spike 并满足[实验记录](../history/flutter-mcp-experiment-2026-08.md#重新启用条件)中的恢复条件，才能重新提议注册到默认工具表面。

## 理由

真实页面实施已证明现有 Evidence 链路可以取得足够高的还原质量。实验 Flutter MCP 同时引入 SDK 协议漂移、DTD 交接、App 生命周期割裂、目标工程 Harness、Case/Scenario 重复声明和多方运行协调；当前增益不足以覆盖复杂度与维护成本。

保留实验代码避免丢失已完成的 provider-neutral receipt、Review reducer、精确 occurrence verifier 和协议探索成果；从默认 registry、Prompt 与目标工程解除绑定则恢复产品原有的低干预边界。

## 后果

- 缺少 Structure/State/Interaction machine authority 时必须如实标记未验证，但不会触发 Harness 实施；
- `summarize_reconstruction_review` 明确是 consumer-reported review，不冒充 Runtime receipt；
- 真机 Target Screenshot 可以作为用户主动提供的追加诊断，但不进入固定工作链路；
- 实验代码的真实官方 server 测试不进入默认 `pnpm verify`，协议适配须满足[实验记录](../history/flutter-mcp-experiment-2026-08.md#重新启用条件)后另行立项。
