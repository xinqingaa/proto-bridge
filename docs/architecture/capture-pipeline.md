# 采集链路

Capture Pipeline 把 authored Runtime Contract 转换为不可变 Evidence。PBWork 和 CLI 进入同一 Pipeline。

## 1. Runtime Manifest

Runtime `describe` 返回：

- protocol version（当前 3）、input version、主题身份与声明时钟；
- capabilities；
- Prototype 和 Screen；
- Variant 标签、打开该状态所需的 authored route query 和 required Fragments；
- Action；
- Scenario、Action sequence 和 Checkpoint。

PBWork 清单携带 `sourceDigest`：Vite 对 Runtime、Core、构建输入与依赖锁文件计算 SHA-256，源变更（含新增/删除）使协议实例失效并重新加载。文档和探索草稿不属于该摘要。Manifest 在同一协议实例内复用，源摘要进入 `inputVersion`，避免 Vue 实现变化但 Registry 不变时误复用旧证据。

同一 Job 的新页面可通过 `describe.knownManifest` 携带先前清单。PBWork 仅在自身编译的源码摘要、原型身份、主题包和声明时钟匹配时复用；不匹配则重新构建。Core 仍校验返回的输入版本和主题身份，缓存不能跳过页面维度与证据检查。

Core 使用浏览器安全 Schema 校验响应。缺字段、未知引用、重复身份或不受支持的协议会阻止 Preflight。身份字段失败时，错误必须给出 Screen/Variant/Fragment 身份和实际值，而不是原始 Zod JSON。Registry validation 在采集前拦截非法 `pbId` / `pbKey`。

读取 Runtime 前运行 PBWork authoring lint：确定性违反 Contract 的结果直接 Block，只能启发式判断的 CSS-only 疑似遗漏形成 Warning。精确等级见[语义标记与证据门禁](../reference/semantic-authoring.md)。

## 2. Selection Draft

Draft 表达用户意图，不表达执行结果。状态和场景均使用 authored ID 的显式集合；GUI/CLI 的“全部”只在入口展开，不进入持久 Draft。Core 对输入归一化并拒绝：

- 未知 Screen/Variant/Scenario；
- 非稳定 Fragment；
- 互相冲突的维度；
- 空或越界 Scope；
- 超过容量的组合（默认 `capture.maxCases` 为 200）；
- 未逐项接受的 warning。

## 3. Preflight

Preflight 固定 manifest/input version、规范化 Selection、warning、risk 和 Case Matrix。主题一致性探测仅在 Runtime 提供完整 `sourceDigest` 时复用：缓存键包括 Runtime URL、完整 Manifest、Screen 范围和设备。缓存最多 32 项、有效期 5 分钟；任何输入变化或探测异常都重新执行，没有源码摘要的 Runtime 每次探测。容量与引用先校验，不能为超容量矩阵先执行大量页面探测。Preflight 有有效期；Runtime 输入变化或过期后必须重新执行。

Matrix 展开顺序必须稳定。Case ID 与 Scope key 在 PBWork 和 CLI 间一致，不能包含数组位置、生成时间或 authored route query；route query 是执行 baseline 输入，不是新的 Case identity 维度。矩阵默认展开清单声明的全部命名主题与浅深模式；`CaseKey.theme` 是命名主题，`CaseKey.themeId` 保留模式语义。新 Case ID 加入 `::theme=<主题>`，旧 Case 没有该字段时保留原身份。Screen Draft 可用显式 `themeModes` 固定重试范围，省略时展开全部组合；NormalizedSelection 的 `declaredThemeModes` 固定完整主题域，Case 数量完成只说明所选范围完成。Selection 必须携带与清单默认主题一致的 `themePack`。主题包摘要、键目录摘要和声明时钟进入 `inputVersion`。取值表、探针与时钟的当前规则见[主题包解析模型](./theme-packs.md#原型绑定与-capture-边界)。

## 4. 浏览器隔离

Playwright Driver 在一个 Job 内复用 Chromium 进程。业务维度与 Capture Scope 相同、仅主题／模式不同的 Case 组成执行组；每组建立新的隔离上下文，固定：

- Runtime URL；
- viewport 与 device scale factor；
- 模式对应的 color scheme，以及清单声明的时区与时钟；
- Variant；
- fixture；
- Scenario；
- Screenshot 参数。

网络、console、page errors 和 failed requests 进入 diagnostics。执行组之间不能共享业务状态。组内在一个外观下准备业务状态并执行共享 Scenario，再仅切换采集渲染环境，逐个外观实际读取语义、校验 required boundary、检查资源并截图。外观切换不得触发 fixture 重建、业务偏好写入或 Scenario 重放；业务状态发生变化或 Runtime 不支持该能力时，回退独立 Case 执行。主题特有交互须独立验证，不能由共享执行推断。

共享要求 Runtime 显式提供 `capture-state` 与 `set-render-theme`，以及完整的作者业务／局部状态读者。Scenario 还须声明 `appearancePolicy: shared`，缺省独立执行。来源执行完成后固定观察时刻并同步界面时钟；外观切换前后、语义观察后及截图完成后均核对状态指纹。指纹包含源码、业务和局部 UI 状态、路由、滚动、表单、焦点与 Overlay。截图完成前发生状态漂移会使 Case 失败；切换时不支持共享或状态已改变则独立重采，并保留拒绝共享的原因、trace 和 debug。`selected` Fragment 截图会主动滚动到目标，因此保持独立执行。

每个 Case 的 `${screenId}.runtime.execution` Fact 记录 `executionId`、`sourceCaseId`、`mode`、`sourceTheme` 和可选 `stateDigest`。真实执行业务准备／动作的来源 Case 为 `independent`；同组其他外观为 `shared-appearance`，不表示在其主题下独立重放动作。历史没有此 Fact 的记录保持执行来源未知。

Job 正常、失败或取消后释放进程；取消时关闭当前 Context。单 Case 直接调用仍独立启动并释放浏览器，初始化异常同样进入清理。正式截图、语义与失败检查不因分组而减少；诊断 trace 与正式 Evidence 分开处理。

## 5. Prepare 与 Readiness

`prepare` 使用 Manifest 中的 authored route query 导航到精确 Screen/Variant/Theme/Fixture，并保存 reset baseline。Runtime 必须返回实际 dimensions；任一维度不匹配都失败。prepare 后固定采集渲染主题与模式，直到协议实例释放或显式切换同组采集外观；重置数据等操作仍真实写入业务偏好，但不能改变采集环境。普通浏览不启用这个固定状态。

PBWork 在 `prepare` 与 `reset` 中触发当前 view 注册的 authored Case 准备钩子，再等待渲染稳定。同 URL 重复复位不依赖路由变化；原型负责重建业务 fixture、Overlay 与局部选中状态，普通产品导航保留交互状态。

`readiness` 只在页面完成状态准备、语义标记稳定且 required Fragment 可解析时成功。Core 会重复观察稳定签名，防止把中间渲染状态当成最终页面。

## 6. Semantic Snapshot

Runtime 读取当前语义树内的 `[data-pb-role][data-pb-id]` 节点。共享 TabViewport 用 `data-pb-capture-inactive="true"` 标记非当前保活面板；这些面板及子节点不属于当前 Case，查找 Fragment 与稳定性检查使用同一边界。当前面板自身的隐藏节点、共享外壳及 Overlay 仍保留，不能以全局可见性过滤代替页面归属。

采集执行以下校验：

- 验证 role；
- 构造 `screenId + pbId + optional pbKey`；
- 重复 `pbId` 要求每个实例都有稳定 `pbKey`；
- 验证 required Fragment 唯一、可见并具有非零 bbox；
- 拒绝 required Fragment 的 `unknown` role、业务 `ds.*` identity 和缺失的必要 Token Evidence；
- 提取文本、状态、可访问性和几何事实；
- 保留实际 DOM 观测来源。

required Fragment 的可见性、bbox、非 `unknown` role、业务 identity 和 Token Evidence 是由 Runtime/Core 执行的当前 Contract；任一检查失败都会阻止该 Case 形成 active revision。

Semantic snapshot 与 Screenshot 必须在同一固定 Case 外观下采集。组件、Token 和主题资源的定义由固定 Catalog 与 DS 同步提供；页面采集记录实际使用的身份、props、binding、组合关系、状态和布局，不逐主题重新定义整套 DS。

## 7. Scenario

Scenario 从 declared initial Variant 开始，按稳定 Action ID 执行。每个 Action：

- 指向稳定 Fragment target；
- 具有受支持的 kind；
- 执行后验证实际 Screen/Variant；
- 在 Checkpoint 重新检查 required boundary。

当前 Checkpoint 没有动作位置字段，表示完整 `actionIds` 之后的终态断言，不按数组位置解释为动作过程中的中间状态。共享执行来源与各外观观测分别记录；六套外观截图不能被统计成六次独立交互验证。

初始 readiness 只检查第一步 Action 的 target；后续 target 可能由前一步打开的 Sheet 或状态切换渲染。Runtime 在执行**每一步**前检查该步 target 的身份、role、可见性和遮挡，不能把后续 target 缺失提前判为初始态不完整。

导致 document 卸载且无法维持协议连续性的导航必须报告 unsupported，不能假装完成。

## 8. Attempt 与 Revision

Case 执行总会形成 Attempt。只有通过 Schema、完整性和激活规则的结果才能形成可激活 Evidence revision。

常见非成功结果：

- Runtime 不可达或协议不匹配；
- required Fragment 缺失、重复或不可见；
- 页面 dimensions 与 Case 不一致；
- Action/Checkpoint 失败；
- Screenshot/Blob 写入失败；
- 用户取消；
- Store 容量或 writer lock 阻塞。

每个 Case 终结（captured、failed、reused、cancelled）后，Core 先把该 Attempt 写入 Store root 下的 Job staging（`job-staging/<jobId>/`：`catalogs.json`、`cases/<序号>-<attemptId>.json`、`blobs/<hex>.bin`），captured Case 同时暂存 Revision 与 Blob 字节，之后才写 journal `case-finished`。staging 是 Job 内部的待提交区，不属于公共 Contract，也不会被 Snapshot 或 MCP 到达；Job finalize 后删除，Store 初始化时清理已终结或缺失 Job 的遗留 staging。

Store 每个 Job 维护已暂存 Case 索引和下一序号，首次读取已有 staging 后复用，避免每写一项重读此前全部 Revision。查重、写入和终结清理按 Job 串行化；只有持久写入成功才更新索引，写入结果不明确时重新读取磁盘。来源 Case 未成功暂存时丢弃可共享浏览器状态，后续外观重新准备业务执行。

Case 执行前，Core 只暂存固定 Catalog 修订，不独立下载或归档清单中的 DS 图形。图形本体及 Target 导出由 DS 同步拥有；页面采集固定身份、源摘要、实际使用信息和截图，详见[主题包解析模型](./theme-packs.md#原型绑定与-capture-边界)。首个 Bundle 尚不存在时同样先写 Job staging，再原子提交，不能提前要求 Bundle 已存在。

截图前，Driver 在当前 Case 的浏览器环境中等待可见 HTML img 与 SVG image 解码；缺少来源、解码失败或超时使该 Case 失败。隐藏图层不作为可见图像失败；浏览器仍负责实际页面资源加载。该检查不归档原文件、不访问 Target，也不宣称覆盖 CSS 背景、任意 Canvas 或全部动态路径。

历史 Catalog 的 theme-asset Blob 继续按固定引用读取；旧 Catalog 资产 staging 的恢复/提交兼容仍保留，正常 DS Capture 不调用该专用写入接口。通用 Case staging、截图必要性与原子提交规则不变。

Blob 写入失败按必要性区分：

- 可选二进制（非 Screenshot）暂存失败：该 Case 去掉这些二进制后重试，journal 记录 `blob-write-failed`；
- 必需 Screenshot Blob 写不进去：该 Case 成为 `failed` Attempt，原因为 `Required screenshot Blob could not be written: …`，在 Coverage 中计为失败并进入失败 Case 分组。

## 9. Run 与 Snapshot Commit

所有 Case 终结后，Core 构建 Run、Coverage、Issue、revision 和 Snapshot。Store 在同一次 Bundle 级提交锁内先写 Issue 与 staging 中的 Blob，再写不可变 Run/revision/Snapshot，最后原子更新 active pointer。

Issue 按内容摘要追加保存，同逻辑 ID 的不同内容并存、相同内容去重；Store 在新 revision 写入前将 Fact 的 `issueRef` 固定到具体摘要，后续 Run 不会改变历史 revision 的解释。精确引用格式见 [Evidence 模型](./evidence-model.md#issue-与-coverage)。

提交失败（例如 Issue 写入 IO 错误）时：

- journal 记录 `commit-failed`，Job 为 failed；
- 一致性 Issue 保留；
- 不能返回成功 Snapshot；
- 旧 active pointer 不变。

提交之外的执行错误记录 `execution-failed`，Job 同样为 failed。

### Job 调度

同一 Workspace writer（同一 Store 实例）同一时间只运行一个 Capture Job。后续被接受的 Job 仍会持久化并以 `queued` 状态可见，直到前面的 Job 终结后依次执行。取消 `queued` Job 会直接终结为 `cancelled`，不执行任何 Case。

### Orphan 恢复

Store 初始化时对非终结的 orphan Job 执行 `finalizeOrphanJobs`：

- 有已暂存 Case：这些 Attempt 作为 Run 提交，termination reason 为 `interrupted`；被选中但没有暂存 Attempt 的 Case 形成 `interrupted` Attempt，原因为 `The writer stopped before this Case finished.`；已暂存的 captured Case 缺 Blob 时降为 `failed`。Coverage 为 partial，Job 终结为 `interrupted`，journal 记录 `finalized-orphan`；
- 无已暂存 Case：沿用零 Attempt 的终结行为，journal 中的 Case 结果仅在 Run 没有 Attempt 时作为失败 Case 报告的后备；
- Bundle 不可写（例如已移入回收站）时跳过提交。

## 10. Handoff

Handoff 创建前评估：

- Coverage 是否覆盖实现范围；
- active Evidence 是否 stale；
- required unknown/conflict；
- Evidence Level；
- 是否存在手工提升或接受风险。

所有 mandatory risks 固定进入 Handoff。

PBWork 定稿的 `awaiting-risks` 阶段由 Local Service 每秒 reconciliation 推进。该 tick 复用按 Bundle/Snapshot 缓存的风险评估，只在以下情况重新执行 Preflight：没有缓存、用户确认风险（进入 `building-prompt`）、构建 Handoff，或该原型之后的 Preflight 观察到不同的 `inputVersion` / `manifestDigest`。Staleness Report 只在构建 Handoff 以及显式 `POST /api/v2/staleness` 时持久化；`POST /api/v2/handoffs/preview` 只预览，不写报告。Consumer 读取顺序见 [Agent 消费指南](../guides/agent-consumption.md)。

## 11. 性能对照

Playwright Driver 的 `metrics` 记录浏览器、Context、导航、动作、共享／独立 Case、回退、语义快照、截图数量和各阶段累计耗时。诊断用 `reuseAppearances: false` 可关闭跨外观复用，保持同一 Selection 与质量检查，以便对照。Yike 浏览器全量测试通过 `PB_CAPTURE_INDEPENDENT=1` 启用该对照路径；它不是产品采集范围选项。

`scripts/measure-capture-process.mjs --output <report.json> -- <command>` 包装命令，采样其进程树的累计 CPU 时间和峰值 RSS，并记录 wall time、退出码与采样间隔。CPU 与 RSS 是采样估计：短命进程及采样间峰值可能遗漏，共享内存页可能重复累计；无 `ps` 权限时明确报告 unavailable，不能据此推断 CPU 或内存为零。性能比较必须使用相同 Case 范围，同时核对截图归属、语义与状态检查、共享来源及 Snapshot/Handoff 结果。
