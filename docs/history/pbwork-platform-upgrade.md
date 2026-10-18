# PBWork 与 PB 平台关键升级

> 制定于 2026-10-16，完成于 2026-10-18（用户确认）。本文保留当时确定的关键平台投入与边界，不作为待执行计划。具体行为、API 和 Schema 以权威文档和代码为准。

## 目标与边界

升级面向所有业务原型，解决制作重复、采集失败路径不可靠、原型缺少独立视觉表达三个平台问题。平台提供通用能力，不承载具体原型的产品定义、主题取值、业务组件或制作排期。

- Core 负责 Contract、状态、引用、主题身份、校验与 Evidence 语义；Workbench、CLI、MCP、Local Service 只适配。
- Evidence 节点记录 Token 键，主题包及完整解析表固定取值；Target 查询与 Capture 隔离。
- 共享导航、存储、主题偏好、滚动和 Overlay 机制；业务原型不复制这些机制。
- DS 是基础而非外观上限；公开变体不足时允许原型自有组件，仍遵守 Token、Flex 与显式 Evidence 约束。
- 本轮不处理字体文件、交付端视觉还原、组件层 Token 全量发布、多手机正式采集或 npm 分发。

## 第 1 步 采集可靠性收口

**关键投入：** 截图等失败如实记录；逐 Case staging 与崩溃恢复；Workspace 单飞队列；Issue 按内容摘要固定 Fact 引用；服务入口统一读取配置；补齐 pending claim 和提示模板验证。

**验收要求：** 失败不能伪装 captured；重复对账不重复生成无意义产物；完整定稿的 Job、Bundle、Snapshot、Handoff 与 Delivery 引用一致，固定引用可通过 MCP 回读。

权威说明：[采集管线](../architecture/capture-pipeline.md)、[采集可靠性决策](../decisions/0013-capture-reliability.md)。

## 第 2 步 原型主题包

**关键投入：** 分离键目录、包私有 Primitive、语义/组件取值与实现常量；一个包可含多套主题及浅深模式，原型通过 Registry 绑定包；Core 统一解析继承、引用、类型、资产、摘要和对比度。

保留间距刻度名，组件层仅发布有依据的性格键；字族固定系统字体栈。Runtime 的 CSS、Vuetify 和响应式 Token reader 消费同一解析表，Workbench 外壳主题独立。

**验收要求：** 全组合可解析；基础包完整；非法引用和未豁免对比度失败可阻断；既有回归原型等价迁移；真实主题绑定与偏好隔离。

权威说明：[主题包模型](../architecture/theme-packs.md)、[Theme 手册](../../apps/pbwork/docs/tokens/themes.md)、[ADR 0014](../decisions/0014-prototype-theme-packs.md)。

## 第 3 步 采集质量

**关键投入：** Runtime 协议固定主题包、摘要、解析表与声明时钟；主题一致性探针验证各主题/模式的语义结构；Handoff 固定 theme-pack Catalog，MCP 只读固定修订。

**验收要求：** 主题值变化使已有 Evidence 过期；Case 模式身份与包内主题分离；结构分叉、缺失/隐藏/零 bbox 节点不被完整性声明掩盖；固定时钟与主题表可复现、可回读。

权威说明：[Evidence 模型](../architecture/evidence-model.md)、[主题包固定边界](../architecture/theme-packs.md)、[语义证据门禁](../reference/semantic-authoring.md)。

## 第 4 步 制作效率

**关键投入：** `v-pb` / `pbStyle()` 同时声明样式与 Token Evidence；生成合法键类型；Screen 就近声明并由 glob 汇总；显式 default completeness boundary；共享运行套件、脚手架和当前 Screen 实时诊断。

**验收要求：** 生成结果可检查新鲜度；工具不复制 Core 语义；声明边界可由 Runtime 精确解析；脚手架能原样完成预检、采集与定稿。

权威说明：[制作工具](../../apps/pbwork/docs/prototypes/authoring-tools.md)、[Authoring Contract](../reference/prototype-authoring.md)。

## 第 5 步 DS 通用组件与收口

**关键投入：** 补齐通用输入、时间选择、数据展示、反馈与整屏组件；BottomSheet 提供统一档位与交互；同步 Vue、Contract、Registry、预览、手册和 Target drift 状态。

**验收要求：** 组件在基础包与演示包浅深模式下可用；焦点、键盘、关闭与滚动使用共享机制；Target 未实现逐项如实标注 pending，不能据映射存在宣称交付端视觉完成。

权威说明：[组件总论](../../apps/pbwork/docs/components/overview.md)、[组件对齐协议](../../apps/pbwork/docs/components/alignment-protocol.md)。

## 第 6 步 设计基础与组件预览迁移

**关键投入：** 12 类设计基础、主题页和 47 个组件接入共享手机舞台；默认单机、按需双机；独立主题/状态/浮层；来源表展示真实样板和值；尺寸偏好、共同滚动与 reduced motion；原型组件扩展显式登记。

**验收要求：** 手机与工具外壳边界清楚；来源与继承事实准确；设备间状态隔离；窄屏、缩放、滚动与 Overlay 可用；预览不冒充正式 Evidence。

权威说明：[预览工作流](../../apps/pbwork/docs/workbench-preview.md)、[PBWork 架构](../architecture/pbwork.md)。

## 总体验收原则

- 按受影响范围完成构建、类型、单测、浏览器交互和文档检查；关键采集链路验证失败、恢复与重复执行。
- 用回归样本验证等价迁移和完整定稿，产物引用必须固定，不以 active/latest 猜测。
- 主题、组件和证据语义变更同时同步权威文档、Contract、Registry 与 Target drift 事实。
- 平台能力完成不代表任何业务原型完成；业务原型自行验证资源、页面、交互与交付。

本记录不保留中间批次日志、逐轮测试计数、临时状态和重复 Schema 草案。版本过程可由 Git 历史追溯，当前验证要求见[开发规范](../maintenance/development.md)。
