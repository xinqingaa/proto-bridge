# 原型工作台设计定稿

> 状态：已定稿
> 范围：`examples/` 内原型工作台的定位、信息架构、技术栈与首期展示范围
> 非目标：本文件不设计 Flutter 实现链路、PB 产物消费方式或跨端验收流程
> 当前 PB 可识别的原型写法见 [source-conventions.md](./source-conventions.md)

---

## 1. 定位

在 `examples/` 内建设一套可运行的**原型工作台**。工作台也是原型平台本身，用来集中展示和维护设计基础、组件与真实交互页面。

工作台首期回答四个问题：

1. 当前有哪些 Token 与主题；
2. 当前有哪些基础组件与复杂组件；
3. 一套业务原型包含哪些页面和状态变体；
4. 组件或页面是否满足原型平台自身的契约与 PB 当前可识别的源码约定。

工作台不是低代码页面生成器。原型页面使用真实 Vue 源码编写，业务交互、状态和路由也保留在正常的 Vue 工程中。

长期工作流中，原型平台领先建设主题、组件与页面；Flutter 使用共享的设计系统定义实现生产组件和页面；PB 提供比组件 Schema 更完整的页面源码、运行态、视觉与目标工程上下文。该链路不属于工作台首期展示范围。

---

## 2. 首期范围

### 必做

| 能力 | 首期要求 |
|------|----------|
| 三栏工作台 | 左侧资源导航、中央预览画布、右侧检查面板 |
| Tokens | 展示颜色、字体、间距、圆角等设计基础 |
| Themes | 至少展示一套完整主题及其 Token 使用 |
| Components | 展示基础组件和复杂组件，并提供独立 Playground |
| Prototypes | 展示业务原型列表、页面列表与页面预览 |
| Screens | 每个页面有稳定身份、路由与源码入口 |
| Variants | 同一页面可以切换并恢复不同业务状态 |
| 手机预览 | 使用手机外框承载真实原型运行时，支持缩放和设备尺寸切换 |
| 契约检查 | 展示当前对象的组件信息、Props/State、Token 使用、Schema 错误与 PB 标记 |

### 不做

- Flutter 页面实现、Flutter 预览或跨端截图对照；
- PB generate / reconstruct 的页面内触发和产物浏览；
- Agent 实现、代码安装或目标工程验证；
- JSON 驱动的页面渲染引擎；
- 重型拖拽低代码画布；
- 权限、多租户、评论协作后端。

以上能力在真实工作流程明确后另行设计，不影响工作台建设。

---

## 3. 技术栈

| 层 | 选择 |
|----|------|
| 框架 | Vue 3 + Vite + Vue Router + Pinia |
| UI | Vuetify 3 |
| 工作台壳 | Vue + Vuetify |
| 组件 Playground | Vue + Vuetify，展示平台组件的真实参考实现 |
| 原型页面 | 真实 Vue 源码，优先使用平台组件与 Vuetify |
| 手机预览 | 自研外框 + iframe |
| 设计系统描述 | Token、Theme 与组件元数据；复杂组件可使用 JSON Schema 描述数据、Props 与状态契约 |

Vue 和 Vuetify 是原型平台的主要实现技术。组件元数据或 JSON Schema 不替代 Vue 页面源码，也不等同于 PB 产物。

iframe 内的 overlay 即使挂载到 `body`，仍被限制在原型运行时边界内，因此首期不建设额外的 contained overlay 体系。

---

## 4. 信息架构

```text
┌────────────────┬─────────────────────────┬──────────────────┐
│ 资源导航       │ 预览画布                │ 契约检查         │
│                │                         │                  │
│ · Tokens       │ 组件 Playground         │ · Contract ID    │
│ · Themes       │ 或手机页面预览          │ · Props / State  │
│ · Components   │                         │ · Parts          │
│ · Prototypes   │                         │ · data-pb 标记   │
│ · Screens      │                         │ · Schema 错误    │
│ · Variants     │                         │ · Token 使用     │
└────────────────┴─────────────────────────┴──────────────────┘
```

### 对象模型

| 对象 | 含义 |
|------|------|
| Token | 颜色、字体、间距、圆角等最小设计值 |
| Theme | 一组有语义的 Token 组合 |
| Component | 基础组件或复杂组件的参考实现与元数据 |
| Component Schema | 复杂组件的数据、Props、状态与组成描述；不承担页面渲染 |
| Prototype | 一套包含多页面和多状态的业务原型 |
| Screen / Page | 有稳定 ID、route 和源码入口的真实页面 |
| Variant / State | 同页的空态、Tab、筛选、弹层开合等可恢复业务状态 |

---

## 5. PB 源码约定

当前 PB Core 使用 tag、class、title、模板指令和源码结构进行启发式分析。真实项目没有 `data-pb-*` 标记，现阶段不要求迁移，也不改变 Core 的现有识别规则。

工作台属于新建原型平台，应同时做到：

1. 按 [source-conventions.md](./source-conventions.md) 使用清晰的 tag / class，保证当前 PB 可以直接识别；
2. 在关键结构和临时层上增加 `data-pb-role` / `data-pb-shell`，为未来显式协议保留稳定标记；
3. 不假设当前 PB 已经读取 `data-pb-*`，当前还原质量仍以现有启发式链路验证。

示例：

```vue
<v-app-bar class="app-bar" data-pb-role="app-bar" />

<v-list class="holding-list" data-pb-role="list" />

<v-bottom-sheet
  v-model="filterSheetOpen"
  class="filter-sheet"
  data-pb-shell="sheet"
/>
```

`data-pb-*` 与 React source adapter 属于同一阶段的后续 source 能力：未来由不同框架共享显式角色与 shell 协议，并映射到 PB 已有的 sections / overlays 语义。该方向不阻塞工作台首期建设。

---

## 6. 首期展示标准

| 能力 | 最低标准 |
|------|----------|
| 工作台壳 | 三栏可用，导航、画布与检查面板状态联动 |
| 设计基础 | Token 与 Theme 页面可以直观看到最终视觉 |
| 组件库 | 同时展示基础组件与至少一个复杂组件 |
| Playground | 可修改代表性 Props / State 并看到组件变化 |
| 原型 | 至少一套多页面业务原型 |
| Variant | 至少一个复杂页面具有两个以上可恢复状态 |
| 手机画布 | iframe 中运行真实路由页面，支持尺寸与缩放 |
| 约定验证 | 工作台源码同时具备当前启发式识别面和未来 `data-pb-*` 标记 |

---

## 7. 后续 source 能力

工作台首期完成后，再统一评估以下 source 能力，不在当前阶段拆成零散兼容改造：

| 能力 | 目标 |
|------|------|
| 显式 `data-pb-*` 协议 | 用稳定属性替代 tag / class 角色猜测，同时保留现有 sections / overlays 语义 |
| React source adapter | 读取 React 源码，并映射到与 Vue 相同的中立语义 |
| 中立 Source IR | 统一承载 sections、state、interactions、routes、lifecycle、uiShells 与 tokens |

---

## 相关文档

- [source-conventions.md](./source-conventions.md) — 当前可执行的原型 Source 约定
- [overview.md](./overview.md) — PB 能力、证据分层与适配器
- [artifacts.md](./artifacts.md) — PB 产物字段与权威关系
- [usage.md](./usage.md) — CLI / MCP / Core 用法
