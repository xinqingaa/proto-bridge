# 原型 Source 约定

> 状态：已定稿
> 用途：当前 `vue3-prototype` 的生产者规范——原型若要被 ProtoBridge 稳定识别，应满足本文的结构与语义。
> 实现对照：V1 Source adapter 依赖 tag、class、title、模板指令与源码结构；V2 instrumented Runtime 读取稳定 `data-pb-*`；具体工作台写法见 [design.md](./design.md)。
> 这不是项目 preset：Core 不绑定业务词表；本文约束的是可解析的 UI 结构。

产物字段见 [artifacts.md](./artifacts.md)；证据分层见 [overview.md](./overview.md)。

---

## 1. 原则

1. **约定先于启发式膨胀**：当前用清晰的 tag、class、角色与 shell 语义表达页面；不要发明引擎认不出的临时层容器。
2. **Source 管逻辑，Runtime 管可见事实**：未打开的弹层可为 `source-only`，但源码中必须存在完整 UI shell 树。
3. **状态可切换**：复杂页用 Variant 驱动 Tab、Sheet 等，便于多次 capture。
4. **角色表保持中立**：当前由 `vue3-prototype` 产出；未来 React 与显式属性协议仍映射到同一套 section / uiShell 语义，不另起业务词表。
5. **组件库是实现细节**：选用 Vuetify、Vant 或自研组件，都必须满足本文当前识别面。

---

## 2. 页面与变体

| 要求               | 说明                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| 稳定身份           | 每页有稳定 `route` / `screenId`，进入页面注册表                       |
| Variant            | 同页业务态显式可切换（如 query、store 标志）：空态、Tab、Sheet 开合等 |
| 一变体一产物       | 需还原的多态分别 capture / generate                                   |
| 列表数据可静态见到 | 列表循环与选项集合应在源码中出现，避免仅运行时字符串拼出整棵 UI       |

---

## 3. 结构角色（sections）

逻辑区块用下列 **kind** 表达（与当前 source 模型对齐）：

| kind         | 含义                                                    |
| ------------ | ------------------------------------------------------- |
| `app-bar`    | 顶栏                                                    |
| `tab-bar`    | 页内 Tab                                                |
| `list`       | 列表区                                                  |
| `chart`      | 图表区                                                  |
| `bottom-bar` | 底栏 / 底部操作区                                       |
| `modal`      | 弹层类区块在 section 层的统称（细分类见 §4 shell kind） |
| `section`    | 普通内容块（卡片、面板、指标组等）                      |
| `unknown`    | 未归类；应尽量少用                                      |

派生语义角色包括：`header`、`tabs`、`section-tabs`、`list`、`modal`、`bottom-actions`、`summary`、`content-section`、`chart`。

### 当前识别面（生产者应满足其一或多项）

当前引擎依靠 tag、class、title 和模板结构识别。生产者应保证这些识别面清晰，不要依赖与 UI 语义无关的偶然类名：

| kind               | 当前推荐识别面                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| `app-bar`          | 名称或 class 含 `app-bar` / `navbar` / `nav-bar` / `toolbar`；或语义化顶栏标签 |
| `tab-bar`          | 含 `tab` / `tab-bar`；页内分段可用明确的 `section-tabs` 语义                   |
| `list`             | 含 `list`，或模板片段包含列表循环；行数据应有源码级循环/集合                   |
| `chart`            | 含 `chart` / `trend` / `donut` 等图表语义                                      |
| `bottom-bar`       | 含 `bottom-bar` / `footer` / `bottom-actions` 等底部操作区命名                 |
| `section`          | 含 `section` / `card` / `panel` 等块级语义                                     |
| `modal`（section） | 含 `modal` / `popup` / `sheet` / `dialog`（细 shell 仍以 §4 为准）             |

---

## 4. UI Shell（临时层）

“主屏之上的临时 UI”是产品语义，不是某一框架 Overlay API 的名字。

### 4.1 Shell kind

| kind                | 用途              | 是否默认进入“必须实现的 UI shell” |
| ------------------- | ----------------- | --------------------------------- |
| `sheet`             | 底部筛选 / 操作板 | 是（有业务/筛选证据时）           |
| `dialog` / `modal`  | 居中确认、详情    | 是                                |
| `drawer`            | 侧滑面板          | 按页面需要                        |
| `popover` / `toast` | 轻量提示          | 默认可不进入必做 shell            |

### 4.2 Overlay 根节点应满足

须让当前静态分析认定“这是一层可开关的 shell”，典型方式（满足其一即可）：

1. 组件/标签名以 `sheet` / `modal` / `popup` / `dialog` / `drawer` 结尾；或
2. 存在显隐绑定（条件渲染或双向绑定），同时具有明确壳层 class，如 `sheet-backdrop`、`modal`、`dialog`、`drawer`。

解析结果进入 source overlays，并进入 plan 的 `overlayPlan`。运行态未打开过可为 `source-only`，仍可能要求实现 UI shell。

未来其它框架 adapter 应映射到相同 shell kind，不另起一套业务语义。

### 4.3 状态命名

| 建议                           | 说明                                  |
| ------------------------------ | ------------------------------------- |
| `*Open` / `*Visible` / `show*` | 控制 shell 显隐                       |
| 业务态与 shell 态分开          | 例如 `activeTab` vs `filterSheetOpen` |

### 4.4 禁止项

- 无识别面的容器冒充弹层；
- 弹层内容只在运行时拼接，源码树中不出现；
- 无注册表的隐式路由；
- 用看起来像浮层的普通块代替显式 shell 语义。

---

## 5. Runtime 与 Source 的关系

Runtime snapshot 另有一套可见角色，如 `app-bar`、`tab-bar`、`list`、`list-item`、`bottom-bar`、`modal`、`card`，依据 DOM、`role`、class、几何位置等推断。

V2 instrumented Runtime 使用独立 Capture Protocol：语义节点同时携带 `data-pb-id` 与 `data-pb-role`；重复实例共享模板 `data-pb-id`，并用非敏感、业务稳定的 `data-pb-key` 区分。禁止把数组 index、CSS selector、DOM path、随机 class 或 Workbench 临时 handle 持久化为 Fragment identity。

正式 Fragment Capture 在 Preflight 中重新打开隔离 Runtime，并验证 `screenId + data-pb-id + data-pb-key` 唯一解析且 readiness/semantic snapshot 一致。检查器当前选中的临时 DOM handle 或 selector 只能帮助定位；缺少稳定身份、重复模板缺少 `data-pb-key`、或目标在准备后的页面中不存在时都必须阻止创建 Job。

| 冲突时                             | 裁决                     |
| ---------------------------------- | ------------------------ |
| 逻辑架构、未打开的 shell、状态意图 | **Source**               |
| 可见文案、bbox、当前屏布局         | **Runtime / screenshot** |

Source 有 `chart` kind；runtime 不一定有独立 `chart` role。细节词表以附录为准，随 Core 演进可更新附录而不改 §3–4 的角色含义。

---

## 6. 组件库映射（当前写法）

本规范不规定使用哪个组件库。当前对接某库时，组件的 tag 或 class 必须能够命中 §3–4；**PBWork（Vue + Vuetify）的具体写法与强制 `data-pb-*` 见 [design.md §19 PB 源码约定](./design.md#19-pb-源码约定)**。

| 约定角色 / shell   | 选用组件（PBWork）      | 如何满足当前识别面                        | 备注                                 |
| ------------------ | ----------------------- | ----------------------------------------- | ------------------------------------ |
| `app-bar`          | `v-app-bar` 或顶栏根    | class 含 `app-bar` / `navbar` / `toolbar` | 同时写 `data-pb-role` + `data-pb-id` |
| `tab-bar`          | `v-tabs` 外层           | class 含 `tab-bar` / `section-tabs`       | `data-pb-role="tab-bar"`             |
| `list`             | `v-list` 或列表容器     | class 含 `list`；行在源码循环中           | 行节点写 `data-pb-id`                |
| `section`          | `v-card` / 面板根       | class 含 `section` / `card` / `panel`     | `data-pb-role="section"`             |
| `chart`            | 图表容器                | class 含 `chart` / `trend` 等             | `data-pb-role="chart"`               |
| `bottom-bar`       | 底部操作区              | class 含 `bottom-bar` / `bottom-actions`  | `data-pb-role="bottom-bar"`          |
| `sheet`            | `v-bottom-sheet` 内容根 | 显隐绑定 + class 含 `sheet`               | `data-pb-shell="sheet"`              |
| `dialog` / `modal` | `v-dialog` 内容根       | 显隐绑定 + class 含 `dialog` / `modal`    | `data-pb-shell`                      |
| `drawer`           | 临时侧滑层              | 显隐绑定 + class 含 `drawer`              | `data-pb-shell="drawer"`             |

规则：换库只换映射方式，不改本文的角色与 shell 定义。

工作台使用 Vue + Vuetify，并**强制**写入 `data-pb-id` / `data-pb-key` / `data-pb-role` / `data-pb-shell`。V2 instrumented Runtime 读取这些标记；V1 Source/Runtime 仍要求同时满足 tag / class 启发式。完整规则见 [design.md](./design.md)“PB 源码约定”。

---

## 7. 后续 source 能力

| 项                                    | 说明                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| 显式 `data-pb-role` / `data-pb-shell` | V2 instrumented Runtime 已消费稳定属性；后续扩展全量 Registry 与 Source adapter     |
| `react-prototype`                     | 读取 React 源码并映射到本文同一角色表                                               |
| 中立 Source IR                        | 统一承载 `sections / state / interactions / routes / lifecycle / uiShells / tokens` |

这三项作为同一组 source 能力统一设计：显式属性提供跨组件库的稳定语义，Vue / React adapter 将框架源码映射到同一 IR。它们是未来扩展方向，不是当前工作台或真实 Vue 项目的迁移前置。

---

## 附录 A：当前 Core 命中条件（实现快照）

以下描述当前 `vue3-prototype` / runtime 的启发式，供生产者对照与回归；在显式属性协议实现前，这些规则就是当前可执行识别面。

### A.1 Source `inferSectionKind`（haystack = tag + class + title）

- `bottom-bar`：`bottom-bar` / `footer`
- `modal`：`modal` / `popup` / `sheet` / `dialog`
- `app-bar`：`app-bar` / `navbar` / `nav-bar` / `header` / `toolbar`
- `tab-bar`：`section-tabs` / `section-chip` / `tab` / `tab-bar`
- `chart`：lexicon `chartTerms`，如 chart、donut、trend、indicator
- `list`：lexicon `listTerms`，或模板片段含列表循环指令
- `section`：lexicon `sectionTerms`，如 section、card、panel、metric

### A.2 Source `isOverlayRoot`

1. tag 名以 `sheet|modal|popup|dialog|drawer` 结尾；或
2. 存在 `v-model` / `v-if`，且 class 像 `sheet-backdrop` / `modal` / `popup` / `dialog` / `drawer`。

### A.3 Runtime `SnapshotNodeRole`（节选）

`role=dialog` 或标记含 modal/popup/sheet → `modal`；含 tab → `tab-bar`；`ul`/`ol`/list → `list`；fixed/sticky 贴顶/底 → `app-bar` / `bottom-bar` 等。

代码位置：`packages/core/src/source/vue3-prototype/vue-sfc.ts`、`snapshot/browser-capture/extract-rendered-page.ts`、`shared/semantic-lexicon.ts`。

### A.4 无组件库时的参考写法

无组件库时，用稳定 class 和显隐绑定即可满足当前约定，例如：

- `class="app-bar"`、`tab-bar`、`holding-list` + 列表循环；
- `v-if="filterSheetOpen"` + `sheet-backdrop` + `filter-sheet`。

---

## 相关文档

- [design.md](./design.md) — 原型工作台范围与 Vue / Vuetify 写法
- [artifacts.md](./artifacts.md) — `overlayPlan` 等产物字段
- [overview.md](./overview.md) — 证据分层与适配器
