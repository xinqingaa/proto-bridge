# 项目背景

ProtoBridge 的背景是团队内 UI 交付链路的工程化升级：从传统的“需求文档 + 静态设计稿 + 人工 UI 走查”，升级为“交互原型 + 源码证据 + AI 编排 + 可验证产物”。

它服务的不是泛泛的页面翻译，而是产品、UI 与客户端研发之间的协作方式升级。目标是让交互、组件、主题、状态和目标工程规范尽早变成可采集、可追溯、可验证的工程证据，减少实现偏差和人工走查成本。

## 原来的交付链路

传统模式大致是：

```text
产品输出 PRD
  -> UI 在 Figma 出静态设计稿
  -> 前端 / 客户端 / 后端按各自理解实现逻辑
  -> 联调
  -> UI 走查
  -> 返工修正
```

这条链路的问题不只是效率低，而是信息在交接时天然丢失：

- Figma 设计稿是静态的，无法完整表达真实交互、状态切换、滚动、弹窗、筛选、tab、空态和异常态。
- 客户端需要根据自己理解补交互和状态，产品、UI、客户端之间容易出现解释偏差。
- 组件、主题、间距、圆角、颜色、字体、状态样式往往依赖人工说明和走查反馈。
- 前后端、客户端、UI 各自实现和校对，问题经常到联调或 UI 走查阶段才暴露。
- UI 走查本质是在事后补偿前面交付证据不足的问题，成本高且反馈滞后。

## 新的目标链路

团队希望让产品和 UI 配合 AI 建立一个交互原型平台：

```text
产品 / UI / AI 生成交互原型
  -> 原型平台沉淀组件、主题、布局、状态和交互
  -> 原型源码与客户端组件 / 主题 / 规范形成对应关系
  -> ProtoBridge 采集 source evidence、runtime evidence 和 target conventions
  -> AI agent 编排客户端实现
  -> 产出可 review、可追溯、可验证的 artifacts
```

这套模式成熟后，理想状态是不再依赖传统的人工 UI 走查来兜底。因为交互原型已经能表达真实状态，源码能表达结构和意图，runtime capture 能表达当前渲染事实，target repo 能表达客户端实现规范，validation 能在实现后检查变更范围和常见风险。

## 原型平台的关键价值

交互原型平台不是单纯“把设计稿做成网页”，它承担了更接近工程输入的角色：

- 原型有真实交互，而不是静态截图。
- 原型有源码，可以提取页面结构、状态空间、交互意图、资源和 token intent。
- 原型组件与客户端组件尽量一一对应，减少实现时的二次理解。
- 原型主题与客户端主题尽量一一对应，减少颜色、字体、间距和状态样式偏差。
- 原型运行态可以被浏览器采集，得到 bbox、computed style、可见文本、active/open state 和截图。

ProtoBridge 正是连接“原型平台”和“客户端目标工程”的中间层。

## ProtoBridge 的位置

ProtoBridge 把不同证据源合并成页面级上下文：

```text
prototype source
running URL
screenshot / OCR
target repository
  -> page-canonical.json
  -> page-debug-index.json
  -> ui-build-plan.json
  -> ui-build-review.md
  -> migration-spec.md
  -> validation result
```

它不要求每次都同时拥有 source 和 URL：

- 只有 source：可以提取结构、状态、交互和 token intent，生成 source-only 实现上下文。
- 只有 URL：可以采集当前运行态 DOM、computed style、bbox 和截图，生成 runtime-only 实现上下文。
- source + URL 都有：可以同时利用源码意图和运行时事实，生成 hybrid 上下文。
- 只有 screenshot/OCR：可以作为视觉和文字补证，但不能替代 source 或 runtime 的完整证据。

Target repo 通常是客户端落地所必需的输入，因为文件落点、组件复用、theme/i18n/assets、route conventions 和 validation 都依赖目标工程。

## 为什么 AI Agent 需要 Bridge

AI coding agent 在上下文清晰时很擅长实现；在必须猜测时就容易犯错。没有 ProtoBridge 时，agent 往往需要自己判断：

- PRD、Figma、原型页面和客户端模块之间的关系。
- 哪个 route 或 source file 对应当前页面。
- 某个样式来自设计意图、源码 token，还是运行时覆盖。
- 页面应该落在哪个 Flutter module。
- 哪个 target component 可以安全复用。
- 哪些交互已经由原型证明，哪些仍需人工确认。
- 实现是否修改了预期范围之外的文件。

ProtoBridge 给 agent 一组稳定产物：实现前可阅读、实现中可追溯、实现后可验证。

## 目标收益

对产品和 UI：

- 交互从静态说明变成可运行原型。
- 组件和主题规则更早进入工程化表达。
- 不确定行为会变成显式 manual confirmations。
- UI 走查从事后兜底逐步转向少量异常确认。

对客户端研发：

- 更快理解页面身份、目标模块、组件复用、theme tokens、i18n 和 assets。
- 减少“按设计稿各自理解”的实现偏差。
- 能在实现前看到 plan 和 review，在实现后验证 changed files 和常见风险。

对 AI agent：

- 有人类可读的 `ui-build-review.md` 指导实现。
- 有机器可读的 `ui-build-plan.json` 描述 file tree、widget tree、mappings、assets、interactions、risks 和 validation hints。
- 有 source + target facts 时，`migration-spec.md` 会补充 source-aware 实现说明。
- 出现偏差时，可以回到 `page-canonical.json` 和 `page-debug-index.json` 查完整证据和定位索引。

## ProtoBridge 不做什么

ProtoBridge 不会：

- 自己产出完整生产 Dart 页面。
- 确定性地把 Vue、HTML、CSS 或 DOM nodes 翻译成 Flutter widgets。
- 替代目标应用架构决策。
- 在没有证据时推断隐藏业务规则、API 合约、权限、风控、埋点或数据归属。
- 把截图伪造成完整 runtime DOM 模型。

它是上下文桥接层和能力编排层。真正实现仍由开发者或 coding agent 在目标仓库中完成。
