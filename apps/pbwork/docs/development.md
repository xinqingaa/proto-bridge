# PBWork 开发规范

## 1. 分区

PBWork 有三个 UI 分区：

| 分区                       | 路径                            | 允许依赖                                            |
| -------------------------- | ------------------------------- | --------------------------------------------------- |
| Workbench                  | `src/workbench`、`src/capture`  | `src/workbench/ui`、Vuetify、Core Service Contract  |
| Prototype Design System    | `src/design-system`             | Token、Theme、Contract、共享实现、Vuetify           |
| Business Prototype Runtime | `src/prototypes`、`src/runtime` | Design System、Prototype Registry、Runtime Contract |

禁止：

- Workbench 复用携带 `data-pb-*` 的 Prototype 组件；
- Prototype 使用 `src/workbench/ui`；
- 页面直接绕开组件库创建另一套通用控件；
- UI 层复制 Core Selection、Job、Evidence 或风险枚举。

## 2. Vue 与 TypeScript

- 使用 `<script setup lang="ts">` 和明确的 props/emits 类型。
- 可复用行为进入 composable 或 Design System，共享前先证明跨页面用途。
- 业务页面不读取组件内部 DOM/class 来驱动状态。
- Router query、history state 和 localStorage 输入必须解析、验证和规范化。
- 异步流程提供 loading、empty、error 和取消/重试边界。
- 不用任意 timeout 作为导航、Bridge 或 Capture 正确性的主要保证。

## 3. Workbench UI

- 常用 Button、IconButton、Select、Checkbox、TextField、Tabs 等从 `src/workbench/ui` 复用。
- Vuetify 是底层能力，不是每个 View 自行决定视觉契约的入口。
- 一级导航保留可访问名称和 Tooltip。
- 空态、失败态、滚动、焦点和深浅主题在真实工作台宽度下验证。
- Evidence 展示不改写 Store JSON，不隐藏 fixed refs、unknown、conflict 和 risk。
- Prototype lifecycle Store 是 PBWork 生命周期及正式产物关联的事实源；Registry lifecycle 不得重新成为运行时默认值或重置目标。
- 新 Prototype ID 必须从“进行中”开始；禁止在 UI、迁移或测试夹具中跳过前序阶段。
- PBWork 的正式 Capture 只由“待确定 → 已定稿”触发，固定为整原型范围；画布、Inspector、原型列表和 Evidence 详情不提供手工采集或重生成入口。
- 已定稿回退必须先清理该记录绑定的 Bundle 并解除正式产物引用；已归档没有出边，所有生命周期都不提供删除原型操作。
- 修改 `src/prototypes/{prototypeId}` 前先检查 PBWork 生命周期：已定稿先回退待确定，已归档不得修改。该约束是作者流程门禁，不是完整 RBAC。

## 4. Prototype UI

- 形状匹配时必须使用 PBWork Design System 组件。
- 页内局部 UI 仅用于业务特有结构，全部设计值走 `--pb-*`。
- 使用组件公开 props/slots/events，不复制其样式或手势实现。
- 页面必须遵守统一壳、导航、滚动、Overlay 和 Variant 规范。
- 产品 `onBeforeRouteLeave` 先认 `isForcedRuntimeNavigation()`；Workbench 树和 Capture 换页由 Runtime 强制导航打开目标页。
- 所有进入 Capture 的 Screen 遵守根 [Authoring Contract](../../../docs/reference/prototype-authoring.md)。
- DS 业务实例使用业务 `inspectId`；业务局部证据节点显式声明 id、role、key 和 Token bindings，详见[语义标记与证据门禁](../../../docs/reference/semantic-authoring.md)。

### 样式实现铁律

Design System 与现役业务原型的样式遵循同一套基础规则：

- **只用 Flex 或常规文档流布局**。禁止 `grid` / `inline-grid`、所有 `grid-*` 属性与 `place-items` / `place-content` / `place-self`；Workbench 壳不属于该约束范围。
- **所有设计量必须消费语义 Token**。颜色、间距、尺寸、比例尺寸、圆角、边框、排版数值、阴影、透明度、层级、动效、滤镜和变换距离只能经 `var(--pb-*)` 使用；Token 的具体值只能定义在 Foundation 与 Theme。具有设计含义的 `0` 也不是例外。
- 约束覆盖 `.vue` 的 style/template/script、共享 TS helper、内联/生成样式与 Vuetify 等 vendor 视觉 props；不能把固定数字从 CSS 搬到 `:size`、`:height`、`:elevation`、`:timeout` 或 JS style object 规避审计。
- 组件和原型样式不得用 `var(--pb-*, 4px)` 一类 literal fallback 绕过 Token。缺少值时先补 Token，再消费 Token。
- `calc()` 只能组合 Token 变量或运行时派生变量，不能带裸数值。
- DOM 测量、索引或指针状态产生的运行时几何值可经 CSS custom property 进入样式；它必须是派生结果，不得成为固定默认设计值、组件公开自由样式入口或 Contract 外依赖。
- CSS 的结构语法（例如 `display: flex`、常规文档流、定位方式、`auto`、`none`）不是设计量；其允许范围由样式门禁固定。任何带视觉或可测量含义的值不在此例外内。
- Grid 禁令是 PBWork Producer Contract，不以单个浏览器当前支持度为例外；它避免向实现 Agent 提供二维布局的错误结构语义。

## 5. Registry 与 Contract

Component 变更是一个原子工作单元：

1. 修改 JSON Contract；
2. 修改 Vue 实现；
3. 修改 Component Registry controls/metadata；
4. 按需修改 scenarios；
5. 修改对应组件文档；
6. 修改测试。

Screen 变更必须同步 Prototype Registry、required boundary、Action/Scenario 和 Runtime 测试。

语义标记变更必须同步 Authoring Contract、语义门禁规范、prototype Skill、检查单和 authoring lint/Runtime tests。已确定属于交付范围的证据节点缺少标记时必须阻断；只能启发式判断的疑似遗漏应产生 warning。

## 6. Token 与 Theme

- Token 使用语义命名，不使用业务名或具体色名表达用途。
- 组件只能绑定 `bindTokens.ts` 允许的 Token。
- Theme 只覆盖值，不改变 Token 语义和组件绑定。
- 不在组件实例、页面 style 或 Playground 中引入自由换绑。
- 新 Token 先证明跨组件/页面价值，再决定是否进入 Bind 池。
- Component Contract 与 Inspector 必须完整声明组件实际消费的 Token；实现不得存在 Contract 未记录的设计值依赖。
- Inspector `getTokenBindings` 与 JSON Contract 的槽位集合必须完全一致；静态一致性测试阻止任一侧单独漂移。
- 修改 Component/Token/Theme Schema、Component Contract、role、Token Catalog、Bind 池或 Theme 后运行 `pnpm ds:target-sync:verify`。连续设计迭代可暂缓 Flutter 视觉精修，但漂移必须保持可见；稳定批次统一更新 Target 映射/API 和 sync baseline。

## 7. 可访问性

- 使用正确 HTML 元素和 ARIA；`data-pb-role` 不能代替可访问语义。
- 所有交互具有键盘路径、可见焦点和可访问名称。
- Icon-only control 必须有 label/tooltip。
- Dialog/Sheet 管理焦点和关闭行为。
- 状态变化使用适当 live region/alert。
- 触控目标满足 `sizing.touch`。

## 8. 滚动和手势

- 每个 Screen 只有一个主纵滚所有者。
- 使用共享 pointer/touch 仲裁。
- `swipe` 与 `mouseSwipe` 分开。
- 横向滚动区使用 `data-horizontal-scroll` 和共享 hook。
- 表单控件、可编辑区域和 `data-no-swipe` 不触发父级翻页。
- 拖动后抑制合成 click，不能用整块 `pointer-events: none` 规避。

## 9. 新原型与测试边界

新增或替换业务原型时，MUST 遵守：

产品定义、信息架构、交互与视觉编排须先按[原型设计工作流](./prototypes/design-workflow.md)形成 `status: approved` 的 `prototypes/{id}/docs/design.md`；固定路径服务于可发现性，不能代替设计质量判断。

1. **`packages/core/src/v2/fixtures` 只保留一套金标**（现行：`reference-case-slice`，导出 `fixtures.referenceCaseSlice`）。禁止按原型再新增 `fixtures/<prototype>-*` 目录。
2. Core / MCP / Consumer 单测与脚本复用该金标。需要新对象形状时，改金标或加最小变体字段，不按 App 复制整包。
3. 新原型允许的测试上限：
   - Registry / 屏清单单测（必要）；
   - 至多 1 条 Runtime 冒烟 e2e（关键屏可开，可选覆盖 1 个 Scenario）；
   - 通用能力（canvas / inspector / capture / navigation）改挂现有样板原型，不为新原型复制全套 e2e。
4. Flutter 还原演示 ≠ Core fixture；有 Target 验收需求时走 acceptance / 既有 evidence-slice，不为此再生金标树。
5. 例外：仅当 Evidence **契约本身**变更且现有金标无法表达时，才扩金标——且仍保持单目录，不按原型分叉。

金标职责是 Evidence 引擎离线样本，不是现役原型资产。目录与导出命名必须保持中性，不得绑死某个业务原型 ID。

## 10. 文档提醒

只要任务修改 Token、Theme、Component Contract、共享手势、Prototype Registry 或 Runtime Contract，Agent 必须：

- 开始时指出需要同步的文档；
- 主动检查 Target sync fingerprint，并说明是本轮同步还是保留 pending；
- 在同一变更中更新文档；
- 交付时列出已同步的文档；
- 运行 `pnpm docs:verify`。

## 11. 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
```

修改 Workbench/Capture 交互时补跑相应 Playwright spec；修改 Evidence 全链路时运行 `pnpm test:e2e:evidence-slice`。
新原型交付验证以上述第 9 节边界为准，禁止为「每个新 App」再铺一套 Core fixture 与全量 e2e。
