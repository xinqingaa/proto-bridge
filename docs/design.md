# 示例工作台设计定稿

> 状态：已定稿  
> 范围：`examples/` 内可演示工作台的定位、视觉、技术栈与演示范围  
> 非目标：不替代 [overview.md](./overview.md) / [artifacts.md](./artifacts.md) / [usage.md](./usage.md)  
> 原型写法约定见 [source-conventions.md](./source-conventions.md)

---

## 1. 定位

在 `examples/` 里做一套**可演示的工作台核心**：用约定好的交互原型对接 ProtoBridge（PB），跑通「编排 → 预览/变体 → 导出产物 → 对照 Flutter 落地」全流程。

- **可以少**：不做完整 SaaS（权限、多租户、协作后端、低代码画布等）。  
- **必须精**：三栏壳、手机框原型、状态变体、PB 导出与审查入口都要能演示。  
- **落点**：扩展现有 `examples/vue3-to-flutter/`（或同目录增壳），**不**新建顶层 `workbench/` 仓或目录产品线。

```text
设计系统 / Vuetify 组件
    ↓ 编排（真源码原型）
可交互手机原型（含 Variant）
    ↓ 工作台：预览 / 选中 / 变体 / 截图
    ↓ source + URL
ProtoBridge
    ↓
page-canonical / ui-build-plan / ui-build-review
    ↓
Agent 按 Flutter target 约定实现与校验
```

分工：

| 角色 | 负责 |
|------|------|
| 工作台（example） | 按约定产出可解析原型；触发 / 展示 PB |
| PB | 采集 → 合并 → 规划 → 审查 |
| 实现 Agent | 读产物，在 target Flutter 工程里写代码 |

---

## 2. 视觉与产品原则

| 项 | 定稿 |
|----|------|
| 设计语言 | **Material Design**（Google 系） |
| 明确告别 | 国区 H5 / Vant 默认脸；不为「像现网 App」牺牲栈统一 |
| 原型原则 | 规范先于自由：只用可被 PB 稳定识别的结构（见 source-conventions） |
| PB 原则 | PB **不承诺**任意原型完美还原；工作台 **承诺**按约定产出可解析原型 |

超出约定的 UI：降级为 runtime 视觉证据 + 人工确认，不靠扩张 PB 启发式。

---

## 3. 技术栈（锁定）

| 层 | 选择 |
|----|------|
| 框架 | Vue 3 + Vite + Vue Router + Pinia |
| UI | **Vuetify 3**（工作台壳 + 手机框内原型**同一库**） |
| 手机框 | 外框自研；原型优先 **iframe**，或 overlay **contained**（禁止 sheet/dialog teleport 飞出手机框） |
| 与 PB | 现有 `source: vue3-prototype`，本期**不改** Core 也能边搭边验 |
| 备选退路 | 若框内交互/观感明显不够，再评估 **仅框内**换 Vant；壳仍可留 Vuetify。默认不走这条 |

不采用：React 本期主路径、shadcn/MUI、桌面壳与手机原型混用两套 UI 库（除非触发退路）。

---

## 4. 信息架构（三栏）

```text
┌─────────────┬──────────────────────────────┬─────────────┐
│ 左侧导航    │ 中央画布                     │ 右侧工具    │
│             │                              │             │
│ · 设计系统  │  手机外框 + 原型运行时        │ · 选中/检查 │
│ · 组件库    │  （可缩放、多机型尺寸）       │ · 截图      │
│ · 原型列表  │                              │ · 状态/变体 │
│ · 页面树    │                              │ · PB 导出   │
│ · Token     │                              │ ·（评论可极简）│
└─────────────┴──────────────────────────────┴─────────────┘
```

同一 example 内：壳、组件预览、原型运行时统一 Vue + Vuetify。

### 对象模型（必做）

| 对象 | 含义 |
|------|------|
| Design tokens | 色、字、间距等（可先薄） |
| Prototype | 一套业务原型（路由 + 多页）= `source.root` |
| Screen / Page | 一个路由页 |
| **Variant / State** | 同页业务态（空态、Tab、Sheet 开合…），支撑多次 capture |
| Export Job | 触发 PB generate / reconstruct，展示 review / artifacts |

### 编排策略

- **先做**：真 Vue 源码原型 + 预览壳 + 变体切换 + PB Bridge。  
- **不做（本期）**：纯 JSON 渲染引擎、重型拖拽低代码、独立协作后端。

---

## 5. 演示清单（少而精）

| 能力 | 最低演示标准 |
|------|----------------|
| 三栏壳 | 左选原型/页，中见手机框，右切变体并导出 |
| 约定组件页 | 至少 1 简单列表页 + 1 含 Tab/Sheet 的复杂页 |
| Variant | 同一复杂页可切换 ≥2 态并分别出 PB 产物 |
| PB Bridge | 一键或脚本触发；能打开 `ui-build-review.md` / plan |
| Flutter 对照 | 沿用 example target；能对照预览（现有 `_proto` 路径即可） |

---

## 6. 绿灯田与现网

现网同类工作台（如 Element 壳 + Vant 手机）只提供产品直觉，**代码与资产不可用**。本 example 自建规范与实现，不 fork 现网。

---

## 7. 后续（记录，不挡本期）

| 项 | 说明 |
|----|------|
| React source adapter | 见 [overview.md](./overview.md)「适配器」；中立 IR + `react-prototype` 为后续增强 |
| `data-pb-*` 稳定标记 | 见 [source-conventions.md](./source-conventions.md)；增强项，非开工前置 |
| Token ↔ Flutter 硬映射表 | 首期不做；PB 保留 style facts，实现侧读 target |
| 分仓独立工作台产品 | 不做；价值验证成功后再议 |

---

## 附录：Vuetify → source-conventions 映射

通用角色与 shell 定义见 [source-conventions.md](./source-conventions.md)。下表仅说明**本期用 Vuetify 3 如何满足该约定**；换库时替换本附录，不改约定正文。

| 约定角色 / shell | Vuetify 组件 | 如何满足识别面 | 备注 |
|------------------|--------------|----------------|------|
| `app-bar` | `v-app-bar` | 标签名含 `app-bar` | |
| `tab-bar` | `v-tabs` / `v-tab` | 含 `tab` | |
| `list` | `v-list` / `v-list-item` | 含 `list`；行数据在源码中可分析 | |
| `bottom-bar` | `v-bottom-navigation` 或底栏布局 | 必要时补 `bottom-bar` / `bottom-actions` class | |
| `section` / 卡片 | `v-card` / `v-sheet` | 含 `card` / `sheet` 块级语义 | |
| `sheet` | `v-bottom-sheet` + 显隐绑定 | 标签名以 `sheet` 结尾 | 状态名建议 `*Open` |
| `dialog` / `modal` | `v-dialog` + 显隐绑定 | 标签名以 `dialog` 结尾 | |
| `drawer`（临时层） | `v-navigation-drawer`（temporary） | 标签名含 `drawer` | 按页需要 |

**手机框（实现约束，非 source 语义）**：原型优先放在 **iframe**，或强制 overlay **contained**，避免 `v-dialog` / `v-bottom-sheet` teleport 到 `body` 后飞出画布。

**退路**：若仅框内改 Vant，另写一张「Vant → source-conventions」表（可包一层满足 §4 的契约组件）；壳仍可留 Vuetify。

无组件库时的 class 参考写法见 source-conventions 附录 A.4 与现有 `examples/vue3-to-flutter/source-vue3`。

---

## 相关文档

- [source-conventions.md](./source-conventions.md) — 框架无关的原型结构 / 弹层约定  
- [overview.md](./overview.md) — PB 能力与适配器  
- [artifacts.md](./artifacts.md) — 产物字段  
- [usage.md](./usage.md) — CLI / MCP  
- [examples/vue3-to-flutter/README.md](../examples/vue3-to-flutter/README.md) — 现有示例 harness  
