# 大类型审计清单（P1）

禁止「一个组件 + 大 type 兼多种语义角色」。本表记录审计结论；**仅 Tab 首刀落地拆分**，其余记录待办。

| componentId                              | 嫌疑点                                                       | 结论           | P1 动作                                                                      |
| ---------------------------------------- | ------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------- |
| `tabs`（历史）                           | `selectionStyle: pill \| underline \| text` 混分段与滑线语义 | **拆**         | 落地为四个层级身份：`tabbar`、`primary-tabs`、`secondary-tabs`、`filter-bar` |
| `button`                                 | `tone` / `variant` 多外观                                    | **不拆**       | 同一 `button` role 的外观槽；Contract `behavior` 已澄清                      |
| `data-list` vs `scrollable-data-list`    | 职责边界                                                     | **已拆，保持** | 外观 vs 滚动壳；文档核验即可                                                 |
| `dialog` / `bottom-sheet` / `flow-sheet` | overlay 门面职责                                             | **保持**       | 各有独立 id；不合并                                                          |
| `chip` vs `badge`                        | 外观相近                                                     | **保持**       | 语义不同，禁止互替                                                           |

## Tab 拆分结果

| id               | 职责         | 默认外观                  | role         |
| ---------------- | ------------ | ------------------------- | ------------ |
| `tabbar`         | 应用根目的地 | 图标 + 文字，激活色与字重 | `bottom-bar` |
| `primary-tabs`   | 页面主分区   | Liquid Glass pill         | `tab-bar`    |
| `secondary-tabs` | 页面子分区   | 文字居中小三角            | `tab-bar`    |
| `filter-bar`     | 当前数据筛选 | Filter chip；无 viewport  | `filter`     |

旧 `selectionStyle` 三选一已删除；四层以独立 `componentId` 区分，禁止用外观 variant 复用职责。
