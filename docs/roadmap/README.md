# ProtoBridge 路线图

> 本目录只记录尚未实施的计划性演进、投入与退出标准，不代表当前行为或现行 Contract。现行行为以 `docs/product`、`docs/architecture`、`docs/reference`、PBWork 手册和代码为准。
>
> 核实日期：2026-10-16。此前的产品收口计划已整体移除：其已交付部分已经体现在现行文档与代码中，未交付部分由下列计划重新定义或列为未排期。

## 在执行的计划

| 顺序 | 计划 | 状态 | 前置条件 | 完成定义 |
| --- | --- | --- | --- | --- |
| 1 | [PBWork 与 PB 平台升级](./pbwork-platform-upgrade.md) | 已暂停（W0/W1 待验收，W2 进行到 S1 完成、S2 主体落地、S3 完成，改动在 `dev/platform`） | 无 | 该计划的「总退出标准」全部满足 |
| 2 | [「一刻」原型](./yike-prototype.md) | 未开始 | 计划一达到总退出标准 | 该计划的「验收信号」全部满足，并完成正式定稿 |

```mermaid
flowchart LR
  Plan1["计划一 平台升级"] -->|"总退出标准满足后"| Plan2["计划二 一刻原型"]
```

两份计划可以在不同对话中分别执行。计划二默认使用计划一交付的主题包、新写法和 DS 组件；如果计划一的某个工作流被缩减，必须先在计划二的「前置条件」中记录替代做法，不能让计划二绕过平台约束。

## 未排期议题

以下议题目前不进入任何计划，只记录重新排期的条件。

| 议题 | 重新排期条件 |
| --- | --- |
| npm 分发与许可证 | 平台升级完成且有外部采用需求后单独立项；先决定许可证与 Local Service 随 CLI 的打包方式，不把 PBWork 发布成 CLI 包。分发取舍见 [ADR 0011](../decisions/0011-producer-git-and-npm-tooling.md)。 |
| 第二道计划批准的可审计性 | 用一次真实 Handoff 画出计划版本、批准、范围变更与实施时序后，再评审独立的 Consumer Session 或 receipt；批准事实不写回 Source Evidence。 |
| Target 五维人机复查面 | 先用真实 Handoff 做一次与 Target 技术栈无关的人工 Review 试评；Target 事实保持在独立 sidecar。 |
| 官方 Flutter MCP Runtime Review | 满足 [ADR 0010](../decisions/0010-flutter-mcp-remains-experimental.md) 的实验边界，并通过[历史实验记录](../history/flutter-mcp-experiment-2026-08.md)中的 go/no-go 条件后再讨论。 |
| 多手机设备正式采集 | Core 目前只注册 `iphone-14`。有原型证明窄屏或大屏存在独有缺陷后再立项；主题维度不在此列，见平台升级计划 W3。 |
| Evidence Review 信息层级、窄屏查看与首次 setup | 平台升级后用真实采集结果重新评估是否仍是主要阻力，再决定是否立项。 |

## 维护规则

- 每份计划自带进度表；实施一项就更新该项的状态与证据，证据写可复核的命令、测试名或固定 ID。
- 落地的能力同步写入权威文档（Product、Architecture、Reference、PBWork 手册、Skill、Schema 和测试），计划文档不替代它们。
- 计划全部完成后，从本目录移除；需要保留的设计理由写入 `docs/decisions`，迁移过程写入 `docs/history`。
