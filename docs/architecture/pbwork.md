# PBWork 架构

PBWork 是一个 Vue 3 + TypeScript + Vuetify 应用，由 Workbench、Prototype Runtime、Design System 和 Capture UI 组成。

PBWork 的全部作者资产由产品、设计和开发人员通过 Coding Agent 修改。Workbench 是浏览、检查、采集和 Review 控制面，不是独立可视化编辑器或聊天式作者入口。

## 目录与职责

```text
apps/pbwork/src/
├── app/                 router, stores, global styles
├── workbench/           management shell, navigation, canvas, inspector
│   └── ui/              workbench-only UI primitives
├── design-system/       prototype tokens, themes, components, contracts
├── prototypes/          business prototypes and the single registry
├── runtime/             pure prototype runtime and browser protocols
└── capture/             deliver flow, jobs, evidence viewer, service client
```

## Workbench

`/workbench/*` 提供：

- Overview；
- Foundations Token/Theme 浏览；
- Component Playground；
- Prototype 生命周期、Screen 树和画布；
- iframe Runtime 预览；
- Inspector、Highlight 和本地评论；
- Capture Console、Deliver FlowSheet、Job Center 和 Evidence Viewer。

Workbench 组件统一从 `src/workbench/ui` 复用或封装。该层可以使用 Vuetify，但业务视图不能随意创建不一致的原生控件。

## Prototype Design System

原型设计基础的依赖链为：

```text
Token + Theme
  → basic components
  → complex components
  → Screen / Panel
  → Prototype shell and navigation
```

权威来源：

- Token：`design-system/tokens/tokens.json`
- 可绑定 Token：`design-system/bindTokens.ts`
- Theme：`design-system/themes/*.json`
- Component Contract：`design-system/components/contracts/*.json`
- Component Registry：`design-system/components/registry.ts`
- Prototype/Screen Registry：`prototypes/registry.ts`

Workbench UI 与 Prototype Design System 不得互相复用组件：原型组件可能携带 `data-pb-*` 和 Inspector 语义，工作壳组件不应进入 Evidence。

Component Contract 还应固定组件的 semantic role policy；业务局部证据节点的显式标记不由 DS 默认值代替。统一规则见[语义标记与证据门禁](../reference/semantic-authoring.md)。

## Registry

`prototypes/registry.ts` 是 Prototype、Screen、Variant、Action 和 Scenario 的唯一注册源。Router、Workbench navigation、Runtime manifest 和 Capture Preflight 都从该注册表读取。

启动校验至少拒绝：

- 重复 Prototype/Screen/path；
- `screenId`、`screenSlug`、`prototypeId` 不一致；
- view 文件不存在；
- default Variant 缺失；
- required Fragment 属于其它 Screen；
- strict Screen 的 default Variant 没有完整性边界；
- Action、Scenario 或 Checkpoint 引用不存在。

## Runtime

`/prototype/:prototypeId/:screenSlug` 只渲染原型，不渲染 Workbench。URL 的 `variant`、`theme` 和 fixture 表达可复现 Runtime 维度。

Runtime 提供：

- Screen view 动态加载；
- Theme 与 Variant 解析；
- Workbench Bridge；
- Inspector snapshot；
- Capture Protocol；
- 稳定等待、路由准备和 reset。

Capture Protocol 的 manifest 由 Registry 构造，`inputVersion` 对 Screen、Variant、Action 和 Scenario 定义计算摘要。页面语义快照只读取同时具有合法 `data-pb-role` 与 `data-pb-id` 的节点。

Authoring lint 在 Runtime 前发现确定性违规和疑似 CSS-only 遗漏；Inspector 使用同一规则展示 Block、Warning 和 Info，不维护私有建议词表。

## Workbench Bridge

Workbench 与 iframe 使用带 `runtimeId` 和 `requestId` 的消息信封：

- iframe load 后重新握手；
- 只接受允许 origin 和当前 `contentWindow`；
- route、inspect、comment、highlight 和 theme 消息各有明确方向；
- iframe 重载后旧 runtimeId 和未完成请求全部失效；
- payload 有大小与字段约束；
- Workbench 只镜像导航语义，不用时间窗口猜测 iframe 状态。

临时 Inspector handle 只服务当前 Workbench session。持久 Evidence identity 必须转换为稳定 Fragment。

## Capture UI

Capture UI 的 store 只保存展示和会话状态，持久事实仍在 Local Service/Store。四类 Capture 入口生成同一种 Draft；Preflight 和 Job 状态使用 Core Service Contract。

Evidence Viewer 可以按 Screen、Case 和 Fragment组织内容，但必须保留：

- 原始 Fact 顺序和 ID；
- provenance；
- active/latest 区别；
- Snapshot、revision 和 Blob refs；
- Issue、unknown、conflict 和 mandatory risks。

## 本地工作台状态

画布设备、缩放、Inspector、评论、Prototype lifecycle override 等工作台偏好可以使用 localStorage。每类数据必须有独立 schema、容量边界、错误恢复和 key；读取失败不能静默覆盖原值。

这些本地状态不能改变 Registry Contract、Store Evidence 或 Runtime URL 的业务语义。

## 测试边界

- Unit：Registry、Router、Runtime URL、Bridge snapshot、组件场景、手势、主题、Capture presentation/store。
- Browser：Workbench navigation、Canvas、Inspector、Comments、业务 Prototype、Runtime layout、Capture 和 Evidence usability。
- Product slice：PBWork Runtime → Core Capture → Store → MCP。

开发强规范见 [PBWork 开发规范](../pbwork/development.md)。
