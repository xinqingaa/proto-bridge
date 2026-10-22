# 平台升级记录

平台规划面向所有原型，不包含具体业务原型的设计、制作排期或验收进度。

目前保留[PBWork 与 PB 平台关键升级](../history/pbwork-platform-upgrade.md)，记录当时确定并完成的六项投入：

1. 采集可靠性收口。
2. 原型主题包。
3. 采集质量与固定取值。
4. 制作工具与共享运行能力。
5. DS 通用组件。
6. 设计基础与组件预览工作流。

上述升级已完成。现行规则查 Product、Architecture、Reference 和 PBWork 手册；新平台提案不以某个业务原型的制作进度作为平台完成状态。

## 当前收敛范围

- [DS 资产引用与页面采集优化](./asset-reference-capture.md)：当前只解除正常采集的重复归档依赖、补充代表资源使用信息并验证历史兼容；通用资源 resolver 等扩展延期。
- [产品文档与动效交付范围](./evidence-delivery-upgrade.md)：产品文档改为 Target 本地职责文档，MCP 文档快照取消，真实动效平台延期，生成脚本复制后续实现。

业务原型的计划与进度仅在各自 `prototypes/{prototypeId}/docs/` 维护，本目录不维护其入口或排期。
