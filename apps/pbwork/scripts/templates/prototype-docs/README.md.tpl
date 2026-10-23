# {{prototypeId}} 文档

本目录区分产品要求、批准入口、原型实施和原型缺口。技术骨架不代表业务或视觉设计批准。

| 文档 | 职责 |
| --- | --- |
| [设计基线](design.md) | 需求采访、批准状态与设计决策入口 |
| [产品说明](product.md) | 定位、受众、范围、页面职责和使用路径 |
| [逻辑与交互](logic-and-interactions.md) | 业务对象、状态机、保存恢复与动作结果 |
| [UI 与动效](ui-design.md) | 页面构图、滚动、视觉与动效要求 |
| [实施](implementation.md) | Promotion Mapping、工程决策和体验检查结果 |
| [原型缺口](known-gaps.md) | 原型当前偏差与未验证边界 |

产品规则只在所属文档完整定义，`design.md` 链接到具体要求，不维护第二份正文。批准仍按设计工作流完成。

`target-docs.json` 声明 Flutter 初始化要带走的文件与目标路径；产品、逻辑和 UI 文档进入 Target 的 docs，设计基线和原型缺口进入 `docs/prototype/`。实施记录不自动导出，Target 的当前实现状态由 Target 自己维护。
