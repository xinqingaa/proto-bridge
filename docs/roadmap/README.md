# 平台规划与升级记录

平台规划面向所有原型，不包含具体业务原型的设计、制作排期或验收进度。

## 调研与待定方案

| 提案 | 状态 | 目标 |
| --- | --- | --- |
| [设计变更、按需采集与 Target 增量更新](./incremental-design-delivery.md) | 调研中，方案待敲定 | 串起影响分析、正式局部交付、Flutter 局部实施和回归；优先厘清证据激活与版本边界 |

本目录的提案不代表现行 Contract 或已经可用的操作流程。实施前继续细化关键问题、范围和退出标准。

## 已完成升级

[PBWork 与 PB 平台关键升级](../history/pbwork-platform-upgrade.md)记录当时确定并完成的六项投入：

1. 采集可靠性收口。
2. 原型主题包。
3. 采集质量与固定取值。
4. 制作工具与共享运行能力。
5. DS 通用组件。
6. 设计基础与组件预览工作流。

上述升级已完成。现行规则查 Product、Architecture、Reference 和 PBWork 手册；新平台提案不以某个业务原型的制作进度作为平台完成状态。

## 当前行为

采集与资源交付的现行行为分别见[采集链路](../architecture/capture-pipeline.md)、[Evidence 模型](../architecture/evidence-model.md)和[主题包解析](../architecture/theme-packs.md)。已落地能力归入对应职责文档，本目录保留尚未实施的平台提案和已完成升级的归档入口，不维护业务原型进度。
