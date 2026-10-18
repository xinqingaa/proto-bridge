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

## 设计基础与组件的共享预览边界

全部 12 个设计基础分类、浅深主题页与 Registry 47 个组件使用 `src/workbench/preview/`。`PreviewComparison` 管单机/按需双机、局部会话与自然撑开的舞台、fit/100% 显示及预览/来源 Tab；设置侧栏只在预览可见，共同滚动在舞台顶部以紧凑开关呈现。`PreviewSurface` 管手机壳、局部主题、设备视口与 Overlay host。`FoundationSample` / `ThemeSample` 编排分类样板与主题事实，`ComponentDeviceSample` 承接原 Playground 的矩阵、导航/转场、长列表与触发演示，Button/BottomSheet 保留专用样板；不嵌套手机，不连接全局 Playground Store。原型扩展最小登记由 `preview/extensions/` 管理，显式元数据与路径校验后接入原导航和手机舞台，当前正式登记为空。人工规则见[预览工作流](../pbwork/workbench-preview.md)，批次见[平台升级第 6 步](../roadmap/pbwork-platform-upgrade.md#第-6-步-设计基础与组件预览迁移)。

预览主题包选项由主题 manifest 的 scope 与 Prototype Registry 的真实绑定生成，按 packId 去重，原型归属与渲染主题分开；复用基础包的原型不单独增加外观选项。每台设备有独立的 `ThemeTableKey`、CSS/主题属性、Vuetify Provider、演示状态、实例标识及浮层 host；控制面保持 Workbench 主题。完整已验证主题身份通过单一 prop 原子传入 Provider，避免同步监听器读到跨包的中间组合。预览只在 CSS 输出中把视口单位适配为设备容器单位，Core 表与 digest 不变。手机内容区保留滚动，舞台正常文档流随设备高度撑开、双机空间不足换行，手册不引入 iframe，不改变正式 Runtime/Capture 或业务偏好。

`PreviewValueTable` 在所有资源的来源 Tab 中按分类列出完整实际样板、原始键值与定义来源，并持有只影响表格的搜索；`SourceValuePreview` 按真实值类型渲染色块、字体、几何/表面、动效等，相同项也保留，不显示差异列/筛选或引用链；它与手机复用同一个 Core 解析缓存，不读取被缩放或容器单位改写的显示 CSS。舞台使用 ResizeObserver 测量可用空间，手机设备容器可通过右下角斜线手柄或方向键等比缩放，外层卡片随内容高度撑开，预览比例变化不重建设备；滚动条隐藏后仍保留内容滚动和键盘焦点。布局、共同滚动、显示模式、自定义缩放和 A/B 主题选择由工作台独立 localStorage 偏好跨页共享与恢复，不持久化演示状态或搜索。预览/来源 Tab 以保留实例的翻页动画切换，支持减少动态效果；共同滚动按相对进度双向同步，仅影响预览内容区。实现常量显示为只读且不入差异；原型扩展缺实现的比较侧显示不适用。正式 Evidence 与平台总验收不由预览替代。

原 ComponentPlayground 的 Pinia 会话暂用于未迁移组件；已接入的代表组件使用每设备会话，不能让双机共用原全局可变状态。主题解析继续复用 Core 和现有 Runtime theme registry；具体资源内的只读资料不产生正式 Evidence。

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

- Token：`design-system/theme/key-catalog.json`
- 可绑定 Token：`design-system/theme/bindings.ts`
- Theme：`design-system/themes/*.json`
- Component Contract：`design-system/components/contracts/*.json`
- Component Registry：`design-system/components/registry.ts`
- Prototype/Screen Registry：`prototypes/registry.ts`

Workbench UI 与 Prototype Design System 不得互相复用组件：原型组件可能携带 `data-pb-*` 和 Inspector 语义，工作壳组件不应进入 Evidence。

Component Contract 还应固定组件的 semantic role policy；业务局部证据节点的显式标记不由 DS 默认值代替。统一规则见[语义标记与证据门禁](../reference/semantic-authoring.md)。

## Registry

`prototypes/registry.ts` glob 汇总原型的 `prototype.ts` 与每个 Screen 目录的 `screen.ts`，汇总结果是 Prototype、Screen、Variant、Action 和 Scenario 的唯一注册源；`defineScreen()` 和片段助手生成显式 default 边界，生成文件纳入版本管理并校验新鲜度。Router、Workbench navigation、Runtime manifest 和 Capture Preflight 都从该注册表读取。运行时生命周期不以 Registry 字段为事实源，而由 `prototypeLifecycle` Store 独立管理；新发现的 Prototype ID 一律初始化为“进行中”。

启动校验至少拒绝：

- 重复 Prototype/Screen/path；
- `screenId`、`screenSlug`、`prototypeId` 不一致；
- view 文件不存在；
- default Variant 缺失；
- required Fragment 属于其它 Screen；
- strict Screen 的 default Variant 没有完整性边界；
- Action、Scenario 或 Checkpoint 引用不存在。

## Runtime

`/prototype/:prototypeId/:screenSlug` 只渲染原型，不渲染 Workbench。URL 的 `variant`、包内主题 `theme`、具体模式 `mode` 和 fixture 表达可复现 Runtime 维度。

Runtime 提供：

- Screen view 动态加载；
- Theme 与 Variant 解析；
- Workbench Bridge；
- Inspector snapshot；
- Capture Protocol；
- 稳定等待、路由准备和 reset。

Workbench Inspector 通过已验证的 Runtime bridge 接收当前 Screen 的实时制作诊断；几何与遮挡复用 Capture readiness 的检查，既有选中元素启发式提示保留。它不写 Evidence，不取代 Preflight，接口和目录见[制作工具](../pbwork/prototypes/authoring-tools.md)。

Capture Protocol 的 manifest 由 Registry 构造。`inputVersion` 覆盖 Screen、Variant、Action、Scenario、主题包摘要、键目录摘要和原型声明的时钟。页面语义快照只读取同时具有合法 `data-pb-role` 与 `data-pb-id` 的节点。

Authoring lint 在 Runtime 前发现确定性违规和疑似 CSS-only 遗漏；Inspector 使用同一规则展示 Block、Warning 和 Info，不维护私有建议词表。

## Workbench Bridge

Workbench 与 iframe 使用带 `runtimeId` 和 `requestId` 的消息信封：

- iframe load 后重新握手；
- 只接受允许 origin 和当前 `contentWindow`；
- route、inspect、comment、highlight 和 theme 消息各有明确方向；
- iframe 重载后旧 runtimeId 和未完成请求全部失效；
- payload 有大小与字段约束；
- Workbench 只镜像导航语义，不用时间窗口猜测 iframe 状态；Runtime 返回时只有父级 history 的 back 路径与目标一致才回退，否则 replace 到已验证目标，不凭正数 position 退出工作台；
- Workbench 树、画布顶栏和 Capture Protocol 换页由 Runtime 强制导航执行，产品页按目标打开。手机内返回仍走产品离开确认。

临时 Inspector handle 只服务当前 Workbench session。持久 Evidence identity 必须转换为稳定 Fragment。

## Capture UI

PBWork 不提供页面、控件、Fragment 或整个原型的手工采集入口。待确定原型执行“定稿并采集”时，生命周期 Store 自动构造整原型 Draft，并直接通过 Capture Service Contract 创建 Preflight 与用户确认后的 Job；warning/risk 勾选以 `prototypeId` 隔离，不读写 Capture Store 的全局 draft、preflight、Job 或风险确认字段。Capture Store 在此流程只提供 Service 连接、任务/证据查看和交付路径等 UI 状态。用户不选择采集范围，也不单独点击生成提示词。定稿确认页只读展示 Agent 提示词将指向的绝对路径（Local Service session 上的 `deliveryTargetRoot`，来自 `proto-bridge.json` 的 `delivery.targetRoot`）。改路径只能改配置后重启 `pnpm pb:up`。

生命周期 Store 只编排动作并保存正式产物引用，不复制 Selection、Case identity、Coverage 或 risk 算法。持久 Evidence 仍由 Local Service/Store 管理，Preflight、Job、Handoff 和 Delivery 仍使用 Core Service Contract。只有生命周期记录绑定的已定稿或已归档产物出现在“定稿采集”页；CLI 和其它入口创建的 Bundle 不会自动成为 PBWork 定稿产物。PBWork 在 Capture Service Contract 上提交人类确认并显示服务端生命周期文档；Job 接受后，Local Service reconciliation 负责恢复和推进自动阶段。不同原型的 Preflight、warning 与 risk 确认按 Prototype ID 隔离；未提交的 UI 勾选只存在当前页签，warning 在创建 Job 前、risk 在开始提示词生成前写入 Workspace 生命周期记录。

结果身份只由 Core `classifyCaptureResults`（`@proto-bridge/core/v2/result-classification`）投影。输入是生命周期文档、Bundle/Snapshot/Job 元数据，以及 console 上实际读到的 Delivery receipt 与 Handoff。PBWork 只映射中文、排序和展示，不重新判断身份，也不提供把未绑定结果认领为正式的入口。

| 分类 | 判定 |
| --- | --- |
| 已正式定稿 | 生命周期 record 的 artifacts 精确绑定这一组 Bundle、Snapshot、Handoff、Delivery，且这些对象仍可读、Bundle 未进入 trash |
| 定稿进行中 | `finalizing` 且 phase 为 `preflighting`、`capturing` 或 `building-prompt` |
| 待逐项确认 | `finalizing` 且 phase 为 `awaiting-confirmation` 或 `awaiting-risks` |
| 定稿未完成 | `failed` 且 `action` 为 `finalize`，由 Job 的 `operationKey` 连到该次操作 |
| 引用失效 | 绑定的 Bundle 被删除或移入 trash，或绑定的 Snapshot、Handoff、Delivery 对不上。对象清单尚未加载时，不把缺失当成删除；已经读到的 trash 仍算失效 |
| 结果读取失败 | 列出的对应 Snapshot 读不到。不改用另一份 active Snapshot 的 Coverage，未读到的 Snapshot 不计失败项 |
| 仅诊断 | 其余结果，包括 Coverage 完整的历史 Bundle 和 CLI 采集 |

来源只在 receipt 记录了 `source: cli | gui` 时显示 GUI 或 CLI。没有 receipt、字段缺失，或同一 Snapshot 上多张 receipt 的来源冲突时，显示来源未知。不从 Bundle ID、文件名、时间或 active/latest 推断身份或来源。正式绑定按 `deliveryId` 精确匹配 receipt；未绑定结果只汇总与该 Bundle、Snapshot（以及已知 Handoff）一致的 receipt。

概览、任务中心、定稿面板和 Evidence Review 对同一结果显示同一句：分类 · 来源，该 Snapshot Coverage 不完整时再加“部分失败 · N 项”。展示候选先列生命周期绑定的 Snapshot，再列各 Bundle 的 active Snapshot；active 只决定是否出现在列表中，不决定身份。生命周期阶段芯片仍用“已定稿”，与结果标签“已正式定稿”分开。回退失败的目录状态仍是“回退失败”，并保留“重试回退”；被绑定结果的身份保持已正式定稿。仅诊断结果不显示“可交付”或“已定稿”。失败分组和“继续定稿”保持不变。

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

- Unit：Registry、Router、Runtime URL、Bridge snapshot、组件场景、手势、主题、Capture presentation/store、结果分类文案。
- Browser：Workbench navigation、Canvas、Inspector、Comments、业务 Prototype、Runtime layout、Capture 和 Evidence usability。
- Product slice：PBWork Runtime → Core Capture → Store → MCP。

开发强规范见 [PBWork 开发规范](../pbwork/development.md)。

来源表由 `sourceThemeColumns` 按实际包与主题独立生成列，不受手机对比、主题或实现选择影响；名称列固定，超宽横向滚动，来源模式独立存储。`GlassMaterial` 为导航与 GlassSurface 共享的无交互材质层；IconCatalog 仅在预览内提供同源 SVG/PNG 导出，正式 Icon 不承担下载职责。
