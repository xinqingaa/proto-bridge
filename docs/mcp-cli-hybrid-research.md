# ProtoBridge CLI / MCP Hybrid Research

本文档用于沉淀 ProtoBridge CLI / MCP hybrid 演进方向的核心结论、讨论方向和未决问题。

目标是让后续推进时能够快速恢复：

- 已经形成了哪些判断。
- 哪些问题已经有初步结论。
- 哪些问题仍然未决。
- 接下来应该按什么顺序继续推进。

与 [todo.md](todo.md) 的关系：

- 本文档给出长期架构方向：从 workflow-first 演进到 capability-first。
- `todo.md` 负责把这个方向拆成当前可执行优先级。
- 当前最直接的落点是 `todo.md` 的 P0：先定统一产物模型与 MCP 契约。

---

## 1. 核心结论

当前最重要的结论有五条：

1. `CLI` 和 `MCP` 作为两个 mode 本身是合理的，不需要推翻。
2. 当前真正的问题不在 mode，而在于每个 mode 绑定了一条过于固定的 workflow。
3. 未来更理想的方向不是“只保留一种模式”，而是“保留两种入口，但把底层能力拆成可组合 capability，由不同入口按条件编排”。
4. 源码、runtime capture、screenshot/OCR 各有价值，但不能简单设定“源码绝对优先”；更合理的是做字段级优先级。
5. 这件事不是不可做，但真正的难点不在入口层，而在统一中间模型、冲突处理规则和可调试性设计。

一句话概括：

```text
当前讨论已经从“某些页面样式不一致”扩展成了
“ProtoBridge 是否要从 workflow-first 演进成 capability-first”。
```

---

## 2. 当前判断：什么是对的，什么是问题

### 2.1 当前认为是合理的部分

- `CLI = Source-aware Migration`
- `MCP = UI Reconstruction`
- source / snapshot / target / workflow 这套 core 分层整体上是合理的。
- target repo 一定存在，这一点是稳定前提。
- MCP 适合作为 agent 动态调用入口。
- CLI 适合作为 source-aware 的稳定入口和批处理入口。

### 2.2 当前认为有问题的部分

- `CLI` 和 `MCP` 对应了两条非常固定的工作流。
- 一旦用户进入某个 mode，就会被该 mode 的既有 workflow 限制住。
- 当前 workflow 的边界太硬，导致输入条件稍微复杂时，调度不够灵活。

典型例子：

- 明明本地同时有源码和 URL/runtime，但 MCP 仍然只按 URL-first 方式工作。
- 明明 source-aware 路径可能更强，但 CLI 又主要停留在产出 JSON / Markdown，而不是被 agent 直接调度到更后面的 Dart 生成阶段。

产品判断是：

```text
mode 合理，workflow 过于固化。
```

---

## 3. 目标系统形态

理想系统目标，不是合并 CLI 和 MCP，而是重新定义它们之间的关系。

更理想的关系应是：

```text
mode = 入口形态
workflow = 预设编排
capability = 通用底层能力
```

目标形态：

- `CLI` 继续存在，作为终端入口。
- `MCP` 继续存在，作为 agent / tool 调用入口。
- 两者都不再只绑定一条固定 workflow。
- source、snapshot、target、planning、validation 都应逐步变成共享 capability。
- system 应能根据“是否有源码 / 是否有 URL / 是否有 screenshot / 是否有 target repo”决定调用哪些能力。

更准确地说，这里想推动的不是：

```text
CLI vs MCP
```

而是：

```text
CLI + MCP
都只是 capability orchestration 的不同入口。
```

---

## 4. 关于“源码是不是最好用”的结论

这里有一个很关键的前提讨论：源码是不是最好的信息源。

结论不是简单的“是”或“不是”，而是要区分问题类型。

### 4.1 源码最擅长什么

源码更适合表达：

- 页面属于哪个模块
- 页面有哪些 section
- 有哪些交互和状态
- 有哪些 tab / modal / 条件渲染
- 设计意图是什么
- 页面应该如何拆分成更合理的 target 结构
- token 的语义来源是什么

### 4.2 runtime 更擅长什么

runtime capture 更适合表达：

- 当前这一刻页面真实渲染成了什么样子
- 当前 viewport 下哪些节点可见
- 元素真实 bbox 是多少
- computed style 最终是多少
- 当前 active tab 是谁
- 某个 modal 当前是否真的打开

### 4.3 screenshot / OCR 更擅长什么

screenshot / OCR 更适合做：

- 最终视觉对照
- OCR 补证
- 人工 review
- 发现 runtime 结构和视觉不一致时的补充证据

### 4.4 最终判断

不建议把前提写成：

```text
源码绝对优先
```

更建议写成：

```text
源码优先表达结构、语义、状态空间和设计意图；
runtime 优先表达当前真实渲染结果；
screenshot 优先表达最终视觉对照和补证。
```

也就是说：

- 不是“整体谁优先”
- 而是“不同字段由不同信息源优先”

---

## 5. 对当前系统的重新理解

一个重要的认知变化是：

### 5.1 `ui-build-plan.json` 不是确定性翻译结果

它不是：

```text
node -> Flutter code
```

更像是：

```text
evidence -> implementation guidance -> agent judgment -> Flutter code
```

它会告诉 agent：

- 页面有哪些视觉区块
- 哪些节点像 button / list / modal / image
- 哪些样式可能映射到哪些 theme token
- 哪些区域建议拆分成 widget

但它不会严格决定：

- 一定该用哪个 Flutter widget
- 一定该用哪一个 target component
- 一定该选哪一个 theme token candidate
- 一定该用 Row / Column / Stack 的哪一种实现

### 5.2 Flutter 落地阶段仍然依赖 agent 做很多判断

当前系统里，agent 仍要继续判断：

- 布局方式
- component 复用方式
- theme token 选择
- 默认背景、边框、圆角是否覆盖
- tab / modal / 展开态是否要只做 UI 占位还是进一步表达

结论：

```text
当前系统的精度不仅取决于 evidence，
也取决于 planner 的表达力和 agent 的实现判断。
```

---

## 6. 对“skill 调 CLI 再自动生成 Dart”的判断

一个现实可行的过渡方向是：

```text
skill -> 调 CLI -> 生成 page-canonical.json / ui-build-review.md
-> 再继续自动生成 Dart
```

### 6.1 短期判断：可行

这条线是合理的短期方案，原因是：

- CLI 已经具备 source-aware 能力。
- CLI 产物已经比较完整。
- 这条路径能够让 agent 利用 source 侧更强的结构语义。
- 工程上容易先跑通。

### 6.2 但它不是最理想的长期形态

原因不是它不能做，而是它会带来一些结构上的限制：

- CLI 颗粒度偏粗，更像固定 workflow，不像可细粒度组合的 capability。
- shell 调 CLI 后，artifact 文件会变成主要接口，agent 需要再读文件、再解析、再转语义。
- 局部重试、局部增量更新、动态编排不如直接调用能力灵活。
- 随着 hybrid workflow 变复杂，“skill 包一层 CLI 黑盒”的方式会越来越绕。

### 6.3 最终判断

可以把它理解成：

- 短期：很好的桥接方案
- 中期：应该逐步把 CLI 里的关键 source-aware 能力提升成可直接调度的 core / MCP capability
- 长期：skill 负责 orchestration，而不是永远依赖 CLI 黑盒

---

## 7. 对实现难度的评估

实现难度需要分阶段看。

### 7.1 如果目标只是先做 hybrid 调度

例如：

- 有源码时走 source analyze
- 有 URL 时补 runtime capture
- 有 screenshot 时补视觉证据
- target repo 一直作为稳定输入

那么难度判断是：

```text
中等难度
```

### 7.2 如果目标是彻底做成 capability-first 平台

例如：

- source / snapshot / target / planning 全部能力化
- CLI / MCP 都只是 preset
- 支持动态编排、冲突合并、调试 trace、review artifact

那么难度判断是：

```text
中等偏上难度
```

### 7.3 真正最难的部分

最难的不是：

- 怎么写一个 skill
- 怎么调 CLI
- 怎么加几个 MCP tool

最难的是：

- 统一中间模型
- 冲突优先级规则
- source facts 与 runtime evidence 的 merge
- 如何把复杂信息既保真又可调试地表达出来

---

## 8. 统一产物方向草案

统一产物模型的方向已经基本形成。

初步草案包括：

- 一份最完整的 `page json`
- 一份 `debug json` 或 `debug md`
- 一份 `ui build json`
- 一份给人 review 的执行说明 `md`
- 一份或多份 screenshot

### 8.1 这套方向的价值

它说明系统不应该只产出单一 workflow 产物，而应该同时面向：

- machine canonical context
- human review
- code generation / implementation plan
- debugging / traceability

### 8.2 结构化思路

可以把产物分成两类：

#### A. Canonical artifact

系统内部真正可信、最完整的标准上下文。

例如：

- `page-canonical.json`

它应尽量完整地保留：

- source facts
- runtime facts
- screenshot refs
- provenance
- merge result

#### B. Projection artifacts

这是不同阶段、不同对象需要阅读的投影视图。

例如：

- `page-debug-index.json`
- `page-debug-review.md`
- `ui-build-plan.json`
- `ui-build-review.md`

### 8.3 建议的产物模型方向

更收敛的表达可以是：

```text
1. page-canonical.json
2. page-debug-index.json
3. ui-build-plan.json
4. ui-build-review.md
5. screenshot.png / screenshots/
```

其中：

- `page-canonical.json` 是系统核心真相
- `page-debug-index.json` 用于快速定位问题
- `ui-build-plan.json` 用于代码生成和执行计划
- `ui-build-review.md` 用于人工 review

---

## 9. 核心技术难点

hybrid 方向里最关键的技术难点包括：

### 9.1 Source facts 和 runtime evidence 怎么合并

这不是简单的字段拼接问题，而是：

- 两类信息的语义中心不同
- 一类更偏意图和结构
- 一类更偏当前事实和最终渲染

### 9.2 当 source 和 runtime 不一致时，谁优先

结论是：

- 不应整体讨论谁优先
- 应按字段类型决定优先级

### 9.3 模块、section、theme、component、interaction 的冲突怎么解

这会影响：

- 页面落在哪个 target module
- 页面拆分成哪些 widget
- 哪些 target component 能复用
- 哪些 theme token 是强约束，哪些只是候选

---

## 10. Source / Runtime 冲突场景

source / runtime 冲突可能出现在以下真实场景。

### 10.1 多状态分支页面

例如：

- 未登录 / 已登录
- 空态 / 有数据
- tab1 / tab2 / tab3
- 折叠 / 展开

在这种情况下：

- source 更适合告诉系统“有哪些状态存在”
- runtime 更适合告诉系统“当前 capture 到的是哪一个状态”

### 10.2 源码有语义 token，但 runtime 被覆盖

例如源码写了语义化 CSS var，但运行时被：

- 父容器 class 覆盖
- active class 覆盖
- 媒体查询覆盖
- inline style 覆盖

在这种情况下：

- token 语义来源更适合看 source
- 最终显示出来的颜色、背景、字号等更适合看 runtime

### 10.3 数据不同导致结构不同

例如：

- source 里定义了列表、卡片、按钮、角标
- runtime 当前样本只有两条数据，或者直接是空态

在这种情况下：

- source 更适合表达完整骨架
- runtime 更适合表达当前首屏真实排列

### 10.4 modal / tab 存在，但当前未触发

例如：

- source 里明明定义了底部弹层
- 当前 runtime capture 没点开它

在这种情况下：

- “这个能力存在”更适合信 source
- “它当前是不是打开状态”更适合信 runtime

### 10.5 source 和 runtime 版本不一致

例如：

- 本地源码还是旧版
- 运行 URL 已经是新版本

在这种情况下：

- 两边都不能被默认视为绝对真相
- 必须显式保留 provenance 和 mismatch warning

### 10.6 source 更语义化，runtime 更扁平事实化

例如：

- source 能表达“这是交易下单页”“这是持仓信息卡”“这是买卖切换 tab”
- runtime 可能只能表达为一个 section、一个 list、一个 button

在这种情况下：

- 模块命名、业务语义、交互意图更适合依赖 source
- bbox、可见性、当前样式更适合依赖 runtime

---

## 11. 字段级优先级思路

虽然还没有写成正式规则表，但方向已经很明确。

建议未来按字段类型决定优先级：

- `module / screenId / semantic section / interaction intent / state space`
  优先 source

- `visible / bbox / computed style / actual active state / actual open modal / actual visible text`
  优先 runtime

- `pixel appearance / OCR text / visual comparison`
  优先 screenshot / OCR

- `component reuse / theme target / file tree / route placement`
  优先 target repo conventions

关键判断是：

```text
不要先问“整体谁优先”，
而要先问“这个字段最适合由谁来决定”。
```

---

## 12. 对现有项目的总体架构判断

当前不需要形成“要不要重做项目”的结论，已有判断是：

- 当前不是“项目已经不可维护”。
- 当前更像是“core 分层已有基础，但 workflow 暴露面还不够灵活”。
- 方向不是重写，而是从 workflow-first 逐步演进到 capability-first。

也就是说：

- 不应推翻 CLI / MCP mode
- 不应轻易重启一个全新项目
- 应在当前项目中继续抽象和能力化

---

## 13. 推进顺序建议

继续推进时，建议按下面顺序思考，而不是直接跳进代码。

### 第一步：先定统一产物模型

先想清楚：

- 哪一份是 canonical truth
- 哪几份是 debug / review / build projection

### 第二步：再定字段级优先级

先做一张表，回答：

- 哪类字段优先信 source
- 哪类字段优先信 runtime
- 哪类字段优先信 screenshot / OCR
- 哪类字段优先信 target repo

### 第三步：再定 mode / workflow / capability 的关系

把下面这几个概念明确区分：

- CLI 是什么
- MCP 是什么
- workflow 是什么
- capability 是什么
- skill 在其中扮演什么角色

### 第四步：最后才讨论技术实现路径

例如：

- 先用 skill 调 CLI 过渡
- 还是直接补 MCP tool
- 还是先把 core API 进一步能力化

---

## 14. 当前未决问题

当前已经形成很多方向，但下面这些问题仍然没有定论：

- 是否需要一个统一的 `page-canonical.json`
- source 与 runtime 的 merge 规则是否要显式版本化
- 当 source 和 runtime 不一致时，warning 和人工确认机制怎么设计
- `ui-build-plan.json` 和 `ui-build-review.md` 的边界该如何定义
- 短期是否先走 `skill -> CLI -> Dart`，还是尽快把 source-aware 能力暴露进 MCP / core capability
- role / section / component mapping 是否要纳入 hybrid 设计一起重构

---

## 15. 最重要一句话

如果只记住一句话，那就是：

```text
ProtoBridge 的下一个阶段，不是决定“选 CLI 还是选 MCP”，
而是把 CLI / MCP 都降级成入口，把 source / snapshot / target / planning 提升成可编排 capability。
```
