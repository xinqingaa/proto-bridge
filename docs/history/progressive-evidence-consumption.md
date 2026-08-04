# 渐进消费：按需读取到底是谁在按需？

本文记录围绕固定 Evidence 消费的一个真实问题：Agent / MCP「按需读取」究竟怎样成立，任务范围（整原型 / 单页 / 单控件）又如何与证据读取粒度划分。它用于澄清职责与取舍，不是当前 Tool 操作手册。

操作顺序见 [Agent 消费指南](../guides/agent-consumption.md)。

## 一句话

MCP 提供「只能按范围取」的接口；Agent 决定「这一步要不要再深挖」。不是 MCP 替你猜需求，也不是靠 Prompt 口头说「少读一点」。

## 真实疑问

Evidence 已经可以固定交付之后，消费侧仍然容易变成：

- Agent 一上来读取完整 Acceptance Contract / 大量 Case，上下文膨胀到几十 MB；
- 「少读一点」只写在 Prompt 里，接口仍提供整包默认路径，纪律很容易被打破；
- 不清楚按需是 **MCP 自动裁剪**，还是 **Agent 自己少调 Tool**；
- 不清楚整原型（例如 7–8 页、50–60 态）、单页、单控件这些交付任务，对应怎样的读取切分。

核心问题可以收成一句：

> 固定 Evidence 进入 Agent 工作集时，形状和时机应由谁约束？「任务范围小」是否等于「可以跳过 Screen / 截图」？

## 谁在「按需」？

按需成立靠两层分工，不能混成一层。

| 层 | 做什么 | 不做什么 |
| --- | --- | --- |
| MCP / Core 投影 | 每个 Tool 返回闭集字段；必须带 `screenId` / `caseId` / `projection` 等范围；没有「默认吐整个 Handoff」的路径 | 不替 Agent 规划实现顺序，不自动预取下一屏 |
| Agent | 根据当前实现问题调用下一层 Tool；决定先做哪一屏、何时看图、何时查 token | 不能绕过 Tool 直接扫 Store；不能把 full Snapshot 当默认入口 |

更准确的说法：

- **按需读取** = Agent 按需发起调用；
- **按需成立** = MCP 把「整包灌入」从默认路径上拿掉，用投影契约强制粒度。

旧路径：Agent 默认 `read_acceptance_contract` / 全量 Case，上下文体积由产品路径本身推高。  
新路径：接口默认不给整包；除非调用方带明确范围去要，否则拿不到那一层明细。

## 渐进的五层

对每个实现范围内的 Screen，默认顺序是：

```text
inspect（握手）
  → read_handoff_index（地图：有几屏、几 Case、几张图、风险）
    → read_screen_packet(screenId)（这一屏的壳、baseline、状态列表、图的引用）
      → read_evidence_screenshot（先看图）
        → read_case_delta（非默认态才看差量）
          → read_evidence_detail（只有卡住时，按维度/ID 深挖）
```

| 何时 | 读什么 | 性质 |
| --- | --- | --- |
| 总是（Bootstrap） | index：Screen / Case / digest / Scenario 地图 | 必读，但很薄 |
| 每个要做的 Screen 总是 | screen packet + 该屏 distinct 截图 | 必读 |
| 非 baseline / 有状态差时通常要 | case delta | 准必读 |
| 只有实现问题说不清时 | detail：structure / components / tokens / interactions / provenance | 真正按需 |
| 默认不做 | 完整 Snapshot、完整 Contract、全量 Facts | debug 专用 |

`omittedCategories` 表示：「这一层故意没给你这些，继续读取的入口在这里」，不是证据丢失。

Continuation 只续读同一次规范化查询直到 `complete=true`。不要换 selector 轮询，把所有投影读光。

## 两个正交维度

不要把下面两件事当成一件事：

1. **交付任务范围**（人给 Agent 的目标）：整原型 / 几屏 / 一屏 / 一组组件 / 一个控件；
2. **证据读取粒度**（Tool 层）：始终按五层展开，不因「任务小」就跳过 Screen 地图或截图。

渐进工具解决的是证据进入上下文的**形状和时机**；任务怎么切是**交付范围**。两者正交：

- 范围再小，也走 index → packet → 图；
- 范围再大，也是一屏一屏推进；detail 只在问题上门。

### 整原型

例如 7–8 页、50–60 态；冷链量级约 3 页、24 Case。

- Handoff index 一次看清全局地图；
- 一次只做一个 Screen；做完当前屏再进下一屏；
- 每屏：packet → 该屏所有 distinct 图 → 默认态先落地 → 再用 delta 扩状态；
- 跨屏 Scenario 等在相关默认态都做完后再统一重放。

不要一上来把「全部页面 × 全部状态」的 Facts 灌进上下文。

### 单个页面

- index 仍读（固定引用与 mandatory risks）；
- 只对该屏调用 `read_screen_packet`；
- 其它 Screen 的 packet / detail 不调；
- 该页所有 distinct digest 仍要看图；同图多 Case 只看一次图，用 case delta 区分语义。

### 一组组件 / 单个控件

读取仍从**所在 Screen**进入，不能假装存在「只读一个控件的全域证据」捷径：

1. `read_screen_packet(screenId)` — 壳、滚动、周围结构；
2. `read_evidence_screenshot` — 最终可见结果以图为准；
3. 需要时 `read_evidence_detail`，带 `projection` 与 `componentIds` / `tokenIds`；
4. `resolve_target_components` / `resolve_target_tokens` — 在目标工程找落点。

控件级任务缩小的是**实现范围**和 **detail 查询范围**，不是跳过 Screen 或截图。

## 何时按需、何时不按需

Agent 可用的启发式：

```text
我现在缺的信息是什么？
├─ 还不知道有哪些屏/Case/图？ → handoff_index（必做）
├─ 还没建立这一屏心智模型？ → screen_packet + screenshot（必做）
├─ 默认态和某状态差在哪？ → case_delta（通常要）
├─ 某个间距/层级/组件 ID 对不上？ → detail 定向查一次
├─ 目标工程用哪个 symbol？ → resolve_target_*，不是再读全量 Evidence
└─ 已经能改代码并对照截图验证？ → 停止读，开始写；不要为「读全」循环
```

- **不按需（强制）**：身份、风险、Screen 地图、在办 Screen 的 packet、distinct 截图；
- **按需（可选）**：detail 各维度、examples、更深 provenance；
- **禁止当默认**：完整 Contract / 全 Snapshot / 为凑齐 Acceptance 条目而扫一遍。

## 任务包示例（冷链量级）

约 3 Screen、24 Case、16 张不同图时，可按屏拆包：

| 任务包 | 读证据 | 写代码 |
| --- | --- | --- |
| Screen 1 默认态 | index + packet + 该屏图 + 必要 resolve | 壳 + 默认布局 |
| Screen 1 其它状态 | 各 case_delta + 缺的图 | overlay / 空态 / 错误态等 |
| Screen 2 / 3 | 同上，做完一屏再下一屏 | 同 |
| 跨屏 Scenario | 相关屏默认态完成后重放 | 导航 / 参数传递 |
| 只改 AppBar | 仍要 packet + 该屏图，再 detail `components=app-bar` | 只改映射到的目标组件 |

状态数多，不等于要多开 Agent 并行读全库。若并行，也按 Screen（或明确 Case 子集）拆任务，各自绑定同一固定 Handoff，互不预取对方未完成的 detail。

## 旧路径与新路径

| | 旧（全量默认） | 新（渐进默认） |
| --- | --- | --- |
| 默认入口 | 整包 Contract / 多 Case 全读 | index → 单屏 packet |
| 上下文膨胀 | 产品路径本身推高 | 由 Tool 粒度压住 |
| 「少读」靠什么 | Prompt 纪律（易破） | 接口不提供整包默认路径 |
| 视觉 | 易被结构 / token 明细淹没 | 截图在结构全量展开前进入工作集 |
| 完成判定 | 容易变成「读过 / 测过」 | 仍按 Case / 图 / Scenario 覆盖；未读维度不能装成已验证 |

## 小结

- 按需读取的决策权在 Agent；按需能够成立的约束权在 MCP 投影契约。
- 交付范围与读取粒度正交：缩小任务不等于跳过 Screen / 截图；放大任务也不等于一次读完全库。
- detail 是问题上门的工具，不是把 Acceptance 条目读满的配额。
