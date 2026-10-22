# 一刻交付整改范围

更新日期：2026-10-22。当前任务收敛为采集修复与 PBWork 原型源文档补全；已完成的采集修复保留。

## 当前出口

采集修复由 [DS 资产采集范围](../../../../../../docs/roadmap/asset-reference-capture.md) 维护：正常 Capture 不独立归档 DS 原文件，保留页面实际加载检查、资源使用信息和固定截图，在临时 Store 验证首 Bundle、Snapshot 与 Handoff。

产品文档先在本原型 docs 源目录补充完整：[product.md](product.md) 定义范围与页面职责；[logic-and-interactions.md](logic-and-interactions.md) 描述数据流、状态机和保存恢复；[ui-design.md](ui-design.md) 描述结构、主题、资源与动效；[known-gaps.md](known-gaps.md) 区分现状偏差、待决和未验证事项。后续由创建/生成与同步流程将对应文档复制到独立 yike/docs，目标工程读取本地副本，不通过 MCP 获取文档。自动复制后续实现，当前可由用户手动复制；现有 yike 文档及 design.md 不动。

## 保留的已知问题

| 问题 | 状态与处理 |
| --- | --- |
| 设置项驼峰 key | 已有 Core 修复，保留回归 |
| 表盘说明 typography.micro 的主题一致性 | 已修复，保留三主题检查 |
| createHabit/updateHabit 保存失败后仍报告成功 | 业务缺陷，记录在本目录 known-gaps；本轮不修改模型与编辑流程 |
| 运行计时不逐秒保存 | 写明实际保存时点及未保存进度损失；提高恢复精度未决定 |
| 独立 Target 与模板 Target 区分 | 交付时继续核对 launcher 与目标根目录，不复制 Evidence Store |
| Flutter 业务页面及业务存储 | 当前未实现；按工程 Riverpod、存储、路由边界后续实施 |
| 正常动效过程与视觉 | 文档表达意图，尚无正式过程采样或 Flutter 还原验收 |

## 原计划的处理

旧 A/B/C/D 中的文档 Catalog、Screen 章节登记、动效片段与 MCP 读取均不进入本轮。产品规则在本原型源目录维护，交付后读取 Target 本地副本；动效采样平台延期，详见 [平台范围收敛](../../../../../../docs/roadmap/evidence-delivery-upgrade.md)。本批不改变一刻业务规则，不实现 Flutter 业务页面，也不改历史 Evidence 或生命周期状态。

完成报告须区分已执行回归、静态文档整理、未修业务缺陷与未验证的视觉/动效，不能用静态采集通过宣称正常动效已还原。
