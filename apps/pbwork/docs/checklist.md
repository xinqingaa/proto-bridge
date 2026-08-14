# 交付检查单

完成 PBWork Prototype、Design System 或 Runtime 改动后逐项检查。

## 设计系统

- [ ] 形状匹配时优先 DS 组件；局部 UI 已论证且走 Token
- [ ] FilterBar / Card 未滥用（自定义 Chip 行须 `data-no-swipe`；列表行默认非 Card）
- [ ] style/template/script/TS helper、生成样式与 vendor 视觉 props 无固定设计值（含设计意义的 `0`）；所有设计量仅消费 `var(--pb-*)`，不存在 literal fallback
- [ ] DS 与现役原型没有 CSS Grid / `place-*` Grid 简写，只使用 Flex 或常规文档流
- [ ] `calc()` 只组合 Token/运行时派生变量；DOM 测量值仅经 custom property 传入，未形成固定默认值或自由样式入口
- [ ] 新增或实际消费的 Token 已同步 Foundation、Theme、Bind 池（如需）、Contract 与 Inspector
- [ ] 浅色 / 深色主题下关键表面可读；theme 切换不堆业务 history、不占用 variant
- [ ] 新增或改动的 props 已进 contract + registry；触达文档已更新叙事（不以 props 表为权威）
- [ ] Contract 含 `playground.presentation`；语义变更已补 `summary`/`behavior`/`states[].kind`（适用时）
- [ ] Contract ↔ Vue ↔ Registry 经校验一致，Inspector 与 JSON Contract 的 token binding 槽位集合完全一致；文档与 Contract 语义不冲突
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
- [ ] Dialog/Toast 未深埋进滚动变换层（宜兄弟挂载）

## 导航与 Variant

- [ ] 新原型或结构性改动存在 `docs/design.md` 且状态为 `approved`
- [ ] 本次调整的页面设计增量已批准；其它待定页面未被当作可以任意发挥的空白
- [ ] 探索草稿位于 `src/drafts`，未注册为正式 Prototype，也未被当作 Capture/Handoff 输入
- [ ] `docs/implementation.md` 的 Promotion Mapping 已将视觉元素分为现有 DS、通用 DS 缺口、业务局部 UI、外部资产或降级项
- [ ] 导航职责、关键交互效果与视觉编排不存在影响实现的未决问题
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

## Experience Gate

- [ ] 新页面或整页重构已对正式 PBWork 实现再次应用 `frontend-design`，不是只验收过草稿
- [ ] 已在声明的目标视口查看真实浏览器截图，首屏只有一个最高焦点且阅读顺序符合页面契约
- [ ] 已检查浅色、深色、窄屏和页面契约要求的默认/关键状态
- [ ] 签名视觉在 DS、Token 和 Evidence 转译后仍成立，没有退化成通用组件堆叠
- [ ] 所有看起来可点的元素都有可观察结果、反馈和可见键盘焦点
- [ ] Divider、Card、标签、图标和装饰都编码真实结构；已移除发现的不必要配件
- [ ] 重复元素对齐，文字不溢出，Overlay/固定导航不遮挡内容，reduced motion 不影响理解
- [ ] Experience Gate 发现的问题已修复，并重新通过 Delivery Gate；不是仅记录为已知缺陷

## 文档

- [ ] 正式 Prototype 使用 `docs/design.md`；未新增根目录 `requirements.md`、`implementation-notes.md` 或其它平铺产品文档
- [ ] 若沉淀了新的**通用**规则，已写入 `apps/pbwork/docs`（不要把未定稿视觉口味写成铁律）
- [ ] 业务个案笔记（如有）与手册不冲突；冲突以手册 + contract 为准
- [ ] 组件、Token、Theme、手势或 Registry 变化已按 `development.md` 同步文档
- [ ] Component/Token/Theme Schema、Contract、role、Catalog、Theme 或 Bind 池变化已运行 `pnpm ds:target-sync:verify`；连续迭代保留 pending/drift，稳定批次恢复完整 `synced` baseline
- [ ] `pnpm docs:verify` 已通过
- [ ] authoring lint、Registry validation 和 Runtime Capture 的 Block 为零；每个 Warning 已修复或记录理由
