# PBWork 开发规范

## 1. 分区

PBWork 有三个 UI 分区：

| 分区 | 路径 | 允许依赖 |
| --- | --- | --- |
| Workbench | `src/workbench`、`src/capture` | `src/workbench/ui`、Vuetify、Core Service Contract |
| Prototype Design System | `src/design-system` | Token、Theme、Contract、共享实现、Vuetify |
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

## 4. Prototype UI

- 形状匹配时必须使用 PBWork Design System 组件。
- 页内局部 UI 仅用于业务特有结构，全部设计值走 `--pb-*`。
- 使用组件公开 props/slots/events，不复制其样式或手势实现。
- 页面必须遵守统一壳、导航、滚动、Overlay 和 Variant 规范。
- 所有进入 Capture 的 Screen 遵守根 [Authoring Contract](../../../docs/reference/prototype-authoring.md)。

## 5. Registry 与 Contract

Component 变更是一个原子工作单元：

1. 修改 JSON Contract；
2. 修改 Vue 实现；
3. 修改 Component Registry controls/metadata；
4. 按需修改 scenarios；
5. 修改对应组件文档；
6. 修改测试。

Screen 变更必须同步 Prototype Registry、required boundary、Action/Scenario 和 Runtime 测试。

## 6. Token 与 Theme

- Token 使用语义命名，不使用业务名或具体色名表达用途。
- 组件只能绑定 `bindTokens.ts` 允许的 Token。
- Theme 只覆盖值，不改变 Token 语义和组件绑定。
- 不在组件实例、页面 style 或 Playground 中引入自由换绑。
- 新 Token 先证明跨组件/页面价值，再决定是否进入 Bind 池。

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

## 9. 文档提醒

只要任务修改 Token、Theme、Component Contract、共享手势、Prototype Registry 或 Runtime Contract，Agent 必须：

- 开始时指出需要同步的文档；
- 在同一变更中更新文档；
- 交付时列出已同步的文档；
- 运行 `pnpm docs:verify`。

## 10. 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm test:e2e:runtime
```

修改 Workbench/Capture 交互时补跑相应 Playwright spec；修改 Evidence 全链路时运行 `pnpm test:e2e:evidence-slice`。
