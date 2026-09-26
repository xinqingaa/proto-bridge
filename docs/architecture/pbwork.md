# PBWork 架构

PBWork 是一个 Vue 3 + TypeScript + Vuetify 应用，由 Workbench、Prototype Runtime、Design System 和 Capture UI 组成。

PBWork 的全部作者资产由产品、设计和开发人员通过 Coding Agent 修改。Workbench 是浏览、检查、生命周期流转和 Review 控制面，不是独立可视化编辑器或聊天式作者入口。

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

- Overview（续做一件作品，含 Runtime 预览）；
- Foundations Token/Theme 浏览；
- Component Playground；
- 原型目录与详情（作品身份、生命周期流转、页面地图；这两页不嵌 iframe）；
- Prototype Screen 树和画布（iframe Runtime 预览）；
- Inspector、Highlight 和本地评论；
- 定稿采集结果、Job Center 和 Evidence Viewer。

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

`prototypes/registry.ts` 是 Prototype、Screen、Variant、Action 和 Scenario 的唯一注册源。Router、Workbench navigation、Runtime manifest 和 Capture Preflight 都从该注册表读取。运行时生命周期不以 Registry 字段为事实源，而由 `prototypeLifecycle` Store 独立管理；新发现的 Prototype ID 一律初始化为“进行中”。

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
- Workbench 只镜像导航语义，不用时间窗口猜测 iframe 状态；
- Workbench 树、画布顶栏和 Capture Protocol 换页由 Runtime 强制导航执行，产品页按目标打开。手机内返回仍走产品离开确认。

临时 Inspector handle 只服务当前 Workbench session。持久 Evidence identity 必须转换为稳定 Fragment。

## Capture UI

PBWork 不提供页面、控件、Fragment 或整个原型的手工采集入口。待确定原型执行“定稿并采集”时，生命周期 Store 自动构造整原型 Draft，并直接通过 Capture Service Contract 创建 Preflight 与用户确认后的 Job；warning/risk 勾选以 `prototypeId` 隔离，不读写 Capture Store 的全局 draft、preflight、Job 或风险确认字段。Capture Store 在此流程只提供 Service 连接、任务/证据查看和交付路径等 UI 状态。用户不选择采集范围，也不单独点击生成提示词。定稿确认页只读展示 Agent 提示词将指向的绝对路径（Local Service session 上的 `deliveryTargetRoot`，来自 `proto-bridge.json` 的 `delivery.targetRoot`）。改路径只能改配置后重启 `pnpm pb:up`。

生命周期 Store 只编排动作并保存正式产物引用，不复制 Selection、Case identity、Coverage 或 risk 算法。持久 Evidence 仍由 Local Service/Store 管理，Preflight、Job、Handoff 和 Delivery 仍使用 Core Service Contract。只有生命周期记录绑定的已定稿或已归档产物出现在“定稿采集”页；CLI 和其它入口创建的 Bundle 不会自动成为 PBWork 定稿产物。PBWork 在 Capture Service Contract 上提交人类确认并显示服务端生命周期文档；Job 接受后，Local Service reconciliation 负责恢复和推进自动阶段。不同原型的 Preflight、warning 与 risk 确认按 Prototype ID 隔离；未提交的 UI 勾选只存在当前页签，warning 在创建 Job 前、risk 在开始提示词生成前写入 Workspace 生命周期记录。

稳定生命周期只允许：

```text
进行中 → 待确定 → 已定稿 → 已归档
   ↑         │        │
   └─────────┘        └─ 清理绑定 Evidence 后回到待确定
```

已归档没有任何出边。所有阶段都不提供删除原型操作。已定稿回退时 PBWork 只持久化 `rolling-back` 意图；Local Service 把该次定稿绑定的 Bundle 移入 Store trash 后，才清除 Snapshot、Handoff、Delivery 和 Prompt 引用并转回待确定。失败原因持久为 `failed(action: rollback)`，原型仍保持已定稿，界面提供“重试回退”；重试继续使用同一绑定 Bundle。

Evidence Viewer 可以按 Screen、Case 和 Fragment组织内容，但必须保留：

- 原始 Fact 顺序和 ID；
- provenance；
- active/latest 区别；
- Snapshot、revision 和 Blob refs；
- Issue、unknown、conflict 和 mandatory risks。

## 本地工作台状态

画布设备、缩放、Inspector 和评论等偏好可以使用 localStorage；生命周期事实源位于配置的 Store root 下 `pbwork/<workspaceId>/lifecycle-v1.json`。Core 定义 Schema/转移与固定引用规则，Local Service 通过 generation 与 `expectedRevision` 校验执行写入，并在启动及运行期间 reconciliation；Pinia Store 只缓存服务端文档、提交人工确认和显示状态。新发现的 Prototype ID 一律初始化为“进行中”；Registry 的 `lifecycle` 字段只作作者标注，不覆盖空存储。旧 `pbwork.prototype-lifecycle.v2` 只在 sidecar 为空且 Workspace/generation 完全匹配时迁移；final/archived 的 Job、Run、Snapshot、Coverage、Handoff、Delivery Receipt 和 Prompt 路径均须验证，未通过则降为待确定并标注 Evidence 仅供诊断。旧状态中的进行中操作不会被自动续跑。

Workbench **没有** Workspace reset 按钮；`pnpm pb:reset` / CLI `workspace reset` 才是全量清理入口。Core reset 会清除 sidecar；clean/trash 保护仍被有效生命周期引用的固定产物，回退操作完成后才解除绑定。清浏览器缓存不会删除磁盘上的 Bundle 或 Delivery；未绑定的旧 Bundle 即使 Coverage 完整也仅供诊断，不提供人工认领入口。

这些本地状态不能改变 Registry Contract、Store Evidence 或 Runtime URL 的业务语义。

## 测试边界

- Unit：Registry、Router、Runtime URL、Bridge snapshot、组件场景、手势、主题、Capture presentation/store。
- Browser：Workbench navigation、Canvas、Inspector、Comments、业务 Prototype、Runtime layout、Capture 和 Evidence usability。
- Product slice：PBWork Runtime → Core Capture → Store → MCP。

开发强规范见 [PBWork 开发规范](../pbwork/development.md)。
