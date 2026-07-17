# PBWork 原型工作台设计

> 状态：已定稿
> 范围：PBWork 的产品结构、页面布局、运行时边界、交互方式与首期验收标准
> 非目标：本文不设计 Flutter 实现链路、PB 产物消费流程或多人协作系统

旧 `examples/` 示例已经移除，不再维护、不再使用，也不是 PBWork 的脚手架或兼容目标。PBWork 从 `apps/pbwork/` 独立建设，禁止复制或依赖旧 example 的源码、路由、脚本、产物与目录结构。

PBWork 是使用 Vue 3 与 Vuetify 3 建设的原型平台。它集中展示设计基础、主题、组件和真实交互原型，并为 PB 提供独立、干净、可复现的原型 Runtime URL。

---

## 1. 产品目标

PBWork 首期必须完成以下闭环：

1. 浏览 Token、Theme、基础组件和复杂组件；
2. 在 Playground 中查看组件 Props 与状态变化；
3. 按生命周期浏览原型、页面和 Variant；
4. 在单手机画板中运行真实 Vue 页面；
5. 选中运行时元素并检查组件、结构、样式与 PBWork 源码约定；
6. 给页面元素添加保存在本机的评论；
7. 打开独立原型页面或复制可直接交给 PB 的 Runtime URL；
8. 通过受控高级操作将组件示例或新 Variant 写回源码。

PBWork 默认是展示与检查工具。只有用户主动进入高级操作并二次确认后，才允许修改白名单内的源码文件。

长期目标是让原型平台领先维护主题、组件和业务页面，Flutter 使用共享的设计系统定义实现生产 UI，PB 负责组织更完整的源码、运行态、视觉与目标工程上下文。多人协作、拖拽编排、登录鉴权、权限控制和版本历史属于后续产品化能力。

---

## 2. 首期边界

### 必做

| 能力 | 首期要求 |
|------|----------|
| 工作台壳 | 顶栏、一级导航、二级导航、中央内容区和右侧检查区完整可用 |
| 设计基础 | 展示颜色、字体、间距、圆角、阴影等 Token |
| 双主题 | 工作台壳与原型运行时分别切换主题，互不影响 |
| 组件库 | 展示基础组件、复杂组件和组件元数据 |
| Playground | 临时修改代表性 Props / State、重置状态，并提供受控源码写入 |
| 原型 | 按生命周期展示原型、Screen 和 Variant |
| 手机画布 | 单画板、缩放、拖动、设备尺寸、原型主题、全屏和刷新 |
| 元素检查 | iframe 内 hover、选择、高亮，并在右侧显示检查信息 |
| 评论 | 为选中元素添加本地评论，支持完成与删除 |
| Runtime URL | iframe、全屏、复制链接和 PB 使用同一个纯原型 URL |

### 不做

- Flutter 页面实现、Flutter 预览或跨端截图对照；
- PB generate / reconstruct 的页面内触发和产物浏览；
- 多人实时协作与共享评论；
- 登录、鉴权与角色权限；
- JSON 驱动的页面渲染器；
- 拖拽式低代码页面编排；
- 云端数据库、发布系统和版本历史。

---

## 3. 技术选型

| 层 | 选择 |
|----|------|
| 框架 | Vue 3 + Vite |
| 路由 | Vue Router |
| 状态 | Pinia |
| UI | Vuetify 3 |
| 工作台布局 | Vuetify App Layout + CSS Grid |
| 原型运行时 | 独立 Router Layout + iframe |
| 手机外框 | CSS 绘制，不依赖图片 |
| 本地评论 | `localStorage` |
| 组件描述 | TypeScript 注册表 + JSON Schema Draft 2020-12；使用 Ajv 校验 Token、Theme、组件 Contract 与 Playground 输入 |
| 高级源码写入 | 仅开发环境启用的本地 Vite/Node 服务 |
| 类型与格式 | `vue-tsc` + Prettier |
| 测试 | Vitest + Vue Test Utils；仅工作台与 Runtime 闭环使用 Playwright |

Vue 与 Vuetify 是 PBWork 的主要实现技术。JSON Schema 用于描述原型平台与 Flutter 可共享的主题或组件定义，不替代真实 Vue 页面源码，也不等同于 PB 产物。首期以可提交的 JSON 定义为共享边界并由 Ajv 校验，PBWork 将其适配为 Vuetify 配置；Flutter 消费方式不在本文范围内。

### 3.1 工程身份与命令

PBWork 的应用根目录固定为 `apps/pbwork/`，包名固定为 `@proto-bridge/pbwork`。它加入 pnpm workspace，但不进入 Core、CLI 或 MCP 的发布包。

| 命令 | 作用 |
|------|------|
| `pnpm --filter @proto-bridge/pbwork dev` | 启动工作台、Runtime 路由和开发环境源码写入服务 |
| `pnpm --filter @proto-bridge/pbwork build` | 构建只读静态工作台与 Runtime |
| `pnpm --filter @proto-bridge/pbwork typecheck` | Vue / TypeScript 类型检查 |
| `pnpm --filter @proto-bridge/pbwork test` | 单元与组件测试 |
| `pnpm --filter @proto-bridge/pbwork test:e2e` | 浏览器端工作台与 Runtime 闭环测试 |

生产构建是纯静态应用，不包含源码写入 API。history fallback 是部署 PBWork 的硬要求，`/workbench/**` 与 `/prototype/**` 都必须回退到应用入口。

---

## 4. 应用布局

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ PBWork  / 当前位置                 全局搜索              壳主题  设置       │
├────────┬──────────────────┬─────────────────────────────┬──────────────────┤
│ 一级   │ 二级资源导航     │ 中央内容 / 预览画布         │ 上下文检查       │
│ 导航   │                  │                             │                  │
│        │ 根据一级导航变化 │ Token / Theme               │ 概览             │
│ 设计   │                  │ Component Playground        │ Props / State    │
│ 基础   │                  │ Prototype Overview          │ Schema / Token   │
│        │                  │ 单手机画板                  │ 约定 / 样式      │
│ 组件   │                  │                             │ 评论             │
│        │                  │                             │                  │
│ 原型   │                  │                             │                  │
└────────┴──────────────────┴─────────────────────────────┴──────────────────┘
```

### 4.1 尺寸建议

| 区域 | 默认尺寸 | 行为 |
|------|----------|------|
| 顶栏 | 56px 高 | 固定 |
| 一级导航 | 72px 宽 | 固定 rail，可显示图标和短标签 |
| 二级导航 | 264px 宽 | 可折叠 |
| 右侧检查 | 360px 宽 | 可折叠，可在较窄窗口收为抽屉 |
| 中央区域 | 剩余空间 | 最小宽度 480px，内容独立滚动 |

首期不为平板或手机建设工作台布局。PBWork 是桌面工具，推荐最小窗口宽度 1280px。

### 4.2 Vuetify 结构

顶栏与一级导航使用 Vuetify App Layout；二级导航、中央区域和右侧检查使用 `v-main` 内的 CSS Grid，避免多个永久 Drawer 相互挤压。

```vue
<v-app>
  <v-app-bar height="56" />

  <v-navigation-drawer permanent rail :rail-width="72" />

  <v-main>
    <div class="workbench-grid">
      <v-sheet class="resource-panel" />
      <main class="content-canvas" />
      <v-sheet class="inspector-panel" />
    </div>
  </v-main>
</v-app>
```

主要组件：

- 顶栏：`v-app-bar`、`v-toolbar-title`、`v-breadcrumbs`、`v-text-field`、`v-btn`；
- 一级导航：rail `v-navigation-drawer` + `v-list`；
- 二级导航：`v-list`、`v-list-group`，原型树可使用 `v-treeview`；
- 检查面板：`v-tabs`、`v-window`、`v-expansion-panels`；
- Playground 控件：`v-form`、`v-select`、`v-switch`、`v-slider`、`v-text-field`；
- 状态提示：`v-alert`、`v-chip`、`v-tooltip`、`v-snackbar`；
- 二次确认：`v-dialog`。

---

## 5. 顶部全局栏

顶栏只承载全局能力：

| 区域 | 内容 |
|------|------|
| 左侧 | PBWork 名称与当前位置面包屑 |
| 中间 | 全局搜索入口，可搜索 Token、Theme、Component、Prototype 和 Screen |
| 右侧 | 工作台壳浅色/深色切换、设置入口 |

首期只有一个 Workspace，不显示 Workspace 切换器。当前 Prototype、Screen、Variant、设备和原型主题属于画布上下文，不放进全局顶栏。

首期 stub（有入口、不阻塞主闭环）：

| 入口 | 首期行为 |
|------|----------|
| 全局搜索 | 可按注册表 ID / 名称做本地过滤跳转；不做模糊语义搜索、不做跨仓库索引 |
| 设置 | 仅工作台偏好（壳主题已在顶栏；可放“清除本地评论”等说明）；不做账号、远程同步或权限 |

---

## 6. 导航结构

### 6.1 一级导航

一级导航固定为中文：

1. 设计基础
2. 组件
3. 原型

不增加 Dashboard、PB、Flutter、Jobs 或 Review 等一级入口。

### 6.2 二级导航

```text
设计基础
├── 设计令牌
│   ├── 颜色
│   ├── 字体
│   ├── 间距
│   ├── 圆角
│   └── 阴影
└── 主题
    ├── 默认主题
    └── 其他已注册主题

组件
├── 基础组件
│   └── 具体组件
└── 复杂组件
    └── 具体组件

原型
├── 全部原型
├── 进行中        # lifecycle: active
├── 待确认        # lifecycle: review
├── 已定稿        # lifecycle: final
└── 已归档        # lifecycle: archived
```

原型按生命周期分类，不按 UI、PM、DE、QA 等职责重复归档。职责作为原型元数据与筛选条件，可以用 `v-chip` 展示负责人和参与方。生命周期枚举与注册表字段见 §13。

选中某个生命周期后，二级面板继续展示 Prototype → Screen → Variant 树：

```text
已定稿
└── 项目协作
    ├── 任务列表
    │   ├── 默认态
    │   ├── 加载中
    │   └── 空态
    └── 任务详情
        ├── 总览
        ├── 活动
        └── 错误
```

Variant 是 Screen 的子节点，不作为一级导航或独立资源类型出现。

---

## 7. 中央内容区

中央内容由当前选中的最末级资源决定：

| 选中对象 | 中央内容 |
|----------|----------|
| Token 分类 | Token 色板、字阶、间距、圆角或阴影样本 |
| Theme | 完整主题样本和代表性组件矩阵 |
| Component | Component Playground |
| Prototype | 原型概要、页面列表、状态和负责人 |
| Screen | 手机画板中的默认 Variant |
| Variant | 手机画板中的指定状态 |

Foundations 和组件页面使用普通 Vue/Vuetify 内容布局。Screen 和 Variant 使用 iframe 运行独立原型页面。

### 7.1 Component Playground

Playground 默认只在内存中修改组件 Props / State：

- 调整后立即预览；
- 支持一键重置；
- 刷新后恢复源码注册值；
- 默认不保存、不生成代码、不生成分享链接。

“高级操作 → 更新组件示例”允许将当前配置写回源码。用户必须先看到目标文件、配置摘要和 diff，再在 `v-dialog` 中二次确认。

### 7.2 手机画板

首期只显示一个手机画板。画板由三层组成：

```text
Canvas：负责背景、居中、拖动和缩放
Device Frame：CSS 手机外框与 viewport 尺寸
iframe：真实 Prototype Runtime URL
```

手机外框使用中性 CSS 视觉，不绑定具体品牌。默认 viewport 为 390 × 844。缩放只影响画板显示，不改变 iframe viewport。

首期设备尺寸（宽 × 高）：

| 预设 | Viewport |
|------|----------|
| iPhone 14（默认） | 390 × 844 |
| iPhone SE | 375 × 667 |
| Android 常见 | 360 × 800 |
| iPhone 14 Pro Max | 430 × 932 |

iframe 使 Vuetify overlay 即使挂载到 `body`，仍被限制在手机运行时内部，不会飞出工作台画布。

---

## 8. 工作台 URL 与 Runtime URL

PBWork 必须使用两套明确分离的路由布局。路由模式固定为 **Vue Router history**（非 hash）。开发服务器与部署都按 history fallback 配置；复制给 PB 的链接不得依赖 `#/`。

### 8.1 工作台路由

工作台路由用于浏览、检查和操作 PBWork：

```text
/workbench/foundations/tokens/colors
/workbench/foundations/themes/:themeId
/workbench/components/:componentId
/workbench/prototypes/:prototypeId/screens/:screenSlug
/workbench/prototypes/:prototypeId/screens/:screenSlug?variant=:variantId&theme=:themeId
```

工作台路由会挂载顶栏、导航、画布、检查器和评论工具，不得作为 PB 的页面输入。

### 8.2 原型 Runtime 路由

Runtime 路由只挂载原型页面和必要运行时能力。这是 PBWork 对浏览器、评审与 PB capture 的**对外契约**：

```text
/prototype/:prototypeId/:screenSlug?variant=:variantId&theme=:themeId
```

权威示例（路径与 query 语义以此为准；host/port 随本地或部署变化）：

```text
http://127.0.0.1:5173/prototype/project/task-list?variant=default&theme=light
http://127.0.0.1:5173/prototype/project/task-detail?variant=sheet-open&theme=dark
```

| 部分 | 规则 |
|------|------|
| `prototypeId` / `screenSlug` | 与注册表字段一致；二者共同定位 Screen，稳定、可读、可进 PB `--route` |
| `screenId` | 不进入 URL；全局 Contract ID，如 `project.task-list`，供 PB、Bridge、评论和检查器使用 |
| `variant` | 可选；缺省时使用该 Screen 的 `defaultVariantId` |
| `theme` | 可选；缺省时使用原型默认主题 |
| 业务 query | Variant 可声明额外 `query`；复制链接时一并带上，且必须可由注册表复现 |
| 禁止 | 工作台专用 query（如 `inspect=1`、`fullscreen=1`）不得出现在交给 PB 的 URL 上 |

Runtime Layout 包含：

- 原型页面；
- 原型 Theme；
- Variant 状态；
- 必需的全局样式；
- Runtime Bridge。

Runtime Layout 不包含：

- PBWork 顶栏和导航；
- 画布背景与手机外框；
- 右侧检查面板；
- 评论输入 UI；
- 工作台壳主题。

iframe `src`、全屏预览、复制原型链接和 PB capture 必须使用同一个 Runtime URL。不得通过在工作台 URL 上增加 `fullscreen=1` 并隐藏工作台 DOM 的方式模拟纯原型页面。

PB 侧用法约定：`--url` 指向完整 Runtime URL；`--route` 使用 `/prototype/:prototypeId/:screenSlug`（可带与注册表一致的 query）。具体 CLI 文案以日后同步的 `usage.md` 为准。

### 8.3 URL 状态权威

Runtime URL 是当前 Screen、Variant、Theme 和可复现业务 query 的唯一分享权威。画布控件切换 Variant 或原型 Theme 时，必须先更新工作台路由和 iframe `src`；Bridge 消息只负责交互反馈，不能形成另一份脱离 URL 的持久状态。

规则：

1. 刷新 Runtime URL 必须恢复同一可见状态；
2. “复制原型链接”始终从当前规范化 iframe URL 生成，不读取临时 store 拼接另一条链接；
3. iframe 内发生 Screen 导航时，Runtime 通过 `route` 消息通知工作台，工作台同步导航树和地址栏；
4. 无法序列化的临时交互可以存在，但不得进入正式 Variant 或复制链接；
5. 未知 Prototype、Screen、Variant 或 Theme 返回明确的运行时错误页，不静默回退到其他页面。

---

## 9. 画布工具栏

Screen/Variant 画布工具栏包含：

| 工具 | 行为 |
|------|------|
| 选择元素 | 开启 iframe hover 与点击选择 |
| 添加评论 | 选择元素或页面位置后创建评论 |
| 拖动画布 | 平移中央画布，不操作原型页面 |
| 缩小 / 放大 | 调整画板显示比例 |
| 缩放比例 | 显示并选择常用比例 |
| 适应画布 | 自动计算居中缩放比例 |
| 设备尺寸 | 切换 iframe viewport |
| 原型主题 | 切换原型自身主题，不影响工作台壳 |
| Variant | 切换源码注册的可复现状态 |
| 刷新 | 重载当前 iframe |
| 全屏预览 | 在新标签页打开当前 iframe URL |
| 复制原型链接 | 复制当前 iframe 完整 URL |

全屏预览不创建另一套页面，它直接打开当前 Runtime URL。复制链接必须包含当前 Prototype、Screen、Variant、原型 Theme 和必要业务参数，可以直接提供给浏览器、评审人员或 PB。

---

## 10. 双主题

PBWork 同时维护两套互不影响的主题状态：

| 主题 | 控制范围 | 控制位置 | 持久化 |
|------|----------|----------|--------|
| 工作台壳主题 | 顶栏、导航、画布背景和检查面板 | 顶部全局栏 | `localStorage` |
| 原型主题 | iframe 内的组件和页面 | 画布工具栏 | Runtime URL query + 当前会话 |

切换工作台壳主题不得重载或改变原型主题。切换原型主题必须更新工作台 URL 和 iframe Runtime URL，不改变 PBWork 壳。

Component Playground 使用原型主题体系，可以在 Playground 内独立切换，不继承工作台壳主题。

---

## 11. Runtime Bridge 与元素选择

Runtime Bridge 只服务 **PBWork 壳 ↔ 原型 iframe** 的通信。它不是 PB Core / CLI / MCP 的通道；PB 只打开或 capture 同一个纯 Runtime URL，不经过 Bridge。

即使首期同源，也使用 `postMessage` 保持工作台与原型运行时边界清晰。高亮层、尺寸标注与选择遮罩实现在 **Runtime Layout 内**，由 Bridge 指令开关；不得由工作台向任意第三方页面注入脚本。

### 11.1 消息信封

所有消息使用同一信封：

```ts
type BridgeEnvelope<TType extends string, TPayload> = {
  source: 'pbwork' | 'pbwork-runtime'
  protocolVersion: 1
  runtimeId: string
  type: TType
  requestId?: string
  prototypeId: string
  screenId: string
  variantId?: string
  themeId: string
  payload: TPayload
}
```

每次 iframe `load` 都生成新的 `runtimeId`。PBWork 只接受：`event.source === iframe.contentWindow`、`source === 'pbwork-runtime'`、`protocolVersion` 匹配、origin 在允许列表，且 `runtimeId`、`prototypeId`、`screenId`、`variantId`、`themeId` 与当前 iframe 上下文一致的消息。

### 11.2 消息方向与最小类型

```text
Prototype iframe
  ready / hover / select / clear-select / route / state
                ↓ postMessage
PBWork
  更新工具状态、选中对象和右侧检查面板

PBWork
  init / inspect-mode / comment-mode / highlight / reload
                ↓ postMessage
Prototype iframe
```

| type | 方向 | 用途 |
|------|------|------|
| `init` | workbench → runtime | iframe load 后下发本次 `runtimeId` 与当前 URL 上下文，启动握手 |
| `ready` | runtime → workbench | iframe 可交互；携带当前 route、variant、theme |
| `hover` | runtime → workbench | 悬停元素摘要（可选 bbox） |
| `select` | runtime → workbench | 锁定元素：tag/class/text/bbox/path、`data-pb-*`、语义父节点 |
| `clear-select` | runtime → workbench | 选择已清除 |
| `route` / `state` | runtime → workbench | 页内导航或可序列化状态变化（用于检查面板摘要） |
| `inspect-mode` | workbench → runtime | 开关选择模式；开启时拦截点击，不触发页面业务 |
| `comment-mode` | workbench → runtime | 开关评论落点模式；与 inspect 互斥 |
| `highlight` | workbench → runtime | 按 `data-pb-id` 或临时 handle 高亮/清除 |
| `reload` | workbench → runtime | 要求 runtime 按当前 URL 重载（也可由工作台直接重设 iframe `src`） |

握手：工作台在 iframe `load` 后创建 `runtimeId`，向当前 `contentWindow` 发送 `init`，Runtime 保存该 ID 并返回携带同一 ID 的 `ready`；超时则提示刷新，不把过期消息写入检查面板。Runtime 在收到 `init` 前不得发送选择或状态消息。iframe 重载后必须重新握手，旧 `runtimeId` 与 `requestId` 全部作废。

### 11.3 选择行为

1. 进入“选择元素”模式（关闭评论模式）；
2. hover 元素时在 iframe 内显示高亮边框和尺寸；
3. 点击后锁定元素，**不向页面业务处理器传递该次点击**；
4. Runtime Bridge 返回元素信息和最近的语义父节点；
5. 右侧检查面板切换到选中元素；
6. `Esc` 或再次点击空白/工具退出时清除选择。

拖动画布模式下不向 iframe 发送指针事件用于选择。退出 inspect / comment 后，页面恢复正常交互。

普通 DOM 可以被选择；带稳定标记的组件或区块提供更完整信息。标记与识别面要求见 [§19 PB 源码约定](#19-pb-源码约定)。

### 11.4 组件检查元数据

PBWork 不读取 Vue 私有字段（如 DOM 上的内部组件实例）来获取 Props / State。可检查组件通过公开的 Runtime Inspection Registry 主动登记元数据：

```ts
type InspectRegistration = {
  element: HTMLElement
  pbId: string
  componentId?: string
  getProps?: () => Record<string, unknown>
  getState?: () => Record<string, unknown>
  getTokens?: () => string[]
}
```

组件可以通过 `usePbInspect()` composable 或 `v-pb-inspect` directive 登记。Runtime 使用 `WeakMap<HTMLElement, InspectRegistration>` 保存关系；选中普通 DOM 时只返回 DOM/style 信息，选中已登记组件时才返回 Props、State、Contract ID 与 Token。

返回值必须是可 JSON 序列化快照，并限制文本与集合长度，禁止传递函数、Vue proxy、DOM 引用或循环对象。组件卸载时自动注销，iframe 重载后注册表重建。

---

## 12. 右侧检查面板

右侧面板是上下文面板，内容随当前资源或选中元素变化，不固定展示所有字段。

### 12.1 Token / Theme

- ID、名称和语义说明；
- 当前值与不同主题值；
- 视觉样本；
- 使用组件与示例。

### 12.2 Component

- Contract ID、分类和说明；
- Props、Slots、Events；
- States / Variants；
- JSON Schema 校验；
- Token 使用；
- `data-pb-*` 标记情况；
- 源码文件引用。

### 12.3 Prototype / Screen / Variant

- Prototype ID、生命周期和参与职责；
- Screen ID、route 和源码入口；
- 当前 Variant、Theme 和 viewport；
- 页面状态摘要；
- 原始 tag/class 与 PBWork 约定检查结果；
- 预留的 `data-pb-*` 信息。

### 12.4 选中元素

建议使用以下 Tab：

| Tab | 内容 |
|-----|------|
| 概览 | 标签、class、文本、bbox、DOM path、所属 Screen/Variant |
| 组件 | 组件名、Props/State、Contract ID、语义父节点 |
| 约定 | 原始 tag/class、`data-pb-id`、`data-pb-role`、`data-pb-shell` 与 PBWork 一致性提示；不得展示为 PB Core 的实际推断结果 |
| 样式 | 字体、颜色、背景、间距、圆角、边框和阴影 |
| 评论 | 当前元素的未完成和已完成评论 |

---

## 13. 注册表与 Variant

导航树、Runtime URL、检查面板、Playground 写回与复制链接共用同一注册源，不得各写一份硬编码列表。

### 13.1 唯一注册源

| 资源 | 注册位置（约定） |
|------|------------------|
| Prototype 元数据 | `src/prototypes/registry.ts#prototypes` |
| Screen / Variant | `src/prototypes/registry.ts#prototypeScreens` |
| Component | `src/design-system/components/registry.ts`；共享契约在 `components/contracts/*.json` |
| Theme / Token | `src/design-system/themes/*.json`、`src/design-system/tokens/*.json` |

`prototypeScreens` 是 PBWork 路由、导航和当前 PB source adapter 共同读取的唯一页面表。不得再维护一份只给 Vue Router 或只给 PB 的页面列表。工作台启动时校验注册表；高级写入成功后先重新校验，再刷新路由和预览。

### 13.2 最小 schema

当前 `vue3-prototype` adapter 静态读取页面时需要 `screenId`、`path`、`view`。PBWork 注册表必须保留这些字段，不得改成 adapter 无法识别的 `route/entry` 私有别名。

```ts
type PrototypeLifecycle = 'active' | 'review' | 'final' | 'archived'

type PrototypeRecord = {
  id: string
  label: string
  lifecycle: PrototypeLifecycle
  owners?: string[]
  roles?: string[] // 参与职责，仅元数据与筛选，不作导航轴
  defaultThemeId: string
}

type ScreenRecord = {
  prototypeId: string
  screenId: string // 全局 Contract ID，如 project.task-list
  screenSlug: string // Prototype 内 URL 段，如 task-list
  label: string
  title?: string
  path: string // Runtime path，如 /prototype/project/task-list
  view: string // 可静态解析的 Vue SFC 逻辑相对路径，如 project/screens/TaskList.vue
  defaultVariantId: string
  variants: PrototypeVariant[]
}

type PrototypeVariant = {
  id: string
  label: string
  description?: string
  query?: Record<string, string>
  fixture?: string
}

type TokenRecord = {
  id: string
  label: string
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'elevation'
  value: string | number
  description?: string
}

type ThemeRecord = {
  id: string
  label: string
  dark: boolean
  colors: Record<string, string>
  variables?: Record<string, string | number>
}

type PlaygroundControl = {
  key: string
  label: string
  control: 'text' | 'number' | 'boolean' | 'select' | 'color'
  options?: Array<{ label: string; value: string | number | boolean }>
}

type ComponentRecord = {
  id: string
  label: string
  category: 'basic' | 'complex'
  view: string
  contract: string // 可被 Flutter 消费的 JSON 契约路径
  schema?: string // 复杂组件 JSON Schema 路径；首期仅描述 Props/State，不作页面渲染器
  example?: Record<string, unknown>
  defaultProps?: Record<string, unknown>
  controls: PlaygroundControl[] // 显式声明控件；Schema 只负责校验
}

type ComponentContract = {
  schemaVersion: 1
  id: string
  category: 'basic' | 'complex'
  props: Record<string, unknown> // JSON Schema property definitions
  states: string[]
  slots: string[]
  events: string[]
  tokenBindings: Record<string, string> // semantic slot -> Token ID
}

export const prototypes = [] satisfies PrototypeRecord[]
export const prototypeScreens = [] satisfies ScreenRecord[]
```

Token、Theme 和 `ComponentContract` 必须保持 JSON 可序列化，并分别通过 `schemas/token.schema.json`、`schemas/theme.schema.json`、`schemas/component.schema.json` 校验。共享 JSON Contract 是跨端权威；`ComponentRecord.view` 和 `controls` 只描述 PBWork 的 Vue 实现与 Playground，不得进入跨端 Contract。TypeScript 类型由同一字段契约维护，不允许出现只存在于 UI store 的第二套定义。Theme JSON 必须转换为 Vuetify `ThemeDefinition`，保证 Token 样本、Playground 和 Runtime 使用同一套主题值。Playground 按 `controls` 渲染明确控件，JSON Schema 只校验输入，不生成通用表单。

Vue Router 与组件预览使用 `import.meta.glob` 建立静态模块映射，再通过 `view` 查找唯一 SFC。Screen 的 `view` 固定写为 `<prototypeId>/screens/<File>.vue`，例如 `project/screens/TaskList.vue`。当前 adapter 使用 TypeScript AST 静态读取导出的数组，支持类型标注、`satisfies` 和 `as const`，但禁止函数调用、展开语法和其他动态表达式，也不会执行注册表源码。存在 `prototypeScreens` 时 adapter 只消费该数组；没有时才遍历其他导出数组，兼容现有项目。精确路径无匹配时才允许唯一 basename 回退；多文件同名必须报错。启动校验必须拒绝：重复 ID/path、同一 Prototype 内重复 screenSlug、`screenId !== ${prototypeId}.${screenSlug}`、`path !== /prototype/${prototypeId}/${screenSlug}`、未知 prototypeId、缺失默认 Variant、`view` 无匹配或匹配多个文件、未知或缺失默认 Theme、保留 query 被写入 Variant `query`、非法业务 query 值。

二级导航的生命周期中文标签对应：`active` 进行中、`review` 待确认、`final` 已定稿、`archived` 已归档。

### 13.3 Variant 行为

Variant 默认由源码注册，工作台只负责切换和展示。典型 Variant 包括默认态、加载中、空态、错误态、指定 Tab、Sheet 打开和 Dialog 打开。`variant` 与 `theme` 是 Runtime 保留 query，不得重复写入 `PrototypeVariant.query`；该字段只保存额外业务参数。`fixture` 固定为相对当前 Prototype 目录的路径，如 `fixtures/empty.json`。

页面仍可正常交互，但临时交互状态不会自动成为正式 Variant。“高级操作 → 保存为新 Variant”会读取当前可序列化状态，要求填写 ID、名称和说明，并在二次确认弹框中显示目标注册表、状态摘要与 diff。确认后才写入源码。

工作台不得保存业务上无法恢复或无法序列化的状态；写入后必须能够通过 Runtime URL 独立打开。

JSON Schema 首期用于校验 Token、Theme、基础/复杂组件共享契约，以及复杂组件 Props / State 的 Playground 输入；**不**用 Schema 驱动整页渲染，也不等同于 PB 产物。

### 13.4 Screen Runtime 接口

Variant 元数据保持纯静态数据；页面如何应用或导出状态通过 Screen Runtime 接口提供，不把函数写进注册表：

```ts
type ScreenRuntimeAdapter = {
  applyVariant: (variant: PrototypeVariant) => void | Promise<void>
  serializeVariant?: () => Record<string, unknown> | Promise<Record<string, unknown>>
}
```

每个 Screen 必须实现 `applyVariant`，保证直接打开 Runtime URL 可以恢复注册 Variant。只有实现了 `serializeVariant` 的 Screen 才显示“保存为新 Variant”；否则高级入口禁用并说明该页面不支持状态导出。

序列化结果只能包含可恢复的业务状态和 fixture 引用，不包含 DOM、函数、临时动画进度、网络连接或不可重复的时间值。

---

## 14. 本地评论

评论仅保存在当前浏览器，不提供账户或共享能力。

```ts
type LocalComment = {
  id: string
  prototypeId: string
  screenId: string
  variantId?: string
  themeId?: string
  elementId?: string
  selector?: string
  bbox?: { x: number; y: number; width: number; height: number }
  content: string
  status: 'open' | 'resolved'
  createdAt: string
  updatedAt: string
}
```

定位优先级：

1. `data-pb-id`；
2. 稳定 selector / DOM path；
3. 保存时 bbox 作为视觉回退。

元素找不到时，评论仍保留在评论列表，并标记为“定位失效”。评论支持新增、编辑、完成、重新打开和删除。清除浏览器数据会删除全部评论，界面应明确提示这一限制。

按当前 Prototype / Screen 列出评论；切换 Variant 或原型 Theme 时：

- 默认仍显示该 Screen 下全部评论；
- 可用筛选只看当前 `variantId` / `themeId`；
- 定位时优先匹配当前 Variant 下仍存在的 `data-pb-id`，否则标记定位失效而不删除。

---

## 15. 高级源码写入

高级写入只在本地开发环境启用，部署后的只读 PBWork 不暴露入口。

### 15.1 支持操作

- `update-component-example`：只更新 `src/design-system/components/registry.ts` 中目标组件的 `example` / `defaultProps` 静态字段，不修改组件 `.vue` 实现；
- `create-variant`：创建 `src/prototypes/<prototypeId>/fixtures/<variantId>.json`，并向 `src/prototypes/registry.ts` 的目标 Screen 追加 `{ id, ..., fixture: 'fixtures/<variantId>.json' }`；两个文件必须原子写入。

### 15.2 确认流程

```text
用户发起高级操作
  → 校验输入和 Schema
  → 服务端生成候选 patch
  → 弹框展示目标文件、摘要和 diff
  → 用户二次确认
  → 应用 patch
  → format / validate
  → 刷新注册表和预览
```

### 15.3 安全边界

- 仅允许修改 PBWork source 内的白名单目录和文件类型；
- 客户端不能提交任意绝对路径；
- 预览 patch 与最终应用必须使用同一内容摘要；
- 文件在确认前发生变化时拒绝写入并重新生成 diff；
- 写入失败不得留下部分修改；
- TypeScript 注册表只允许 AST 定位并修改既有静态字段，禁止正则替换源码；JSON 使用临时文件 + 原子替换；
- Schema 校验或格式化失败时报告错误，不静默写入；
- 服务端不得执行客户端传入的任意 shell 命令。

本地服务可以提供“生成预览 patch”和“确认应用 patch”两个阶段的接口，确认令牌短时有效且只能使用一次。

白名单固定如下，不得放宽到仓库任意路径：

- `update-component-example` 只允许 `src/design-system/components/registry.ts`；
- `create-variant` 只允许 `src/prototypes/registry.ts` 与 `src/prototypes/<prototypeId>/fixtures/<variantId>.json`；
- 拒绝：仓库根配置、`packages/**`、任意绝对路径、客户端传入的 shell

### 15.4 本地 API 契约

| Endpoint | 作用 |
|----------|------|
| `GET /__pbwork/source-actions/status` | 返回写入服务是否可用、允许操作和白名单摘要 |
| `POST /__pbwork/source-actions/preview` | 校验结构化操作并返回文件摘要、unified diff、确认令牌和过期时间 |
| `POST /__pbwork/source-actions/apply` | 使用一次性确认令牌应用 preview 中完全相同的 patch |

客户端只提交结构化动作，如 `update-component-example` 或 `create-variant`，不得提交任意文件内容或 patch。服务端根据注册表 ID 解析目标文件。响应统一包含 `ok`、`code`、`message`；失败时不得依赖 HTTP 500 文本让界面猜测原因。

`apply` 成功后返回变更文件、校验结果和新的注册表摘要；失败时返回可展示错误并保证文件恢复到操作前状态。非开发环境三个 Endpoint 都不存在，而不是仅依赖前端隐藏按钮。

---

## 16. 目录结构

PBWork 固定为本仓库内的 `apps/pbwork/` 独立前端应用。旧 `examples/` 已经移除且不再维护或使用；PBWork 不提供兼容层，不读取旧路径，也不复用旧脚本。Source adapter 的 `source.root` 指向 `apps/pbwork/`，runtime capture 只使用 PBWork 的 Runtime URL。

```text
apps/pbwork/
├── package.json
├── proto-bridge.config.json    # source.adapter=vue3-prototype，source.root=.
└── src/
    ├── app/                    # Router、Pinia、Vuetify 入口
    ├── workbench/              # PBWork 壳
    │   ├── layout/
    │   ├── navigation/
    │   ├── canvas/
    │   ├── inspector/
    │   ├── comments/
    │   └── source-actions/
    ├── runtime/                # 纯原型 Layout 与 Runtime Bridge
    ├── design-system/
    │   ├── tokens/             # 共享 JSON 定义
    │   ├── themes/             # 共享 JSON 定义
    │   ├── components/         # Vue 实现、注册表与共享 JSON 契约
    │   └── schemas/
    └── prototypes/
        ├── registry.ts
        └── <prototype>/
            ├── screens/
            ├── variants/
            ├── fixtures/
            └── metadata.ts
```

推荐 Pinia store：

- `workbench`：导航、面板开关、工作台主题；
- `canvas`：设备、缩放、平移、工具模式；
- `prototype`：当前 Prototype、Screen、Variant 和原型主题；
- `selection`：hover、选中元素和 Runtime Bridge 状态；
- `comments`：本地评论；
- `playground`：组件临时 Props / State。

### 16.1 首期固定内容

首期内容用于验证真实工作流，不从旧 example 搬运：

- Theme：`light`、`dark`；
- 基础组件：按钮、图标按钮、文本框、Chip、Card；
- 复杂组件：App Bar、Tabs、Data List、Bottom Sheet；
- Prototype“项目协作”：任务列表（默认、加载中、空态）与任务详情（概览、活动、错误、Sheet 打开）。

上述内容是 M2—M4 的共同验收样本；实现时可以细化视觉，但不得用占位页替代多页面、多 Variant 和弹层场景。

---

## 17. 首期里程碑

按依赖顺序交付；后一阶段不阻塞前一阶段的可演示验收。

| 阶段 | 目标 | 完成标准（摘要） |
|------|------|------------------|
| M1 壳与双路由 | 工作台布局 + Runtime Layout 分离 | 工作台 URL 与 Runtime URL 可分别打开；Runtime 无壳 DOM |
| M2 注册表与导航 | Foundations / 组件 / 原型树 | 注册表驱动二级导航；至少一套多页原型可点选 |
| M3 画布与设备 | 单手机 iframe 画板 | 缩放、拖动、适应、设备切换、主题与 Variant 切换、复制 Runtime URL |
| M4 Bridge 与检查 | 选择元素 + 右侧检查 | inspect 模式、选中信息、`data-pb-*` 展示 |
| M5 评论 | 本地评论 | 新增/完成/删除/刷新仍在/定位失效 |
| M6 高级写入 | 开发环境写回 | Playground 更新示例与保存 Variant：diff + 二次确认 + 白名单 |

全局搜索与设置按 §5 stub 实现即可，不单独占里程碑。

### 17.1 测试边界

测试只覆盖容易破坏核心闭环的契约：注册表解析与 URL 规范化、Bridge 信封校验、评论持久化、源码写入白名单与原子性，以及一条 workbench → Runtime 的 Playwright 闭环。组件库不追求覆盖率指标，不为 Vuetify 行为重复写测试，也不扩张大面积快照。

---

## 18. 首期验收标准

### 18.1 工作台结构

- 平台名称显示为 PBWork；
- 顶栏、三栏内容结构和右侧检查面板布局稳定；
- 一级导航固定为“设计基础 / 组件 / 原型”；
- 二级导航可折叠，原型可按生命周期过滤；
- 1280px 及以上桌面窗口可正常使用。

### 18.2 设计系统与组件

- Token 与 Theme 有完整视觉样本；
- 工作台壳和原型主题可以独立切换；
- 至少展示一组基础组件和一个复杂组件；
- Playground 可以临时调参、重置，并完成一次受控源码更新预览。

### 18.3 原型与画布

- 至少一套多页面原型；
- 至少一个 Screen 包含两个以上源码注册 Variant；
- 单手机画板支持缩放、拖动、适应画布和设备切换；
- iframe overlay 不越过手机运行时边界；
- 全屏与复制链接使用当前 iframe Runtime URL（history，含 variant/theme）；
- 将复制出的 URL 直接交给 PB 时，不包含任何工作台 DOM。

### 18.4 检查与评论

- 选择模式可以 hover、选中和清除元素；
- 右侧显示结构、样式和 PBWork 约定检查（含强制写入的 `data-pb-*`），且不伪装成 PB Core 产物；
- 评论可以按元素保存、重新定位、完成和删除；
- 刷新后本地评论仍存在；
- 元素失效时评论不会丢失，并显示定位失效状态。

### 18.5 高级操作

- 默认浏览和 Playground 操作不修改源码；
- 更新组件示例和保存 Variant 都必须显示 diff 并二次确认；
- Variant 写入后可以由独立 Runtime URL 恢复；
- 非开发环境不提供源码写入入口。

---

## 19. PB 源码约定

本节是 PBWork 作为 Vue / Vuetify 生产者的写法规范，与 [conventions.md](./conventions.md) 的角色 / shell 语义对齐。当前 PB Core **不读取** `data-pb-*`，但仍要求工作台源码强制写入，以便检查面板、评论锚点与未来显式协议无缝衔接；**同时**必须满足当前 tag / class 启发式，否则今天的 `source.analyze` / runtime 识别会失败。

### 19.1 强制标记

| 属性 | 谁必须写 | 值 |
|------|----------|-----|
| `data-pb-id` | 新建组件根、页面关键区块、列表行根、可评论的主要节点 | 稳定、页面内唯一，如 `task-list.summary`；动态列表使用业务 ID（如 `task-list.row.${task.id}`），禁止使用数组 index |
| `data-pb-role` | 逻辑区块根（对应 conventions section kind / 派生角色） | 如 `app-bar`、`list`、`section`、`tab-bar`、`bottom-bar`、`chart` |
| `data-pb-shell` | Overlay / 临时层根 | `sheet` / `dialog` / `modal` / `drawer`（与 conventions shell kind 一致） |

规则：

1. 能被检查或评论的节点优先保证 `data-pb-id`；
2. 区块根同时写 `data-pb-role`；shell 根同时写 `data-pb-shell`；
3. 不发明 Core 角色表以外的业务词表；
4. 属性是补充，**不能替代** tag / class / 显隐绑定等当前识别面。

### 19.2 Vuetify → 当前识别面

换库只换映射；角色与 shell 含义仍以 conventions 为准。

| 约定 | Vuetify / 写法 | 如何命中当前启发式 | 同时写入 |
|------|----------------|--------------------|----------|
| `app-bar` | `v-app-bar` 或页面顶栏根 | 根节点 class 含 `app-bar`（或 `navbar` / `toolbar`） | `data-pb-role="app-bar"` + `data-pb-id` |
| `tab-bar` | `v-tabs` / 分段控件外层 | class 含 `tab-bar` 或 `section-tabs` | `data-pb-role="tab-bar"` |
| `list` | `v-list` 或列表容器 | class 含 `list`；行数据在源码循环中可见 | 容器 `data-pb-role="list"`；行 `data-pb-id` |
| `section` | `v-card` / 面板根 | class 含 `section` / `card` / `panel` | `data-pb-role="section"` |
| `chart` | 图表容器 | class 含 `chart` / `trend` 等 | `data-pb-role="chart"` |
| `bottom-bar` | 底部操作区 | class 含 `bottom-bar` / `bottom-actions` | `data-pb-role="bottom-bar"` |
| `sheet` | `v-bottom-sheet` 内容根 | `v-model` / `v-if` 显隐 + class 含 `sheet`（或标签名以 sheet 结尾） | `data-pb-shell="sheet"` |
| `dialog` / `modal` | `v-dialog` 内容根 | 显隐绑定 + class 含 `dialog` / `modal` | `data-pb-shell="dialog"` 或 `modal` |
| `drawer` | `v-navigation-drawer`（临时层场景） | 显隐绑定 + class 含 `drawer` | `data-pb-shell="drawer"` |

Shell 显隐状态名建议 `*Open` / `*Visible` / `show*`，并与业务态字段分开。

### 19.3 约定检查

选中元素的「约定」Tab 应同时显示：

- 原始 tag/class，以及根据本节规则得到的 PBWork 约定匹配项；
- 节点上的 `data-pb-id` / `data-pb-role` / `data-pb-shell`；
- 不一致时的提示（例如 class 像 list 但缺少 `data-pb-role`）。

该 Tab 是 PBWork 的源码约定检查，不复制 Core adapter 的完整算法，也不得声称是某次 PB 运行的真实结果。真实 PB 结果只能来自 PB 产物，首期不接入。约定问题只提示、不阻断预览；新建页面和组件的 code review 应拒绝缺少关键 `data-pb-id` 的区块根。

---

## 20. 后续方向

- 显式 `data-pb-*` 协议被 Core 正式消费，与 React source adapter、中立 Source IR 统一设计；
- Flutter 共享主题、基础组件和复杂组件定义；
- PB 产物在真实生产页面跟进中的使用方式；
- 多人共享评论、在线状态和评审流程；
- 登录鉴权、角色权限和定稿权限；
- 拖拽编排、版本历史、发布与回滚；
- 跨端运行页面的视觉与交互验收。

当前 PB 的 class/tag 约定以 [conventions.md](./conventions.md) 为准；PBWork 按 §19 强制预留 `data-pb-*`，并保持 tag / class 识别面可用。
