# {{displayName}} 文档

产品文档描述应用应有的行为；[已知缺口](known-gaps.md) 记录 Target 的当前实现状态和待决事项。项目介绍与运行方式见 [根 README](../README.md)。

## 产品与体验

| 文档 | 职责 |
| --- | --- |
| [产品说明](product.md) | 定位、范围、页面职责与使用路径 |
| [逻辑与交互](logic-and-interactions.md) | 业务对象、数据流转、状态与保存恢复 |
| [UI 与动效](ui-design.md) | 构图、滚动、视觉与动效要求 |

## 工程规范

| 文档 | 职责 |
| --- | --- |
| [工程架构](architecture.md) | 分层、状态管理、存储与目录边界 |
| [组件](components.md) | 公共组件与共享弹层 |
| [Theme 与 Token](theme.md) | 主题模型、语义取值与适配 |
| [静态资源](assets.md) | 资源来源、目录和同步清单 |
| [路由](routing.md) | 注册、参数与启动 |
| [测试](testing.md) | 原生检查、场景与移动视觉验证 |
| [ProtoBridge 适配](proto-bridge.md) | 组件、Token 映射与同步 |

## 协作、来源与状态

- [协作与工作流](workflow.md)：阅读顺序、授权、任务 Skill 和交付要求。
- [工程工具](tooling.md)：MCP 连接、交付目标绑定与项目内命令。
- [已知缺口](known-gaps.md)：Target 当前缺口，历史评审按需保存在 `reviews/`。
- [原型文档来源](prototype-source.md)：导入范围、版本与后续维护边界。
{{prototypeLinks}}
