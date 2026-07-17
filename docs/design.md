# PBWork 原型工作台设计

> 状态：已定稿
> 范围：PBWork 的产品结构、页面布局、运行时边界、交互方式与首期验收标准
> 非目标：本文不设计 Flutter 实现链路、PB 产物消费流程或多人协作系统

PBWork 是使用 Vue 3 与 Vuetify 3 建设的原型平台。它集中展示设计基础、主题、组件和真实交互原型，并为 PB 提供独立、干净、可复现的原型 Runtime URL。

---

## 1. 产品目标

PBWork 首期必须完成以下闭环：

1. 浏览 Token、Theme、基础组件和复杂组件；
2. 在 Playground 中查看组件 Props 与状态变化；
3. 按生命周期浏览原型、页面和 Variant；
4. 在单手机画板中运行真实 Vue 页面；
5. 选中运行时元素并检查组件、结构、样式与 PB 识别信息；
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
| 组件描述 | Token、Theme、组件元数据；复杂组件可使用 JSON Schema 描述数据、Props 与状态 |
| 高级源码写入 | 仅开发环境启用的本地 Vite/Node 服务 |

Vue 与 Vuetify 是 PBWork 的主要实现技术。JSON Schema 用于描述原型平台与 Flutter 可共享的主题或组件定义，不替代真实 Vue 页面源码，也不等同于 PB 产物。

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
│        │                  │ 单手机画板                  │ PB / 样式        │
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
├── 进行中
├── 待确认
├── 已定稿
└── 已归档
```

原型按生命周期分类，不按 UI、PM、DE、QA 等职责重复归档。职责作为原型元数据与筛选条件，可以用 `v-chip` 展示负责人和参与方。

选中某个生命周期后，二级面板继续展示 Prototype → Screen → Variant 树：

```text
已定稿
└── 资产业务
    ├── 持仓列表
    │   ├── 默认态
    │   └── 空态
    └── 盈亏分析
        ├── 总览
        ├── 已实现
        └── 风险
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

手机外框使用中性 CSS 视觉，不绑定具体品牌。默认 viewport 为 390 × 844，并提供若干常用设备尺寸。缩放只影响画板显示，不改变 iframe viewport。

iframe 使 Vuetify overlay 即使挂载到 `body`，仍被限制在手机运行时内部，不会飞出工作台画布。

---

## 8. 工作台 URL 与 Runtime URL

PBWork 必须使用两套明确分离的路由布局。

### 8.1 工作台路由

工作台路由用于浏览、检查和操作 PBWork：

```text
/workbench/foundations/tokens/colors
/workbench/foundations/themes/:themeId
/workbench/components/:componentId
/workbench/prototypes/:prototypeId/screens/:screenId
```

工作台路由会挂载顶栏、导航、画布、检查器和评论工具，不得作为 PB 的页面输入。

### 8.2 原型 Runtime 路由

Runtime 路由只挂载原型页面和必要运行时能力：

```text
/prototype/:prototypeId/:screenId?variant=:variantId&theme=:themeId
```

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

切换工作台壳主题不得重载或改变原型主题。切换原型主题只更新 Runtime URL 或向 Runtime Bridge 发送主题命令，不改变 PBWork 壳。

Component Playground 使用原型主题体系，可以在 Playground 内独立切换，不继承工作台壳主题。

---

## 11. Runtime Bridge 与元素选择

PBWork 与 iframe 通过轻量 Runtime Bridge 通信。即使首期同源，也使用 `postMessage` 保持工作台与原型运行时边界清晰。

### 11.1 消息方向

```text
Prototype iframe
  ready / hover / select / route / state
                ↓ postMessage
PBWork
  更新工具状态、选中对象和右侧检查面板

PBWork
  inspect-mode / comment-mode / highlight / theme / variant / reload
                ↓ postMessage
Prototype iframe
```

消息必须包含来源标识、协议版本、prototypeId、screenId 和 variantId；PBWork 只接受来自当前 iframe 与允许 origin 的消息。

### 11.2 选择行为

1. 进入“选择元素”模式；
2. hover 元素时在 iframe 内显示高亮边框和尺寸；
3. 点击后锁定元素；
4. Runtime Bridge 返回元素信息和最近的语义父节点；
5. 右侧检查面板切换到选中元素；
6. `Esc` 清除选择。

普通 DOM 可以被选择；带稳定标记的组件或区块提供更完整信息。工作台新建组件和关键页面区块应提供 `data-pb-id`，并按当前约定同时保留可被 PB 识别的 tag/class。`data-pb-role` / `data-pb-shell` 作为未来兼容标记写入，但当前 PB Core 不依赖这些属性。

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
- 当前 class/tag 识别面；
- 预留的 `data-pb-*` 信息。

### 12.4 选中元素

建议使用以下 Tab：

| Tab | 内容 |
|-----|------|
| 概览 | 标签、class、文本、bbox、DOM path、所属 Screen/Variant |
| 组件 | 组件名、Props/State、Contract ID、语义父节点 |
| PB | 当前启发式 role/shell、`data-pb-id`、`data-pb-role`、`data-pb-shell` 与一致性提示 |
| 样式 | 字体、颜色、背景、间距、圆角、边框和阴影 |
| 评论 | 当前元素的未完成和已完成评论 |

---

## 13. Variant

Variant 默认由源码注册，工作台只负责切换和展示。每个 Variant 至少包含：

```ts
type PrototypeVariant = {
  id: string
  label: string
  description?: string
  route: string
  query?: Record<string, string>
  fixture?: string
}
```

典型 Variant 包括默认态、加载中、空态、错误态、指定 Tab、Sheet 打开和 Dialog 打开。

页面仍可正常交互，但临时交互状态不会自动成为正式 Variant。“高级操作 → 保存为新 Variant”会读取当前可序列化状态，要求填写 ID、名称和说明，并在二次确认弹框中显示目标注册表、状态摘要与 diff。确认后才写入源码。

工作台不得保存业务上无法恢复或无法序列化的状态；写入后必须能够通过 Runtime URL 独立打开。

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

---

## 15. 高级源码写入

高级写入只在本地开发环境启用，部署后的只读 PBWork 不暴露入口。

### 15.1 支持操作

- 将 Playground 当前配置更新为组件示例；
- 将当前页面可序列化状态保存为新 Variant。

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
- Schema 校验或格式化失败时报告错误，不静默写入；
- 服务端不得执行客户端传入的任意 shell 命令。

本地服务可以提供“生成预览 patch”和“确认应用 patch”两个阶段的接口，确认令牌短时有效且只能使用一次。

---

## 16. 推荐目录结构

```text
prototype/src/
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
│   ├── tokens/
│   ├── themes/
│   ├── components/
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

---

## 17. 首期验收标准

### 17.1 工作台结构

- 平台名称显示为 PBWork；
- 顶栏、三栏内容结构和右侧检查面板布局稳定；
- 一级导航固定为“设计基础 / 组件 / 原型”；
- 二级导航可折叠，原型可按生命周期过滤；
- 1280px 及以上桌面窗口可正常使用。

### 17.2 设计系统与组件

- Token 与 Theme 有完整视觉样本；
- 工作台壳和原型主题可以独立切换；
- 至少展示一组基础组件和一个复杂组件；
- Playground 可以临时调参、重置，并完成一次受控源码更新预览。

### 17.3 原型与画布

- 至少一套多页面原型；
- 至少一个 Screen 包含两个以上源码注册 Variant；
- 单手机画板支持缩放、拖动、适应画布和设备切换；
- iframe overlay 不越过手机运行时边界；
- 全屏与复制链接使用当前 iframe Runtime URL；
- 将复制出的 URL 直接交给 PB 时，不包含任何工作台 DOM。

### 17.4 检查与评论

- 选择模式可以 hover、选中和清除元素；
- 右侧显示结构、样式和 PB 识别信息；
- 评论可以按元素保存、重新定位、完成和删除；
- 刷新后本地评论仍存在；
- 元素失效时评论不会丢失，并显示定位失效状态。

### 17.5 高级操作

- 默认浏览和 Playground 操作不修改源码；
- 更新组件示例和保存 Variant 都必须显示 diff 并二次确认；
- Variant 写入后可以由独立 Runtime URL 恢复；
- 非开发环境不提供源码写入入口。

---

## 18. 后续方向

- 显式 `data-pb-*` 协议与 React source adapter；
- Flutter 共享主题、基础组件和复杂组件定义；
- PB 产物在真实生产页面跟进中的使用方式；
- 多人共享评论、在线状态和评审流程；
- 登录鉴权、角色权限和定稿权限；
- 拖拽编排、版本历史、发布与回滚；
- 跨端运行页面的视觉与交互验收。

当前 PB 的 class/tag 约定以 [conventions.md](./conventions.md) 为准；PBWork 只需在新源码中同时预留未来 `data-pb-*` 标记。
