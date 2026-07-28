# PBWork V2 Capture 体验规格

> 状态：V2 计划，待实施
> 权威范围：PBWork 中 Evidence 的选择、预检、采集、检查、重采和 Agent Handoff
> 上位决策：[ProtoBridge / PBWork V2 重构计划](./pb-pbwork-v2-rearchitecture.md)
> 数据契约：[ProtoBridge V2 Contract 规范](./pb-v2-contracts.md)
> Service 与代码落点：[ProtoBridge V2 实施规格](./pb-v2-implementation.md)

本文件定义 PBWork 如何成为 ProtoBridge V2 的证据采集控制面。它不规定一级或二级侧边导航的最终视觉样式，但固定 Capture Console 路由、四类入口和返回行为，确保产品路径可验收。

当前对外 V1 产品行为仍以 [`docs/design.md`](../design.md) 为准；V2 实施目标只以本规格为权威，`docs/design.md` 不得覆盖本规格。V2 完成并正式切换时，再把已验收行为一次性同步到正式产品文档。

## 1. 产品边界

PBWork V2 Capture 负责：

- 从当前画布或 Prototype Registry 建立 `CaptureSelection`；
- 在创建 Job 前执行 semantic preflight；
- 展示完整 Case Matrix、预计数量和采集范围；
- 启动、取消和重试 Capture Job；
- 展示 Coverage、Issue、unknown、Screenshot、Fragment 和 stale；
- 从已提交的 Bundle 生成 Agent Handoff。
- 从 Bundle 摘要显式 Fork 当前 Snapshot 或 Archive Bundle；两者都不删除历史 Evidence。

PBWork V2 Capture 不负责：

- 把原型翻译成 Flutter 或其他目标代码；
- 选择目标文件、路由、状态框架、组件或 Token；
- 在浏览器端直接运行 Playwright；
- 直接读取或修改 Evidence Store 文件；
- 在 Handoff 中复制整个 Bundle 或 Store 路径；
- 规定 PBWork 侧边导航的最终视觉样式；
- 提供 Agent Chat、账号、角色、审批或多人协作。

用户界面统一使用“采集证据”“检查证据”“交给 Agent”，不使用“翻译代码”描述 Capture。

## 2. 单一操作闭环

所有入口最终进入同一流程：

```text
选择采集范围
→ Preflight
→ 确认 Case Matrix
→ 启动 Capture Job
→ 查看进度
→ 检查 Coverage / Issue / Evidence
→ 修复、重试或重采 stale
→ 创建 Agent Handoff
```

PBWork 不得为当前页面、Fragment 和整个 Prototype 分别实现不同的 Capture 逻辑。它们只生成不同的 Selection Draft，之后共用 Local Service、Core、Store 和结果视图。

Capture Console 固定为 `/workbench/capture`。Draft 保存只用于返回工作台的 `returnTo`，它不进入 CaptureRequest、Run、Bundle 或 Handoff。

## 3. Capture 入口

### 3.1 当前 Screen

在用户已经打开某个 Screen 或 Variant 时提供“采集当前页面”：

1. 自动填入当前 Prototype 和 Screen；
2. 当前 Screen 的 Variant policy 默认显式选择当前 Variant，允许改为 default、critical、all 或指定集合；
3. Scenario policy 默认 critical，允许改为 none、all 或显式 Scenario / Checkpoint；
4. Theme 默认选择当前原型主题；
5. Device 默认选择当前画布设备；
6. 用户进入 Preflight，不直接创建 Job。

当前 Screen、Variant、Theme 必须来自已握手 Runtime 的规范化上下文。工作台 URL、本地 store 或过期 Bridge 消息不能覆盖 Runtime 报告的身份。

### 3.2 选中 Fragment

Fragment Capture 复用 PBWork 已有的元素选择能力，不增加与 inspect/comment 竞争的第三套点选协议：

1. 用户在“选择与评审”模式选中元素；
2. V2 Bridge selection payload 返回并在元素检查面板显示 `screenId`、`data-pb-id`、可选 `data-pb-key`、role、component 和当前 Variant；
3. 用户执行“加入采集范围”；
4. PBWork 将稳定身份转换为 `FragmentSelector`；
5. 用户选择要覆盖的 Variant、Theme 和 Device；
6. 进入 Preflight。

以下情况禁止提交 instrumented Fragment：

- 没有稳定 `data-pb-id`；
- 重复实例没有稳定 `data-pb-key`；
- 只有临时 Runtime handle、DOM path、数组 index 或随机 class；
- 节点属于已经切换或卸载的 Runtime；
- 当前 Variant 下 selector 已失效。

阻止提交时必须说明缺少哪个字段、节点位于哪个 Screen，并允许重新定位；不得静默退化为 CSS selector。

### 3.3 自定义范围

自定义范围支持：

- 一个 Prototype 内多选 Screen；
- 每个 Screen 使用 default、critical、all 或显式 Variant；
- 全局或显式 Screen / Scenario / Checkpoint 策略；
- 可选 Theme；
- 可选 Device；
- 可选多个 Fragment。

Prototype 是单次 instrumented Selection 的边界。跨 Prototype 任务拆成多个 Selection 和 Job，避免 Bundle 身份、Catalog 和 Coverage 混杂。

### 3.4 整个 Prototype

“采集整个原型”选择当前 Prototype 的全部 Screen，并要求用户明确选择 Variant 策略：

- `default`：每个 Screen 只采默认 Variant；
- `critical`：采 Registry 声明的关键 Variant；
- `all`：采全部 Variant。

同时要求确认 Scenario policy：

- `none`：只采 Base Case；
- `critical`：追加 Registry 显式标记的关键 Scenario Checkpoint；
- `all`：追加全部 Scenario Checkpoint。

不得把 Variant 或 Scenario 的 `all` 作为无提示默认值。PBWork 必须在提交前分别显示 Base Case、Scenario Checkpoint Case 和预计截图数。

## 4. Selection Draft

Selection Draft 是 PBWork 本地编辑状态，不是 Run，也不写入 Evidence Store。

Draft 必须展示：

- Prototype；
- Screen 数量和名称；
- Variant 策略与显式选择；
- Scenario 策略、显式 Scenario 和 Checkpoint；
- Fragment 数量和稳定身份；
- Theme；
- Device；
- Screenshot 策略；
- Source 是否启用；
- Trace 策略；
- 当前预计 Case 数。
- 返回工作台路由；该字段只属于 PBWork Draft。

规则：

- 默认值来自当前 Runtime、Workspace capture config 和 Registry；
- 用户修改任一维度后立即使旧 Preflight 结果失效；
- `returnTo` 变化不影响 Preflight；其他进入 CaptureRequest 的字段变化都使旧结果失效；
- Draft 可以在 PBWork 会话内保留，但刷新后恢复不是 V2 硬要求；
- Draft 不允许输入 Store path、target root 或目标工程信息；
- 高级用户可以导入 Selection JSON，但必须经过相同 Schema 和 Preflight。

## 5. Preflight

Preflight 在创建 Capture Job 前完成，且不创建 Run。

检查范围：

- Runtime Protocol 和版本；
- Prototype、Screen、Variant、Theme 和 Device 是否存在；
- `data-pb-*`、Component、Slot、Action 和 Fragment 引用；
- duplicate `pbId` / `pbKey`；
- Runtime 是否能 prepare 所选状态；
- Scenario Step、Checkpoint 和跨 Screen SPA navigation 是否受支持；
- Case Matrix 是否超过 `maxCasesPerJob`；
- Source、Runtime 和 capture config revision；
- 预计 Screenshot、Trace 和容量；
- generic runtime / screenshot-only 模式的能力限制。

结果分为：

| 结果    | 含义                                       | 用户可执行            |
| ------- | ------------------------------------------ | --------------------- |
| ready   | 没有阻塞问题                               | 查看 Matrix、开始采集 |
| warning | 可以采集但 Coverage 或 Evidence Level 受限 | 查看影响、接受后开始  |
| blocked | Contract、引用、协议、上限或安全检查失败   | 定位和修复，不可开始  |

每个 Issue 必须显示：

- code 和 severity；
- Prototype / Screen / Variant；
- 可选 pbId、pbKey、componentId 或 actionId；
- 原因；
- 对 Coverage 的影响；
- `nextAction`；
- 可定位时的“在画布中查看”。

Preflight 返回 `preflightRevision`。Draft、Manifest、Runtime 或配置变化后，PBWork 必须重新 Preflight；Service 发现 revision 过期时返回 `PREFLIGHT_STALE`。

Preflight 同时返回规范化 CaptureRequest、`selectionDigest`、`matrixDigest`、warning Issue IDs 和 blocking Issue IDs。PBWork 创建 Job 时必须原样提交这些字段，并把用户接受的全部 warning IDs 写入 `acceptedWarningIssueIds`；缺少接受记录时 Service 返回 `PREFLIGHT_WARNING_NOT_ACCEPTED`。

Runtime dry-prepare 对每个唯一 Base Case 使用独立 BrowserContext，完成后关闭；不得改变当前画布 iframe。Scenario 在 Preflight 只校验 Contract、引用、Checkpoint identity 和 capability，不执行业务 Step；实际可达性由 Capture attempt 证明。Preflight 不创建 Run、不更新 Bundle。

## 6. Case Matrix 确认

Matrix 是创建 Job 前的最终确认，不是执行日志。

最少展示：

- Screen；
- Variant；
- Theme；
- Device；
- Scenario / Checkpoint；
- Fragment；
- Screenshot 类型；
- 是否可复用现有 Case Evidence revision；
- 是否 stale；
- 预计新增 Case、复用 revision 和 Scenario Checkpoint Case 数。

交互规则：

- 默认按 Screen 分组；
- 支持只看 warning、stale、复用或新增 Case；
- 超过 `maxCasesPerJob` 时禁止提交并指导缩小范围；
- 用户确认的是规范化 Selection，不逐个编辑派生 Case；
- 需要改变 Matrix 时返回 Selection Draft 修改维度，不能直接篡改单个 Case identity。

## 7. Job 状态与控制

PBWork 页面状态：

```text
draft
→ preflighting
→ blocked | ready
→ queued
→ discovering
→ capturing
→ writing
→ completed | partial | failed | cancelled | interrupted
→ stale
```

`stale` 是已提交 Evidence 相对新输入的状态，不是正在运行 Job 的终态。

运行中至少展示：

- Job ID 和将产生的 Run；
- 当前阶段；
- 已捕获、复用、失败、跳过和剩余 Case；
- 当前 Screen / Variant / Device；
- 启动时间和已用时间；
- 最近 Issue；
- 是否正在取消。

行为：

- 关闭 PBWork 页面不取消后台 Job；
- 重新进入后通过 Job GET 和 SSE event ID 恢复状态；
- cancel 停止未完成 Case，已事务提交的 Case 不回滚；
- retry 先生成只包含失败、interrupted 或用户指定范围的 Selection Draft，重新 Preflight 并提交后创建新 Run；
- Service 重启后 running Job 显示 interrupted，不能假装继续；
- writing 阶段只有 Store transaction 成功、生成新 Bundle Snapshot 并原子更新 Manifest 后才能显示 Bundle 已更新；
- failed、skipped、unsupported、cancelled 或 interrupted attempt 不清除已有 active successful Evidence；
- Job 是可恢复进度对象，Run 是终态不可变执行记录，PBWork 不把两者状态混用。

## 8. 结果与 Evidence 检查

结果页按以下层级组织：

```text
Bundle / Active Snapshot 摘要
├── Snapshot Coverage
├── Issue / unknown
├── Screen
│   └── Case
│       ├── Screenshot
│       ├── Fragment
│       ├── Case Evidence Revision
│       ├── Runtime / Source facts
│       └── provenance / refs
└── Run 历史
    └── Case Attempt
```

默认摘要必须回答：

- 本次选择了什么；
- 成功采集了什么；
- 哪些失败、unsupported 或未采；
- 是否存在 stale；
- Evidence Level；
- 哪些 unknown 会影响实现；
- 是否适合生成 Handoff。
- 当前 active Snapshot、各 Case 的 active Evidence revision 和 latest attempt 是否一致。

Bundle lifecycle 行为：

- Fork 要求用户选择明确的源 Snapshot 和新 Bundle ID；成功后进入新 Bundle 摘要；
- Archive 要求确认当前 active Snapshot ID；归档后禁止继续追加 Run，需先 Fork；
- PBWork 不提供直接删除 active Bundle 的操作；容量清理统一走带 dry-run 的 Clean。

展示规则：

- Screenshot 使用缩略图网格，打开后保留 Case 身份；
- Evidence 默认展示结构化摘要和 refs；
- raw DOM、Source 全文、Trace 和 Debug Blob 只在调试入口按需读取；
- Coverage 不用单一百分比掩盖失败 Case；
- captured、reused、partial、unsupported、skipped 和 failed 分开显示；
- cancelled 和 interrupted 也必须与 skipped / failed 分开显示；
- Snapshot Coverage 与单次 Run Coverage 分开展示，不用最近 Run 冒充 Bundle 当前态；
- Source/Runtime 冲突并列显示并保留 provenance；
- PBWork 不根据 Evidence 生成 Flutter 建议。

## 9. Stale、修复与重采

PBWork 不能只读取 Store 中的旧 stale 布尔值。进入结果页、创建 Handoff 或用户执行“刷新 stale”时，PBWork 调用 staleness preflight，把当前 Runtime / Source / Config 的 Case dependency closure 与指定 Bundle Snapshot 比较并生成不可变 `StalenessReport`。

当 Case 依赖摘要变化时，Report 标记 stale，并显示导致变化的维度：

- Runtime revision；
- Source revision；
- fixture；
- Component / Token Contract；
- Theme / Device；
- capture engine 或策略。

无关 Screen、Source 文件、Component、Token 或 Asset 的变化不得使当前 Case stale。PBWork 显示 Report 的生成时间、Snapshot ID 和 input revision；Store-only 状态下只能展示已有 Report，并明确不能判断相对当前 Source 的新 stale。

用户可以：

- 重采全部 stale；
- 重采选中 Screen；
- 重采选中 Case；
- 将 failed 与 stale 合并为一次新 Selection。

重采总是创建新 Run。旧 Run、旧 Bundle Snapshot 和旧 Case Evidence revision 仍可审计；新的事务提交成功后生成新 Snapshot。失败 attempt 只更新 latest attempt，不覆盖旧 active successful Evidence。

PBWork 不提供手工编辑 Evidence、删除单条事实或把 warning 改成成功的入口。

## 10. Agent Handoff

“创建 Agent Handoff”只对已事务提交的 Bundle 可用。

创建前展示：

- Workspace 和 Prototype；
- Bundle Snapshot 和 Staleness Report；
- Screen、Case、Fragment 范围；
- complete / partial；
- selected、captured、reused、failed、skipped、unsupported、cancelled、interrupted、missing 和 stale Case 数；
- 关键 unknown；
- 用户填写的实现意图。

规则：

- complete 可以直接生成；
- partial 或 stale 必须二次确认，并将状态与 `riskAcceptance` 写入 Handoff；
- blocked preflight、未提交 Job 或失效引用不能生成；
- Handoff 使用 Contract 中的 `workspaceId`、`bundleId`、`bundleSnapshotId`、`stalenessReportId` 和具体 object revision refs；
- 不包含 Store root、target root、Flutter 计划或 Evidence 全文。

`complete` 要求所有 selected Case latest attempt 为 captured 或 reused、具有 active Evidence revision 且不 stale。failed、skipped、unsupported、cancelled、interrupted、缺失或无 active revision 均使状态成为 partial。

Handoff 创建后不可变。后续新 Run、新 Snapshot 或新 Staleness Report 不改变已下载或已复制 Handoff 的解析结果。

生成后提供：

- 复制 Handoff JSON；
- 下载 Handoff JSON；
- 查看 `recommendedResources`；
- 返回修改实现范围。

PBWork 不负责把 Handoff 自动发送给某个 Agent，也不在 V2 中引入 Agent Chat。

## 11. Local Service 映射

| PBWork 行为          | Service                                            |
| -------------------- | -------------------------------------------------- |
| 载入可选范围         | `GET /api/v2/prototypes`                           |
| Preflight 和 Matrix  | `POST /api/v2/capture-preflight`                   |
| 开始采集             | `POST /api/v2/capture-jobs`                        |
| 恢复 Job             | `GET /api/v2/capture-jobs/:jobId`                  |
| 实时进度             | `GET /api/v2/events`                               |
| 取消                 | `POST /api/v2/capture-jobs/:jobId/cancel`          |
| 生成重试范围         | `POST /api/v2/capture-jobs/:jobId/retry-selection` |
| 刷新 stale / 重采范围 | `POST /api/v2/bundles/:bundleId/staleness-preflight` |
| Bundle / Snapshot / Case revision / Catalog / Blob | 对应只读 GET |
| Fork / Archive Bundle  | `POST /api/v2/bundles/:bundleId/fork` / `archive` |
| 创建 Handoff         | `POST /api/v2/bundles/:bundleId/handoffs`          |

PBWork 浏览器端不访问文件系统、Playwright 或 Store 目录。`pb serve` 使用 URL fragment 中的一次性 bootstrap nonce 换取 bearer token，PBWork 换取后立即清除 fragment；token 只保存在 `sessionStorage`，不进入 query、Handoff、日志或 Bundle。SSE 使用带 Authorization header 的 fetch stream。

## 12. 错误与恢复

| 场景                 | PBWork 行为                                         |
| -------------------- | --------------------------------------------------- |
| Local Service 未启动 | 显示连接诊断和启动指引，保留 Draft                  |
| Runtime 未就绪       | 阻止 Preflight，允许刷新 Runtime                    |
| Contract 无效        | 展示具体节点和修复建议                              |
| Matrix 超限          | 禁止提交，引导减少 Screen、Variant、Theme 或 Device |
| `PREFLIGHT_STALE`    | 保留 Draft，自动重新 Preflight，不创建 Job          |
| warning 未接受       | 保留 Matrix，要求确认全部 warning，不创建 Job       |
| Job interrupted      | 显示已提交范围，提供 retry                          |
| Store 写入失败       | 不宣称 Bundle 更新，展示可重试 Issue                |
| Bundle/Case 引用失效 | 禁止 Handoff，要求刷新或重采                        |
| Snapshot/revision 失效 | 禁止 Handoff，不回退到 active Snapshot             |
| partial/stale        | 明确风险，允许用户确认后生成 Handoff                |

错误恢复不能通过修改 Evidence、手工拼 Store 路径或跳过 Contract 校验完成。

## 13. 可访问性与容量反馈

- Selection、Matrix、Job、Issue、Evidence 和 Handoff 全流程可仅用键盘完成；
- Fragment 使用现有 inspect 键盘选择能力；
- Job 状态和错误通过 `aria-live` 通知，但高频进度需要节流；
- Matrix 和 Evidence 列表支持大数据虚拟化，不能一次渲染整个 Prototype 的全部 DOM；
- Screenshot 使用缩略图，原图按需加载；
- 色彩不是 complete、partial、failed、stale 的唯一表达；
- cancel、清理或覆盖用户输入的操作需要明确确认。

## 14. 验收场景

### 14.1 当前 Screen

给定用户正在查看一个已握手 Screen；当用户选择“采集当前页面”并通过 Preflight；则 PBWork 必须展示当前 Screen 的 Matrix，Service 收到规范化 Selection，完成后能从 Bundle 生成 Handoff。

### 14.2 Fragment

给定画布选中具有稳定 `pbId` 的节点；当用户加入采集范围；则 Draft 必须包含对应 `FragmentSelector`。若重复实例缺少 `pbKey`，PBWork 必须阻止提交并定位问题。

### 14.3 多页面

给定用户选择多个 Screen 和 critical Variants；当任一维度变化；则旧 Preflight 立即失效，重新确认的 Matrix 与 Core 展开的 Case 完全一致。

### 14.4 整个 Prototype

给定用户选择整个 Prototype；当 Matrix 超过上限；则 PBWork 不创建 Job，并明确展示缩小范围的方法。

### 14.5 Partial 与重试

给定部分 Case 失败但 Bundle 已提交；当用户查看结果；则 PBWork 分开显示 active successful Evidence 和 latest failed attempt，并能从失败范围创建新 Run。新 Run 成功后生成新 Snapshot，旧 Run、旧 Snapshot 和旧 Evidence revision 仍可查看。

### 14.6 Stale

给定 Component Contract 或 fixture 变化；当 PBWork 对指定 Snapshot 执行 staleness preflight；则只把依赖闭包包含该变化的 Case 标记 stale，并能生成只包含 stale Case 的重采 Selection。

### 14.7 Handoff

给定已提交 Bundle Snapshot；当用户创建 Handoff；则 Handoff 固定 Snapshot、Staleness Report 和 Evidence revision，所有逻辑 refs 可由当前 Workspace MCP 解析，且不含绝对路径、target root 或 Flutter 实现建议。后续重采不改变旧 Handoff。

### 14.8 页面关闭与 Service 重启

给定 Capture 正在运行；当用户关闭并重新打开 PBWork；则 Job 状态可恢复。若 Service 在运行中重启，Job 显示 interrupted，并只通过“生成 retry Selection → Preflight → 创建新 Job”产生新 Run。

### 14.9 Scenario 与 Checkpoint

给定 Screen 声明 critical Scenario 和多个 Checkpoint；当用户使用 critical policy 通过 Preflight；则 Matrix 展示每个 Checkpoint Case。执行中发生 SPA navigation 时 Core 验证目标 Screen / Variant；已到达 Checkpoint 正常提交，失败 Step 后未到达的 Checkpoint 显示 skipped。

### 14.10 Warning 与 Job 绑定

给定 Preflight 返回 warning；当用户未确认或 Draft 发生变化；则 PBWork 不创建 Job。只有 warning IDs 完整接受且 Preflight revision、Selection digest、Matrix digest 均有效时 Service 才创建 Run。

### 14.11 Snapshot 历史稳定

给定一个已生成 Handoff 的 Snapshot；当同一 Case 后续重采并产生新 Snapshot；则旧 Handoff 仍读取旧 Evidence revision，新 Handoff 才读取新 Snapshot。

## 15. 完成定义

PBWork V2 Capture 完成必须同时满足：

1. 四条 Capture 入口共用同一 Selection、Preflight、Job 和 Store Contract；
2. Fragment 不依赖 CSS selector 或临时 handle 建立正式身份；
3. Job 创建前始终展示 Preflight 和 Case Matrix；
4. 结果明确区分 complete、partial、failed、unsupported、cancelled、interrupted 和 stale；
5. Evidence Inspector 默认按需读取，不加载整个 Prototype；
6. retry 和 stale recapture 必须重新 Preflight，提交后创建新 Run且不覆盖历史；
7. Handoff 引用完整、包含 Workspace 和 Coverage，不包含物理路径或目标计划；
8. 浏览器端不直接访问 Playwright、文件系统或 Store；
9. 本文 §14 的全部场景都有组件或 E2E 测试；
10. PBWork 正式产品文档在 V2 切换提交中与本规格同步。
11. `/workbench/capture`、四类进入方式和返回行为通过交互验收。
12. warning acceptance、Preflight revision、Selection digest 和 Matrix digest 与 Service 完全一致。
13. Snapshot Coverage 与 Run Coverage 分开展示，latest attempt 不覆盖 active successful Evidence。
14. Staleness Report 显式绑定 Snapshot；Store-only 状态不伪装为已检查当前 Source。
15. Handoff 固定 Snapshot 和 object revision，后续重采不导致读取漂移。
