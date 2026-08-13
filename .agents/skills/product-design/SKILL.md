---
name: product-design
description: >-
  Define, review, or revise product intent, users, scope, information
  architecture, journeys, interaction behavior, states, and acceptance signals
  before implementation. Use for new products, new prototypes, structural
  feature changes, navigation changes, ambiguous requirements, or workflows
  whose product logic is incomplete. Do not use for visual styling alone,
  implementation-only maintenance, defects with an established design, or
  PBWork-specific authoring and Evidence rules.
---

# 产品设计

先把产品逻辑闭合，再进入视觉设计或实现。主动整理含糊输入并提出连贯推荐，不把工作退还成一份长问卷。

## 判断设计范围

| 请求 | 处理 |
| --- | --- |
| 新产品、新原型、新核心流程 | 完成完整产品设计并取得确认 |
| 根导航、页面职责、核心对象或状态改变 | 形成设计增量并取得确认 |
| 单页局部交互 | 只补受影响的行为和状态 |
| 缺陷、文案、Token、Evidence 或纯实现维护 | 沿用既有设计，通常不触发本 Skill |

把信息标记为明确、可低风险推定或阻断。只有不同选择会改变产品方向、核心流程或信息架构时才暂停；暂停前先给出推荐方案和取舍。

## 必须闭合的产品问题

### 产品定义

- 目标用户、使用情境和当前阻力；
- 一句话产品承诺、主要结果和成功信号；
- 核心对象、关系和生命周期；
- 范围、非目标和设计原则。

### 信息架构

- 根导航的唯一职责和页面地图；
- 页面、面板、浮层、流程步骤与筛选的层级；
- 入口、返回、深链和跨模块连续性；
- 每个页面存在的理由与明确不承载的内容。

不要让底部导航、页面主标签和局部筛选争夺同一层级。可见切换必须改变职责、内容或数据范围。

### 交互与状态

- 每个页面的主导目的和操作优先级；
- 每个控件的初始状态、触发、可见结果、持久化和恢复；
- 成功、加载、空、错误、校验、禁用和中断；
- 确认、撤销、退出、返回和跨页状态保持；
- 如何证明操作成功，而不是只显示 Toast 或选中态。

把原型视为可运行的产品切片。未准备实现的能力不要画成可交互控件。

## 输出与确认

新产品或结构性设计至少输出：产品定义、对象模型、导航与页面职责、核心旅程、关键状态、假设与否决项、可观察验收信号。维护任务只记录设计增量。

本 Skill 不规定视觉语言、设计系统、路由、Evidence 或目标技术栈。视觉方向交给视觉设计 Skill；仓库落点交给仓库专用 Skill。

结构性设计在实现前必须取得用户确认。确认整套方向即可，不要求逐条签字。
