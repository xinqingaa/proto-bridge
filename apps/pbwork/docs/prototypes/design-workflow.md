# 原型设计工作流

本文是 PBWork 业务原型从需求到正式 Authoring 的唯一设计流程。产品定义、视觉探索、设计基线和工程实现分别拥有清楚边界。

## 阶段

```text
需求与参考
  → 产品设计
  → 视觉探索（按需）
  → 用户确认
  → prototypes/{id}/docs/design.md
  → Promotion Gate
  → 正式 PBWork Authoring
  → Runtime / Evidence / Handoff
```

### 1. 产品设计

使用仓库 `product-design` Skill 闭合用户、范围、对象、信息架构、流程、状态和验收信号。页面数量和功能清单不是产品设计。

### 2. 视觉设计与探索

视觉语言不明确、现有页面缺少焦点或需要比较方向时，由 `pbwork-prototype-design` 编排 `frontend-design`。视觉方案必须与业务主体、页面任务和真实内容相关，不能只给出“高级、极简”等形容词。

需要真实页面比较时，探索代码只放在：

```text
apps/pbwork/src/explorations/{prototypeId}/
```

探索页允许快速验证构图，但不进入 Prototype Registry，不受正式 Authoring 完整性门禁，不得用于 Capture/Handoff，也不得声称可以直接交付目标端。

### 3. 设计确认

新原型、结构性改动和视觉语言改变必须在正式实现前获得用户确认。确认前可以继续分析和探索，但不能覆盖正式 Screen。

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

| 状态 | 含义 |
| --- | --- |
| `draft` | 产品定义、IA 或交互仍未闭合 |
| `exploring` | 存在待选择的结构或视觉方向 |
| `approved` | 结构和视觉方向已获确认，可以正式 Authoring |

`design.md` 是产品与体验唯一基线，至少覆盖：

- 产品定义、用户、承诺、范围与非目标；
- 核心对象、关系和状态；
- 信息架构、页面地图和导航职责；
- 核心旅程、交互结果、失败与恢复；
- 产品级视觉命题和共享视觉语法；
- 逐页焦点、构图、密度和任务型差异；
- 图标、图片、图表、动效和外部资产策略；
- Theme、目标视口、安全区域、键盘和可访问性；
- Promotion Gate 分类；
- 否决项、未决项和可观察验收信号。

不要求机械复制标题或填充无关章节，但以上决策必须可定位。Registry、文件清单、测试命令、Evidence 字段和代码细节不写入设计基线。

个案实现说明可选放在 `docs/implementation.md`。它只记录本原型的代码组织、状态存储、迁移和实现决定，不复制 PBWork 通用规范。

禁止在 Prototype 根目录新增 `requirements.md`、`implementation-notes.md` 或其它平铺产品文档。

## Promotion Gate

探索方向进入正式 Authoring 前，每个重要视觉元素必须归类：

| 分类 | 处理 |
| --- | --- |
| 现有 PBWork DS | 直接使用公开 Contract |
| 通用 DS 缺口 | 切换 `pbwork-design-system`，先完成 Token/组件原子变更 |
| 业务局部 UI | 使用现有 Token，并声明独立 Evidence 节点 |
| 外部资产/动效 | 定义资产 ID、状态、触发、时长、降级和跨端契约 |
| 放弃或降级 | 在设计文档记录原因，不把不可交付创意静默带入正式实现 |

视觉独特不等于必须新增 DS。只有跨页面或跨业务稳定复用的能力才进入共享层。

## 正式 Authoring

`pbwork-prototype-authoring` 只消费 `status: approved` 的设计。正式页面遵守 Token-only、DS-first、Flex-only、Registry、semantic authoring、Action/Scenario/Checkpoint 和 Runtime 确定性约束。

若实现暴露假交互、结构冲突、无法兑现的视觉方向或范围扩大，停止实现并回到设计阶段，不静默改变 `design.md`。

## Skill 边界

| Skill | 负责 | 不负责 |
| --- | --- | --- |
| `product-design` | 产品定义、IA、流程、状态 | 具体视觉语言、PB Evidence |
| `frontend-design` | 通用视觉发散、构图、字体、审美批评 | PB Token/DS、Flutter 映射 |
| `pbwork-prototype-design` | 编排产品与视觉设计、探索、设计基线、晋级分类 | 正式 Runtime/Evidence 实现 |
| `pbwork-prototype-authoring` | 正式 Screen、Registry、状态与 Evidence | 替用户决定结构性方向 |
| `pbwork-design-system` | 共享 Token、Theme、组件和手势 | 单个业务页面的产品设计 |

普通 Token、组件、Contract 或缺陷维护不默认调用 `frontend-design`。只有新视觉身份、跨页面视觉原语或大范围组件语言重构才先进入原型设计或视觉设计。
