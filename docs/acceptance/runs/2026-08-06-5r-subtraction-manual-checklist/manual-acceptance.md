# 5R 减法后人工对照清单

记录日期：2026-08-06（Asia/Shanghai）

验收类型：减法收敛后的实施对照清单（待执行）  
验收状态：清单就绪，等待同固定 Handoff 的一次新实施

关联计划：
[5R 减法收敛](../../2026-08-06-5r-subtraction-convergence.md)

## 目的

在不回退 Phase 1–5、不恢复 full-read 的前提下，验证本轮减法是否：

1. 稳定出现编辑前按 Screen 的 Evidence 理解摘要；
2. 减少 `if (index == 0/1/2)` 式 Region→位置硬编码；
3. 提高 Source/Evidence 固定业务数据对齐；
4. 保持主滚动边界与公共组件/Token 命中水位不低于 V5。

## 建议固定对象

优先复用既有冷链固定 Handoff（与 2026-08-05 人工验收同一证据族），新开 feature 目录实施，避免覆盖历史对照实现。

实施前确认 MCP：

- `projectionVersion === 4`
- capabilities 含 `screen-packet` / `semantic-implementation-inventory`
- Consumer guide 不再要求默认读取 plan/tranche

## 对照检查项

### A. 编辑前理解摘要

- [ ] 每个 Screen 在编码前有白话摘要
- [ ] 覆盖：主结构与滚动、组件落点、Token 落点、状态、交互
- [ ] 不是评分表 / 逐 Region 配额 / 固定模版

### B. 结构与编码组织

- [ ] 主滚动 owner 与成员 section 正确
- [ ] 无 `if (index == 0) summary; if (index == 1) search; ...` 式位置语义
- [ ] 允许目标工程自然的组件组合表达同一滚动与层级；不允许把 Evidence Region 当文件或类边界硬切

### C. 业务数据

- [ ] 列表 key / 文案对齐 Evidence
- [ ] 温度序列、事件、表单选项、默认值对齐，不近似发明
- [ ] Variant 差异来自 Case / canonicalBrief，而非临时字符串拼装

### D. 组件 / Token / 状态 / 交互

- [ ] 公共组件复用与 resolver 结果一致
- [ ] Token slot 语义正确（不只是“用了 TS.*”）
- [ ] 搜索、筛选、空/加载/错误、导航参数消费闭环
- [ ] 表单 required / 默认态与 Source 对齐

### E. 验收工具使用

- [ ] 默认路径未强制 `read_implementation_plan` / `read_implementation_tranche`
- [ ] 实施后可用 obligations / verify 复查
- [ ] `flutter analyze` / `flutter test` 通过
- [ ] 有条件时做固定 viewport 视觉抽查

## 通过标准（够用即可）

- 理解摘要稳定出现
- 位置语义编码消失或显著减少
- mock/业务数据对齐明显好于 V6 shortcut
- 主观不低于 V5（约 8 分水位）

不要求一次到 9 分。

## 记录模板

执行后在本目录追加：

- 使用的 Workspace / Handoff / Snapshot / Delivery
- 新 feature 路径
- A–E 勾选结果
- 仍存 Major / Moderate / Minor
- 是否需要再开一轮有界修正
