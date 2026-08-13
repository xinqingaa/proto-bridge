---
name: pbwork-prototype-design
description: >-
  Design or redesign PBWork business prototypes before formal authoring. Use
  for new PBWork prototypes, structural product changes, visual-language
  changes, independent visual explorations, promotion of an exploration into
  PBWork, or creation and revision of
  apps/pbwork/src/prototypes/{prototypeId}/docs/design.md. Coordinate
  product-design for product logic and frontend-design for visual direction;
  do not use for routine Token/component maintenance, Workbench UI, or formal
  Evidence implementation after the design is approved.
---

# PBWork 原型设计

把产品逻辑与视觉方向收敛成可由 PBWork 正式实现、采集并交付的设计。不要在探索阶段宣称 PB 合规，也不要在正式页面中边写代码边替用户决定结构性方向。

## 必读

1. 现有 `docs/design.md`、业务页面和用户提供的参考；
2. `apps/pbwork/docs/prototypes/design-workflow.md`；
3. 新产品或结构改变时使用 `product-design`；
4. 视觉语言、页面构图或审美探索时使用 `frontend-design`；
5. 晋级前阅读 `apps/pbwork/docs/principles.md`、Token、组件组合和原型手册。

## 选择工作模式

### 设计模式

用于收敛正式方向并维护：

```text
apps/pbwork/src/prototypes/{prototypeId}/docs/design.md
```

先闭合产品定义、信息架构和交互，再定义产品级视觉语法与逐页构图。页面可以因任务采用不同构图，但必须共享字体、颜色、间距、图标、表面、动效和内容语气的产品语法。

### 探索模式

需要比较视觉方向时，使用独立路由和：

```text
apps/pbwork/src/explorations/{prototypeId}/
```

探索代码：

- 不注册进 Prototype Registry，不进入 Capture/Handoff；
- 不覆盖正式 Screen，不声称符合 PB Authoring Contract；
- 尽量复用 Theme Token 和现有交互组件；
- 可以暂时使用探索性构图、图形和局部视觉值；
- 必须记录与 PBWork Token、DS、Evidence 和跨端资产契约的差距；
- 用户选择方向后再进入晋级，不把探索代码直接移动成正式页面。

## 视觉探索方法

使用 `frontend-design` 时，让它提出与业务主体相关的视觉命题、色彩、字体角色、布局、标志性元素和动效策略，并做自我批评。禁止只产出“高级、简洁”一类不可执行形容词。

视觉计划至少说明：

- 产品级统一视觉语法；
- 每类页面的单一焦点和阅读顺序；
- 页面为何需要环、序列、舞台、图像、图表或其它结构；
- 深浅主题、目标视口、键盘、安全区域和 reduced motion；
- 图片、图标、SVG、Rive、Lottie 或视频的资产角色。

## Promotion Gate

将每个重要视觉元素分到且只分到以下一类：

1. 直接使用现有 PBWork DS；
2. 应扩展或新增的通用 DS 能力；
3. 使用现有 Token 的业务局部 UI；
4. 具有显式 ID、状态和跨端契约的外部资产或动画；
5. 因成本、可访问性或证据不确定性而降级或放弃。

复杂动效必须定义触发、状态、时长、缓动、循环、暂停和 reduced-motion fallback。PB 不从 Screenshot 或 CSS 猜动画；Rive/Lottie 等交付资产 ID 与状态机契约。

晋级时不要求所有新创意都已有 DS 组件。只有跨页面或跨业务稳定复用的能力才进入 DS；业务特有图形留在原型内，但必须 Token 化并声明 Evidence。

## `design.md` 输出

按 `apps/pbwork/docs/prototypes/design-workflow.md` 写入唯一设计基线。文档状态为 `draft`、`exploring` 或 `approved`：

- `draft`：产品或交互尚未闭合；
- `exploring`：存在待选择的视觉或结构方向；
- `approved`：不存在会改变正式实现方向的未决项，且已获用户确认。

不要把 Registry、文件清单、测试命令或 Evidence 字段复制进设计文档；这些属于 Authoring Contract 和可选 `docs/implementation.md`。

## 交接 Authoring

只有 `approved` 设计可以交给 `pbwork-prototype-authoring` 做新原型或结构性实现。交接时提供：

- 获批的产品和视觉方向；
- 逐页职责、关键状态和验收信号；
- Promotion Gate 分类；
- 仍允许实现阶段自主决定的微观范围。

正式实现若暴露假交互、方向冲突或需要扩大范围，停止并回到本 Skill，不静默改写设计。
