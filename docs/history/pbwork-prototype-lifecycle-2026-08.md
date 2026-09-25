# PBWork 原型生命周期管理实施记录

> 状态：Delivered，2026-08-19 完成实施与验收。
>
> 本文记录已经确认的 PBWork 原型生命周期实施基线；现行行为以架构、指南和代码为准。

## 1. 目标与边界

本页的早期基线已被当前实现替代：Prototype lifecycle 由 PBWork Pinia Store 写入 `pbwork.prototype-lifecycle.v2`；Core Store 只保存被引用的 Evidence。Registry 可携带 `lifecycle` 字段作作者标注，但空存储一律初始化为“进行中”。当前行为以 `docs/architecture/pbwork.md`、本指南和代码为准。

本轮目标是把它改成 PBWork 内真实可用的生命周期：

1. 明确“进行中、待确定、已定稿、已归档”各自承担的职责；
2. 所有新原型只能从“进行中”开始，不能插队；
3. “待确定 → 已定稿”自动采集整个原型并生成提示词；
4. “已定稿 → 待确定”清理该次定稿绑定的 Store Evidence，并使旧提示词不再可用；
5. “已归档”是终态，不能回退、修改或删除；
6. PBWork 不向任何生命周期的原型提供删除按钮；
7. 重做原型生命周期管理页，采集页只做小幅调整；
8. 清除 PBWork 中页面、控件、局部范围和整个原型的手工采集入口。

### 1.1 明确不做

- 不修改 Core 的 Evidence、Selection、Preflight、Capture、Handoff 或 Prompt Contract；
- 不重新设计 Capture Pipeline 或 Store 对象模型；
- 不修改 CLI 的采集能力和参数；
- 不让 CLI 读取或遵守 PBWork 生命周期；
- 不在 App 层实现候选方案版本系统；
- 不为 Component、Token 或 Theme 建立独立生命周期；
- 不引入 RBAC、账号、审批人或服务端权限系统；
- 不估算人数、工期或人天。

CLI 仍可以按原有方式采集页面、组件、控件、Fragment 或整个原型。CLI 产生的 Bundle 不改变 PBWork 生命周期，也不自动成为某次“已定稿”的正式产物。

## 2. 生命周期模型

稳定状态只有四个：

```text
进行中 ──────→ 待确定 ──────→ 已定稿 ──────→ 已归档
                  ↑              │
                  └──────────────┘

待确定也可以退回进行中；已归档没有任何出边。
```

`定稿中`、`回退清理中` 和 `操作失败` 是一次流转任务的状态，不是新的生命周期。

### 2.1 进行中（active）

职责：制作和完善一个尚未进入正式确认的原型。

允许：

- 修改页面、导航、交互、文案、Variant、Scenario 和 Registry；
- 在 Workbench 中预览、检查、评论和修复问题；
- 进入“待确定”。

不允许：

- 直接进入“已定稿”或“已归档”；
- 在 PBWork 中手工采集页面、控件或整个原型；
- 生成正式 Agent 提示词。

新 Prototype ID 第一次被 PBWork 发现时必须创建为 `active`。Registry 中的 lifecycle 字段不再具有把新原型初始化到其它阶段的权限。

### 2.2 待确定（review）

职责：供产品、设计和开发确认方向，并把可能并存的候选方案收敛为一个正式方案。

允许：

- 继续修改原型；
- 在同一个原型中通过不同入口展示候选方案 A/B；
- 退回“进行中”继续制作；
- 确认已经收敛后发起“定稿并自动采集”。

不允许：

- 把候选方案 A/B 作为 App 级版本写入生命周期 Store；
- 为候选方案分配正式 v1/v2、Bundle 或发布编号；
- 在该阶段提前生成正式 Evidence 或 Agent 提示词；
- 跳过自动采集直接进入“已定稿”。

候选方案只是原型内容，不是生命周期实体。可以临时提供两个页面入口，但进入定稿前必须：

1. 选定唯一正式方向；
2. 从正式用户路径中移除未选方案；
3. 从正式 Prototype Registry 中移除未选方案的 Screen/Variant/Scenario；
4. 如需保留探索代码，将其移至 `src/drafts`，避免进入整原型采集；
5. 在定稿确认中勾选“正式路径已收敛为唯一方案”。

第一阶段只通过文档、检查单和定稿确认约束收敛，不实现候选方案识别、比较或自动阻断算法。

### 2.3 已定稿（final）

职责：表示正式方案已经唯一确定，且该方案的整个原型 Evidence 与 Agent 提示词已经自动生成成功。

进入条件：

- 当前状态是“待确定”；
- 用户确认正式路径已经收敛；
- 自动整原型采集成功；
- Handoff 和 Agent 提示词生成成功；
- PBWork 已保存该次定稿的固定产物引用。

允许：

- 只读查看原型、定稿 Evidence 和提示词；
- 复制已有提示词；
- 回退到“待确定”；
- 进入“已归档”。

不允许：

- 在“已定稿”状态下继续修改正式原型；
- 手工补采某个页面或控件；
- 重新采集、重新生成或覆盖提示词；
- 直接回到“进行中”；
- 删除原型或单独删除其定稿产物。

如果需要修改，必须先执行“回退到待确定”。PBWork 只有在该次定稿绑定的 Store Evidence 完成清理、产物引用完成解除后，才把生命周期改为“待确定”。之后再次定稿会重新执行一次完整采集并生成新的提示词。

### 2.4 已归档（archived）

职责：保留已经结束维护的最终原型及其定稿产物，作为永久只读记录。

允许：

- 查看原型；
- 查看定稿 Evidence；
- 查看和复制已有提示词。

禁止：

- 回退到任意生命周期；
- 修改、重新采集或重新生成提示词；
- 删除原型；
- 清理或替换其绑定的定稿 Evidence；
- 在 PBWork 中恢复为可维护状态。

本轮不引入 RBAC。不可回退由三层约束共同保证：

1. 生命周期 Store 的 transition guard 不提供 `archived` 出边；
2. PBWork 界面不渲染回退、修改、采集、归档或删除操作；
3. 单元测试和浏览器测试固定该终态行为。

这只是 PBWork 管理边界。CLI 仍可独立产生诊断 Bundle，但不能修改归档状态，也不能替换归档原型在 PBWork 中绑定的正式产物。

### 2.5 对原型作者和 Coding Agent 的约束

PBWork Workbench 不是源码编辑器，因此本轮不能从操作系统层阻止用户或 Agent 直接修改文件。文档、PBWork Skill 和交付检查单必须同步以下规则：

- 修改 `src/prototypes/{prototypeId}` 前先确认该原型的 PBWork 生命周期；
- “进行中”和“待确定”可以修改；
- “已定稿”必须先在 PBWork 回退到“待确定”，完成 Evidence 清理后才能修改；
- “已归档”不得修改；如需重新制作，应创建新的 Prototype ID，并从“进行中”开始；
- 不得通过直接修改 localStorage、Registry 初始值或隐藏 UI 绕过流转。

这属于本轮明确的治理边界，不宣称为 RBAC 或文件系统级强制权限。

## 3. 流转规则

| 来源 | 目标 | 是否允许 | 必须发生的动作 |
| --- | --- | --- | --- |
| 新原型 | 进行中 | 是 | 创建生命周期记录 |
| 进行中 | 待确定 | 是 | 记录流转原因 |
| 待确定 | 进行中 | 是 | 记录退回原因 |
| 待确定 | 已定稿 | 有条件 | 自动整原型采集、创建 Handoff、生成提示词并绑定产物 |
| 已定稿 | 待确定 | 有条件 | 清理绑定 Evidence，解除 Handoff/Prompt/Delivery 引用 |
| 已定稿 | 已归档 | 是 | 固定终态，不改变已有产物 |
| 已归档 | 任意状态 | 否 | 无 |
| 任意状态 | 删除 | 否 | PBWork 不提供删除能力 |

所有未列出的跳转均拒绝。卡片拖拽不能作为状态流转方式；所有流转都通过带后果说明的明确动作完成。

## 4. 自动定稿流程

“定稿并自动采集”是 PBWork 生命周期动作，不是新的 Capture Pipeline：

```text
待确定
  → 自动执行 Preflight
  → 展示唯一方案确认、定稿后果和现有 warning
  → 用户完成现有 Contract 要求的确认
  → 使用现有接口构造“整个原型”的 Selection Draft
  → 使用现有 Capture Job 完成采集
  → 展示并确认现有 Handoff mandatory risk
  → 使用现有 Handoff / Delivery 能力生成提示词
  → 保存固定产物引用
  → 已定稿
```

用户确认的是“是否定稿”和现有 Contract 要求的 warning/risk，不选择采集范围，也不点击“生成提示词”。确认完成后，采集、Handoff 和提示词生成连续自动执行。

### 4.1 自动选择范围

PBWork 固定调用现有的“整个原型”入口：

- 所有正式注册的 Screen；
- 每个 Screen 当前正式注册的 Variant；
- 所有正式 Scenario 和 Checkpoint；
- 现有流程自然携带的 Catalog、Component 和 Token Evidence。

生命周期 Store 不复制 Selection 展开、Case identity、风险或 Capture 算法。

### 4.2 成功与失败

- 全部步骤成功后，才从“待确定”切换为“已定稿”；
- 采集失败、被取消、Handoff 失败或提示词生成失败时，稳定状态仍是“待确定”；
- 失败界面展示原因和“重新执行定稿”动作，不暴露局部补采或提示词重生成动作；
- 重试重新执行完整定稿任务，不能把失败任务的局部结果拼成正式产物；
- 已经进入“已定稿”后，只读取保存的提示词，不再次调用生成接口。

若当前 Delivery 接口仍需要默认 Target Root，PBWork 继续使用现有默认值；warning 和 mandatory risk 继续按现有 Contract 展示和确认。本轮不修改这些 Contract。

## 5. 已定稿回退与 Evidence 清理

“回退到待确定”是一个有副作用的受控动作：

```text
已定稿
  → 用户确认“定稿证据和提示词将失效”
  → 将本次定稿绑定的全部 Bundle 移入现有 Store trash
  → 清除 PBWork 保存的 Snapshot/Handoff/Delivery/Prompt 引用
  → 待确定
```

本轮所说的“清除 Store Evidence”采用现有 Store 能力，语义为：

- 整个定稿 Bundle 从 PBWork 正常 Evidence Inventory 中移除；
- PBWork 不再展示或消费其中的 Snapshot、Handoff 和提示词；
- 生命周期记录不再持有这些产物引用；
- 不原地改写 Store 的不可变历史文件。

这是在“不修改 Evidence/Store Contract”的前提下能够成立的清理边界。若要求物理删除已经被 Handoff 引用的 Store 对象或删除 `.proto-bridge/deliveries/` 文件，则必须扩展到 Core/Local Service，不属于本轮方案。

清理必须先成功，生命周期才切换为“待确定”。清理失败时：

- 保持“已定稿”；
- 禁止编辑；
- 展示失败对象和重试清理动作；
- 不允许绕过清理直接改状态。

## 6. PBWork 生命周期 Store

### 6.1 定位

重新设计 `prototypeLifecycle` Pinia Store，使其成为 PBWork 生命周期和定稿产物关联的本地事实源；写入版本化 localStorage，不进入 Core Store 或 Local Service protocol。

Registry 继续描述原型、页面和 Runtime Contract；不再作为运行时生命周期事实源。

### 6.2 建议状态

```ts
type LifecycleStage = "active" | "review" | "final" | "archived";
type LifecycleOperation =
  | { kind: "idle" }
  | {
      kind: "finalizing";
      phase:
        | "preflighting"
        | "awaiting-confirmation"
        | "capturing"
        | "awaiting-risks"
        | "building-prompt";
      jobId?: string;
      startedAt: string;
    }
  | { kind: "rolling-back"; bundleIds: string[]; startedAt: string }
  | { kind: "failed"; action: "finalize" | "rollback"; message: string };

type FinalizedArtifacts = {
  bundleIds: string[];
  snapshotId: string;
  handoffId: string;
  deliveryId: string;
  agentPromptPath: string;
  receiptPath: string;
  finalizedAt: string;
};

type PrototypeLifecycleRecord = {
  prototypeId: string;
  stage: LifecycleStage;
  operation: LifecycleOperation;
  artifacts: FinalizedArtifacts | null;
  createdAt: string;
  updatedAt: string;
};
```

具体字段可在实施时按现有 API 返回值缩减，但必须满足：

- 能判断一个原型当前阶段；
- 能恢复进行中的定稿或回退任务；
- 能精确找到该次定稿绑定的全部 Evidence；
- 能只读打开唯一已有提示词；
- 能在回退时完整解除关联；
- 能区分稳定生命周期和临时任务状态。

### 6.3 初始化与迁移

- 新 localStorage schema 使用新版本 key；
- 已存在的原型可以一次性读取旧有效状态进行迁移；
- 旧 `final` 若没有完整产物引用，不得迁移成可信“已定稿”，应降为“待确定”；
- 旧 `archived` 若没有可验证的定稿产物，保留只读归档展示并标记“旧记录无绑定产物”，不得自动开放回退；
- migration 完成后不再读取 Registry lifecycle 作为 override；
- 此后发现任何新的 Prototype ID，一律初始化为“进行中”。

### 6.4 恢复与一致性

- Store 写入单个版本化 JSON 文档，解析失败时展示恢复错误，不静默覆盖；
- `finalizing` 在刷新后根据保存的 Job ID 恢复进度；
- `rolling-back` 在刷新后重新执行幂等清理；
- `final` 记录引用的 Bundle 在 Inventory 中缺失时，显示“定稿产物缺失”，不自动伪造成功或静默降级；
- 只有生命周期 Store 中保存的 `FinalizedArtifacts` 才能出现在 PBWork 的“定稿采集”页；
- CLI 或其它入口创建的 Bundle 不会自动挂到生命周期记录上。

## 7. 原型生命周期管理页重新设计

目标页面：`/workbench/prototypes/all`

这次需要重新设计。页面的唯一工作是回答：每个原型处于哪个阶段、下一步能做什么、定稿产物是否完整。

### 7.1 信息架构

```text
┌ 原型生命周期 ──────────────────────────────────────────────┐
│ 进行中 ───── 待确定 ───── 已定稿 ───── 已归档             │
│  2            1             3            4                 │
└────────────────────────────────────────────────────────────┘

阶段职责说明 / 当前筛选

┌ 原型名称 ───── 当前阶段 ─── 定稿产物 ─── 最近变化 ─── 下一动作 ┐
│ 冷链处置台      待确定        尚未生成       今天        定稿并采集 │
│ 恒动            已定稿        Evidence + 提示词 昨天        查看产物   │
└──────────────────────────────────────────────────────────────┘
```

设计方向遵循现有 Workbench 深色、紧凑、工具型视觉语言，采用“生命周期轨道 + 资产台账”，不再使用与生命周期无关的装饰性卡片预览。

页面的记忆点是顶部四段生命周期轨道：它既展示顺序和数量，也是筛选器；归档段在视觉上明确封口，表达终态。布局、排版、颜色继续消费 Workbench UI 和现有主题变量，不新造 Prototype DS 组件。

### 7.2 原型行内容

每个原型只展示决策所需信息：

- 名称与 Prototype ID；
- 当前阶段；
- 页面数和待处理评论数；
- 定稿产物状态：未生成、生成中、完整、清理失败或旧记录缺失；
- 最近一次生命周期变化；
- 当前唯一主动作及必要的次动作。

不再展示：

- “采集整个原型”按钮；
- “恢复注册状态”；
- 任意删除按钮；
- 与真实原型无关的占位页面缩略图。

### 7.3 阶段动作

| 阶段 | 主动作 | 次动作 |
| --- | --- | --- |
| 进行中 | 送交待确定 | 打开原型 |
| 待确定 | 定稿并自动采集 | 退回进行中、打开原型 |
| 已定稿 | 查看 Evidence 与提示词 | 回退待确定、归档 |
| 已归档 | 查看归档产物 | 无生命周期动作 |

流转 Dialog 不再展示一个通用目标状态单选列表，而是针对具体动作说明：

- 当前阶段和目标阶段；
- 本次动作会发生什么；
- 是否自动采集；
- 是否会清理 Evidence；
- 是否不可逆；
- 必要的确认项与可选备注。

定稿执行期间在原型行和任务中心展示同一个进度，不弹出原有可选范围的 Deliver FlowSheet。

## 8. 采集页微调

目标页面：`/workbench/capture`

采集页保留现有列表结构和结果查看能力，只调整定位：

- 页面标题由“采集历史”改为“定稿采集”；
- 描述改为“这里展示已定稿或已归档原型自动生成的完整 Evidence 与提示词”；
- 数据源只展示生命周期 Store 已绑定的定稿产物；
- 每一项明确展示原型生命周期、定稿时间和产物完整性；
- 主操作只有“查看结果/提示词”；
- 移除“清空所有原型证据”“清理此项”“重试局部任务”等人工管理按钮；
- 空态引导用户前往“原型生命周期”页完成待确定与定稿，不再引导去画布采一页或采控件；
- 运行中的定稿任务仍由全局任务中心展示，不把失败任务伪装成已定稿记录。

Evidence 详情页保持现有查看结构，但移除“重新采集”和“重新生成提示词”。已存在提示词时直接展示、复制或打开文件；没有提示词时只显示定稿产物异常，不提供生成按钮。

## 9. PBWork 手工采集入口清理

需要从 PBWork UI 中移除：

- 原型列表的“采集整个原型”；
- 原型概览或画布的“采集当前页面”；
- Inspector 的“采集选中控件/Fragment”；
- Evidence Viewer 的“重新采集”；
- Delivery Panel 的“生成提示词/重新生成提示词”；
- 任何可以进入范围选择 FlowSheet 的公开入口；
- Capture Console 的 Evidence 清空、回收站和永久删除入口。

可以保留在内部实现中供生命周期自动定稿复用的能力，不需要为了隐藏按钮删除 Core、Local Service 或 CLI API。

## 10. Component、Token 与 Theme

本轮不为它们增加生命周期或专门 Store 设计。

整原型自动采集继续使用现有 Runtime Manifest、Catalog 和 Evidence 行为；现有链路能采集的 Component/Token/Theme 信息会自然进入定稿 Evidence。生命周期层只保存最终产物引用，不计算新的 Design System 指纹，也不改变旧 Evidence 的 Staleness 规则。

## 11. 实施顺序

用户确认本文后，按以下依赖顺序实施：

1. 重写 `prototypeLifecycle` Store、迁移逻辑和 transition guard；
2. 增加“定稿中/回退清理中”的可恢复任务编排；
3. 用现有 Capture Store/Service 完成整原型采集、Handoff 和 Prompt 自动生成；
4. 重新设计 `/workbench/prototypes/all` 生命周期管理页；
5. 清理 Gallery、Canvas、Inspector、Evidence Viewer 和 Delivery Panel 的手工入口；
6. 微调 `/workbench/capture` 为只读的“定稿采集”页；
7. 更新 PBWork 当前行为文档、Workbench Skill reference 和测试；
8. 完成 PBWork 与文档验证。

## 12. 验证计划

### 12.1 Store 单元测试

- 新 Prototype ID 始终初始化为 `active`；
- 只允许文档定义的 transition matrix；
- `archived` 没有出边；
- 定稿成功前不会写入 `final`；
- 定稿失败保持 `review`；
- `final → review` 只有清理成功后才提交；
- 清理失败保持 `final`；
- finalized artifact refs 可以在刷新后恢复；
- CLI/未绑定 Bundle 不进入定稿记录；
- v1 localStorage 迁移不会制造无产物的可信 `final`。

### 12.2 页面与交互测试

- 生命周期轨道筛选、键盘焦点和深浅主题；
- 每个阶段只出现允许的动作；
- PBWork 不出现原型删除按钮；
- 定稿确认要求“唯一方案已收敛”；
- 自动定稿期间不出现范围选择；
- 已定稿提示词只能读取，不能生成或重新生成；
- 回退会清理绑定 Bundle 并解除产物引用；
- 已归档不能回退、采集或删除；
- Capture Console 只展示已绑定的定稿/归档产物。

### 12.3 回归验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm docs:verify
```

交互实施后补跑相关 Workbench Playwright 测试，重点检查滚动、空态、错误恢复、键盘使用和两套主题。CLI 不改代码，但保留其现有测试结果作为“不受生命周期影响”的边界证明。

## 13. 退出标准

满足以下条件才算本轮完成：

1. 四阶段职责、允许动作和禁止动作在文档、Store 与 UI 中一致；
2. 新原型不能从非“进行中”阶段开始；
3. “待确定 → 已定稿”只通过自动整原型采集完成；
4. 已定稿只展示唯一已有提示词，没有重生成入口；
5. “已定稿 → 待确定”先完成绑定 Evidence 清理；
6. 已归档在 PBWork 中永久只读且不可删除；
7. PBWork 中不再存在页面、控件、Fragment 或原型的手工采集入口；
8. Capture Console 只承担定稿产物查看；
9. CLI 的页面、组件、控件和原型采集能力保持原样；
10. PBWork、Workbench 浏览器测试和文档校验通过。

## 14. 已确认实施基线

本文已经以下列规则进入实施：

- 四个稳定状态为“进行中 → 待确定 → 已定稿 → 已归档”；
- 待确定允许原型内部存在候选方案 A/B，但定稿前必须通过文档和确认项收敛；
- 定稿动作自动执行现有整原型 Capture、Handoff 和 Prompt；
- 已定稿可以回退到待确定，前提是先把绑定 Bundle 移入 Store trash 并解除全部正式产物引用；
- 已归档是 PBWork 永久终态；
- 生命周期事实和正式产物关联由新的 PBWork lifecycle Store 管理；
- 原型页重做为生命周期控制台，采集页只做只读定位调整；
- Core、Local Service Contract、Capture Pipeline 和 CLI 均不修改。

## 15. 实施结果

- 已在实施前通过 Workspace Reset 清空旧 Evidence 与旧 Delivery/提示词；随后产生的对象均来自新生命周期流转。
- `prototypeLifecycle` Store 已成为 PBWork 生命周期和定稿产物关联的事实源，新原型固定从“进行中”开始。
- 生命周期控制台、自动整原型定稿、回退清理、归档终态和只读“定稿采集”页已经落地。
- 页面、控件、Fragment、单页和整原型的 PBWork 手工采集入口，以及提示词生成/重生成入口已经移除；CLI 未改动。
- 冷链异常处置台已通过实际 PBWork 流程完成 26/26 Case、Handoff 和唯一提示词并进入“已定稿”。
- 恒动按约定只尝试一次；Preflight 因“需要 101 项，当前上限 100”被阻断，当前保持“待确定”并显示真实原因，未重试或修改原型。
- 生命周期页和定稿采集页已按 `frontend-design` 完成真实浏览器截图检查；完整 `pnpm verify` 通过。
