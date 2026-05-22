# Early Exercise Restoration Iteration

本文记录 YouFi 期权行权页面在 ProtoBridge 产物上多轮优化的架构设计经验。重点不是某一次 Flutter 实现，而是产物如何从“可生成”迭代到“可稳定还原、可审查、可扩展”。

## 背景

测试页面是早行权 / 期权行权页面。它同时包含：

- 标准页面骨架：AppBar、标题、持仓列表、底部操作区；
- 重复列表卡片：11 个持仓卡片，结构一致但字段、标签和按钮状态不同；
- 动态文本：金额、百分比、日期、数量、单位、状态标签；
- 多个交互入口：历史页、规则提示、排序、筛选、提交、确认；
- sheet / modal：规则、提交确认、筛选、更多说明等；
- 目标工程约束：YouFi 的 GetX、route、theme、i18n、common widget 风格。

这类页面很适合暴露 ProtoBridge 的真实难点：证据完整性、证据冲突、重复结构压缩、目标工程映射、实现任务边界。

## 时间线

主线产物大致经历了以下阶段：

| 阶段 | 代表产物 | 主要变化 | 结果 |
| --- | --- | --- | --- |
| 原始阶段 | `early-exercise-mpdqhry3-d230bd` | 有基础 source semantics、component/theme/i18n 映射，但缺少 node audit、dynamic text、overlay 证据 | 能生成页面骨架，但容易漏交互、误判结构，重复卡片和动态值还原弱 |
| 视觉证据增强 | `mpfasbpq` 到 `mpgdmyn6` | 增加 node audits、dynamicTextHints，暴露 runtime bbox、wrap、视觉 band | 视觉依据明显增强，但 plan 变重，列表卡片审计重复，语义噪声仍存在 |
| 交互与 overlay 增强 | `mpgjt8z2` 到 `mpgk0r6t` | AppBar 操作语义、interaction intent、overlayPlan 开始进入产物；overlay 从 9 个收敛到 4 个 | 右侧历史 / 规则这类入口有证据链，sheet 不再只能靠猜 |
| 语义清理 | `mpgnk7q3` 到 `mpgnru6h` | sourceSemantics 从泛化的 QuoteSummary / ChartPanel / ChartAdapter 收敛到 FilterBar / List / ContentSection / OverlayShell | 文件结构判断更贴近页面，减少错误业务抽象对 agent 的干扰 |
| 实现索引与压缩 | `mpgo1xuz` 到 `mpgollpe` | 引入 implementationIndex、repeatedGroups、代表卡片 + 实例差异，nodeAudits 从 13 个降到 3 个 | 最新阶段是当前最好的平衡：证据仍完整，但实现负担明显下降 |

最新产物 `early-exercise-mpgollpe-364470` 的关键特征：

- `visualPlan.nodeAudits` 收敛为 3 个高价值审计；
- `visualPlan.dynamicTextHints` 保持 23 个；
- `implementationContract.overlayPlan` 保持 4 个 overlay 入口；
- `implementationContract.implementationIndex.repeatedGroups` 有 1 个重复组；
- `implementationContract.implementationIndex.repeatedItemNodes` 覆盖 11 个卡片实例；
- AppBar 语义顺序可表达为 back -> history -> rules；
- 仍保留 1 个 layout conflict，用于提示 header/filter 行的 source 与 runtime 证据冲突。

## 架构判断

### 1. `ui-build-plan.json` 应该是完整证据库，不是轻量任务包

早期踩过的坑是“为了简洁而漏内容”。一旦 plan 没有交互、overlay、动态文本或 provenance，后续实现只能靠 agent 猜，最后会出现：

- 右侧按钮语义被误写成其他入口；
- sheet / modal 被认为没有证据而跳过；
- 动态字段被硬编码；
- source intent 与 runtime 视觉冲突时没有依据判断。

因此当前方向是正确的：`ui-build-plan.json` 保持完整证据，`ui-build-review.md` 负责人类审查视图，restore skill / agent task 负责阶段化消费。不要把 plan 退化成“本轮任务清单”。

### 2. 完整证据不等于无差别堆积

完整性和噪声是两件事。中期产物的问题不是 plan 大，而是有些字段对实现贡献低或重复度高：

- 11 个卡片 audit 每个都接近完整展开，累计约 100KB 级别；
- themeMappings 中大量低置信 token 给人“看起来能用，但实际不能直接用”的错觉；
- sourceSemantics 残留泛化业务拆分，导致 agent 误以为页面有 QuoteSummary / ChartPanel 等结构；
- overlay 早期数量过多，重复或来源不清，增加实现判断成本。

后续优化的核心不是删证据，而是把证据组织成更接近实现决策的形态：

- 重复 UI 用 representative template + instance deltas；
- theme/font 映射用 groups 表达共性，低置信 mapping 降级为参考；
- sourceSemantics 只保留页面真实业务结构；
- overlay 保留 source、interaction、component mapping 或 opened-state provenance。

### 3. Source / Runtime 冲突必须显式化

header/filter 行暴露了一个典型冲突：

- source 结构显示标题、数量、Value、Expiration 同属一个 header 容器；
- runtime bbox 和 node audit 显示它们实际渲染为两条视觉 band，并存在 flexWrap。

这不是简单的采集错误或实现错误，而是 source intent 和 runtime result 的冲突。ProtoBridge 最有价值的做法不是替用户二选一，而是：

- 在 `visualPlan.layoutConflicts` / `implementationContract.conflicts` 中明确冲突；
- 标注 source evidence 和 runtime evidence；
- 给出默认还原策略和人工确认点。

对 Flutter restore 来说，第一轮可以按 runtime 视觉还原；如果用户判断产品意图应按 source 一行布局，就应该作为人工 override，而不是让 agent 默默改。

### 4. 目标工程 common widget 必须强约束

本案例中 CommonAppBar 是一个重要坑。产物里已经能表达右侧历史 / 规则两个入口，但实现仍可能因为像素差异或结构复杂而自建 AppBar。

这说明目标工程映射不能只说“可以复用”，而要区分：

- 强约束组件：CommonAppBar、CommonButton、Pop.sheet 等，默认必须复用；
- 候选组件：视觉相似但不确定的组件；
- 禁用直译：目标工程已有明确 common widget 时，不应手写局部替代。

这一点已经沉淀进 restore skill：common component 的目标工程一致性优先级高于局部像素完全一致。

### 5. i18n 需要“复用已有 key + 模块前缀新增 key”

本次 Flutter 实现出现过重复 key 导致 const map 编译失败：

```text
The key "options_exercise" conflicts with another existing key in the map.
```

这类错误不是视觉还原问题，而是 restore 约束不足。经验是：

- 新增文案优先使用模块前缀，例如 `option_exercise_v2_*`；
- 通用 key 已存在时复用，不重复插入；
- 修改 translations 前先查重；
- `flutter analyze` 至少作为编译级验证门槛。

这个规则同样已经补进 restore skill。

## 有效优化

### Repeated Groups

最新阶段最有效的优化是 repeated group。对于 11 个卡片，完整 audit 全量展开会让 plan 变大，也会让 agent 把每张卡片当成不同组件处理。

更好的结构是：

- 一个 representative node 描述卡片模板；
- instance list 描述每张卡片的差异字段；
- style / control delta 单独列出；
- validation hint 要求实例数量、关键差异和按钮状态被覆盖。

这既保留证据，又更贴近 Flutter 实现：一个 `PositionCard` widget + model list。

### Overlay Consolidation

overlay 必须存在，但需要收敛。早期 overlay 证据多但分散，容易让 agent 一轮内试图实现过多弹层。收敛到 4 个后，效果更好：

- agent 知道页面有哪些弹层；
- 第一轮可以只保留入口和 TODO；
- 后续阶段可以基于同一份 plan 实现 sheet，不需要重新采集；
- overlay 的 provenance 能说明它来自 source、interaction、component mapping 还是 opened-state。

### Source Semantics Cleanup

清掉 QuoteSummary / ChartPanel / ChartAdapter 这类泛化残留后，文件结构建议明显更稳。sourceSemantics 应该描述这个页面真实存在的业务区块，而不是套用通用金融页面模板。

这类优化对 agent 影响很大，因为 agent 会把 sourceSemantics 当成架构优先级最高的证据之一。

### Implementation Index

implementationIndex 的价值在于把“实现时最该看的索引”从完整证据库里提出来。它不替代完整 plan，而是帮助 agent 快速定位：

- 重复节点；
- 冲突节点；
- 高风险布局；
- 动态文本；
- overlay 入口；
- target binding。

这比让 agent 在 400KB 到 600KB 的 JSON 里自行发现关键关系稳定得多。

## 暂不优化的点

### 暂不把 plan 拆成任务包

虽然分阶段实现更符合真实开发节奏，但 plan 本身暂时不拆。原因是：

- 第三轮做 sheet 时仍需要第一轮已经看到 overlay 证据；
- 若任务包漏掉 future phase 证据，agent 会形成错误假设；
- 完整证据库利于复盘和冲突定位。

未来可以增加 phased consumption view，但不应牺牲 `ui-build-plan.json` 的完整性。

### 暂不强行压缩所有 themeMappings

themeMappings 仍有低置信和泛化 token 噪声，但它不是当前最高风险。更合理的后续方向是增加 `themeMappingGroups` 和置信分层，让实现者优先看高置信 group，而不是删除低置信证据。

### 暂不要求每次 restore 都完整 build

对 Flutter restore 来说，`flutter analyze` 是最低门槛。完整 `flutter build apk --debug` 更强，但耗时高。当前规则是：

- 做过 compile 级验证就明确说明；
- 如果为了速度只跑 analyze，也明确没有做完整 build；
- 出现 i18n、route、generated file、asset 等风险时，提高到 debug build。

## 性能与还原速度

产物从约 245KB 增长到 500KB 以上时，确实会影响 agent 阅读和实现速度。实际影响主要不是 JSON 解析性能，而是认知负担：

- agent 要在更多字段之间判断优先级；
- 低置信 mapping 会制造误导；
- 重复 card audit 会消耗上下文；
- overlay、mock、i18n、route、theme 同时出现，会拉散实现重心。

最新产物下降到约 440KB，同时保留关键证据，是更合理的方向。优化目标不应单纯追求文件小，而应追求：

- 高价值证据保留；
- 重复证据结构化；
- 冲突显式化；
- 实现入口索引化；
- 低置信信息降权。

## 推荐的扩展原则

将这套经验扩展到其他页面时，建议保持以下原则：

1. 证据完整性优先：plan 保留 source、runtime、target、interaction、overlay、i18n、theme、validation 的完整链路。
2. 实现可消费性优先：重复结构用 group，关键关系用 implementationIndex，review 用人类可读摘要。
3. 冲突显式化：source intent 和 runtime result 不一致时，输出 conflict，而不是静默覆盖。
4. 目标工程优先：CommonAppBar、CommonButton、Pop.sheet、route/i18n/theme 这些目标工程约定应强约束。
5. 分阶段实施：真实页面还原建议 4 到 5 轮，第一轮主页面，第二轮 mock 接口，第三轮 sheet/modal，第四轮精修和整体优化。
6. 验证要匹配风险：至少 `flutter analyze`；涉及资源、路由、i18n 或构建链路时补 debug build。

## 经验总结

这次迭代说明 ProtoBridge 的核心价值不是一次性自动生成完美 Flutter 页面，而是把“实现所需证据”组织成可审查、可复用、可冲突定位的工程契约。

最重要的架构收获是：

- 完整证据库是底座，不能为了简洁牺牲；
- 重复和低置信内容要结构化、分层、降权；
- source semantics、runtime visual facts、target conventions 三类证据必须各司其职；
- 真实开发需要阶段化执行，但阶段化应该发生在消费层，而不是通过删减 plan 实现；
- restore skill 是执行约束，ui-build-plan 是证据契约，二者职责不能混淆。

这套思路可以继续推广到更多页面类型，例如复杂表单、行情页、资产页、交易确认流和多状态空页面。扩展时最该关注的不是新增多少字段，而是每个字段是否能帮助实现者更准确地做一个工程决策。
