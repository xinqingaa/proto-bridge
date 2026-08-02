# Implementation Discipline

- Screenshot 与 Fragment 的结构、token、文案、状态和交互是源页面的硬约束。
- 不得发明证据未支持的容器形态、文案、交互、状态或页面入口。
- Evidence 未给出的布局敏感 prop，先对照 Screenshot；仍不确定时写入剩余风险，不得静默接受会改变构图的组件默认值。
- Evidence 的语义组件必须映射到目标工程已声明或扫描确认的本地组件。已有可靠映射时，不得用外观相似的通用 widget 静默替代。
- 必须覆盖 Handoff 选中的 Case、variant 和 interaction，不得只实现默认态。无法实现的状态必须在编辑前披露。
- 不得在目标工程中创建绕过既有公共组件、Theme、路由或状态边界的平行基础层。
