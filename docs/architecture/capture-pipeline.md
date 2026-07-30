# 采集链路

Capture Pipeline 把 authored Runtime Contract 转换为不可变 Evidence。PBWork 和 CLI 进入同一 Pipeline。

## 1. Runtime Manifest

Runtime `describe` 返回：

- protocol version 与 input version；
- capabilities；
- Prototype 和 Screen；
- Variant、critical 标记和 required Fragments；
- Action；
- Scenario、Action sequence 和 Checkpoint。

Core 使用浏览器安全 Schema 校验响应。缺字段、未知引用、重复身份或不受支持的协议会阻止 Preflight。

## 2. Selection Draft

Draft 表达用户意图，不表达执行结果。Core 对输入归一化并拒绝：

- 未知 Screen/Variant/Scenario；
- 非稳定 Fragment；
- 互相冲突的维度；
- 空或越界 Scope；
- 超过容量的组合；
- 未逐项接受的 warning。

## 3. Preflight

Preflight 固定 manifest/input version、规范化 Selection、warning、risk 和 Case Matrix。Preflight 有有效期；Runtime 输入变化或过期后必须重新执行。

Matrix 展开顺序必须稳定。Case ID 与 Scope key 在 PBWork 和 CLI 间一致，不能包含数组位置或生成时间。

## 4. 浏览器隔离

Playwright Driver 为每个 Case 建立隔离上下文，固定：

- Runtime URL；
- viewport 与 device scale factor；
- theme；
- Variant；
- fixture；
- Scenario；
- Screenshot 参数。

网络、console、page errors 和 failed requests 进入 diagnostics。Case 间不能共享会改变结果的页面状态。

## 5. Prepare 与 Readiness

`prepare` 导航到精确 Screen/Variant/Theme/Fixture，并保存 reset baseline。Runtime 必须返回实际 dimensions；任一维度不匹配都失败。

`readiness` 只在页面完成状态准备、语义标记稳定且 required Fragment 可解析时成功。Core 会重复观察稳定签名，防止把中间渲染状态当成最终页面。

## 6. Semantic Snapshot

Runtime 读取 `[data-pb-role][data-pb-id]` 节点：

- 验证 role；
- 构造 `screenId + pbId + optional pbKey`；
- 重复 `pbId` 要求每个实例都有稳定 `pbKey`；
- 验证 required Fragment 唯一、可见并具有非零 bbox；
- 提取文本、状态、可访问性和几何事实；
- 保留实际 DOM 观测来源。

Semantic snapshot 与 Screenshot 必须在同一固定 Case 中采集。

## 7. Scenario

Scenario 从 declared initial Variant 开始，按稳定 Action ID 执行。每个 Action：

- 指向稳定 Fragment target；
- 具有受支持的 kind；
- 执行后验证实际 Screen/Variant；
- 在 Checkpoint 重新检查 required boundary。

导致 document 卸载且无法维持协议连续性的导航必须报告 unsupported，不能假装完成。

## 8. Attempt 与 Revision

Case 执行总会形成 Attempt。只有通过 Schema、完整性和激活规则的结果才能形成可激活 Evidence revision。

常见非成功结果：

- Runtime 不可达或协议不匹配；
- required Fragment 缺失、重复或不可见；
- 页面 dimensions 与 Case 不一致；
- Action/Checkpoint 失败；
- Screenshot/Blob 写入失败；
- 用户取消；
- Store 容量或 writer lock 阻塞。

## 9. Run 与 Snapshot Commit

所有 Case 终结后，Core 构建 Run、Coverage、Issue、revision 和 Snapshot。Store 先写不可变对象，再原子更新 active pointer。

提交失败时：

- Job 为 failed；
- 一致性 Issue 保留；
- 不能返回成功 Snapshot；
- 旧 active pointer 不变。

## 10. Handoff

Handoff 创建前评估：

- Coverage 是否覆盖实现范围；
- active Evidence 是否 stale；
- required unknown/conflict；
- Evidence Level；
- 是否存在手工提升或接受风险。

所有 mandatory risks 固定进入 Handoff。Consumer 读取顺序见 [Agent 消费指南](../guides/agent-consumption.md)。

