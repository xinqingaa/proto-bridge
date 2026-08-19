# 人工五维保真对照模板

> 用途：实施会话已结束，且操作者明确要求「生成人工验收骨架/归档」之后，对照 Source 原型 / Evidence 与目标实施代码做人工 Review 归档。  
> **不是** Agent 实施合同，也不生成机器 Runtime receipt。
> **硬边界：** 不得写回 Prompt / Skill / MCP 默认链路；不得作为下一次实施的输入；不得驱动 Agent 按本文档反复改代码。

## 何时生成（旁路归档）

仅在同时满足时生成或更新本记录：

1. 实施会话已结束（代码冻结或本轮不再大改）；
2. 操作者明确说出「生成人工验收骨架/归档」或等价指令；
3. 输出只写入 `docs/acceptance/runs/...`，不进入 Delivery Prompt。

采集阶段（PBWork/CLI）不在 Agent 对话内，时间线可手填或从 Delivery/Handoff 时间戳近似。

复制到：

`docs/acceptance/runs/<YYYY-MM-DD>-<feature>-human-fidelity-01/manual-acceptance.md`

---

# <原型名> 人工五维保真对照

记录日期：YYYY-MM-DD（Asia/Shanghai）

验收类型：人工五维保真对照  
验收状态：骨架 / 草稿 / 完成首轮 / 完成（带修正项）

关联原型：`apps/pbwork/src/prototypes/<prototype>`

目标工程：`apps/flutter_pb_app`

实施路径：`apps/flutter_pb_app/lib/features/<feature>/`

## 一、验收目的

对照固定 Evidence / Source 原型与目标实施代码，按五维判断还原质量，并区分：

1. 实施侧真实问题；
2. Target 公共组件 / Token 维护差异（命中但不扣分）；
3. 平台迁移可接受差异。

本记录只供人工 Review 归档，不驱动 Agent 反复回查。

## 二、固定验收对象

- Workspace：
- Bundle：
- Snapshot：
- Handoff：
- Delivery（如有）：
- Source Screenshot 数量：
- 实施文件：

## 三、操作时间线

时区默认 Asia/Shanghai。采集在 Agent 外；Agent 段按对话轮次填写。

| 阶段 | 起止 | 执行方 | 备注 |
| --- | --- | --- | --- |
| 采集证据 | HH:MM–HH:MM | PBWork / CLI | Agent 无法采集 |
| 只读计划 | HH:MM–HH:MM | Agent 对话 1 | 理解摘要 + 计划，暂停批准 |
| 实施代码 | HH:MM–HH:MM | Agent 对话 2 | |
| AI 自测 / 验收 | HH:MM–HH:MM | Agent 对话 2 尾声 | analyze / test / 自检 |
| Agent 合计 | 约 N 分钟 | 对话 1 起 → 对话 2 止 | 不含采集 |
| 端到端合计 | 约 N 分钟 | 采集起 → 自测止 | 含采集 |

## 四、计分规则

| 维度 | 看什么 | 不扣分 | 扣分 |
| --- | --- | --- | --- |
| 页面结构 | 壳层、主滚动、section 层级、构图轴向 | 平台原语差异 | scroll owner / 层级 / 构图明显偏离 |
| 组件命中 | Evidence componentId → 目标公共组件是否正确选用 | **命中了但皮肤不同** | 该用公共组件却自造或错用 |
| 主题 Token | Evidence token **key** 是否落到正确 accessor | **key 命中**但最终观感因组件实现不同 | key 未命中或用相近 key 顶替 |
| 状态命中 | Variant、默认值、可见性、固定业务数据 | — | mock 自造、默认值错、参数未消费 |
| 交互命中 | 导航、筛选、弹层、校验、Scenario | 弹层皮肤差异 | 行为缺失或错误 |

五维各给 0–10，再简单平均。仅作人工产品判断，不进机器门禁。

## 五、有效还原

- 

## 六、真实问题

按 Major / Moderate / Minor 列出；每条标明责任：实施 / Target 维护 / 平台。

### 6.1 Major

-

### 6.2 Moderate

-

### 6.3 Minor

-

## 七、可接受差异

-

## 八、五维评分

| 维度 | 分数 | 说明 |
| --- | ---: | --- |
| 页面结构 | /10 | |
| 组件命中 | /10 | |
| 主题 Token | /10 | |
| 状态命中 | /10 | |
| 交互命中 | /10 | |
| 简单平均 | /10 | |

## 九、总评

一句话结论。

## 十、证据限制

本记录结论来自：固定 refs、Source 原型、实施代码、人工对照。未宣称像素级自动验收或机器 Runtime authority。操作时间线为近似记录，不作为性能基准。
