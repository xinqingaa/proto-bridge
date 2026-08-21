# PBWork 与 ProtoBridge 协作

PBWork 是 ProtoBridge 的 GUI，但不是 Core 的替代实现。它把人的选择和 Review 操作映射到 Core Contract，并通过 instrumented Runtime 提供高质量 Evidence。

原型作者、设计师和产品人员都通过 Cursor、Codex 等 Coding Agent 修改 PBWork 代码资产；Workbench 用于浏览、检查、采集和 Review，不是独立可视化编辑器，也不维护另一套作者协议。

## 两个界面

| 界面      | 面向对象                                   | 职责                                                                                              |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Workbench | 原型作者、设计者、开发者                   | Design Foundation、组件 Playground、原型画布、Inspector、生命周期流转、定稿采集和 Evidence Review |
| Runtime   | Core Capture、Playwright、Workbench iframe | 确定性渲染 Screen/Variant，暴露 authored manifest、语义快照和 Scenario 执行能力                   |

Workbench 路由位于 `/workbench/*`。Runtime 路由位于 `/prototype/:prototypeId/:screenSlug`，业务状态通过受约束 query 表达。画布设备、缩放和工作壳偏好不得进入 Runtime URL。

## 原型阶段

制作原型时：

1. 按[原型设计工作流](../pbwork/prototypes/design-workflow.md)完成产品设计、视觉探索、确认和 Promotion Gate；
2. 从 PBWork Design Foundation 选择语义 Token；
3. 从基础和复杂组件中选择对口组件；
4. 按 PBWork 组合、导航和手势规范组装 Screen；
5. 在 Registry 声明 Screen、Variant、Action、Scenario 和 required boundary；
6. 使用 Inspector 核对稳定 `data-pb-*` 身份；
7. 运行 PBWork unit/typecheck 与 Runtime 浏览器测试。

独立探索路由不属于 Runtime，不进入 Selection、Capture 或 Evidence Review。只有翻译到获批设计和正式 Authoring Contract 的结果才能交付。

DS 业务实例必须传稳定 `inspectId`。业务局部证据节点必须显式提供 id、role 和实现所需 `data-pb-token-*`；CSS Token 本身不能替代 Token Evidence。完整规则见[语义标记与证据门禁](../reference/semantic-authoring.md)。

工作壳组件与原型组件严格隔离：`src/workbench/ui` 服务 Workbench，`src/design-system/components` 服务 Runtime。工作壳不能复用携带原型采集语义的组件。

## 交付阶段

PBWork 的正式交付由“待确定 → 已定稿”生命周期动作触发。生命周期记录和操作阶段由 PBWork 的 `prototypeLifecycle` Pinia Store 写入 localStorage；动作自动把整个原型转换为 `SelectionDraft`，并连续完成：

1. 整原型 Preflight；
2. 用户逐项确认现有 warning，并确认候选方案已经收敛；
3. 执行整原型采集；
4. 用户逐项确认现有 mandatory risk；
5. 自动创建 Handoff 和唯一 Agent 提示词，同时写入 `.proto-bridge/deliveries/`；
6. 只有全部成功后才把本地生命周期提交为“已定稿”，并保存该次 Job/Bundle/Snapshot/Handoff/Delivery 引用。

PBWork 不显示范围选择、页面采集、控件采集、重新采集或提示词生成/重生成按钮。已定稿和已归档只读取生命周期记录绑定的 Evidence 与提示词；刷新后按 `deliveryId` 回读已存在的 Agent prompt。已定稿若需修改，先清理该次定稿绑定的 Bundle 和正式产物引用，再回退到待确定；已归档永久只读。

CLI 不受 PBWork 生命周期约束，继续支持 `deliver --prototype <id>`、`--screen <id|slug>`、`--only-variant <id>`、`--only-scenario <id>` 和 `--selection`。这些入口会发出非正式采集警告：交互终端确认 `y` / `yes`，非 TTY / `--json` 需要 `--acknowledge-unofficial-capture`。CLI 产生的 Bundle 不改变 PBWork 生命周期，也不会自动出现在“定稿采集”页。默认目标路径来自 Workspace `delivery.targetRoot`，`--target` 只覆盖单次命令。

PBWork 展示 Core 返回的：

- 规范化 Selection；
- Preflight ready/blocked；
- warning 和接受状态；
- Case Matrix（界面文案为「将采集 N 项」）；
- 运行中的 Job；
- Run、Snapshot、Coverage、Issue 和 Handoff。

任务中心保留后台任务状态与恢复；「定稿采集」页只列出生命周期 Store 已绑定的已定稿/已归档产物，并用于只读 Review 详情。术语对照见 [词汇表](../reference/vocabulary.md#gui-对照)。

PBWork 可以重组显示顺序，但不能改写 Store JSON、隐藏风险、发明状态词汇或重新计算 active 引用。

## Review 阶段

Review 先回答 Evidence 是否足够，而不是页面“看起来是否差不多”：

- required Fragment 是否全部 resolved；
- 语义 Snapshot 和 Screenshot 是否属于同一 Case；
- active revision 是否来自成功 Attempt；
- unknown / conflict / Issue 是否可解释；
- Handoff 风险是否已进入 Agent 提示词。

## Agent 消费

交付产物（`agent-prompt.md`）是 Store 索引，不嵌入完整 Evidence Brief/Review Contract；Agent 通过 MCP 按固定 Handoff / Snapshot 渐进读取。助手怎么读、怎样算过关见 [Agent 消费指南](./agent-consumption.md)。

## 边界

- Workbench 不直接访问 Store 或 Playwright；经 Local Service。
- Runtime 不依赖 Workbench 全局状态。
- CLI `deliver` 与 GUI 定稿写入同一套 deliveries 约定；CLI 不改变生命周期。
- Workspace `delivery.targetRoot` 是提示词和 MCP Target 扫描的默认路径，不是 Evidence。
