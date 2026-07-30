# ADR 0005：PBWork 使用一套严格的设计基础和组件边界

- 状态：Accepted

## 决策

PBWork 原型统一使用一套 Token/Theme Foundation 和一套 basic/complex Component Library。Prototype、Workbench 和 Runtime 的组件职责明确分层。

## 理由

PBWork 不只是视觉 Demo，它是 Evidence Producer。页面内重复造组件、手势和设计值会造成：

- 同一语义出现多种不可预测 DOM；
- Inspector 和 Capture 标记不一致；
- Theme、可访问性和交互状态无法统一验证；
- 原型经验无法沉淀为可复用规范；
- Agent 获取的组件与 Token 证据不稳定。

## 结果

- 形状匹配时必须使用对口 PBWork 组件。
- 所有设计量使用语义 Token。
- Contract、Registry、实现、Playground、测试和文档共同构成组件变更。
- 工作壳组件与 Runtime 原型组件隔离。
- 手势、滚动、导航和 Overlay 使用共享实现。
- 只有经过跨页面验证的能力才能提升为共享 Token 或组件。

如果未来引入多套 Foundation/Kit，需要先建立 Kit 身份、Prototype 绑定和 Capture Catalog 语义；同一 Screen 不混用多个 Kit。

