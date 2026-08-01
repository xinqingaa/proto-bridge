# ADR 0006：实现相关语义必须显式进入 Evidence

- 状态：Accepted for convergence

## 决策

PBWork 原型由产品、设计和开发人员通过 Coding Agent 维护，不建设独立可视化编辑器或聊天式作者入口。

Agent 需要独立实现或验收的节点必须显式成为 Evidence：注册 DS 组件通过业务 `inspectId`、组件 role 和组件 token bindings 提供；业务局部节点通过 `data-pb-id`、`data-pb-role`、按需 `data-pb-key` 和 `data-pb-token-*` 提供。只在 CSS 中使用 Token 不构成 Token Evidence。

## 理由

Capture 无法从 CSS class、DOM 层级或截图可靠判断作者希望 Agent 独立实现哪些标题、辅助文字、色面和状态。若完全依赖推断，同一页面在组件增加、设计细化或目标技术栈变化后会产生不同解释。

显式标记让作者意图、Runtime observation 和 Agent 消费拥有稳定交点，同时保留 authored completeness：不是要求标记所有 DOM，而是要求标记所有实现相关节点。

## 结果

- Identity、role、component 和 Token binding 的职责分离。
- strict required Fragment 禁止依赖 `ds.*` 或 `unknown`。
- 业务局部证据节点只写 CSS Token 属于不合规。
- DS Component Contract 需要纳入 semantic role policy。
- 静态检查负责发现属性不成对和疑似 CSS-only 节点；Runtime/Core 负责确定性完整性门禁。
- 所有参与者使用相同仓库 Skill、Authoring Contract、检查单和 CI，不按人员角色维护不同规范。

精确规则见[语义标记与证据门禁](../reference/semantic-authoring.md)。
