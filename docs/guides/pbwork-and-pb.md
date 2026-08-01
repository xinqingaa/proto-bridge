# PBWork 与 ProtoBridge 协作

PBWork 是 ProtoBridge 的 GUI，但不是 Core 的替代实现。它把人的选择和 Review 操作映射到 Core Contract，并通过 instrumented Runtime 提供高质量 Evidence。

原型作者、设计师和产品人员都通过 Cursor、Codex 等 Coding Agent 修改 PBWork 代码资产；Workbench 用于浏览、检查、采集和 Review，不是独立可视化编辑器，也不维护另一套作者协议。

## 两个界面

| 界面 | 面向对象 | 职责 |
| --- | --- | --- |
| Workbench | 原型作者、设计者、开发者 | Design Foundation、组件 Playground、原型画布、Inspector、Deliver Flow、任务中心和 Evidence Review |
| Runtime | Core Capture、Playwright、Workbench iframe | 确定性渲染 Screen/Variant，暴露 authored manifest、语义快照和 Scenario 执行能力 |

Workbench 路由位于 `/workbench/*`。Runtime 路由位于 `/prototype/:prototypeId/:screenSlug`，业务状态通过受约束 query 表达。画布设备、缩放和工作壳偏好不得进入 Runtime URL。

## 原型阶段

制作原型时：

1. 从 PBWork Design Foundation 选择语义 Token；
2. 从基础和复杂组件中选择对口组件；
3. 按 PBWork 组合、导航和手势规范组装 Screen；
4. 在 Registry 声明 Screen、Variant、Action、Scenario 和 required boundary；
5. 使用 Inspector 核对稳定 `data-pb-*` 身份；
6. 运行 PBWork unit/typecheck 与 Runtime 浏览器测试。

DS 业务实例必须传稳定 `inspectId`。业务局部证据节点必须显式提供 id、role 和实现所需 `data-pb-token-*`；CSS Token 本身不能替代 Token Evidence。完整规则见[语义标记与证据门禁](../reference/semantic-authoring.md)。

工作壳组件与原型组件严格隔离：`src/workbench/ui` 服务 Workbench，`src/design-system/components` 服务 Runtime。工作壳不能复用携带原型采集语义的组件。

## 交付阶段

「交付到 Agent」（Deliver FlowSheet）把选择转换为 `SelectionDraft`，并在同一张 Sheet 内完成：

1. 确认范围（可自动 Preflight）；
2. 执行采集（进度留在 Sheet 内）；
3. 结果摘要与风险提醒；
4. 创建 Handoff，渲染并可复制 Agent 提示词，同时写入 `.proto-bridge/deliveries/`。

PBWork 展示 Core 返回的：

- 规范化 Selection；
- Preflight ready/blocked；
- warning 和接受状态；
- Case Matrix（界面文案为「将采集 N 项」）；
- 运行中的 Job；
- Run、Snapshot、Coverage、Issue 和 Handoff。

任务中心保留后台历史与恢复；「采集结果」页用于按需 Review 详情。术语对照见 [词汇表](../reference/vocabulary.md#gui-对照)。

PBWork 可以重组显示顺序，但不能改写 Store JSON、隐藏风险、发明状态词汇或重新计算 active 引用。

## Review 阶段

Review 先回答 Evidence 是否足够，而不是页面“看起来是否差不多”：

- required Fragment 是否全部 resolved；
- 语义 Snapshot 和 Screenshot 是否属于同一 Case；
- active revision 是否来自成功 Attempt；
- unknown / conflict / Issue 是否可解释；
- Handoff 风险是否已进入 Agent 提示词。

## Agent 消费

交付产物（`agent-prompt.md`）是 Store 索引；Agent 通过 MCP 按固定 Handoff / Snapshot 读取 Evidence。顺序见 [Agent 消费指南](./agent-consumption.md)。

## 边界

- Workbench 不直接访问 Store 或 Playwright；经 Local Service。
- Runtime 不依赖 Workbench 全局状态。
- CLI `deliver` 与 GUI 交付写入同一套 deliveries 约定。
