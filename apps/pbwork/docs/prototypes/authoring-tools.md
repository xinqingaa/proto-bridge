# 制作工具

这些工具只减少声明重复；[Authoring Contract](../../../../docs/reference/prototype-authoring.md) 和 Core 仍决定身份、角色、完整性与采集语义。

## Screen 就近声明

原型元信息放在 `src/prototypes/{id}/prototype.ts`（默认导出 `PrototypeRecord`），Screen 放在 `screens/{slug}/screen.ts` 与同目录 Vue 文件。`prototypes/registry.ts` 用 glob 汇总，Router、Workbench 和 Runtime 继续消费同一份登记结果。

```ts
import { defineScreen, fragment, screenScope } from '@/authoring/define-screen';
export const scope = screenScope('demo', 'home');
export default defineScreen({
  prototypeId: 'demo', slug: 'home', label: '首页',
  view: 'demo/screens/home/Home.vue', defaultVariantId: 'default',
  fragments: [fragment('root', { required: true }), fragment('row', { key: 'task-a', required: true })],
  variants: [{ id: 'default', label: '默认' }],
});
```

`scope.screenId`、`scope.id(slot)`、`scope.ref(slot, key?)` 与 `scope.node(slot, role, { style?, tokens?, key? })` 补齐 Screen 身份和 pbId 前缀。Action、Scenario、非默认 Variant 和跨 Screen 引用仍须作者显式声明；不从 DOM 或截图推导。

Screen 可通过 `appearanceEvidence.rules` 声明业务用法与额外外观样本，供 Core 的“实现交付”计划减少重复观察；规则类型直接复用 Core Runtime Contract。它与共享业务执行的 `appearancePolicy` 各自负责不同边界。声明字段、条件绑定/资源分支要求、缺少所选代表态时的局部回退及未实拍来源见[外观用法声明](../../../../docs/reference/prototype-authoring.md#实现交付的外观用法声明)。Workbench 不自行计算主题复用政策。

`fragment(..., { required: true })` 只声明 default Variant 的最小完整性边界。`pnpm pb:screens:generate` 生成 `src/prototypes/generated/default-boundaries.json`；该文件应纳入版本管理，审阅生成 diff。开发启动和构建前会生成；单测独立对比声明与已入库结果，防止漏生成。空边界、重复声明和重复 Screen 拒绝生成。变更声明后可直接运行此命令，不必等待构建。

## 一次声明样式和证据

```vue
<script setup lang="ts">
import { vPb, pbStyle } from '@/authoring/pb-style';
import { scope } from './screen';
</script>
<template>
  <p v-pb="{ id: scope.id('title'), role: 'text', style: { color: 'color.on-surface', typography: 'typography.title' } }">标题</p>
  <span v-pb="{ id: scope.id('remaining'), role: 'text', key: 'task-a' }"
    :style="pbStyle({ color: 'color.on-surface-muted', typography: 'typography.caption' })">还差两次</span>
</template>
```

`vPb` 是 `<script setup>` 的本地 `v-pb` 指令。它写入实际元素的 `data-pb-id`、`data-pb-role`、可选 `data-pb-key`；`style` 或同元素 `pbStyle()` 同时产生 CSS `var(--pb-*)` 和 `data-pb-token-*`。响应式更新会移除旧声明留下的样式、key 与绑定。只对原生元素使用此指令，DS 实例传 `inspectId`，绑定仍由 Registry 提供。DS 内部的语义部件通过 Registry 的显式 `semanticParts` 归属沿用组件绑定；局部业务子节点不能借用祖先绑定来通过完整性检查。

支持背景、颜色、圆角、字阶、阴影、描边、gap、padding/margin（含各方向）和宽高。颜色仅接受颜色键，字阶仅接受字阶键；`padding`/`margin` 支持纵横二元组，分别生成四个方向的 Token Facts，不能把键数组伪装成一个键。`transparent`/`none` 使用 Core 允许的字面量；实现常量只产生 CSS，不进入 Token Evidence。

需要描述结构或子部件的证据时可显式传 `tokens: { spacing: 'spacing.md' }`；它不改变根元素的样式。这是作者的证据声明，不是 CSS 推断，也不能覆盖 DS Contract。常规局部样式优先用 `style`，避免 CSS 与 Evidence 双写。

类型由 `pnpm ds:keys:generate` 从键目录、常量表和 Contract `componentTokens` 生成到 `design-system/theme/generated/keys.ts`，应纳入版本管理。未知键和错误键族在类型检查失败；`theme-keys-generated.test.ts` 检查生成新鲜度。`theme/slots.ts` 是样式生成和 Inspector 属性观察的共享槽字典。

## 共享运行套件

`runtime/prototype/index.ts` 导出：

- `usePrototypeStorage({ prototypeId, name, schemaVersion, defaults, validate, migrate? })`：以原型和模型名隔离存储，验证版本与数据，可显式迁移；损坏、不可用或配额耗尽不阻止当前模型运行。
- `prototypeNavigation(router, route, prototypeId)`：`enter` 进栈并写父路径链，`replace`/`variant` 保留父引用，`back` 在嵌入画布恢复父级、独立窗口返回历史；深链回退到显式 fallback。`tab` replace 根目的地，跨 Tab `enter(to, targetHome)` 先规范父级，`home` replace 清空中间链。
- 主题偏好 API：复用 `useThemePackPreference`、`writeThemePackPreference`、`useSystemThemeMode`，实际主题应用仍由 RuntimeLayout 统一完成。返回时按原型当前主题与模式盖章，system 转成具体模式。
- `useClock()`：复用 Date 时钟；Capture 从 `prototype.ts` 的 `clock` 声明安装时间与时区，交互模式读真实时间。
- `useCaptureState(prototypeId, scope, read, options?)`：从 `@/runtime/capture-state` 引入；`scope` 分别使用 `business`、当前完整 `screenId` 或稳定的嵌套局部名称。读取器只读返回完整业务/命令私有状态与局部 UI 状态，在 Vue scope 销毁时注销。例如 `useCaptureState("demo", "demo.home", () => ({ draft: draft.value, open: open.value }))`。仅在覆盖全部可采 Screen 及影响检查点的嵌套状态后，在 `prototype.ts` 声明 `captureState: true`。缺少 business/当前 Screen 覆盖不会自动从 DOM 补齐。第 4 参数 `options.appearancePolicy` 缺省 `shared`；任何当前挂载读取器声明 `independent` 都拒绝整个原型的外观复用，适用于偏好选中态随主题改变的设置页。此默认值不绕过原型 opt-in 和状态覆盖要求。Scenario 的 `appearancePolicy` 缺省 `independent`，只有主题无关业务流程显式声明 `shared`。完整边界见[原型制作规范](../../../../docs/reference/prototype-authoring.md#跨主题共享执行的作者声明)。
- `usePrototypeCaseReset(reset)`：在当前 view 注册 authored fixture 的同步准备函数。Capture `prepare` 和 `reset` 均触发，即使 URL 未变化；函数应复位共享业务状态、表单、Overlay、选中和滚动等局部状态。普通产品导航不触发此钩子，不能以路由 query 的改变代替实际状态准备。演示 fixture 与真实首次数据分离，隔离保存副作用。

Runtime 的稳定等待会等字体、Vue 渲染及当前有限动画结束，再检查语义节点；共享面板退出期间仍存在的遮罩不会被视作稳定结果。循环环境动效不纳入该等待，检查目标被真正遮挡时仍应失败。

独立与嵌入 Runtime 的外层文档均固定于视口并裁切溢出，滚动由 Screen 或共享 Overlay 内的明确所有者承担；聚焦滑入中的控件不得滚动整个文档或让设备画面移位。裁切不关闭内容区的滚轮、触摸或键盘滚动。
- `PrototypeShell`：AppBar、内容与 navigation 插槽；`launch` 为真时只显示 `launch` 插槽。它是组合外壳，不新增启动页业务或品牌组件。
- `PrototypeTabs`：组合已有 TabViewport 与 Tabbar，保活、关闭横滑、使用 `motion.duration-instant`；父级把更新交给导航的 `tab()`。

## 脚手架与验证

在仓库根执行 `pnpm pb:new-prototype <id>`，ID 使用小写连字符格式；已有目录拒绝覆盖。生成原型声明、独立且继承基础包的主题包、`status: draft` 的 `docs/design.md`、外壳、首页、模型存储、Date 时钟和一条登记测试，并生成 default 边界。无需手改登记表。模板不绑定仅供 Gallery/Playground 的 `yike`。

空骨架可以执行 Preflight 与定稿技术验收；它不代表业务设计批准。开始真实业务/视觉制作前，按[设计工作流](./design-workflow.md)完成需求采访与批准。

`pnpm test:e2e:scaffold` 生成临时原型，构建后执行真实 Core Preflight、两次同 Case 采集（比较时间文本与截图字节）、Workbench 完整定稿。Store 与固定引用结果保存在命令输出的系统临时目录；结束时移除临时源码并重新生成边界，不改变日常 Workspace。

## 制作诊断与正式校验

Workbench 浏览、刷新、切换 Screen 时不执行整页制作检查，不显示检查 loading、检查面板或工具栏入口，也不以声明诊断禁止原型交互。元素 Inspector 保留选中节点的信息与启发式提示。

正式采集继续执行 Core 的 Preflight 和 Runtime Capture readiness，覆盖必需节点、身份、role、Token Evidence、几何与遮挡等声明问题；Block 仍阻止完整性声明和正式交付。这些技术校验不代表业务、视觉或体验验收。

## 模拟设备与安全区

公共PhoneShell只绘制中性的模拟状态栏（固定09:41）与底部指示条，不使用业务背景渐变，不属于原型业务节点或Evidence。设备选择只表达逻辑视口尺寸，不声称复刻指定型号或OS状态栏。草稿外壳维持原样，不提取为业务布局。

Runtime默认模拟安全区为顶部44px、底部20px，与设备外壳一致；移动浏览器实际env安全区与默认值取较大者，不相加。独立Runtime与Core Capture使用相同默认值，嵌入状态不改变业务布局。背景可铺满，交互内容避让保护区。PrototypeShell的默认AppBar负责顶部，定制app-bar插槽由Shell负责顶部，二者只消费一次；有navigation时由底部导航消费底区，无navigation的普通页由Shell消费，launch保留全屏背景。Toast底部使用底区与常规间距较大者，Sheet沿用大于底区的内容留白。资源预览已经在scroll宿主扣除安全区，因此该宿主的子组件safe变量为零，避免重复避让；覆盖整个viewport的Overlay仍使用完整环境。

原型页面默认不显示滚动条，包括嵌套内容和弹层；保留滚轮、触摸和键盘滚动。只有用户明确要求时才允许显示滚动条。此规则覆盖嵌入、独立 Runtime 和采集，不改变 Workbench 自身滚动条。
