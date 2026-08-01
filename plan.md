# ProtoBridge 收敛版本实施计划

## 1. 目标

把当前 Evidence-first 架构收敛为一条可由产品、设计和开发人员通过 Cursor、Codex 等 Coding Agent 重复执行的黄金路径：

```text
PBWork Foundation / Component / Prototype code
  → authoring lint + Registry validation
  → deterministic Runtime
  → PBWork GUI or CLI Selection
  → Core Preflight / Capture / Store
  → fixed Catalog + Snapshot + Handoff
  → MCP fixed read
  → Agent implementation
  → Target-native validation
```

收敛版本不建设可视化原型编辑器、面向作者的聊天窗口、云端多人审批或多 Kit。所有作者角色使用同一套仓库 Skill、文档、Contract、代码评审和 CI。

## 2. 完成定义

满足以下全部条件才算收敛完成：

- 新 strict Screen 无 legacy exception；
- DS 业务实例不以 `ds.*` 作为 required Fragment identity；
- 业务局部证据节点不再只靠 CSS Token；
- id、role、key、component 和 Token binding 职责可由 Schema/校验确定；
- required Fragment 的唯一性、role、可见性、bbox 和必要 Token Evidence 都由真实 Runtime 阻断；
- Component Contract 固定 semantic role policy；
- Token binding 保留真实 provenance，并能由固定 Catalog 解析；
- Capture 正式生成并固定交付所需 Catalog revision；
- PBWork 与 CLI 对同一 Draft 产生相同 Case、门禁和 Evidence；
- Handoff/MCP 不回退 active/latest，Agent 能读取 Screenshot、Fragment、Component 和 Token Evidence；
- Phase 1–5 的协议、门禁、Catalog 固定读取和 Target-neutral Agent 指引完成闭环；
- `pnpm verify` 和 `pnpm docs:verify` 全绿。

## 3. 权威文档

| 主题 | 唯一权威 |
| --- | --- |
| 产品职责与闭环 | `docs/product/overview.md`、`docs/product/workflow.md` |
| Identity、role、component、Token Evidence、严重性 | `docs/reference/semantic-authoring.md` |
| 原型 Authoring Contract | `docs/reference/prototype-authoring.md` |
| Evidence 对象与引用 | `docs/architecture/evidence-model.md` |
| Capture 执行 | `docs/architecture/capture-pipeline.md` |
| PBWork Token/组件/组合 | `apps/pbwork/docs/` |
| Agent 任务路由 | `AGENT.md`、`skills/*/SKILL.md` |
| 架构理由 | `docs/decisions/0001` 至 `0006` |
| 未实施差距与顺序 | 本文件 |

其它入口只做摘要和链接，不复制 role 枚举、Token slot、风险词表或完整门禁算法。

## 4. 当前差距

### G1：required completeness 弱于文档

当前 Runtime readiness 主要检查 Fragment 存在，Core semantic coverage 主要比较 identity。`visible=false`、零 bbox 和部分非法组合尚未统一阻断。

目标：required Fragment 必须满足 exact-one、valid non-unknown role、visible、bbox 非零和所需 Evidence；否则 Case 失败且不能激活 revision。

### G2：属性成对和业务 identity 未前置检查

当前 semantic snapshot 只扫描 `[data-pb-role][data-pb-id]`。只写其中一个的节点可能被静默忽略；DS 默认 `ds.*` 可以进入业务 Runtime。

目标：authoring lint 和 Runtime 都拒绝属性不成对；strict required Fragment 拒绝 `ds.*`；DS 业务实例必须传业务 `inspectId`。

### G3：CSS-only 自定义节点会丢失独立 Evidence

当前业务局部文字即使使用 `var(--pb-typography-*)`，没有 id、role 和 `data-pb-token-*` 时只会成为父节点聚合文本或完全不进入语义树。

目标：确定属于独立实现/验收范围时 Block；只能启发式识别的疑似遗漏 Warning。不能让启发式结果冒充 authored completeness。

### G4：Component semantic role 不在 Contract

当前 role 写在 Vue 模板，Contract 无法发现 Card、FormSection、Divider 等语义策略漂移。

目标：Contract 增加 semantic policy：

```text
policy: fixed | contextual | decorative
defaultRole?: SemanticRole
allowedRoles?: SemanticRole[]
```

固定组件拒绝页面改写；上下文组件只允许白名单；装饰组件默认不进入语义树。

### G5：Token binding 校验和 provenance 不完整

当前 Component Contract binding 会校验 bind pool，但运行时 registration 和 `data-pb-token-*` 没有统一解析；自定义 dataset binding 可能被标为 Registry 来源。

目标：Runtime 返回结构化 binding source，Core Fact 保留真实 provenance；所有 Token ID 由固定 Catalog 解析。

### G6：Catalog Schema 存在，正式生产链路未闭合

当前 Store/MCP 支持 Catalog revision，但正式 Capture 尚未稳定生成 Prototype、Screen、Component 和 Token Catalog。

目标：Preflight 固定 catalog input digest，Capture/commit 写入 Catalog revision，Snapshot/Handoff 固定所需 Catalog ref。

### G7：主消费指引仍与 Flutter 绑定

Evidence 已框架无关，Flutter 已是隔离的可选 legacy Target adapter；但 MCP Consumer Guide 和 Agent prompt 仍把 Flutter 工具及命令写成主路径的必选步骤。

目标：本阶段只把主消费纪律改为 Target-neutral：存在适用 adapter 时才读取约定/样例并执行目标原生验证。不新增语言、不扩 `TargetPlatform`，也不删除或重构现有 Flutter adapter。

## 5. 实施阶段

### Phase 0：文档基线

状态：本轮完成。

- 接受 ADR 0006；
- 建立 `docs/reference/semantic-authoring.md`；
- 同步 Authoring Contract、产品闭环、PBWork 手册、Skill、检查单和组件页；
- 明确 Block/Warning/Info；
- 修复已知 CLI README、FlowSheet Contract 文档漂移；
- 保留 history 与 acceptance 记录，不把它们当当前规范；
- 不处理旧业务原型代码或删除工作。

验收：`pnpm docs:verify` 不再因正式文档漂移失败；若扫描本地生成物失败，应先让校验忽略被禁止提交的 `output/`，而不是修改历史产物冒充当前规范。

### Phase 1：统一 authoring diagnostics

状态：本轮完成。

主要落点：

- `packages/core/src/v2/contracts`：严重性、稳定 diagnostics code 和共享数据结构；
- `apps/pbwork/src/prototypes` / 新 lint 模块：Vue/Registry authoring checks；
- `apps/pbwork/src/workbench/inspector`：展示同一 diagnostics；
- `packages/core/src/v2/capture`：Preflight 接受 Block/Warning 结果。

必须实现的确定性 Block：

- `data-pb-id` 与 `data-pb-role` 不成对；
- 非法 ID/role/Token attribute；
- required Fragment 使用 `ds.*` 或 `unknown`；
- 重复模板缺 key；
- Registry required/action/scenario 引用非法。

必须实现的 Warning：

- 带 PB typography/color/background CSS 的文本或色面疑似缺少语义标记；
- 非 required 语义节点缺少常见 Token binding；
- 业务局部 UI 疑似复制 DS 组件。

Warning 检查允许不完美，但必须输出稳定 code、位置、理由和 next action。不得自动把 warning 节点加入 required boundary。

测试：lint unit、Registry tests、Inspector diagnostics tests、PBWork/CLI Preflight parity。

### Phase 2：Runtime/Core completeness

状态：本轮完成。

主要落点：

- `apps/pbwork/src/runtime/capture-protocol.ts`；
- `packages/core/src/v2/runtime-contract/protocol.ts`；
- `packages/core/src/v2/capture/playwright-driver.ts`；
- Runtime/Core capture tests。

实现顺序：

1. readiness 只解析 semantic marker 集合，不再用任意 `[data-pb-id]` 满足 required；
2. required identity 必须 exact-one；
3. required node role 必须合法且非 `unknown`；
4. required node visible=true 且 bbox 宽高非零；
5. Overlay occlusion 能确定时 Block，不能确定时 Warning；
6. completeness Fact 明确记录每个 required Fragment 的检查结果；
7. 任一 Block 阻止 captured/active revision。

测试至少覆盖 hidden、zero-size、duplicate、id-only、role-only、unknown、`ds.*`、重复 key、Overlay 和正常结果。

### Phase 3：Component semantic Contract

状态：本轮完成。

主要落点：

- `apps/pbwork/src/design-system/schemas/component.schema.json`；
- `apps/pbwork/src/design-system/types.ts`；
- 所有 component contracts；
- `validateRegistries.ts`；
- Vue root marker 与 inspect registration；
- component docs/tests。

迁移步骤：

1. 为每个组件分类 fixed/contextual/decorative；
2. 固定 Button/List/Search/Overlay 等明确职责；
3. 为 Card/FormSection 等上下文组件定义 allowed roles；
4. Divider 等装饰组件默认退出 semantic tree；
5. 校验 Vue/registration/Contract 一致；
6. 业务实例 role override 只能使用 Contract 公开 prop 和 allowed roles。

完成前不扩 role 词表；先处理已有词的含义和使用一致性。

### Phase 4：Token Evidence 与 provenance

状态：本轮完成。

主要落点：

- Runtime semantic node Schema；
- Inspect registration；
- dataset token reader；
- Core Fact/provenance；
- Token/Catalog resolver。

目标结构至少能表达：

```text
slot
tokenId
source: component-contract | runtime-registration | data-pb
```

规则：

- DS Contract binding 继续限制在 bind pool；
- 业务局部 binding 可以使用 Foundation 中允许的 Token，但必须由 Catalog 解析；
- slot 使用受控稳定 ID；
- dataset 不覆盖组件 Contract 的固定 binding；发生冲突时保留 conflict，不静默覆盖；
- Fact provenance 与真实来源一致。

测试覆盖未知 Token、非法 slot、来源冲突、Theme 切换不改 binding、CSS-only 无 Fact 和显式 dataset 有 Fact。

### Phase 5：Catalog 生产闭环

状态：本轮完成。

主要落点：Core catalog builder、PBWork Runtime manifest/catalog input、Capture commit、Snapshot/Handoff、MCP read model。

至少生成：

- Prototype identity 与 Foundation identity；
- Screen/Variant/Action/Scenario；
- Component Contract 与 semantic policy；
- Token definitions、Theme overrides 和 bindability；
- 每个 entry 的 digest 与整个 input digest。

Catalog revision 必须不可变、由 Snapshot 可达。Handoff 范围使用组件或 Token Evidence 时必须固定对应 Catalog，否则 Block。

测试覆盖 Catalog 复用、输入变化产生新 revision、旧 Snapshot 仍读旧 Catalog、不可达拒绝和 MCP 固定读取。

Phase 5 同时清理主 Agent prompt、MCP Consumer Guide 和 prompt 中的 Flutter 必选表述，改成 Target-neutral 的条件式 adapter 与目标原生验证。现有 Flutter tools 作为可选 legacy adapter 保留。

## 6. CI 门禁

建议最终命令层级：

```text
pnpm docs:verify
pnpm authoring:lint
pnpm typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm --filter @proto-bridge/core test
pnpm test:e2e:runtime
pnpm test:e2e:evidence-slice
pnpm test:e2e:mcp
pnpm test:e2e:consumer
pnpm verify
```

CI 规则：

- Block 数量必须为零；
- Warning 必须有稳定 allow/ack 记录，不提供全局 `--force`；
- 新工作不得加入 legacy allowlist；
- 文档、Contract、Registry、实现和测试必须同一变更同步；
- `output/`、Store 和构建临时目录不参与正式文档扫描或提交。

## 7. 明确不做

- 本计划不删除或修复现有两套业务原型；
- 不建设可视化拖拽编辑器；
- 不建设作者聊天窗口；
- 不建设云端账户、权限或多人审批；
- 不引入多 Foundation/Kit；
- 不要求标记所有 DOM；
- 不用截图、CSS selector 或启发式推断替代 authored required boundary；
- 不在本阶段实现 Kotlin、Swift、React Native Target Adapter。
- 不在本阶段创建新黄金原型；Phase 1–5 使用协议、单元、集成和现有中性夹具验收。
- 不在本阶段抽象或重构 Flutter Target Adapter；只清理主链路对它的硬绑定。

旧原型删除和未来新黄金原型应作为后续独立工作，不能与本轮协议收敛混成同一任务。
