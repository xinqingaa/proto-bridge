# ADR 0014：三层 Token 与原型自有主题包

- 状态：已接受
- 日期：2026-10-17
- 替代：[ADR 0012](./0012-pbwork-ds-is-foundation-not-ceiling.md) 第 6 项的阶段性品牌取值限制

## 背景

共享 DS 形态不应把所有原型压成同一种品牌外观。全局明暗两套取值无法表达原型自己的品牌，也无法可靠交付包继承和资产来源。另一方面，按组件或页面随意换绑会丢失语义一致性。

## 决策

- Primitive 仅在包及继承链内可见；Semantic 键由 PBWork 目录声明；Component 键由拥有它的 Contract 声明。Core 统一校验和解析三层引用，不内置 PBWork 键名。
- 每个正式原型绑定同 ID 的自有主题包，可继承基础包并包含多套具名主题及 light/dark 模式。主题只改变取值，不改变语义节点和绑定。
- 实现常量独立于 Token，不允许被主题覆盖，也不进入 Catalog、Evidence 绑定或 Target 映射。可见设计量只在主题包或常量表定义。
- 样例包只用于 Gallery / Playground。原型可以拥有自有组件；手势、滚动、Overlay 与导航机制继续共享。字体、独立色轴及组件层全量发布不由本次决策引入。

## 影响

Runtime、CSS、JS 读取和 Vuetify 使用同一张 Core 解析表；资源 URL 保留所属包，交付固定摘要与值表。目录、常量和 Contract 共同生成作者键类型并有新鲜度测试。现行模型见[主题包解析模型](../architecture/theme-packs.md)；作者接口见[制作工具](../../apps/pbwork/docs/prototypes/authoring-tools.md)。
