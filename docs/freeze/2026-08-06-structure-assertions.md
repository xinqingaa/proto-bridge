# 结构断言 vs 观测拓扑：冷链 scroll-owner 冗余

- 日期：2026-08-06
- 范围：`structureAssertions` 作者合同 vs Runtime `scrollOwner` 观测；冷链 exception-queue 为触发样例
- 依据：
  - ADR 0007（结构合同独立、多构图、不写死单一原型）
  - `packages/core/src/v2/runtime-contract/protocol.ts`（断言 Schema，默认 `[]`）
  - `packages/core/src/v2/capture/playwright-driver.ts`（`structureContractFacts`）
  - `apps/pbwork/src/runtime/capture-protocol.ts`（`observedScrollOwner`）
  - `packages/core/src/v2/consumer-projection.ts`（StructureIR / `canonicalBrief.primaryScroll`）
  - `apps/pbwork/src/prototypes/registry.ts`（冷链断言落点）
  - 交付样例：`.proto-bridge/deliveries/2026-08-05T22-48-31+08-00/`
- 引入 commit：`5813336`（2026-08-03，`feat:  验收链路增强`）
- 状态：封板前待复查（未改代码）

## 一句话

主滚动归属应以 Runtime 观测拓扑为准；Registry `structureAssertions` 不能补采集，也不进入 Agent StructureIR 主路径。冷链 exception-queue 上的 scroll-owner/order 断言与已观测事实重复，疑似验收链路增强时的过早加固，不宜当作通用原型写法。

## 问题陈述

若原型已用 `ScrollableDataList` + 业务 `inspectId` 明确主滚动，却仍在 Registry 手写「summary/search/filters/list 的 scroll-owner 必须是 scroll-list」，容易造成两种错误预期：

1. 以为断言在「提供」结构证据（实际只是对拍）；
2. 把某一页构图抄成全仓作者习惯，过约束千变万化原型。

## 已核实事实（冷链样例）

1. **引入点**：仅 commit `5813336`；与 `shellFragments`、Acceptance Contract 同批。
2. **使用面**：全仓 Registry 仅 `cold-chain-ops.exception-queue` 的 `default` / `empty` 声明 `structureAssertions`。
3. **观测已成功**：交付 `2026-08-05T22-48-31+08-00` 中，summary/search/filters/list 等 region 的 `scrollOwner` / `semanticParent` 已指向 `…exception-queue.scroll-list`（provenance 为观测拓扑，非断言）。
4. **断言结果**：同交付中 `structure.assertion.*` 为 matched（expected == observed），属重复确认。
5. **Agent 主路径**：`buildStructureIR` 只消费 `semantic-region-topology`；断言进入 `authored-structure-contract` 义务，不驱动 `canonicalBrief.primaryScroll` / `scrollContainers`。
6. **协议意图**：Schema 默认空数组；ADR 0007 明确支持多种构图，不把单一列表页写法写死为通用规则。

## 机制分层（复查时勿混）

| 层 | 做什么 | 对 Agent |
| --- | --- | --- |
| 观测拓扑（`scrollOwner` / parent / order） | 每节点 DOM 计算写入 Facts | StructureIR / packet 主来源 |
| `shellFragments` + shellPolicy | 壳层继承/替换合同 | reconstruction readiness |
| `structureAssertions` | 可选：作者期望 vs 观测对拍 | 不注入 scrollOwner；冲突仅 Issue/risk |

## 相关代码风险 / 疑点（第二轮排查清单）

- [ ] **Registry 清理候选**：删除 exception-queue `structureAssertions` 后，同原型重采，确认 `*.scrollOwner` 与 `scrollContainers` / `primaryScroll` 不变、无新增 conflict。
- [ ] **`order` 断言语义**：`expectedAssertionValue` 对 `kind: 'order'` 只比 children 顺序，**未使用 `parent` 字段**——「挂在 scroll-list 下」并未被真正校验。确认是缺陷还是有意弱断言。
- [ ] **Acceptance 膨胀**：`acceptance-contract.ts` 将所有 `*.structure.*` fact（含 assertion、shell）再推成 structure 义务；与 topology 重复时是否应降噪或改门槛。
- [ ] **Screen packet 压缩**：`compactScreenStructure` 的 regions **去掉** per-region `scrollOwner`，主滚动靠 `scrollContainers` + `canonicalBrief.primaryScroll`。核对消费指南/Prompt 是否足够强调，避免 Agent 误读「没采到滚动」。
- [ ] **观测启发式边界**：`observedScrollOwner` 依赖 `overflowY` 或 `role===scroll-list`；排查非 ScrollableDataList、双滚动、viewport 整页滚、sticky 头等构图是否误判为 viewport 或错误 fragment。
- [ ] **`inspectId` 时序**：DS 模板默认 `data-pb-id="ds.*"`，`usePbInspect` onMounted 才写成业务 id；确认 readiness 后 snapshot 绝不会落到 `ds.scrollable-data-list` 作为 owner。
- [ ] **能力边界文档**：Authoring / screens-and-variants 对「何时写 structureAssertions」几乎空白——补规范或明确「默认不写、仅关键不变量」。
- [ ] **其它原型**：确认 field-service / ledger-planet 无同类断言抄写；CLI/GUI 交付路径无强制要求断言。
- [ ] **历史误归因**：人工验收中「主滚动正确 vs 旧实现滚动错误」应归因于观测+实现，而非断言；避免后续用断言「修」Agent 读包问题。

## 取舍草案（待决）

| 选项 | 做法 | 备注 |
| --- | --- | --- |
| A. 删样例断言 | 去掉冷链两处 `structureAssertions`，保留观测 + shell | 与「断言不补采集」一致；优先 |
| B. 保留协议、收紧作者规范 | Schema/能力保留；文档写清 opt-in 与禁止全树镜像 | 适合仍想对少数屏做回归对拍 |
| C. 强化观测回归 | 对 ScrollableDataList 页加 e2e/合同测试断言 `scrollOwner`，替代 Registry 手写 | 比作者断言更可扩展 |
| D. 修 order 比对 | 若保留断言能力，让 `order` 真正约束 parent 或改名以免误导 | 独立小修复 |

建议默认方向：**A + B + C**；D 仅在保留断言能力时做。

## 非目标

- 不否定 ADR 0007 的结构验收维度或 shell contract。
- 不把「唯一主滚动」从 PBWork recipes 删掉（那是 DS 组装规范，不是 Capture 硬断言）。
- 本条目不回写 Prompt/Skill；落地后再更新权威文档。

## 建议落地顺序

1. 第二轮按上方清单核对代码与至少一条非冷链列表页观测。
2. 决定 A/B/C；若删断言，补一条观测回归测试。
3. 更新 Authoring 或 freeze→产品文档；从本目录归档或删除本条目。
