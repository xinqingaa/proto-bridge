# 协作与工作流

本页统一维护通用协作流程；产品要求、工程规范、实现状态和专用协议由各自文档负责。

## 开始工作

先读根 README、文档索引与当前缺口（如有），确认产品定位和实现范围。产品任务按需读取产品、逻辑与 UI 文档；代码修改读取 [工程架构](architecture.md)，再查组件、主题、资源、路由和测试规范。检查工作区已有改动，保留与任务无关的内容。

本工程只维护 Flutter 应用。Producer 的修改是独立任务；不复制 Evidence Store 到 Target。

## 授权与实施

用户要求先评估时，先只读说明现状、方案、预计文件和验证方式，等待明确批准。

新的固定 Handoff 任务先按 Consumer Skill 读取 Evidence 与 Target 上下文，原样报告 `mandatoryRisks`。按 Screen 用简短散文说明结构与滚动边界、组件与 Token 落点、状态与交互覆盖、预计修改文件、验证和剩余风险，再等待明确批准；此前不修改工程或执行改变 Target 状态的命令。

批准在约定范围内持续有效。范围扩大或出现新的产品取舍时，完成不依赖该决定的工作后说明待决事项。普通工程和文档任务按用户给定范围执行，不套用固定 Handoff 的 Screen 审批流程。

## 文档、Evidence 与代码

- 本地产品文档定义应有行为；代码和当前缺口说明实际完成程度。
- 固定 Evidence 表达源页面已观测的结构、文案、状态、交互与构图，保留固定 Workspace、Handoff、Bundle、Snapshot 和 revision。
- 本工程规范与公开代码决定 Flutter 的组件、状态、存储、Theme 和路由落点；Target adapter 只提供目标上下文，不能覆盖源观测。

文档版本不自动等于 Evidence 版本。冲突应记录双方来源、影响和待决事项，不静默改写要求。设计中的动效意图不能当成已采集过程。

## 任务 Skill

| 任务 | 入口 |
| --- | --- |
| 固定 Evidence 页面实现 | [Consumer](../.agents/skills/proto-bridge-consumer/SKILL.md) |
| 无固定 Handoff 的 DS 同步 | [DS Target Sync](../.agents/skills/proto-bridge-ds-target-sync/SKILL.md) |

实现后的还原 Review 使用工程可用的 Acceptance Skill；其五维纪律由 Core 维护。Skills 负责专用操作和协议细节，通用授权和协作以本页为准。

## 连接与交付

固定 Evidence 任务调用 `inspect_evidence_workspace` 核对 `deliveryTargetRoot` 与本工程一致；不一致时停止该交付并报告。客户端入口以本工程实际 MCP 配置为准，不能只修改提示词中的目标路径。

验证按 [测试规范](testing.md) 执行。组件或 Token 的 `pending` 必须披露，不能当作 resolved 或静默替换；映射、DS 同步、场景测试和移动视觉接受分别报告。适用时使用受限 `allowedPaths` 与预期文件调用 `validate_target_changes`，再进入还原 Review。

交付说明修改、验证、偏差和剩余风险。固定 Evidence 任务另外报告固定引用与 revision、原始风险、状态与交互覆盖、Target validation、视觉验证和 Review 完整度；未执行的检查明确保留。

## 规范演进

从产品需求正推或从具体 Target 反推规范时，先区分通用工程规则、产品特例与一次性状态。通用规则更新所属工程文档及必要的公开 API/测试；生成入口变化更新脚手架模板。产品取舍留在原型或 Target 的产品文档，历史验证留在评审记录。已有 Target 的改进不会自动回灌基线，基线变化也不会自动覆盖已生成工程。
