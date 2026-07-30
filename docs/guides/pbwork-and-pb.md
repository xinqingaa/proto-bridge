# PBWork 与 ProtoBridge 协作

PBWork 是 ProtoBridge 的 GUI，但不是 Core 的替代实现。它把人的选择和 Review 操作映射到 Core Contract，并通过 instrumented Runtime 提供高质量 Evidence。

## 两个界面

| 界面 | 面向对象 | 职责 |
| --- | --- | --- |
| Workbench | 原型作者、设计者、开发者 | Design Foundation、组件 Playground、原型画布、Inspector、Capture Console、任务中心和 Evidence Review |
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

工作壳组件与原型组件严格隔离：`src/workbench/ui` 服务 Workbench，`src/design-system/components` 服务 Runtime。工作壳不能复用携带原型采集语义的组件。

## 采集阶段

Capture Composer 把选择转换为 `SelectionDraft`。打开 Composer 可以自动执行范围检查，但启动采集必须由用户确认。

PBWork 展示 Core 返回的：

- 规范化 Selection；
- Preflight ready/blocked；
- warning 和接受状态；
- Case Matrix；
- 运行中的 Job 和 Case；
- Run、Snapshot、Coverage、Issue 和 Handoff。

PBWork 可以重组显示顺序，但不能改写 Store JSON、隐藏风险、发明状态词汇或重新计算 active 引用。

## Review 阶段

Review 先回答 Evidence 是否足够，而不是页面“看起来是否差不多”：

- required Fragment 是否全部 resolved；
- 语义 Snapshot 和 Screenshot 是否属于同一 Case；
- active revision 是否来自成功 Attempt；
- 是否存在 required unknown 或 unresolved conflict；
- Snapshot 是否 stale；
- Handoff 是否覆盖实际实现范围。

如果证据不足，应修改原型 Contract、状态准备或语义标记并重采。手工确认风险不会提升 Evidence Level，也不会把未知事实变为已知。

## CLI 的关系

CLI 和 PBWork 是两个 Producer 入口：

- PBWork 适合交互选择、视觉检查和结果 Review；
- CLI 适合可重复自动化、批量操作和 CI；
- 两者共用 Selection、Preflight、Matrix、Capture、Store 和 Handoff；
- 同一输入必须得到相同 Case identity 和状态语义。

## MCP 的关系

MCP 是 Consumer，不创建 Capture Job。PBWork 或 CLI 先生成 Handoff，Agent 再通过 MCP 读取固定 Evidence。PBWork 不把 Handoff 自动发送给某个 Agent，也不假设 Agent 的目标工程布局。

原型制作细节见 [PBWork 原型生产者手册](../pbwork/README.md)，采集实现见 [采集链路](../architecture/capture-pipeline.md)。

