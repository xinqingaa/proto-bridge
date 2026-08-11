# 交付检查单

完成 PBWork Prototype、Design System 或 Runtime 改动后逐项检查。

## 设计系统

- [ ] 形状匹配时优先 DS 组件；局部 UI 已论证且走 Token
- [ ] FilterBar / Card 未滥用（自定义 Chip 行须 `data-no-swipe`；列表行默认非 Card）
- [ ] 无硬编码色值/字号/阴影等设计量
- [ ] 浅色 / 深色主题下关键表面可读；theme 切换不堆业务 history、不占用 variant
- [ ] 新增或改动的 props 已进 contract + registry；触达文档已更新叙事（不以 props 表为权威）
- [ ] Contract 含 `playground.presentation`；语义变更已补 `summary`/`behavior`/`states[].kind`（适用时）
- [ ] Contract ↔ Vue ↔ Registry 经校验一致；文档与 Contract 语义不冲突
- [ ] 未引入第二图标包；默认图标为 Lucide
- [ ] 未用大 type 兼多语义角色（见 alignment-protocol / audit-large-types）

## 组合与手势

- [ ] Tabbar 未兼任面板/手势，根目的地默认不横滑
- [ ] 一级/二级 Tab 嵌套时只有一个横滑 owner；三级 Tab 不拥有 viewport；维度切换用 R7
- [ ] 一级/二级 Tab 内容在具名 slot；`fill` 时高度链完整
- [ ] 列表：ScrollableDataList 外包，DataList 管外观
- [ ] 状态页（loading/empty/error）已关闭刷新/分页手势
- [ ] 唯一纵滚；顶部下拉与横滑不打架
- [ ] 嵌套横条使用 `data-horizontal-scroll` + 共享 hook
- [ ] 未页内复制手势仲裁
- [ ] Dialog/Snackbar 未深埋进滚动变换层（宜兄弟挂载）

## 导航与 Variant

- [ ] Tab replace / 二级 push；跨 Tab 进栈 parent 正确
- [ ] 返回与完成流符合 shell-and-nav（含嵌入 Runtime）
- [ ] keepMounted 下各面板 ownsVariant
- [ ] Screen / Variant 已注册且可经 URL 打开
- [ ] 叠加/校验等关键态有 Variant；theme ≠ variant
- [ ] 列表与选项数据在源码中可见
- [ ] 已先列出所有需要 Agent 独立实现或验收的证据节点
- [ ] DS 业务实例使用业务稳定 `inspectId`；required Fragment 不依赖 `ds.*`
- [ ] 业务局部证据节点的 `data-pb-id` / `data-pb-role` 成对，重复实例使用稳定 `data-pb-key`
- [ ] 业务局部证据节点显式声明实现所需 `data-pb-token-*`，没有只靠 CSS Token
- [ ] 严格 Screen 的 default Variant 已声明非空 `requiredFragments`
- [ ] required Fragment 在真实 Runtime 中唯一、role 非 unknown、可见且有非零 bbox
- [ ] 关键交互已声明 Action、Scenario 与 Checkpoint
- [ ] 新 Screen 未加入 `LEGACY_EVIDENCE_SCREEN_IDS`
- [ ] Action target 使用稳定 Fragment；Scenario/Checkpoint 实际维度可验证
- [ ] prepare/readiness/snapshot/reset 在独立 Case 中可重复

## 文档

- [ ] 若沉淀了新的**通用**规则，已写入 `apps/pbwork/docs`（不要把未定稿视觉口味写成铁律）
- [ ] 业务个案笔记（如有）与手册不冲突；冲突以手册 + contract 为准
- [ ] 组件、Token、Theme、手势或 Registry 变化已按 `development.md` 同步文档
- [ ] `pnpm docs:verify` 已通过
- [ ] authoring lint、Registry validation 和 Runtime Capture 的 Block 为零；每个 Warning 已修复或记录理由
