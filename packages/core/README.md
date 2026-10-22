# @proto-bridge/core

ProtoBridge 的唯一产品语义层，包含可执行 Evidence Contract、Capture、Store、Handoff 和独立 Target 查询/验证。

## 职责

- Workspace、Bundle、Case、Run、Attempt、revision、Snapshot、Coverage、Issue、Staleness、Handoff 和 Blob Schema；
- 稳定 ID、状态词汇、风险、错误和引用断言；
- Selection、Preflight、Case Matrix、Playwright Capture 和 JobHost；
- Runtime/Service browser-safe protocol；
- 不可变本地 Store、active activation、防降级、fork/archive/clean；
- Evidence Read Model；
- Target adapter conventions、examples 和 change validation；当前内置 Flutter adapter。
- 风险驱动的 L1/L2/L3 Review Profile、Code/Runtime 双轨状态、Runtime provider receipt 与有界失败 reducer。

## 公共导出

```text
@proto-bridge/core
@proto-bridge/core/v2
@proto-bridge/core/v2/capture
@proto-bridge/core/v2/store
@proto-bridge/core/v2/runtime-contract
@proto-bridge/core/v2/service-contract
@proto-bridge/core/target/flutter-app/query
@proto-bridge/core/target/flutter-app/validation
@proto-bridge/core/target
```

`/v2` 是持久对象和协议的 major namespace。具体公共面以 `package.json#exports` 为准。

入口包不得复制 Core Schema、状态、Case identity、risk 或 active-ref 解析。

`PbId` / `PbKey` 保留大小写敏感的驼峰业务标识；其它资源 ID 继续使用小写规则。身份语法见[语义标记规范](../../docs/reference/semantic-authoring.md#3-identity-四分法)。

## 开发

```bash
pnpm --filter @proto-bridge/core build
pnpm --filter @proto-bridge/core typecheck
pnpm --filter @proto-bridge/core test
```

架构说明见 [ProtoBridge 实现](../../docs/architecture/proto-bridge.md)和 [Evidence 模型](../../docs/architecture/evidence-model.md)。

Issue 持久化与 Fact 固定引用遵守 [Evidence 模型](../../docs/architecture/evidence-model.md#issue-与-coverage)。Store 的 `issueContentRef(issue)` 返回内容固定引用，`getIssue(bundleId, ref)` 只读取该引用，`listIssues` 保留同一逻辑 ID 的全部内容版本。

主题包模块通过 `./v2/theme` 和 `./v2` 导出，负责包内多套主题、模式、继承、解析值、引用链、摘要与校验。输入、身份和 API 见 [主题包解析模型](../../docs/architecture/theme-packs.md)；该模块不执行文件 I/O，也不自动把取值写入 Capture Evidence。


### DS 资源与 Capture

正常 Capture 暂存固定 Catalog 元数据并执行页面 Case，不独立下载或归档 DS SVG。浏览器仍加载并检查当前 Case 的可见 HTML/SVG 图像；资源使用信息随现有节点 props 固定。历史 theme-asset Blob 与旧 Catalog staging 仍可读取/恢复。完整职责及未覆盖边界见 [采集链路](../../docs/architecture/capture-pipeline.md) 和 [主题包模型](../../docs/architecture/theme-packs.md#原型绑定与-capture-边界)。

## 主题覆盖与采集复用

Core 固定每个 Screen 的选定状态与 Scenario Checkpoint 及完整主题／模式域。默认 `implementation-delivery` 采用完整业务基准与 authored 代表外观；`appearance-audit` 逐项实采全部外观。`ScreenSelectionDraft.themeModes` 显式固定重试组合；`NormalizedSelection.capturePlan` 固定观察和派生来源，按 `ruleKey` 共用规则与最小 Case/Scope 引用。`CaseKey.theme` 区分命名主题，`themeId` 保留模式；旧 Case ID 仍可读取。`captureCoverage` 分开表达业务、规则和计划截图，`themeCoverage` 保留穷举实际截图含义；详见 [Evidence 模型](../../docs/architecture/evidence-model.md)。

Job 通过 Driver 的可选 `openSession()` 复用浏览器进程，每个 Case 仍创建独立 Context，终结后 `dispose()` 释放进程。全部 Case 复用历史证据时不启动浏览器。主题探测只在 Runtime 提供完整源码 `sourceDigest` 时按固定输入缓存，规则见[采集链路](../../docs/architecture/capture-pipeline.md)。
