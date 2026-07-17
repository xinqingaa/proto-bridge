# ProtoBridge 工作台：产品说明与技术选型

> 状态：草案（讨论用）  
> 范围：自建工作台的产品形态、与 PB Core 的关系、技术栈选型（含 React 考量）、建议方案  
> 非目标：不替代 [overview.md](./overview.md) / [artifacts.md](./artifacts.md) / [usage.md](./usage.md) 中的 PB 能力说明

---

## 1. 一句话定位

**工作台**是面向产品 / 设计 / 前端的「规范原型生产与协作环境」：用统一设计系统编排可交互手机原型，并与 **ProtoBridge（PB）** 对接，把页面证据整理成可给实现 Agent / 开发者消费的契约产物。

- PB 负责：采集 → 合并 → 规划 → 审查（证据与契约）。  
- 工作台负责：按约定产出**好解析、可协作**的原型，并触发 / 消费 PB。

```text
设计系统 / 组件库
    ↓ 编排
可交互原型（多套）
    ↓ 预览 / 标注 / 截图 / 评论
工作台协作
    ↓ source + URL（或导出）
ProtoBridge
    ↓
page-canonical / ui-build-plan / ui-build-review
    ↓
Agent 依据 Flutter（或其它 target）的项目架构进行实现与校验
```

---

## 2. 关键前提：现网经验可用，现网资产不能用

公司内的原型工作台（例如 Vue + Element Plus 桌面壳 + Vant 手机原型）。这类系统可以证明：

- 「组件库 + 多套原型 + 手机框预览 + 标注工具」这条产品路径成立；  
- 「工作台与解析引擎约定组件 / 弹层命名」比无限启发式更可持续。

但必须明确：

| 可以带走的 | 不能带走的 |
|------------|------------|
| 产品直觉、流程抽象、踩坑认知 | 公司项目代码、组件实现、业务原型、内部规范原文、数据与账号体系 |
| 对 PB 契约化思路的验证 | 把现网工程 fork / 改皮当成自有工作台 |

因此：**自建工作台是一条绿灯田（greenfield）产品线**，不是「把现网 Vue 工作台迁过来」。  
技术栈（Vue 或 React）应在**自有仓库、自有组件库、自有规范**前提下重新选择；现网栈仅作对照，不作实现基线。

---

## 3. 用户与价值

### 3.1 谁用

- **产品 / 交互**：搭流程、改文案与状态、出可点的原型  
- **设计**：落 token（色、字、间距）、审视觉与组件一致性  
- **前端 / 客户端**：对照原型与 PB 产物实现；评论与标注闭环  
- **AI Agent**：消费 PB artifacts，而不是直接读杂乱原型仓库

### 3.2 核心价值

1. **规范先于自由**：原型不是任意页面，而是「可被 PB 稳定识别」的组件与结构。  
2. **证据可追溯**：选中、截图、评论与 runtime / source 证据可对齐到同一 pageId。  
3. **实现可契约化**：工作台 → PB → target（如 Flutter）路径清晰，减少「看图猜交互」。

### 3.3 产品原则（与 PB 对齐）

> PB **不承诺**任意原型完美还原。  
> 工作台 **承诺**按契约产出可解析原型。  
> 超出契约的 UI：降级为 runtime 视觉证据 + 人工确认，**不**靠无限扩张 PB 启发式把 Core 撑胖。

工作台与 PB 共享同一套「可识别约定」；工作台是约定的**生产者**，PB 是约定的**消费者**。

---

## 4. 信息架构与工作流

### 4.1 布局（三栏）

```text
┌─────────────┬──────────────────────────────┬─────────────┐
│ 左侧导航    │ 中央画布                     │ 右侧工具    │
│             │                              │             │
│ · 设计系统  │  手机外框 + 原型运行时        │ · 选中/检查 │
│ · 组件库    │  （可缩放、多机型尺寸）       │ · 截图      │
│ · 原型列表  │                              │ · 评论/任务 │
│ · 页面树    │                              │ · 状态/变体 │
│ · Token     │                              │ · PB 导出   │
└─────────────┴──────────────────────────────┴─────────────┘
```

同一工作台内：**设计系统、组件库、原型运行时、工具栏必须同一技术栈**。  
不在「桌面壳 React、手机原型 Vue」这类混栈上浪费成本——预览、选中、主题与构建链路都会翻倍。

### 4.2 对象模型（建议钉死）

| 对象 | 含义 | 与 PB 的关系 |
|------|------|----------------|
| **Design System** | 字体、色板、间距、圆角、阴影、动效 token | 映射到 style / token 证据 |
| **Component Library** | 基于 token 的通用组件（含弹层契约组件） | Source 分析的稳定识别面 |
| **Prototype** | 一套业务原型（路由 + 多页） | `source.root` |
| **Screen / Page** | 一个路由页 | route / pageId |
| **Variant / State** | 同页业务态（空态、已筛选、风险态…） | 多次 capture 或 query/脚本态 |
| **Annotation** | 评论、截图、选中节点备注 | 可进入 manual questions / 附属文档 |
| **Export Job** | 触发 PB generate / reconstruct | artifacts 输出 |

没有 **Variant**，复杂页（多 Tab、筛选 Sheet 开合）很难稳定产出与示例中类似的「多状态产物」。

### 4.3 主流程（建议编排）

1. **维护设计系统**  
   Token 变更 → 组件库预览 →（可选）已有原型的视觉漂移报告。

2. **维护组件库**  
   只允许「契约组件」进入原型画布（见第 5 节）。业务组件也必须声明角色（section / list / sheet…）。

3. **创建 / 打开原型**  
   从页面模板生成（列表、表单、Tab+Sheet…），而不是无约束空白画布。

4. **编排与预览**  
   中央手机框实时预览；支持结构树选中、属性/文案/状态名编辑、路由跳转预览。

5. **状态与弹层**  
   显式维护页面变体与可打开的 UI Shell；一键切换如 `filterSheetOpen=true`，便于截图与 PB runtime 遍历。

6. **协作**  
   选中评论、区域截图、标记「需实现 / 勿实现(DNE)」；注释可导出给实现侧或写入 PB 人工确认项。

7. **对接 PB**  
   对当前页 / 当前变体跑重建；展示 review 摘要、warnings、source-only 弹层风险；跳转 artifacts。

8. **交付**  
   冻结原型版本（tag / snapshot）+ 对应 PB 产物，交给实现侧。

### 4.4 编排实现策略（务实分层）

| 阶段 | 做法 | 说明 |
|------|------|------|
| **Phase A（推荐先做）** | 原型 = 真实前端工程；工作台 = 预览壳 + 标注 + PB Bridge | 与 PB `source.analyze` 最合拍；源码可 git 审 |
| **Phase B** | 在壳上增加拖拽/表单编排，仍编译到同一组件库与契约 | 降低非前端同学门槛 |
| **不建议一上来** | 纯 JSON 协议渲染引擎、与真实组件库脱节 | 易与 PB 静态分析、版本管理打架 |

---

## 5. 与 ProtoBridge 的契约

### 5.1 结构约定

- 每页有稳定 `screenId` / route，进入页面注册表。  
- 主内容区、AppBar、底栏等使用约定 role 或稳定标记，例如 `data-pb-role="app-bar|list|bottom-actions|..."`。

### 5.2 临时层（UI Shell）约定

PB 今日口语里的「overlay」是**产品语义**（主屏之上的临时 UI），不是某一框架的 Overlay API，也不等于某一 UI 库内部的蒙层实现。

工作台应导出契约组件，对外稳定，对内可包任意实现：

| kind | 用途 | 工作台要求 |
|------|------|------------|
| `sheet` | 底部筛选 / 操作板 | 契约组件 + 显式 open 状态 |
| `modal` / `dialog` | 居中确认 | 同上 |
| `drawer` | 侧滑 | 同上 |
| `popover` / `toast` | 轻量提示 | 默认可不进「必须实现的 UI shell」 |

示例：`PbSheet` / `PbDialog`，并带 `data-pb-shell="sheet"`。  
PB 认**契约标记与状态命名**，而不是去猜具体库的内部节点树。

**状态命名建议**：控制显隐用 `*Open` / `*Visible` / `show*`；业务状态与纯 UI shell 状态分开标注。

### 5.3 主路径禁止项

- 页内无语义容器冒充弹层且无 `data-pb-*`。  
- 无注册表的隐式路由。  
- 弹层内容只在运行时字符串拼接、源码树中不出现（静态分析会失效）。

### 5.4 PB Core 应对齐的演进（概念）

- 中立 IR：`sections / state / interactions / routes / lifecycle / uiShells / tokens`。  
- `uiShells[].kind` 细化形态；对外 `overlayPlan` 可兼容保留。  
- Adapter：`vue3-prototype` / 未来的 `react-prototype` 都映射到同一 IR。  

**约定先于框架**：先定 `data-pb-*` 与组件清单，再实现各 source adapter。

---

## 6. 技术选型：为何重新评估 React

### 6.1 先拆开三个问题

| 问题 | 含义 | 自建工作台语境 |
|------|------|----------------|
| A. 工作台壳 UI | 项目管理、组件文档、工具栏 | 需自选组件库 |
| B. 手机原型组件 | 列表、表单、Sheet… | 需自建契约库（可包开源移动组件） |
| C. PB 是否解析某框架源码 | Source adapter | 与工作台同栈时最省事，但可多 adapter |

因**不能复用公司现网工程**，不存在「已经绑死 Vue，迁栈成本巨大」的包袱；选型应服务**自有产品**的长期体验与生态，而不是对齐不可用的内部实现。

### 6.2 推荐默认：React 主路径（自建场景）

在绿灯田前提下，**默认建议工作台 + 原型统一 React**，理由：

1. **同一技术栈闭环**：壳、组件库、原型预览、选中 SDK 一套构建链。  
2. **设计系统生态**：shadcn（Radix + Tailwind、源码可拥有）或 MUI（完整体系、后台密集控件）在「设计系统 → 可编排组件」链路上成熟，和个人偏好一致，也便于招人与社区方案。  
3. **与 PB 长期方向一致**：PB 需要中立 IR + 多框架 adapter；自建主路径用 React 时，可优先做深 `react-prototype`，Vue adapter 保留给外部/存量输入（含仓库内现有 Vue 示例），而不是「主产品 Vue、React 旁路」。  
4. **无现网代码可搬**：继续选 Vue 并不会获得「继承现网工作台」的优势，只是另一条自建路径。

### 6.3 shadcn 与 MUI 怎么选

| | **shadcn** | **MUI** |
|--|------------|---------|
| 适合 | 强定制视觉、希望组件源码进自己仓库、Tailwind token | 后台壳、表格/复杂表单密集体验、Material 体系 |
| 手机原型 | 通常需自研/组合移动端模式，或另引移动组件再包一层 `Pb*` | 同理，MUI 偏桌面；移动区仍建议独立契约包 |
| 建议 | **壳 + 设计系统文档** 可优先 shadcn | 若壳以密集管理后台为主，可用 MUI |

务实组合示例：

- **壳**：React + shadcn（或 MUI）  
- **原型契约包** `pb-components`：自研 `PbSheet` / `PbList`…，视觉跟 token；底层可选用任意 React 移动组件或纯 CSS  
- **原型应用**：Vite + React Router（或等价），只依赖 `pb-components` + tokens  

### 6.4 仍可选 Vue 的情况

若团队标准强制 Vue、或核心贡献者只熟 Vue，自建用 Vue 3 +（Naive / Vuetify / shadcn-vue）+ 自研 `Pb*` 也完全成立。  
关键不变：**契约组件 + 与 PB 共享规范**，而不是「必须 React」。

### 6.5 与仓库内现有 Vue 示例的关系

本仓库 `examples/vue3-to-flutter` 与 `vue3-prototype` adapter 证明 PB 链路，**不是**自建工作台的产品基线。  

| 资产 | 角色 |
|------|------|
| `vue3-prototype` | 继续维护；服务示例与外部 Vue 原型 |
| 未来 `react-prototype` | 服务自建工作台主路径原型 |
| 中立 IR | 两者共同目标，避免 IR 绑死在 `Vue*` 类型上 |

---

## 7. 建议落地的产品方案

### 7.1 模块划分

- **Workbench Shell**：项目、原型列表、权限、PB 任务  
- **Design System Studio**：token 与主题  
- **Component Gallery**：契约组件文档 + 手机框预览  
- **Prototype Runtime**：iframe / 独立 dev server；注入选中与标注 SDK  
- **Collab**：评论、截图、任务  
- **PB Bridge**：配置 source / target / url，触发 generate，展示 review  

### 7.2 仓库形态（示意）

工作台可与 PB monorepo 分离（推荐），通过 CLI / MCP / npm 依赖 `@proto-bridge/*` 集成：

```text
workbench/                    # 自有产品仓库（建议 React）
├── apps/web                  # 工作台壳
├── packages/design-tokens
├── packages/pb-components    # 契约组件（data-pb-*）
├── prototypes/*              # 各业务原型应用
└── packages/runtime-sdk      # 选中 / 变体 / postMessage

proto-bridge/                 # 本仓库
├── packages/core|cli|mcp-server
└── examples/…                # 示例，非工作台本体
```

### 7.3 里程碑

| 阶段 | 目标 | 成功标准 |
|------|------|----------|
| M1 | Token + `pb-components` + 1 个样板原型 | PB（或过渡脚本）能稳定识别 sheet/modal 与页面注册表 |
| M2 | 工作台预览壳 + 变体 + 截图评论 | 评论挂到节点；可变体切换 |
| M3 | PB Bridge 内嵌 | 不手跑 CLI 也能看到审查摘要与 artifacts 入口 |
| M4 | PB 中立 IR + `react-prototype` | 工作台原型走 React adapter 主路径 |
| M5 | 协作与版本冻结 | 原型 tag 与 PB 产物可对齐交付 |

---

## 8. 风险与非目标

**风险**

- 过早做重型低代码 → 生成不可维护源码，PB 更难解析。  
- 契约过严 → 搭不出来；过松 → PB 再次启发式膨胀。  
- 工作台 pageId / route 与 PB 不一致。  
- 误把公司现网实现当可复用资产（合规与版权风险）。

**非目标**

- 不做 Figma 级自由画布替代品。  
- 不把 PB 做成「任意前端 → 生产 Flutter」编译器。  
- 不承诺未使用契约组件的第三方仓库开箱完美。  
- 不复制或衍生不可用的公司内部工作台代码。

---

## 9. 决策摘要

1. **自建工作台是绿灯田**；现网同类产品仅提供产品认知，**代码与资产不可用**。  
2. **产品主路径**：契约化组件库 → 规范原型 → 工作台协作 → PB 产物；PB 与工作台共享规范。  
3. **技术默认建议**：自建场景下 **React（shadcn 或 MUI 做壳 + 自研 `Pb*` 契约包）** 统一壳与原型；Vue 作为 PB 的并行 source 能力与仓库示例继续存在。  
4. **编排先做预览壳 + 真源码原型**，再考虑拖拽生成；对象模型必须含 Variant。  
5. **弹层按 kind 契约化**，不把「世界上所有浮层」塞进无限规则。

---

## 10. 开放问题

1. 工作台与 PB 同仓还是分仓？  
2. 设计 token 是否与 Flutter 主题做正式映射表，还是继续「PB 保留值、实现 Agent 读 target」？  
3. 评论 / 截图进 git，还是独立协作后端？  
4. 多品牌设计系统是否首期就要？  
5. 壳用 shadcn 还是 MUI（或先 shadcn 壳 + 后期可换）？  

---

## 相关文档

- [overview.md](./overview.md) — PB 能力与证据分层  
- [artifacts.md](./artifacts.md) — 产物字段与 overlayPlan 等  
- [usage.md](./usage.md) — CLI / MCP 用法  
