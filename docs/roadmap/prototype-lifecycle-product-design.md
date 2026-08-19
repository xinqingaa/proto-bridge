# PBWork 原型生命周期产品设计

状态：Proposed（待用户确认）

日期：2026-08-19

本文定义计划中的 PBWork 原型生命周期产品语义，不代表当前实现。对应 Store、指纹和事务设计见[原型生命周期架构设计](./prototype-lifecycle-architecture.md)。

## 设计结论

PBWork 保留四个稳定生命周期：

```text
进行中 -> 确认中 -> 已定稿 -> 已归档
 active     review      final      archived
```

四个阶段只管理一个稳定 `prototypeId` 的长期 lineage。`v1`、`v2` 只属于“已定稿”的不可变 Release，不属于 Screen、Variant、Case、Component 或 Token identity。

进入“确认中”是唯一正式证据生产时机：系统自动采集整个 Prototype、固定 Handoff、生成唯一 Agent Prompt，并把这些对象组成一个不可变 Review Package。用户不再选择页面或控件，也不再点击“生成提示词”。

## 产品目标

- 用生命周期表达原型从可编辑草稿到不可变发布物的过程；
- 自动生产完整 Prototype Evidence 和唯一提示词；
- 让每个 Release、Evidence、Handoff 和 Prompt 都能被固定引用和复现；
- 明确什么时候可以编辑、什么时候必须冻结、什么时候永久封存；
- 允许多个 Release 历史比较，但任何历史版本都不可原地修改；
- 让 Component 和 Token 进入 Release 依赖，而不创建另一套组件生命周期；
- 不引入用户、角色、审批人或完整 RBAC。

## 非目标

- 不把“确认中”做成多人审批系统；
- 不让 PBWork 自动修改、提交或合并 Git；
- 不允许用户为正式生命周期选择局部 Screen/Fragment Capture；
- 不为每个 Component、Token 或 Theme 分配 `v1/v2`；
- 不把旧 Release 更新成当前源码；
- 不从 active/latest 推断 Agent 应消费哪一份 Evidence；
- 不把 Target 工程状态写回 Prototype Release。

## 四个生命周期的职责

| 阶段 | 核心职责 | 原型源码 | Evidence / Prompt | 允许操作 |
| --- | --- | --- | --- | --- |
| 进行中 `active` | 制作和修改下一版 Working Draft | 可修改 | 不生成新的正式 Prompt；历史 Release 只读 | 进入确认、查看历史版本 |
| 确认中 `review` | 审查一份已经自动固定的完整 Review Package | 冻结；不得继续修改 | Evidence、Handoff、Prompt 已存在且不可变 | 查看结果、确认定稿、退回继续修改 |
| 已定稿 `final` | 表示当前 lineage 已有一个不可变 Release vN | 不得直接修改 | Release、Evidence、Handoff、Prompt 永久固定 | 查看/比较版本、创建下一版、归档 |
| 已归档 `archived` | 永久封存整个 Prototype lineage | 完全禁止修改 | 全部历史只读 | 只读查看和比较 |

`preparing-review`、`capturing`、`building-prompt`、`finalizing`、`failed` 和 `stale` 都是任务或有效性状态，不是第五、第六个生命周期。

## 进行中（active）

“进行中”只承担 Working Draft 的制作责任。

- Prototype 页面、Variant、Scenario、Fixture、局部业务 UI 可以修改；
- PBWork Design System 可以被当前草稿消费；
- 当前草稿可以基于一个历史 Release，例如“基于 v1 制作下一版”；
- 历史 Release、Evidence 和 Prompt 继续只读，不随草稿变化；
- 不存在“采当前页”“采控件”“更新采集”或“生成提示词”操作；
- 唯一主操作是“进入确认”。

如果 Prototype 尚无 Release，首次成功定稿会产生 v1。若已有 v1，进行中表示正在制作未来的下一版，但在定稿前不称为 v2。

## 确认中（review）

“确认中”承担一次版本收敛责任，而不是继续创作。

用户从“进行中”选择“进入确认”后，系统自动：

1. 固定当前 Producer Input Fingerprint；
2. 展开整个 Prototype 的固定 Capture Profile；
3. 运行 Preflight 和全原型 Capture；
4. 提交 Run、Snapshot、Catalog、Coverage、Issue 和 Staleness Report；
5. 创建固定 Handoff；
6. 生成唯一 Agent Prompt；
7. 创建不可变 Review Package；
8. 全部成功后才把稳定生命周期推进到“确认中”。

因此“确认中”开始时，证据和提示词必须已经存在。它不是等待用户再点击一次采集或生成。

确认中禁止修改 Prototype 或其版本依赖。若源码、Registry、Runtime、Component Contract、Token、Theme、Capture Profile 或工具链输入发生变化：

- Review Package 本身不修改；
- Package、Evidence 和 Prompt 相对当前源码标记为 `stale`；
- “确认定稿”被阻止；
- 用户必须选择“退回继续修改”，回到进行中，再重新进入确认；
- 不提供“重新采集”按钮。

自动任务失败时，稳定生命周期仍为“进行中”。界面展示“进入确认失败”和诊断；修复后再次执行的是生命周期动作“进入确认”，不是手工 Capture。

## 已定稿（final）

“已定稿”表示 Review Package 已被原子晋级为一个不可变 Release。

`review -> final` 必须同时满足：

- Review Package 对当前 Producer Input 仍为 fresh；
- whole-Prototype Coverage 和 required completeness 通过；
- Block 为零；
- Warning 和 mandatory risk 已逐项处理并形成 Finalization Decision Receipt；
- source tree 已对应一个 clean、可解析的 Git revision；
- 该 revision 的 tree digest 与 Review Package 完全匹配；
- Handoff 和唯一 Prompt 已存在；
- Store 能原子分配下一个 release number。

成功后首次产生 v1，下一次产生 v2。失败不产生 Release，也不消耗版本号。

已定稿阶段不允许直接修改原型。需要继续工作时必须选择“创建下一版”：

- vN 保持完全不变；
- 生命周期回到进行中；
- 新 Working Draft 记录 `baseReleaseId = vN`；
- 后续只有再次通过确认和定稿才产生 vN+1。

如果新 Review Package 与最新 Release 的内容指纹完全相同，Finalization 返回已有 Release，不创建无变化的 vN+1。

## 已归档（archived）

“已归档”封存的是整个 Prototype lineage，不是单独一张截图或某个 Bundle 列表项。

归档只允许从“已定稿”进入，并要求：

- 没有 Working Draft；
- 没有 Review Package 等待处理；
- 没有运行中的生命周期或 Capture 任务；
- latest Release、source revision 和 archive fingerprint 已固定。

归档后：

- 不允许创建下一版；
- 不允许进入确认、Capture、创建 Handoff、生成 Prompt 或新 Release；
- 不允许修改 Prototype 自有源码和 Registry slice；
- 不提供恢复、退回或解除归档；
- Release、Evidence、Prompt 和版本比较永久只读。

该限制不依赖 RBAC。文档定义禁止行为，Core/Store 拒绝 archived lineage 的生产操作，仓库验证检查归档 Prototype 自有源码是否偏离 Archive Receipt。若未来确实需要继续，只能显式 fork 为新的 `prototypeId` 和新的 lineage，不能修改原归档对象。

共享 Component/Token 后续可以继续演进；Archived Release 固定的是其当时的 Design System Fingerprint 和 Git revision。当前分支的新 DS 不能改写归档 Release。

## v1、v2 与版本比较

### 版本号产生时机

- Working Draft 没有版本号；
- Review Package 只有 `reviewPackageId`，不提前占用“vNext”；
- 只有 `review -> final` 原子成功才分配 vN；
- Finalization 失败或取消不消耗版本号；
- 版本号在同一 Prototype lineage 内单调递增，不允许重排或复用。

### 比较何时可用

| 当前条件 | 可比较内容 | 性质 |
| --- | --- | --- |
| 已有 v1，当前在进行中 | Working Draft vs v1 | 实时诊断，不是版本对比 |
| 已有 v1，当前在确认中 | Review Package vs v1 | 两端固定，可用于定稿审查 |
| 已有 v1、v2 | v1 vs v2 | 永久可复现的 Release 对比 |
| 已归档且有多个 Release | 任意 vM vs vN | 永久只读 |

正式的“v1/v2 对比”只在两边都已经是 Release 时成立。进行中的草稿不能冒充 v2。

### 多版本收敛点

每个新版本必须在“确认中”收敛，并在“确认中 -> 已定稿”时一次性通过：

- 全部正式 Screen；
- 全部 authored Variant；
- 全部 authored Scenario/Checkpoint；
- 固定 Theme、Device 和 Fixture profile；
- 完整 Component/Token Catalog；
- 完整 Coverage、风险和 Prompt。

不允许把几个局部 Capture 或不同时间的 Prompt 拼成一个 Release。一个 Release 只绑定一个 Review Package、一个 Snapshot、一个 Handoff 和一个 Prompt。

## Evidence 与 Prompt 的生成规则

### 唯一时机

Evidence、Handoff 和 Prompt 都在“进入确认”的同一自动任务中生成。用户只确认生命周期流转，不确认采集范围，也不执行第二次“生成”。

### 唯一 Prompt

- 一个 Review Package 恰好对应一个 Prompt Artifact；
- Prompt 创建后不可覆盖、不可编辑、不可重新生成；
- UI 如果发现 Prompt 已存在，直接读取并展示相同字节；
- “复制”和“导出”只复制同一 Artifact，不创建新版本；
- Prompt 模板升级不重写历史 Artifact；新模板只作用于未来 Review Package；
- 自动任务在 Prompt 写入前失败时可以幂等续跑“补齐缺失产物”，但已存在的 Prompt 只能返回，不能重建。

### Prompt 与目标工程

Store 内 Prompt 必须是 target-neutral：

- 固定 Workspace、Bundle、Snapshot、Handoff 和 mandatory risks；
- 指示 Agent 使用接收提示词时所在的当前目标工作区；
- 不保存 `targetRoot`、临时实现意图或目标工程可变状态；
- 目标工程选择属于使用提示词时的 Agent 上下文，不触发新 Prompt。

这样同一 Release 无论交给哪个目标仓库，都只存在一份权威 Prompt。

### Warning 与 risk

- Block 阻止自动 Capture；
- Warning 不阻止事实采集，但必须固定到 Review Package 和 Prompt；
- mandatory risk 不阻止 Prompt 生成，Prompt 必须原样展示；
- Warning/risk 的确认记录在独立 Finalization Decision Receipt 中；
- 确认不会修改 Evidence、Handoff 或 Prompt，只决定该 Review Package 是否允许晋级 Release。

## 指纹、变化与过期

Review Package 绑定一个 Producer Input Fingerprint，至少覆盖：

- Prototype 自有源码；
- Prototype Registry slice；
- Runtime manifest/input version 和 build；
- Capture Profile 与显式 Case Matrix；
- Fixture；
- Component Contract、Registry、Token、Theme、Bind Pool 和语义词表；
- Capture Protocol 与工具链版本。

任一输入变化都不会修改旧 Evidence 或 Prompt，而是产生新的 Staleness Report。

“过期”具有精确含义：

- Review Package/Prompt 相对当前源码可以是 `fresh` 或 `stale`；
- stale Prompt 保留历史可读，但不能作为当前实现的默认入口，也不能 Finalize；
- 已定稿 Release 对其固定 source revision 永远有效；
- 旧 Release 相对当前 Working Draft 只会变成历史基线或 superseded，不会被删除、重写或偷偷指向新 Snapshot。

## Component 与 Token 是否进入生命周期

结论：进入 Prototype Release 依赖，但不拥有独立的四阶段生命周期。

每个 Review Package 和 Release 必须固定：

- Component Contract Catalog；
- Component Registry；
- Token Catalog；
- Theme values；
- Bind Pool；
- semantic role/binding vocabulary；
- captured 节点实际使用的 `componentId` 和 Token bindings；
- Design System Fingerprint。

Component/Token 变化会使当前 Review Package stale，必须回到进行中后重新确认。历史 Release 继续引用旧 Catalog 和旧 Design System Fingerprint。

不创建“Component v1”“Token v2”或 Component lifecycle。未来若需要独立发布 PBWork Design System，应设计单独的 `DesignSystemRelease`，Prototype Release 只引用它；这不是当前主线。

## PBWork 界面行为

### 全局删除

删除以下人工入口及其范围编辑：

- 采集整个原型；
- 采集当前页面；
- 加入采集范围/采集控件；
- 更新采集/重新采集；
- 开始交付；
- 生成交接与提示词；
- 新建交付版本；
- 覆盖已有 Prompt。

### 按阶段展示

| 阶段 | 主操作 | Prompt 展示 |
| --- | --- | --- |
| 进行中 | 进入确认 | 只显示历史 Release Prompt，并标注版本/适用性 |
| 确认中 | 确认定稿、退回继续修改 | 直接展示当前 Review Package 的唯一 Prompt |
| 已定稿 | 创建下一版、归档 | 直接展示 latest Release Prompt；可切换历史版本 |
| 已归档 | 无写操作 | 只读展示任意历史 Release Prompt |

Task Center 只展示自动生命周期任务、进度、失败和幂等重试。Evidence Viewer 只读。Inspector 继续检查 identity、role、Component 和 Token Evidence，但不能发起 Capture。

## 需要确认的最终方案

本设计请求一次性确认以下结论：

1. 四个稳定阶段采用“进行中 / 确认中 / 已定稿 / 已归档”；
2. 进入确认时自动完成全原型 Capture、Handoff 和唯一 Prompt；
3. vN 只在确认中成功晋级已定稿时产生；
4. 已定稿不允许直接修改，继续工作必须“创建下一版”；
5. 已归档永久只读且不支持恢复，同一 lineage 不再生产任何对象；
6. Prompt target-neutral、Store 内唯一、不可覆盖或重新生成；
7. 旧 Evidence/Prompt 保留历史，但相对当前源码可以 stale；
8. Component/Token 固定进每个 Review Package/Release，但不创建独立生命周期。

以上方案确认后再进入 Contract、Store、Service 和 PBWork 实现。
