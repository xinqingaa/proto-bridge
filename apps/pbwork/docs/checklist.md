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

- [ ] Tabbar 发目的地；根目的地关闭横滑，TabViewport 时长 `motion.duration-instant`
- [ ] 一级/二级 Tab 嵌套时只有一个横滑 owner；三级 Tab 不拥有 viewport；局部原地更新使用 R7
- [ ] 一级/二级 Tab 内容在具名 slot；`fill` 时高度链完整
- [ ] 列表：ScrollableDataList 外包，DataList 管外观
- [ ] 状态页（loading/empty/error）已关闭刷新/分页手势
- [ ] 唯一纵滚；顶部下拉与横滑不打架
- [ ] 嵌套横条使用 `data-horizontal-scroll` + 共享 hook
- [ ] 未页内复制手势仲裁
- [ ] 原型表面默认隐藏滚动条，内容仍可滚动；仅页面明确要求时露出
- [ ] Dialog/Toast 未深埋进滚动变换层（宜兄弟挂载）

## 导航与 Variant

- [ ] 新原型或结构性改动存在 `docs/design.md` 且状态为 `approved`
- [ ] 本次调整的页面设计增量已批准；其它待定页面未被当作可以任意发挥的空白
- [ ] 探索草稿位于 `src/drafts`，未注册为正式 Prototype，也未被当作 Capture/Handoff 输入
- [ ] `docs/implementation.md` 的 Promotion Mapping 已将视觉元素分为现有 DS、通用 DS 缺口、业务局部 UI、外部资产或降级项
- [ ] 导航职责、关键交互效果与视觉编排不存在影响实现的未决问题
- [ ] 根目的地各注册 Screen、共用壳 `view`；切 Tab 用 `replace` 更新 slug；栈页 `push`；跨 Tab 进栈 parent 正确
- [ ] 返回与完成流符合 shell-and-nav（含嵌入 Runtime）
- [ ] 产品离开拦截先认 `isForcedRuntimeNavigation()`；Workbench / Capture 换页由 Runtime 强制导航打开目标页
- [ ] keepMounted 下各面板 ownsVariant
- [ ] 选项 Sheet 选中行使用 `check` Icon 与 `typography.label`
- [ ] Screen / Variant 已注册且可经 URL 打开
- [ ] 叠加/校验等关键态有 Variant；theme ≠ variant
- [ ] 列表与选项数据在源码中可见
- [ ] 已先列出所有需要 Agent 独立实现或验收的证据节点
- [ ] DS 业务实例使用业务稳定 `inspectId`；required Fragment 不依赖 `ds.*`
- [ ] 业务局部证据节点的 `data-pb-id` / `data-pb-role` 成对，重复实例使用稳定 `data-pb-key`（字母开头，不用纯数字）
- [ ] 正式原型全部静态 `data-pb-role` 已通过 `pnpm --filter @proto-bridge/pbwork authoring:lint`，每个值都属于 Core `SEMANTIC_ROLES`；没有为局部原型扩充词表
- [ ] 业务局部证据节点显式声明实现所需 `data-pb-token-*`，没有只靠 CSS Token
- [ ] 严格 Screen 的 default Variant 已声明非空 `requiredFragments`
- [ ] required Fragment 在真实 Runtime 中唯一、role 非 unknown、可见且有非零 bbox
- [ ] 关键交互已声明 Action、Scenario 与 Checkpoint
- [ ] 新 Screen 未加入 `LEGACY_EVIDENCE_SCREEN_IDS`
- [ ] Action target 使用稳定 Fragment；Scenario/Checkpoint 实际维度可验证
- [ ] prepare/readiness/snapshot/reset 在独立 Case 中可重复

## Experience Review

- [ ] 新页面或整页重构已对正式 PBWork 实现再次应用 `frontend-design`，不是只验收过草稿
- [ ] `docs/implementation.md` 已记录 `quick-checked`、`accepted`、`fully-audited`、`needs-focused-review` 或显式 `deferred`；未把 Quick Check 描述成完整体验验收

### L1 Quick Experience Check（默认）

- [ ] 实现稳定后查看了默认状态、主要视口和主题的一张真实浏览器截图
- [ ] 按页面最大风险至多增加一张深色、窄屏、Overlay、关键状态或主要交互结果截图；无次要风险时未强行补齐矩阵
- [ ] 已检查首屏焦点与阅读顺序、签名视觉、明显热区反馈、装饰克制、重复元素对齐、文字溢出、Overlay 与固定导航遮挡
- [ ] 截图修正循环不超过一次；仍有实质问题时记录 `needs-focused-review` 并升级，没有无限迭代或带缺陷标记 `quick-checked`

### L2 Focused Experience Gate（按风险升级）

- [ ] 用户不满意、L1 暴露实质问题、共享视觉语法、核心旅程、数据可视化、复杂交互或承担核心任务的复杂 Overlay 页面已升级到 L2
- [ ] 已按实际风险选择三至五张截图，没有机械穷举主题 × 视口 × 状态
- [ ] 相关默认/关键状态、交互反馈、键盘焦点、主题或窄屏、结构性 Divider/Card/标签/图标/装饰、文字与 Overlay 完整性均通过
- [ ] 发现的不必要配件已移除，实质视觉缺陷已修复；未用已知缺陷换取 `accepted`

### L3 Full Experience Audit（显式或批次）

- [ ] 仅在用户明确要求、最终批次/发布验收或产品风险要求时执行
- [ ] 已覆盖声明的主题、目标视口、reduced motion、关键状态与核心交互，发现的实质问题已修复后才记录 `fully-audited`
- [ ] 视觉修复只重跑受影响的 Delivery 检查和当前 Experience 级别；完整仓库验证保留到页面或连贯批次完成时执行

## 文档

- [ ] 新原型从“进行中”开始；生命周期流转未跳级，已归档原型没有被修改或回退
- [ ] 待确定阶段的候选方案已在定稿前收敛；已定稿修改前已清理绑定 Evidence 并回退
- [ ] PBWork 未新增手工采集、提示词重生成或原型删除入口；CLI 能力边界未被生命周期接管
- [ ] 正式 Prototype 使用 `docs/design.md`；未新增根目录 `requirements.md`、`implementation-notes.md` 或其它平铺产品文档
- [ ] 若沉淀了新的**通用**规则，已写入 `apps/pbwork/docs`（不要把未定稿视觉口味写成铁律）
- [ ] 业务个案笔记（如有）与手册不冲突；冲突以手册 + contract 为准
- [ ] 组件、Token、Theme、手势或 Registry 变化已按 `development.md` 同步文档
- [ ] Component/Token/Theme Schema、Contract、role、Catalog、Theme 或 Bind 池变化已运行 `pnpm ds:target-sync:verify`；连续迭代保留 pending/drift，稳定批次恢复完整 `synced` baseline
- [ ] `pnpm docs:verify` 已通过
- [ ] authoring lint、Registry validation 和 Runtime Capture 的 Block 为零；每个 Warning 已修复或记录理由
