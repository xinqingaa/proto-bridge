# 原型设计工作流

本文是 PBWork 业务原型从需求到正式 Authoring 的唯一设计流程。产品定义、视觉探索、设计基线和工程实现分别拥有清楚边界。

## 阶段

```text
需求与参考
  → 产品设计
  → 视觉探索（按需）
  → 产品基线确认
  → 页面设计增量确认
  → Promotion Mapping
  → 正式 PBWork Authoring
  → Delivery Gate + 分级 Experience Review
  → Runtime / Evidence / Handoff
```

### 1. 产品设计

在 PBWork 原型设计阶段闭合用户、范围、对象、信息架构、流程、状态和验收信号。页面数量和功能清单不是产品设计。

### 2. 视觉设计与探索

视觉语言不明确、现有页面缺少焦点或需要比较方向时，由 PBWork 原型设计流程调用仓库内 `frontend-design`。视觉方案必须与业务主体、页面任务和真实内容相关，不能只给出“高级、极简”等形容词。

需要真实页面比较时，探索代码只放在：

```text
apps/pbwork/src/drafts/{prototypeId}/
```

探索页允许快速验证构图，但不进入 Prototype Registry，不受正式 Authoring 完整性门禁，不得用于 Capture/Handoff，也不得声称可以直接交付目标端。

### 3. 设计确认

新原型、结构性改动和视觉语言改变必须在正式实现前获得用户确认，或获得范围明确的 Agent 自主设计授权。确认前可以继续分析和探索，但不能覆盖正式 Screen。自主设计仍须先形成可审阅的页面契约，不能把授权理解为跳过产品闭合。

### 4. 设计基线

正式业务 Prototype 必须提供：

```text
apps/pbwork/src/prototypes/{prototypeId}/docs/design.md
```

文件使用 frontmatter：

```yaml
---
prototypeId: example
status: draft
approvedAt: 2026-08-13 # 仅 approved 时必需
---
```

状态含义：

| 状态        | 含义                                                               |
| ----------- | ------------------------------------------------------------------ |
| `draft`     | 产品定义、IA 或交互仍未闭合                                        |
| `exploring` | 存在待选择的结构或视觉方向                                         |
| `approved`  | 产品定义、IA、核心旅程和共享视觉语法已稳定，可以逐页批准 Authoring |

`design.md` 是产品与体验唯一基线，至少覆盖：

- 产品定义、用户、承诺、范围与非目标；
- 核心对象、关系和状态；
- 信息架构、页面地图和导航职责；
- 核心旅程、交互结果、失败与恢复；
- 产品级视觉命题和共享视觉语法；
- 页面设计状态，以及已批准页面的焦点、阅读顺序、交互结果、关键状态与跨页分工；
- 图标、图片、图表、动效和外部资产策略；
- Theme、目标视口、安全区域、键盘和可访问性；
- 否决项、未决项和可观察验收信号。

不要求机械复制标题或填充无关章节，但以上决策必须可定位。Registry、文件清单、测试命令、Evidence 字段和代码细节不写入设计基线。

个案实现说明放在 `docs/implementation.md`。它记录 Promotion Mapping、页面交付状态、代码组织、状态存储、迁移和实现决定，不复制 PBWork 通用规范。

产品基线 `approved` 不表示所有页面细节已经完成。`design.md` 必须维护页面设计状态；只有状态为 `approved` 的页面或旅程批次可以进入正式调整。页面契约默认由 Agent 起草，用户可以明确决策，也可以授权 Agent 在既定产品边界内闭合。

最小页面契约只写：页面唯一职责与首屏焦点、具名阅读顺序、热区及结果、适用关键状态、跨页分工和可观察验收信号。不写像素、Flex、组件名、class、inspectId、路由或 Evidence 字段，也不把一种草稿构图规定为唯一实现。

禁止在 Prototype 根目录新增 `requirements.md`、`implementation-notes.md` 或其它平铺产品文档。

## Promotion Mapping

探索方向进入正式 Authoring 前，每个重要视觉元素必须归类，并记录在 `docs/implementation.md`：

| 分类           | 处理                                                  |
| -------------- | ----------------------------------------------------- |
| 现有 PBWork DS | 直接使用公开 Contract                                 |
| 通用 DS 缺口   | 先按 PBWork Design System 规则完成 Token/组件原子变更 |
| 业务局部 UI    | 使用现有 Token，并声明独立 Evidence 节点              |
| 外部资产/动效  | 定义资产 ID、状态、触发、时长、降级和跨端契约         |
| 放弃或降级     | 在设计文档记录原因，不把不可交付创意静默带入正式实现  |

视觉独特不等于必须新增 DS。只有跨页面或跨业务稳定复用的能力才进入共享层。

## 正式 Authoring

正式 Authoring 只消费 `status: approved` 的产品基线和已批准的页面设计增量。正式页面遵守 Token-only、DS-first、Flex-only、Registry、semantic authoring、Action/Scenario/Checkpoint 和 Runtime 确定性约束。

新页面或整页重构必须通过 Delivery Gate，并在正式实现稳定后执行分级 Experience Review：

- **Delivery Gate**：验证 Token、DS、Evidence、Variant、Action/Scenario、Runtime 确定性和测试。
- **L1 Quick Experience Check**：默认检查主要视口和主题的默认状态截图，并按最大风险至多增加一张截图；只允许一轮修正，仍有实质问题则升级。
- **L2 Focused Experience Gate**：用户不满意、L1 暴露问题或页面承担高风险视觉与交互时，按实际风险选择三至五张截图验收。
- **L3 Full Experience Audit**：只在用户明确要求、最终批次/发布验收或产品风险要求时完整覆盖声明的主题、视口、关键状态和核心交互。

视觉探索通过不代表正式实现自动通过 Experience Review。`docs/implementation.md` 分别记录 Delivery 结果和 `quick-checked`、`accepted`、`fully-audited`、`needs-focused-review` 或显式 `deferred`。视觉修复只回归受影响的 Delivery 检查与当前 Experience 级别；完整验证保留到页面或连贯批次完成时执行。

若实现暴露假交互、结构冲突、无法兑现的视觉方向或范围扩大，停止实现并回到设计阶段，不静默改变 `design.md`。

## Agent 边界

PBWork 任务统一由仓库 `pbwork` Skill 路由。该 Skill 按任务读取原型设计、正式 Authoring、Design System 或 Workbench reference，跨边界任务可以按阶段组合，但不需要在多个 PBWork Skill 之间切换。

`frontend-design` 只负责通用视觉发散、构图、字体和审美批评，不负责 PB Token/DS、Evidence 或 Flutter 映射。普通 Token、组件、Contract、Workbench、文案或已定缺陷维护不默认调用它；新页面和整页重构则必须在定方向时和正式 Authoring 后各应用一次，由 PBWork 负责 Delivery Gate 与分级 Experience Review 的协调。
