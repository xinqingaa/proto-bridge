# 原型 Authoring Contract

本规范定义怎样制作能被 ProtoBridge 高效、精确、完整采集的原型。所有进入 PB Evidence 闭环的 PBWork Prototype、Screen 和关键状态都必须遵守。

本规范只负责已批准设计的正式工程化。新原型、结构性改动和视觉语言改变必须先按[原型设计工作流](../pbwork/prototypes/design-workflow.md)形成 `status: approved` 的产品基线；新页面或整页调整还必须具有已批准的页面设计增量。独立视觉探索不属于本 Contract，也不能进入 Capture/Handoff。

产品、设计和开发人员使用 Cursor、Codex 等 Coding Agent 修改同一套代码、Contract、Registry 和文档；PBWork 不维护按人员角色区分的第二套作者协议。节点 identity、role、component、Token Evidence 和 Block/Warning/Info 等级以[语义标记与证据门禁](./semantic-authoring.md)为唯一权威。

## 1. 以 PBWork 设计基础为底座

原型依赖顺序固定为：

```text
PBWork Token / Theme
  → basic components
  → complex components
  → shared gestures and composition recipes
  → Screen / Panel
  → Prototype shell
```

强制规则：

- 形状与风格都匹配的 PBWork 组件存在时必须使用，含其公开变体；与已批准风格冲突时按[原型设计工作流](../pbwork/prototypes/design-workflow.md#promotion-mapping)使用 DS 扩展或原型自有组件，并在 `docs/implementation.md` 记录 DS 缺口。
- 禁止在页面内复制 Dialog、Sheet、Toast、Navigation 或滚动/手势组件的交互机制，也不得通过私有 class 覆盖 DS 组件内部样式。
- 允许原型自有组件与业务局部 UI，但颜色、字体、间距、尺寸、比例尺寸、圆角、边框、阴影、透明度、层级、动效、滤镜和变换距离必须使用 `--pb-*` Token；具有设计含义的 `0` 也必须走 Token。
- 原型只使用 Flex 或常规文档流；禁止 `grid` / `inline-grid`、所有 `grid-*` 和 `place-*`。约束同时覆盖 style、template、script/TS 生成样式与 vendor 视觉 props，不能把固定数值转移到组件参数中。
- `calc()` 只能组合 Token 或运行时派生变量；DOM 测量/交互状态的派生几何值可经 custom property 传入，但不得形成固定默认设计值或公开样式逃生口。
- 业务局部 UI 中需要 Agent 独立实现或验收的节点必须显式声明 `data-pb-id`、`data-pb-role` 和所需 `data-pb-token-*`；只使用 CSS Token 不构成 Token Evidence。
- 禁止创建业务命名的共享 Token。
- 禁止组件实例换绑 Token；Theme 只覆盖 Token 值。
- 禁止复制共享手势仲裁。
- Workbench UI 组件不能用于业务 Runtime，Prototype Design System 组件不能用于 Workbench。

组件选择和组合细节见 [PBWork 原型生产者手册](../pbwork/README.md)。

## 2. 稳定身份

`pbId` / `pbKey` 的语法、驼峰支持和大小写规则以[语义身份规范](./semantic-authoring.md#3-identity-四分法)为准；业务字段参与身份拼接时保留原值。

| 对象       | 身份                                           |
| ---------- | ---------------------------------------------- |
| Prototype  | 稳定 `prototypeId`                             |
| Screen     | `{prototypeId}.{screenSlug}`                   |
| Variant    | Screen 内稳定 slug                             |
| Fragment   | `screenId + data-pb-id + optional data-pb-key` |
| Action     | owner Screen 内稳定 slug                       |
| Scenario   | owner Screen 内稳定 slug                       |
| Checkpoint | owner Scenario 内稳定 slug                     |

禁止使用：

- DOM path、CSS selector、Vue component instance；
- 数组 index、当前排序位置、纯数字 `pbKey`（如 `"3"`）；
- 生成时间、随机值；
- 可编辑展示文案；
- Workbench 临时 handle；
- 仅在一次浏览器 session 内有效的 ID。

## 3. Screen Registry

每个 Screen 在 `apps/pbwork/src/prototypes/{prototypeId}/screens/{screenSlug}/screen.ts` 中用 `defineScreen()` 就近声明，由 `prototypes/registry.ts` glob 汇总：

- `prototypeId`；
- 稳定 `screenId` 和 `screenSlug`；
- 唯一 `path`；
- 指向真实 Vue SFC 的 `view`；
- `defaultVariantId`；
- `variants`；
- 按需声明 `actions` 和 `scenarios`。

Registry 汇总结果是 Router、Workbench、Runtime manifest 和 Capture 的共同权威，不维护第二份 Screen 清单。`screenScope()` 补齐身份，作者标记 `required: true` 的片段在构建前生成 default Variant 边界，生成文件纳入版本管理并有新鲜度测试；这仍是显式 authored boundary。工具、命令与目录见[制作工具](../pbwork/prototypes/authoring-tools.md)。

每个 Screen 必须能通过 URL 直接打开。关键状态不能只能经过手工点击到达。

## 4. Variant

Variant 表达稳定业务状态，例如：

- `default`
- `loading`
- `empty`
- `error`
- `filtered`
- `sheet-open`
- `dialog-open`
- `validation-error`

Theme、Device、Viewport 和 Fixture 是独立 Case 维度，不得伪装成 Variant。

Variant 依赖业务 query 才能确定性打开时，Registry 必须在该 Variant 上声明 `query`。PBWork 将其作为 canonical `routeQuery` 发布到 Runtime Manifest 并纳入 `inputVersion`；Workbench 导航、Runtime reset、Preflight 和 Capture 必须使用同一份 authored 输入。`routeQuery` 不属于 Case identity，也不能覆盖 `variant`、`theme` 或 `mode`。

严格 Screen 的 default Variant 必须声明非空 `requiredFragments`。其它 Variant 可以未声明 boundary，但采集和交接必须保留覆盖风险。

## 5. Runtime 标记

| 属性                | 用途                                          |
| ------------------- | --------------------------------------------- |
| `data-pb-id`        | Screen 内稳定语义模板身份                     |
| `data-pb-key`       | 同一模板下重复实例的稳定业务键                |
| `data-pb-role`      | PB 语义角色                                   |
| `data-pb-shell`     | `sheet`、`dialog`、`modal`、`drawer` 等叠加层 |
| `data-pb-component` | PBWork Design System 组件身份                 |
| `data-pb-action`    | authored Action 的稳定执行目标                |

标记放在拥有该语义的实际节点上，不为“方便采集”增加无意义包裹层。

证据节点有两种合规来源：

- 注册 DS 组件：业务页必须传稳定 `inspectId`，组件提供默认/允许 role、`componentId` 和 token bindings；
- 业务局部节点：同一实际元素必须显式提供 id、role、按需 key，以及 Agent 实现所需的 `data-pb-token-*`。

不要求标记所有 DOM。纯装饰或完全由父 Fragment 覆盖的内部节点可以不标记，但它们不会形成独立 Evidence。详细判定和示例见[语义标记与证据门禁](./semantic-authoring.md)。

重复列表规则：

- 单个模板可使用一个 `data-pb-id`；
- 同屏重复时，每个实例必须具有唯一稳定 `data-pb-key`；
- key 使用业务身份，不使用循环 index；
- 同一 `pbId + pbKey` 只能出现一次。

## 6. Role

`data-pb-role` 是 PB 产品语义词表，不等同于 ARIA role，也不等同于 `componentId`。语义采集要求节点同时具备 `data-pb-role` 与 `data-pb-id`；机器闭集只以 Core Contract 为准，本文不复制第二份枚举。

固定语义组件使用 Contract 默认 role；上下文组件只能从 Contract 的 allowed roles 中选择；装饰组件默认不进入语义树。Role 表达通用产品职责，精确 DS 身份由 `componentId` 表达，例如 `flow-sheet` 使用 `sheet` role。新 strict Screen 的 required Fragment、Action target 和 Scenario assertion 禁止使用 `unknown`。节点仍需提供正确 HTML/ARIA 语义，不能用 `data-pb-role` 代替可访问性。

## 7. Token Evidence

- DS 组件通过 Component Contract 或运行时 registration 提供 token bindings，业务实例不重复手写同一组 `data-pb-token-*`；
- 业务局部证据节点必须显式提供 Agent 需要复现的 Token 槽；
- CSS `var(--pb-*)` 与 Token binding 是两件事：前者控制实际样式，后者形成可消费 Fact；
- 同一父节点下字阶、颜色或状态不同的文本若需要分别实现，必须分别成为证据节点；
- binding value 必须能由固定 Catalog 解析，Capture 必须保留真实 provenance。
- 局部节点可使用 `v-pb` + `pbStyle()` 或指令的 `style` 一次生成样式与标记，键类型由键目录/常量/Contract 生成；DS 实例绑定仍由 Registry 提供。

## 8. Required Fragment

`requiredFragments` 是 authored semantic completeness boundary。原型作者用它声明：“如果这些语义区域没有全部采集，就不能称该 Case 完整。”

每个 required Fragment 必须：

- 属于当前 Screen；
- 在目标 Variant/Checkpoint 中存在；
- identity 唯一；
- 具有合法 role；
- role 不是 `unknown`；
- 实际可见；
- bbox 宽高均大于零；
- 不被错误叠加层遮蔽；
- 在 readiness 后保持稳定；
- 具有交付所需的组件、props 和 Token Evidence。

缺失、重复、不可见或非法节点必须阻止完整性声明，不能降级为无提示成功。

## 9. Action

关键交互通过 Action 声明：

- 稳定 Action ID；
- 受支持的 `kind`；
- 稳定 Fragment target；
- 可验证的执行结果。

Action target 需要 `data-pb-action` 或 Contract 支持的明确语义。禁止让采集器根据按钮文案、DOM 顺序或模糊 selector 猜点击目标。

## 10. Scenario 与 Checkpoint

Scenario 声明：

- owner Screen；
- initial Variant；
- 有序 Action IDs；
- 一个或多个 Checkpoint。

Action target 按场景顺序在各自执行前验收；第二步及后续 target 可以由前一步真实交互渲染，不要求初始 Variant 同时显示全部 Action target。

Checkpoint 必须声明实际 Screen、Variant 和非空 required Fragments。Runtime 执行后发现任一维度不匹配，应确定性失败。

会卸载当前 document 且无法保持 Capture Protocol 连续性的导航必须标记 unsupported。不要用延时或忽略窗口伪装成功。

### 跨主题共享执行的作者声明

Scenario 的 `appearancePolicy` 可选 `shared` 或 `independent`，省略时按 `independent` 执行。只有业务动作、状态转换与主题无关的 Scenario 才能显式声明 `shared`；主题设置、系统模式和主题专属交互保持独立执行。共享声明不减少每种主题模式的页面截图、语义观测、状态和完整性门禁。

原型仅在作者已覆盖完整状态时声明 `PrototypeRecord.captureState: true`。作者通过 `useCaptureState` 提供一个 `business` 读取器、每个可采 Screen 的完整局部 UI 读取器，以及影响检查点的嵌套局部状态读取器；必须覆盖业务 Store、命令/session 的私有状态、表单 draft/校验、选中项、Overlay 和恢复状态。不能仅 hash Store 或从 DOM 猜测作者状态。读取器第 4 参数可声明 `{ appearancePolicy: "independent" }`；在原型已显式启用且完整覆盖状态的前提下，读取器省略此参数默认为 `shared`。任一挂载的读取器声明独立时，整个当前原型拒绝共享，包括静态 Variant。主题设置页的当前已选主题/模式来自业务偏好，不能仅切渲染主题后沿用原选中态；一刻设置页整页采用该独立策略。

实际渲染主题必须独立于业务偏好，渲染切换不能写偏好、重放动作或触发 fixture reset。接口见[制作工具](../../apps/pbwork/docs/prototypes/authoring-tools.md#共享运行套件)。

Runtime 仅对显式启用且具备 `business` 与当前 Screen 读取器的页面开放 `capture-state` / `set-render-theme`。状态指纹同时包含源码版本、固定业务时刻、业务路由、实际滚动、表单、Overlay 和焦点；切换渲染前后均须保持不变。缺少作者覆盖返回 `capture-state-unsupported`；状态变化返回 `capture-state-changed`，由 Capture 回退独立准备与执行，不能声明共享成功。指纹相等只证明已声明及观测的边界未变化，不替代作者完整性责任或各主题实际视觉校验。

## 11. Readiness 与 Reset

Runtime 在 readiness 成功前必须完成：

- URL 与 Case 维度解析；
- Fixture 注入；
- 异步数据和状态准备；
- Theme 应用；
- Variant/Overlay 打开；
- required Fragment 渲染；
- 语义标记稳定。

每个 Case 必须能回到独立 baseline。reset 不能依赖上一个 Case 的偶然页面状态。

PBWork view 可通过 `usePrototypeCaseReset` 注册状态准备函数，`prepare` 与 `reset` 在等待稳定前触发它。同 URL 的重复调用也必须复位业务与局部状态；只更新或监听 URL 不构成复位。接口用法见 [制作工具](../../apps/pbwork/docs/prototypes/authoring-tools.md#共享运行套件)。

## 12. 页面结构

- 一个页面只有一个主滚动所有者。
- 一级多面板：每个根目的地注册独立 Screen，`view` 指向同一壳；壳内 `TabViewport + Tabbar`，切 Tab 更新 home slug。
- 一级主体面板内禁止再嵌套带 window 的 `Tabs`。
- 列表外观使用 `DataList`，滚动/刷新/分页使用 `ScrollableDataList`。
- 状态页关闭不适用的刷新和分页手势。
- Dialog、Sheet、Toast 等 Overlay 与主内容保持清晰语义边界。
- 多 Tab 与栈页使用统一导航辅助，确保深链、返回和跨 Tab 进栈可复现。
- 产品离开拦截写在 `onBeforeRouteLeave` 时先认 `isForcedRuntimeNavigation()`；Workbench 树、画布顶栏和 Capture 换页由 Runtime 强制导航打开目标页。

## 13. 数据与状态

- 关键列表、选项和 Fixture 应在可维护的源码数据结构中表达。
- 不通过随机数据、系统当前时间或不受控网络请求决定 Capture 结果。
- loading、empty、error、校验和 Overlay 等实现范围内的关键状态必须可由 Variant 或 Scenario 重现。
- Screenshot 与语义 Facts 必须来自同一 Case。

## 14. 证据诚实性

- Runtime 只报告实际观测事实。
- 未声明 required boundary 的结果不能声称语义完整。
- unknown、conflict 和 unsupported 必须可见。
- 源码命名、目标工程模式或截图推测不能补齐 required Fact。
- 手工接受 warning 不改变 Evidence Level。

## 15. Delivery 与分级 Experience Review

PBWork Delivery Gate 始终强制。新页面或整页调整在正式实现稳定后默认执行 L1 Quick Experience Check，并按风险、用户反馈或明确指令升级。`docs/implementation.md` 分别记录 Delivery 结果和 `quick-checked`、`accepted`、`fully-audited`、`needs-focused-review` 或显式 `deferred`；Quick Check 不得描述成完整体验验收。

### PBWork Delivery Gate

- Token-only、Flex-only、已记录的 Promotion Mapping 和文档规定的组合方式通过，原型自有组件满足与 DS 组件相同的规则；
- Required Fragment、业务 Evidence 节点、Action、Scenario、Checkpoint、Variant fixture、readiness 和 reset 可确定复现；
- Typecheck、范围测试、Runtime 验证和文档验证通过。

### L1 Quick Experience Check

- 查看默认状态、主要目标视口和主题的一张真实浏览器截图；按页面最大风险至多增加一张深色、窄屏、Overlay、关键状态或主要交互结果截图。
- 检查首屏焦点、阅读顺序、签名视觉、明显热区反馈、装饰克制、重复元素对齐、文字溢出、Overlay 和固定导航遮挡。
- 最多进行一轮截图修正；仍有实质问题时记录 `needs-focused-review` 并升级，不继续无上限迭代。

### L2 Focused Experience Gate

用户不满意、L1 暴露实质问题、共享视觉语法、核心旅程、数据可视化、复杂交互或承担核心任务的复杂 Overlay 页面升级到 L2。按实际风险选择三至五张截图，覆盖相关状态、交互、键盘焦点、主题或窄屏、结构性装饰、文字和 Overlay 完整性；存在已知实质缺陷时不得记录 `accepted`。

### L3 Full Experience Audit

只在用户明确要求、最终批次/发布验收或产品风险要求时，完整覆盖声明的主题、目标视口、reduced motion、关键状态和核心交互。发现的实质问题修复后才记录 `fully-audited`。

视觉修复只重跑受影响的 Delivery 检查和当前 Experience 级别；完整仓库验证保留到页面或连贯批次完成时执行。

### 验证命令

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
```

Delivery Gate 前还应：

- 在浅色和深色 Theme 检查关键表面；
- 用真实浏览器验证 required Fragment 唯一、可见、bbox 非零；
- 验证业务局部证据节点没有只写 CSS Token 而遗漏 id、role 或 `data-pb-token-*`；
- 验证 DS 业务实例使用业务 `inspectId`，required boundary 不依赖 `ds.*`；
- 验证 default 与所有被选中的 Variant；
- 验证 Action、Scenario、Checkpoint 和 reset；
- 验证纵滚、横滑、刷新、Overlay 和返回；
- 确认相关 Contract、Registry、测试和文档同步。

测试边界（MUST）：新原型不得在 `packages/core/src/v2/fixtures` 下新增按原型命名的金标目录；Core/MCP/Consumer 复用唯一 `reference-case-slice`。允许 Registry 单测 + 至多一条 Runtime 冒烟 e2e；通用 Workbench/Capture e2e 改挂现有样板，不按 App 复制全套。详见 [PBWork 开发规范 · 新原型与测试边界](../pbwork/development.md#9-新原型与测试边界)。

Workbench 浏览不以整页制作检查阻断页面，正式 Preflight 与完整性声明仍按本文执行，见[制作工具](../../apps/pbwork/docs/prototypes/authoring-tools.md#制作诊断与正式校验)。原型默认隐藏所有滚动条并保留滚动操作，只有用户明确要求时才显示。模拟设备安全区由共享 Runtime 外壳消费，自定义页头不复制草稿状态行，具体归属见同页安全区说明。


## 已同步图形的页面证据

DS 资源本体由同步链路维护，页面采集不重复归档 SVG。图标名称及语义节点所属装饰图标进入既有 props；原型自有大型表盘可用 `data-pb-artwork` 显式声明已登记 packId/file/assetId、views、sessionAsset/layerAsset 和当前状态。Runtime 核对真实子 image 与该声明，不从临时 URL 猜资源身份；具体当前输出和边界见 [主题包与 Capture](../architecture/theme-packs.md#原型绑定与-capture-边界)。原稿存在或 PNG 已同步都不能替代页面缺图检查、状态行为与视觉验证。

## 当前面板的采集边界

共享 TabViewport 在非当前保活面板声明 `data-pb-capture-inactive="true"`。Runtime 的节点扫描、稳定性检查和 Fragment 查找均排除这些子树，不能把其它 Screen 的节点改挂到当前 Screen。当前面板内部隐藏节点、共享外壳及 Overlay 仍保留；所需 Fragment 的可见性、非零 bbox、合法 role 与 Token Evidence 门禁不变。业务页面不得用该属性隐藏应交付的证据节点。
