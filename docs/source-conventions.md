# 原型 Source 约定

> 状态：已定稿  
> 用途：**框架无关**的生产者规范——任意原型（自研 / 组件库 / Vue / 未来 React）若要被 ProtoBridge 稳定识别，应满足本文的结构与语义。  
> 实现对照：当前 Core 启发式见文末附录；落地到具体 UI 库的映射见 [design.md](./design.md) 附录（本期 Vuetify）。  
> 这不是项目 preset：Core 不绑定业务词表；本文约束的是可解析的 **UI 结构契约**。

产物字段见 [artifacts.md](./artifacts.md)；证据分层见 [overview.md](./overview.md)。

---

## 1. 原则

1. **约定先于启发式膨胀**：用稳定角色与 shell 语义表达页面；不要发明引擎认不出的临时层容器。  
2. **Source 管逻辑，Runtime 管可见事实**：未打开的弹层可为 `source-only`，但源码中必须存在完整 UI shell 树。  
3. **状态可切换**：复杂页用 Variant 驱动 Tab、Sheet 等，便于多次 capture。  
4. **跨框架共用同一角色表**：`vue3-prototype` 与未来的 `react-prototype` 映射到同一套 section / uiShell 语义，不另起业务词表。  
5. **组件库是实现细节**：选用 Vuetify、Vant 或自研组件，都必须先满足本文；库 → 角色的对照写在工作台/示例设计文档，不写进本规范正文。

---

## 2. 页面与变体

| 要求 | 说明 |
|------|------|
| 稳定身份 | 每页有稳定 `route` / `screenId`，进入页面注册表 |
| Variant | 同页业务态显式可切换（如 query、store 标志）：空态、Tab、Sheet 开合等 |
| 一变体一产物 | 需还原的多态分别 capture / generate |
| 列表数据可静态见到 | 列表循环与选项集合应在源码中出现，避免仅运行时字符串拼出整棵 UI |

---

## 3. 结构角色（sections）

逻辑区块用下列 **kind** 表达（与当前 source 模型对齐；名称跨 adapter 保持稳定）：

| kind | 含义 |
|------|------|
| `app-bar` | 顶栏 |
| `tab-bar` | 页内 Tab |
| `list` | 列表区 |
| `chart` | 图表区 |
| `bottom-bar` | 底栏 / 底部操作区 |
| `modal` | 弹层类区块在 section 层的统称（细分类见 §4 shell kind） |
| `section` | 普通内容块（卡片、面板、指标组等） |
| `unknown` | 未归类；应尽量少用 |

派生语义角色（便于 plan）包括但不限于：`header`、`tabs`、`section-tabs`、`list`、`modal`、`bottom-actions`、`summary`、`content-section`、`chart`。

### 稳定识别面（生产者应满足其一或多项）

引擎可以靠 tag、class、属性或未来的 `data-pb-*` 识别。**生产者应保证识别面清晰**，而不是依赖偶然类名：

| kind | 推荐识别面（通用） |
|------|-------------------|
| `app-bar` | 名称或 class 含 `app-bar` / `navbar` / `nav-bar` / `toolbar`；或语义化顶栏标签 |
| `tab-bar` | 含 `tab` / `tab-bar`；页内分段也可用明确的 section-tabs 语义 |
| `list` | 含 `list`（或等价列表语义）；行数据有源码级循环/集合 |
| `chart` | 含 `chart` / `trend` / `donut` 等图表语义 |
| `bottom-bar` | 含 `bottom-bar` / `footer` / 明确的底部操作区命名（如 `bottom-actions`） |
| `section` | 含 `section` / `card` / `panel` 等块级语义 |
| `modal`（section） | 含 `modal` / `popup` / `sheet` / `dialog`（细 shell 仍以 §4 为准） |

---

## 4. UI Shell（临时层）

「主屏之上的临时 UI」是**产品语义**，不是某一框架 Overlay API 的名字。

### 4.1 Shell kind

| kind | 用途 | 是否默认进入「必须实现的 UI shell」 |
|------|------|-------------------------------------|
| `sheet` | 底部筛选 / 操作板 | 是（有业务/筛选证据时） |
| `dialog` / `modal` | 居中确认、详情 | 是 |
| `drawer` | 侧滑面板 | 按页面需要 |
| `popover` / `toast` | 轻量提示 | 默认可不进入必做 shell |

### 4.2 Overlay 根节点应满足

须让静态分析能认定「这是一层可开关的 shell」，典型方式（满足其一即可）：

1. **组件/标签名**以 `sheet` / `modal` / `popup` / `dialog` / `drawer` 结尾；或  
2. **显隐绑定**（条件渲染或双向绑定）+ **壳层 class/语义**（如 `sheet-backdrop`、`modal`、`dialog`、`drawer` 等）。

解析结果进入 source overlays，并进入 plan 的 `overlayPlan`。运行态未打开过可为 `source-only`，仍可能要求实现 UI shell。

### 4.3 状态命名

| 建议 | 说明 |
|------|------|
| `*Open` / `*Visible` / `show*` | 控制 shell 显隐 |
| 业务态与 shell 态分开 | 例如 `activeTab` vs `filterSheetOpen` |

### 4.4 禁止项

- 无识别面的容器冒充弹层。  
- 弹层内容只在运行时拼接，源码树中不出现。  
- 无注册表的隐式路由。  
- 用「看起来像浮层」的普通块代替显式 shell 语义。

---

## 5. Runtime 与 Source 的关系

Runtime snapshot 另有一套可见角色（如 `app-bar`、`tab-bar`、`list`、`list-item`、`bottom-bar`、`modal`、`card`…），依据 DOM、`role`、几何位置等推断。

| 冲突时 | 裁决 |
|--------|------|
| 逻辑架构、未打开的 shell、状态意图 | **Source** |
| 可见文案、bbox、当前屏布局 | **Runtime / screenshot** |

Source 有 `chart` kind；runtime 不一定有独立 `chart` role。细节词表以附录为准，随 Core 演进可更新附录而不改 §3–4 的角色含义。

---

## 6. 组件库映射（写法说明）

本规范**不**规定使用哪个组件库。对接某库时，另写一张映射表（放在工作台设计文档或 example README）：

| 约定角色 / shell | 选用组件 | 如何满足本文识别面 | 备注 |
|------------------|----------|-------------------|------|
| `app-bar` | （库组件名） | tag / class / 属性如何命中 §3 | |
| `sheet` | （库组件名） | 如何满足 §4.2 | 显隐状态名 |
| … | … | … | |

**规则**：换库只换映射表；不改本文件的角色与 shell 定义。  
**本期示例映射**：[design.md](./design.md)「附录：Vuetify → 本约定」。

可选增强（未实现）：在契约组件上增加 `data-pb-role` / `data-pb-shell`，减少对 class 启发式的依赖——仍映射到本文同一张表。

---

## 7. 后续（记录）

| 项 | 说明 |
|----|------|
| `data-pb-role` / `data-pb-shell` | 稳定属性，跨库统一 |
| 中立 IR | `sections / state / interactions / routes / lifecycle / uiShells / tokens` |
| `react-prototype` | 映射到本文同一角色表；见 [overview.md](./overview.md) |

---

## 附录 A：当前 Core 命中条件（实现快照）

以下描述**今日** `vue3-prototype` / runtime 的启发式，供对照与回归；**生产者应以 §3–4 的语义为准**，不要把附录当成唯一 API。

### A.1 Source `inferSectionKind`（haystack = tag + class + title）

- `bottom-bar`：`bottom-bar` / `footer`  
- `modal`：`modal` / `popup` / `sheet` / `dialog`  
- `app-bar`：`app-bar` / `navbar` / `nav-bar` / `header` / `toolbar`  
- `tab-bar`：`section-tabs` / `section-chip` / `tab` / `tab-bar`  
- `chart`：lexicon `chartTerms`（如 chart、donut、trend、indicator）  
- `list`：lexicon `listTerms`，或模板片段含列表循环指令  
- `section`：lexicon `sectionTerms`（如 section、card、panel、metric…）

### A.2 Source `isOverlayRoot`

1. tag 名以 `sheet|modal|popup|dialog|drawer` 结尾；或  
2. 存在 `v-model` / `v-if`，且 class 像 `sheet-backdrop` / `modal` / `popup` / `dialog` / `drawer`。

（其它框架 adapter 应用等价规则：显隐绑定 + 壳语义，或约定属性。）

### A.3 Runtime `SnapshotNodeRole`（节选）

`role=dialog` 或标记含 modal/popup/sheet → `modal`；含 tab → `tab-bar`；`ul`/`ol`/list → `list`；fixed/sticky 贴顶/底 → `app-bar` / `bottom-bar` 等。

代码位置：`packages/core/src/source/vue3-prototype/vue-sfc.ts`、`snapshot/browser-capture/extract-rendered-page.ts`、`shared/semantic-lexicon.ts`。

### A.4 无组件库时的参考写法

现有 example 用纯 class 即可满足约定，例如：

- `class="app-bar"`、`tab-bar`、`holding-list` + 列表循环  
- `v-if="filterSheetOpen"` + `sheet-backdrop` + `filter-sheet`  

见 `examples/vue3-to-flutter/source-vue3/.../PnlAnalysis.vue`、`HoldingList.vue`。

---

## 相关文档

- [design.md](./design.md) — 示例工作台与 **Vuetify 映射附录**  
- [artifacts.md](./artifacts.md) — `overlayPlan` 等产物字段  
- [overview.md](./overview.md) — 证据分层与适配器  
