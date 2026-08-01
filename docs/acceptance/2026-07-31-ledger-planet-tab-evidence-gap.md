# 账本星球 Tab 交互证据与还原缺口

Issue ID：`PB-ACCEPT-001`

状态：Producer Fixed / Pending Recapture and Consumer Verification

严重度：High

关联验收：

- Workspace：`pbwork-local`
- Handoff：`handoff-2026-07-31t091907780-594559a9`
- Snapshot：`snapshot-2026-07-31t091900445-70898f63`
- 列表 revision：`revision-2026-07-31t091900441-95ac5f92`
- 目标页面：`apps/flutter_pb_app/lib/features/ledger_planet_v2/ledger_planet_page.dart`

## 问题

Flutter V2 任务列表展示“全部 / 待完成 / 已完成”三个 Tab，但用户无法点击切换。

这不是单一环节的问题：

1. **基础选中态不能切换是还原缺陷。** Evidence 已证明该区域是 Tabs，目标工程的 `CommonTabs` 也具备标准 `TabBar` 交互；Consumer 实现额外使用 `IgnorePointer` 禁用了点击。
2. **切换后如何过滤列表是 Evidence 缺口。** 固定 Snapshot 没有“待完成”或“已完成”的 Action、Scenario、Checkpoint、revision 或 Screenshot，无法证明各状态应展示哪些任务以及是否存在空状态。

## 复现场景

前置条件：

- 从应用 Hub 打开 `Ledger Planet V2`；
- 页面处于固定 Evidence 的默认状态，“全部”Tab 选中；
- 列表展示三条任务。

操作：

1. 点击“待完成”；
2. 点击“已完成”。

实际结果：

- 点击没有响应；
- 选中指示器始终停留在“全部”；
- 列表内容不变化。

期望结果：

- Tab 作为标准交互控件应响应点击并切换选中态；
- 列表过滤结果必须由补采后的固定 Evidence 决定，不能仅凭任务状态文案推断。

## 已有 Evidence

固定列表 revision 已证明：

- `ledger-planet.task-list.filters.role = tab-bar`；
- `componentId = tabs`；
- 标签为“全部 / 待完成 / 已完成”；
- `selectionStyle = pill`；
- `size = md`；
- 存在 active/inactive 颜色与背景 token；
- 默认 Screenshot 中“全部”为选中态。

固定 Evidence 只包含以下列表 Action：

- `ledger-planet.task-list.action.open-claimable-task`，目标是任务 `t2`。

未发现：

- 点击“待完成”或“已完成”的 Action；
- Tab 切换 Scenario 与 Checkpoint；
- 两个筛选状态对应的 revision、Fragment 或 Screenshot；
- 筛选后的列表成员、顺序和空状态。

## 原因

### Consumer 还原原因

实现阶段将“没有筛选结果证据”解释成“整个 Tab 不得交互”，在 `CommonTabs` 外包裹了 `IgnorePointer`。这混淆了两层能力：

- Evidence 已支持的标准 Tabs 选中交互；
- Evidence 尚未支持的业务过滤结果。

前者不应被禁用；后者在补齐证据前不应猜测。

### Producer 采集原因

本次 Selection 仅覆盖任务列表默认 Case，以及从 `t2` 打开领取态详情的 Scenario。Prototype manifest 和 Case Matrix 没有把两个筛选操作作为关键交互纳入交付范围，因此 Snapshot 只能证明默认构图，不能证明筛选后的页面状态。

### 流程暴露缺口

当前验收能检查 Scenario 是否到达详情页，但没有显式检查“截图中可见的交互控件是否都具备交互覆盖”。因此 Coverage 为 complete 时，仍可能只代表已声明范围完整，而不是页面所有显著交互完整。

## 大致修复链路

### 1. 立即修复 Consumer 的基础交互

- 移除 `CommonTabs` 外层的 `IgnorePointer`；
- 保留 `DefaultTabController` 或显式 `TabController`；
- 确认三个 Tab 的选中指示器可切换；
- 默认进入页面时仍保持“全部”选中；
- 在没有新 Evidence 前，不宣称筛选内容已正确还原。

### 2. 补充 Prototype 交互契约

- 为“待完成”和“已完成”声明稳定 Action；
- 为两个 Action 声明 Scenario 与 Checkpoint；
- 明确每个状态的 fixture、列表成员、顺序和空状态；
- 将对应 root/list/row Fragment 纳入 required scope。

### 3. 重新采集并交付

- 生成默认、待完成、已完成三个固定 Case；
- 每个 Case 实际采集 Screenshot、语义 Facts 和 revision；
- 在 Evidence Review 中核对 Tab 选中态和列表结果；
- 创建包含三个 Case 的新 Snapshot 与 Handoff，不覆盖本 Issue 引用的历史固定对象。

### 4. 按新 Handoff 完成业务过滤还原

- 根据新 revision 实现 Tab 状态与任务集合映射；
- 不从“去完成 / 待领取”等文案反推分类规则；
- 增加默认 → 待完成 → 已完成的 Widget 测试；
- 对照三个 Screenshot 自检并执行 `flutter analyze`、`flutter test` 和 `validate_target_changes`。

### 5. 增加闭环守卫

- Producer 验收增加“显著交互控件覆盖”检查；
- Handoff 摘要区分“组件交互语义已证明”和“业务结果状态已证明”；
- Consumer 验收检查交互组件是否被 `IgnorePointer`、空回调或 disabled 状态意外降级。

## 验收标准

- 点击三个 Tab 时选中态可切换；
- 默认 Case 的构图和文案不回退；
- “待完成”和“已完成”分别有固定 Action、Scenario、revision 和 Screenshot；
- 每个筛选状态的列表结果可追溯到固定 Evidence；
- Widget 测试覆盖三个 Tab 及对应列表结果；
- 不再以“缺少业务结果证据”为由禁用 Evidence 已证明的基础控件交互。

## 2026-08-01 Producer 修复记录

PBWork 采集侧已完成以下修复，原历史 Evidence 因数据已清理，仍需重新采集后才能关闭本 Issue：

- 任务列表只保留页面级 `default`、`empty` Variant；“待领取”归属任务详情，不再与列表默认数据冲突；
- 新增“待完成”“已完成”筛选 Action、Scenario 和 Checkpoint，并固定 Tab 选中状态与可见任务 key；
- Screen manifest 可声明 `requiredScenarioIds`，Preflight/Handoff 分别报告交互覆盖与 Case 覆盖；
- Checkpoint 支持校验显式状态、重复项精确 key 和禁止出现的 Fragment；
- 交付流程恢复全局及逐页 Variant/Scenario 选择，可明确选择要采集的页面、状态和行为；
- 新增 Evidence Inventory，按 Prototype / Screen 展示已采集、未采集、过期、失败、归档和回收站状态；
- 支持查看结果、检查新鲜度、按 Case 定向重采、批量移入回收站、恢复及带指纹校验的永久删除；
- 已移除的 Screen/Variant/Scenario 引用会被标记为过期，不再使旧 Evidence 的检查流程直接中断。

Producer 自动化验证已覆盖任务列表三个 Tab 的 Runtime Capture，以及采集任务在页面关闭后的恢复。Issue 关闭仍要求按上述契约重新生成固定 Evidence，并完成 Flutter Consumer 的交互与过滤结果验收。
