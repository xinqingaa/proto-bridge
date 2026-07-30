# 从 V1 到 Evidence 架构

本文记录 ProtoBridge 从页面实现规划工具转向 Evidence 基础设施的背景。它用于解释架构取舍，不是当前产品的使用指南。

## V1 的历史职责

V1 试图把四类输入汇总成页面级上下文：

- Vue 原型源码；
- 浏览器 Runtime 与截图；
- 目标 Flutter 工程扫描；
- 用户配置和人工修订。

处理链路为：

```text
source / URL / screenshot / target repository
  → page-canonical.json
  → ui-build-plan.json
  → ui-build-review.md
  → Agent implementation and validation
```

`page-canonical.json` 聚合页面事实，`ui-build-plan.json` 尝试给出目标工程实现蓝图，`ui-build-review.md` 为人类和 Agent 提供自然语言投影。CLI `generate` 负责生产产物，MCP 以页面为中心重建上下文并提供 Target 工具。

## V1 的贡献

V1 建立了后续架构仍然需要的基础认识：

- 原型源码、Runtime、Screenshot 和 Target 是不同来源；
- Fact 需要 provenance；
- 低置信名称和路径相似度不能直接成为目标路由或组件结论；
- Target 约定应从真实仓库读取；
- CLI、MCP 和 Agent 可以组成完整产品闭环；
- PBWork 需要稳定 Screen、Variant、Token 和组件身份。

这些原则没有被丢弃，而是从页面计划模型中拆出并加强。

## 结构性问题

### 页面聚合过早

Page Canonical 把多个来源聚合为一个页面对象，但不同来源的完整性和生命周期不同。Runtime 变化、Target 变化和人工修订会让“页面当前真相”难以固定。

### Planner 必须填满输出

Build Plan 需要给出文件、组件、路由、状态和 Token 建议。Evidence 缺失时，Planner 仍需要产出结构完整的结果，于是 unknown 容易转化为推断或 advisory guidance。

继续增强 Planner 会让 PB 越来越像目标工程代码生成器，却不能证明推导所需的原型证据是否完整。

### 完整性无法证明

采集器可以看到 DOM 和截图，但不知道页面的关键区域是否全部出现，也不知道某个交互状态是否已经准备完成。缺少 authored required boundary 时，“抓到了内容”不等于“抓完整了页面”。

### 运行和消费引用不稳定

页面产物通常强调最终文件，而没有充分区分稳定 Case、单次 Attempt、active 成功结果、失败重试和某次 Review 使用的固定 Snapshot。后续生成可能改变 Agent 实际读取的上下文。

### Source、Runtime 与 Target 耦合

Source Adapter、Runtime Capture 和 Target Planner 同处一条生成链，使目标工程事实可能反向影响原型事实，也让支持新框架需要改变中心模型。

### 入口语义容易分叉

CLI、MCP 和 GUI 如果各自维护页面重建、状态和引用规则，会逐步形成多套“当前页面”和错误恢复逻辑。

## 架构转向

新的中心问题不再是“PB 能否生成更完整的 Flutter 计划”，而是：

> PB 能否生产一份完整性边界明确、来源可追溯、历史不可变、可以固定交给 Agent 的原型 Evidence？

由此形成五项核心决策：

1. Evidence 是产品输出，Agent 决定目标实现。
2. 原型作者通过 Runtime Contract 声明完整性。
3. Run、revision、Snapshot 和 Handoff 不可变。
4. active successful Evidence 与 latest Attempt 分离。
5. Producer、Consumer 和 Target 单向隔离。

## 职责变化

| 历史职责 | Evidence 架构中的归属 |
| --- | --- |
| 页面聚合产物 | Case Evidence revision + Snapshot |
| 实现蓝图 | 由 Agent 结合 Evidence 与 Target 上下文决定 |
| Source 推断页面完整性 | Authored Runtime required boundary |
| CLI generate | Selection/Preflight/Capture/Bundle/Handoff 命令 |
| 页面重建 MCP | 固定 Evidence Reader |
| Target Planner | 独立 Target query/validation |
| 最终 output 文件 | 不可变 Store 对象和逻辑引用 |

PageCanonical、Artifact writer、Planner、Vue Source Adapter、CLI `generate` 和页面型 MCP 工具没有进入当前产品。Target 查询和验证作为独立能力保留。

## `/v2` 的含义

迁移期间使用 V2 区分新的持久对象和协议。迁移完成后，产品入口只剩 Evidence 工作流，但以下名称继续存在：

- `packages/core/src/v2`
- `@proto-bridge/core/v2`
- Runtime/Service 协议中的 major version
- `schemaVersion: 2`

它们是 Schema 与协议的稳定 major namespace，用于未来兼容性判断，不表示仓库同时提供两套产品。

## 设计资料的归宿

迁移计划中的长期知识已经分别沉淀到：

- [产品总览](../product/overview.md)
- [Evidence 模型](../architecture/evidence-model.md)
- [采集链路](../architecture/capture-pipeline.md)
- [原型 Authoring Contract](../reference/prototype-authoring.md)
- [架构决策](../decisions/README.md)

阶段完成记录和已删除代码的操作说明只保留在 Git 历史中。

