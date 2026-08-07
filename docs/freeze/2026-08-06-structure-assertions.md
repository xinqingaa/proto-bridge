# 结构断言 vs 观测拓扑：冷链 scroll-owner 冗余

- 日期：2026-08-06
- 落地：2026-08-07
- 状态：**已落地（A + B + C）**
- 范围：`structureAssertions` 作者合同 vs Runtime `scrollOwner` 观测；冷链 exception-queue 为触发样例

## 决议

主滚动归属以 Runtime 观测拓扑为准。冷链 exception-queue 上的 scroll-owner/order `structureAssertions` 是验收链路增强时留下的冗余对拍，已删除。

| 选项 | 做法 | 结果 |
| --- | --- | --- |
| A. 删样例断言 | 去掉冷链 `default` / `empty` 的 `structureAssertions` | 已做（`registry.ts`） |
| B. 保留协议、收紧作者规范 | Schema 保留；不把断言写进原型作者主文档（避免 Agent 误用） | 已做（不在 screens-and-variants / Authoring 强调；消费侧只说明读 `primaryScroll`） |
| C. 强化观测回归 | e2e 断言观测到的 `scrollOwner`，不依赖 Registry 断言 | 已做（ledger task-list + cold-chain exception-queue） |
| D. 修 order 比对 | 让 `order` 真正约束 parent | **不做**（能力收成 opt-in，不单独修） |

## 一句话（保留）

Registry `structureAssertions` 不能补采集，也不进入 Agent StructureIR 主路径；主滚动靠观测 + `ScrollableDataList` 业务 `inspectId`。

## 非目标（仍适用）

- 不否定 ADR 0007 的结构验收维度或 shell contract。
- 不把「唯一主滚动」从 PBWork recipes 删掉。
- 未改 Prompt/Skill 主体；消费指南已补 compact regions 说明。
