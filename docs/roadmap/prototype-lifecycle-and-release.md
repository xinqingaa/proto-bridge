# PBWork 原型生命周期设计包

状态：Planned（设计待用户确认）

全局优先级：P2

日期：2026-08-19

目标投入：本设计不估算工期；确认后按 Contract、Store、Service、PBWork 和验证依赖拆分实施

## 文档定位

本文件只作为计划入口，不重复产品与架构细节：

- [原型生命周期产品设计](./prototype-lifecycle-product-design.md)：四阶段职责、版本、自动 Evidence/Prompt、不可修改和 Component/Token 产品边界；
- [原型生命周期架构设计](./prototype-lifecycle-architecture.md)：Store 对象、指纹、Staleness、唯一 Prompt、Release 事务和 Archive 门禁。

两份设计当前均为 Proposed。用户确认前不实施代码，也不把其中规则写成现行 Product、Architecture 或 Reference Contract。

## 当前基线

- PBWork lifecycle 是 Registry 加 localStorage override，不是 Store 事实；
- 当前允许从页面、控件、自定义范围或整个 Prototype 手工发起 Capture；
- Deliver Flow 会手工创建 Handoff 和可重复/可覆盖的 delivery Prompt；
- Run、revision、Snapshot、Catalog 和 Handoff 已不可变，但尚无 Review Package 或 Prototype Release；
- Store 已有 Bundle、Snapshot、Staleness 和 archive 基础，尚未把 source、Prompt 和 lifecycle 绑定为一个固定包。

## 待确认主线

```text
进行中
  -> 进入确认时自动采集整个 Prototype
  -> 自动固定 Handoff 和唯一 target-neutral Prompt
确认中
  -> fresh/complete/decision/source checks
已定稿
  -> immutable vN
  -> 创建下一版或永久归档
已归档
  -> lineage 永久只读
```

主线包括：

- 删除 PBWork 全部人工新建/更新/重新采集入口；
- 删除 Prompt 生成、重新生成、覆盖和“新建交付版本”入口；
- Core/Store 拥有四阶段 lifecycle、Review Package、Release、fingerprint 和 archive 语义；
- 自动 whole-Prototype Capture 固定全部正式 Screen、Variant、Scenario/Checkpoint 和 Catalog；
- Component/Token 固定为 Prototype Release dependency，但不增加独立生命周期；
- 旧 Evidence/Prompt 历史只读，相对当前源码可以 stale；
- vN 只在确认中成功晋级已定稿时产生。

## 探索项

- 独立 Design System Release；
- 多 Theme/Device Release Profile；
- dirty worktree source artifact；
- archived lineage fork 的产品入口；
- Release comparison 的持久缓存；
- 远程协作、审批人身份和 RBAC。

探索项不阻塞主线，也不得提前进入当前 Contract。

## 依赖

- 依赖现有 Capture Protocol、CaptureJobHost、immutable Store、Staleness、Handoff 和 MCP progressive consumption；
- 不依赖 Flutter MCP 或 Target Runtime Review；
- 需要调整现行 Warning/Handoff 风险门禁，使 Evidence/Handoff/Prompt 可自动固定，Finalization Decision 独立保存；
- 需要把 Prompt 从 targetRoot-bound delivery 文件提升为 Store 内唯一、target-neutral Artifact。

## 用户确认后的实施边界

```text
Core Contract / fingerprint
  -> Store object / atomic lifecycle transaction
  -> automatic Capture + Handoff + Prompt orchestrator
  -> Local Service
  -> PBWork lifecycle UI and manual-entry cleanup
  -> MCP Release read model
  -> migration / gates / E2E / current docs
```

实现期间不得让 PBWork、CLI 或 Local Service 复制 Core lifecycle、version、fingerprint、staleness 或 Prompt uniqueness 算法。

## 退出标准

- 四阶段职责和允许操作与产品设计一致；
- `active -> review` 无第二次点击即可产生完整 Review Package；
- 一个 Review Package 恰好一个 Snapshot、Handoff 和 Prompt；
- Prompt 只能读取、复制或导出相同 bytes，不能重新生成或覆盖；
- source/Runtime/Selection/Catalog/DS 变化可确定性使当前 Package stale；
- v1/v2 只来自成功、原子的 Release transaction；
- final 必须先创建下一版才能修改；
- archived lineage 的 Store 生产写入和 Prototype 自有源码漂移均被阻止；
- Component/Token Catalog 和 Fingerprint 可由 Release 固定并按需消费；
- 旧 Bundle/Handoff/Delivery 保持历史可读但不补造 Release；
- Schema、实现、测试和现行权威文档在交付时同步通过完整验证。

## 范围缩减顺序

如需收缩首期范围，依次延后：

1. Release comparison 持久缓存，改为固定 refs 即时计算；
2. MCP 完整 Release history，只保留 Release 到 Handoff 的固定读取；
3. 丰富的版本差异 UI，只保留版本列表与基础摘要；
4. 多 Theme/Device Profile，只保留一个固定 Release Profile；
5. archived fork，只保留永久只读。

不得缩减：自动 whole-Prototype Capture、唯一 Prompt、Review Package 指纹、Staleness、Release 原子性、final/archived 不可修改和 Component/Token 固定依赖。
