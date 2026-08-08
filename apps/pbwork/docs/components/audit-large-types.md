# 大类型审计清单（P1）

禁止「一个组件 + 大 type 兼多种语义角色」。本表记录审计结论；**仅 Tab 首刀落地拆分**，其余记录待办。

| componentId | 嫌疑点 | 结论 | P1 动作 |
| --- | --- | --- | --- |
| `tabs`（历史） | `selectionStyle: pill \| underline \| text` 混分段与滑线语义 | **拆** | 落地：`tabs`（pill 分段）+ `underline-tabs`（滑线/极简） |
| `button` | `tone` / `variant` 多外观 | **不拆** | 同一 `button` role 的外观槽；Contract `behavior` 已澄清 |
| `data-list` vs `scrollable-data-list` | 职责边界 | **已拆，保持** | 外观 vs 滚动壳；文档核验即可 |
| `dialog` / `bottom-sheet` / `flow-sheet` | overlay 门面职责 | **保持** | 各有独立 id；不合并 |
| `chip` vs `badge` | 外观相近 | **保持** | 语义不同，禁止互替 |

## Tab 拆分结果

| id | 职责 | 默认外观 | role |
| --- | --- | --- | --- |
| `tabs` | 页内二级分段 / 筛选条 | pill | `tab-bar` |
| `underline-tabs` | 页内分区导航（滑线）；极简为 state | underline + indicator | `tab-bar` |

旧 `selectionStyle` 三选一已删除；采集时用独立 `componentId` 区分。
