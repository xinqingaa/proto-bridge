# ProtoBridge V2 Contract 规范

> 权威范围：V2 身份、语义、Runtime、Selection、Evidence、Coverage 和 Handoff
> 上位决策：[V2 重构计划](./pb-pbwork-v2-rearchitecture.md)
> 实现与入口：[V2 实施规格](./pb-v2-implementation.md)

本文件定义跨 Core、PBWork、CLI、MCP、Service 和 Store 共用的唯一机器契约。实现使用 Zod 或 JSON Schema 做运行时校验，并由 Schema 生成或校验 TypeScript 类型。

## 1. Schema 与兼容性

```ts
type SchemaIdentity = {
  schemaVersion: 2;
  schemaRevision: string; // semver
  semanticVocabularyVersion: string;
};
```

- `schemaVersion` 是不兼容主版本；
- Reader 拒绝未知 major；
- V2 minor 可以增加可忽略字段，删除或改变字段语义必须提升 major；
- Writer 只写当前 revision，不就地改写历史 Run；
- CLI、MCP、PBWork 和 Adapter 不维护私有枚举或第二套类型。

## 2. ID 规范

基础语法：

```text
segment      = [a-z][a-z0-9]*(?:-[a-z0-9]+)*
qualified-id = segment(?: "." segment)*
```

限制：

- 小写 ASCII；
- 单个 ID 最长 160 字符；
- 禁止空白、斜杠、反斜杠、`..` 和运行时递增序号；
- 原始 ID 不直接作为文件路径；Store 使用安全 slug 和 digest。

| 标识 | 作用域 | 示例 |
| --- | --- | --- |
| `workspaceId` | Store 全局 | `pbwork-local` |
| `prototypeId` | Workspace 全局 | `ledger-planet` |
| `screenId` | Workspace 全局 | `ledger-planet.ledger-list` |
| `variantId` | Screen 内 | `filter-sheet` |
| `pbId` | Screen Contract 内 | `ledger-planet.ledger-list.filters.open` |
| `pbKey` | 同一语义父节点内 | `record-a1` |
| `componentId` | Component Registry 全局 | `date-range-sheet` |
| `actionId` | Screen 内 | `open-filter-sheet` |
| `scenarioId` | Screen 内 | `apply-date-range` |
| `themeId` | Workspace 内 | `light` |
| `deviceId` | Workspace 内 | `phone-390x844` |

ID 重命名视为旧身份删除和新身份创建。旧 Case 只保留在历史 Run；需要追踪迁移时由 Registry 显式声明 alias，Core 不按名称相似度自动关联。

### 2.1 公共引用

```ts
type EvidenceRef = {
  refId: string;
  kind:
    | "contract"
    | "runtime"
    | "source"
    | "screenshot"
    | "blob"
    | "issue";
  uri?: string;
  digest?: string;
  source?: SourceRef;
};

type UnknownFact = {
  fact: string;
  reason: string;
  requiredEvidence?: string[];
  refs: EvidenceRef[];
};

type Viewport = {
  width: number;
  height: number;
  deviceScaleFactor: number;
};

type CaptureEnvironment = {
  deviceId: string;
  viewport: Viewport;
  locale: string;
  timezone: string;
  fixedTime: string;
  colorScheme: "light" | "dark";
  reducedMotion: true;
  networkPolicy: string;
};
```

## 3. `data-pb-*` Authoring Contract

| 属性 | 要求 | 含义 |
| --- | --- | --- |
| `data-pb-id` | 关键节点必需 | Screen 内稳定语义节点 |
| `data-pb-key` | 进入 Evidence 的重复实例必需 | 稳定、非敏感实例键 |
| `data-pb-role` | 关键节点必需 | 跨技术栈语义角色 |
| `data-pb-shell` | Overlay 根必需 | Overlay 行为容器 |
| `data-pb-component` | 已注册 DS 组件根必需 | Component Contract ID |
| `data-pb-slot` | 声明的 Component part 必需 | Contract slot |
| `data-pb-action` | 业务 action trigger 必需 | Action Contract ID |

关键节点包括：

- Screen 根；
- 业务 region；
- action trigger；
- Overlay 根；
- 需要单独交接的 Fragment 根；
- 需要进入 Evidence 的重复实例根。

规则：

- 非重复节点在可见 DOM 中 `data-pb-id` 唯一；
- 重复节点允许共享模板 `pbId`，但 `{pbId, pbKey}` 必须唯一；
- `pbKey` 使用 fixture 或业务稳定键，禁止数组下标；
- 敏感业务主键必须先映射成稳定非敏感键；
- unknown role、shell、component、slot 或 action 在 instrumented runtime 中是 Contract Error；
- Action 的 kind、target、precondition 和 outcome 来自 Contract，不从 ID 文本猜测；
- DS 组件自动输出 component、内置 role 和 slot；
- 页面只声明业务 region、稳定 ID、Action 和重复实例 key；
- Registry validation、template lint 和 Runtime preflight 共同校验；
- instrumented capture 遇到缺失关键标记时失败，不静默降级。

Fragment selector：

```ts
type FragmentSelector = {
  screenId: string;
  rootPbId: string;
  pbKey?: string;
};
```

Fragment 没有独立人工 ID。Case Evidence 为实际采集结果生成 opaque `fragmentRef`。

## 4. 语义词表

`data-pb-role` 是闭集，不等同于 ARIA role：

```text
page
app-bar
bottom-bar
navigation
section
summary
card
list
scroll-list
list-item
filter
search
form
field
tab-bar
tab
tab-panel
tab-viewport
chart
empty-state
loading-state
error-state
sheet
dialog
drawer
toast
button
icon
image
text
unknown
```

Shell 闭集：

```text
sheet
dialog
modal
drawer
popover
toast
```

新增词必须同步 Schema、文档、lint、Runtime snapshot 和 Core normalizer。业务方不能通过自由字符串扩词。

## 5. 事实裁决

| 事实 | 权威来源 |
| --- | --- |
| 身份 | Runtime Contract / Registry / `data-pb-*` |
| 逻辑与未渲染状态 | 显式 Contract / Source |
| 当前状态、文本、bbox、computed style | Runtime |
| 最终视觉 | Screenshot + runtime computed value |
| Accessibility | ARIA / semantic HTML |
| Navigation | declared、source、scenario、observed 分别保留 |

```ts
type EvidenceValue<T> = {
  value: T;
  source:
    | "runtime-contract"
    | "runtime-observed"
    | "source"
    | "aria"
    | "screenshot"
    | "heuristic";
  confidence: "explicit" | "observed" | "inferred";
  refs: EvidenceRef[];
};
```

同一事实冲突时保留双方 EvidenceValue，选出 effective value，并生成 Issue。Screenshot 无权覆盖业务语义。

## 6. Runtime Protocol V2

### 6.1 暴露边界

Workbench Bridge 只服务 PBWork 壳与 iframe。

PB Runtime Protocol 挂载在纯 Runtime 页：

```ts
interface ProtoBridgeRuntimeV2 {
  version: 2;
  protocolRevision: string;
  invoke(request: RuntimeRequestV2): Promise<RuntimeResponseV2>;
}

declare global {
  interface Window {
    __PROTO_BRIDGE_V2__?: ProtoBridgeRuntimeV2;
  }
}
```

Core 通过 Playwright `page.evaluate` 调用该协议，不经过 Workbench、MCP 内存或 `postMessage` Bridge。

### 6.2 Request

```ts
type RuntimeRequestV2 =
  | { kind: "describe" }
  | { kind: "prototype-manifest"; prototypeId: string }
  | { kind: "screen-contract"; screenId: string }
  | { kind: "navigation-graph"; prototypeId: string }
  | { kind: "prepare-case"; input: RuntimeCaseInput }
  | { kind: "wait-until-stable"; caseId: string; timeoutMs: number }
  | { kind: "semantic-snapshot"; caseId: string }
  | { kind: "execute-scenario"; caseId: string; scenarioId: string }
  | { kind: "reset-case"; caseId: string };

type RuntimeResponseV2 =
  | {
      ok: true;
      requestKind: RuntimeRequestV2["kind"];
      data: unknown;
      warnings: string[];
    }
  | {
      ok: false;
      requestKind: RuntimeRequestV2["kind"];
      code: RuntimeProtocolErrorCode;
      message: string;
      retryable: boolean;
    };

type RuntimeProtocolErrorCode =
  | "PROTOCOL_MISMATCH"
  | "CAPABILITY_UNSUPPORTED"
  | "INVALID_REQUEST"
  | "CASE_DIMENSION_MISMATCH"
  | "RUNTIME_NOT_READY"
  | "SCENARIO_FAILED"
  | "PAYLOAD_TOO_LARGE";

type RuntimeCaseInput = CaptureCaseKey & {
  prototypeId: string;
  canonicalRuntimeUrl: string;
  fixtureRef?: string;
};
```

Runtime capability：

```text
prototype-manifest
screen-contract
variant-manifest
navigation-graph
semantic-snapshot
component-contracts
token-bindings
stability
scenario-execution
```

### 6.3 Prepare

`prepare-case` 是 instrumented capture 进入状态的唯一入口。它必须：

1. 导航到 canonical Runtime URL；
2. 应用 Variant fixture、Theme 和业务 query；
3. 清理前一 Case 的临时状态；
4. 禁止 localStorage、session theme 或 history 偏好覆盖输入；
5. 返回实际 Screen、Variant、Theme、Device、fixture digest 和 runtime revision；
6. 任一维度不一致时失败，不静默回退。

```ts
type RuntimeReadyState = {
  ready: boolean;
  caseId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  fixtureDigest?: string;
  runtimeRevision: string;
  pending: Array<
    "route" | "data" | "font" | "animation" | "layout" | "scenario"
  >;
  warnings: string[];
  stableAt?: string;
};
```

`ready=true` 要求维度完全一致、pending 为空且连续稳定帧通过。协议 payload 默认上限 256 KiB，超过上限返回 typed ref 或明确错误，不做无标记截断。

## 7. CaptureSelection 与 Case

```ts
type CaptureSelection = {
  prototypeId: string;
  screens:
    | { mode: "all" }
    | { mode: "include"; ids: string[] };
  variants:
    | { mode: "default" }
    | { mode: "critical" }
    | { mode: "all" }
    | {
        mode: "include";
        refs: Array<{ screenId: string; variantId: string }>;
      };
  fragments?: FragmentSelector[];
  themes?: string[];
  devices?: string[];
  source?: { enabled: boolean };
  capture?: {
    screenshots: Array<"viewport" | "full-page" | "fragments" | "overlay">;
    trace: "off" | "on-failure";
    concurrency?: number;
  };
};
```

所有入口统一提交判别式请求：

```ts
type CaptureRequest =
  | {
      kind: "instrumented-prototype";
      selection: CaptureSelection;
      bundleId?: string;
    }
  | {
      kind: "generic-runtime";
      prototypeId: string;
      screenId: string;
      url: string;
      devices?: string[];
      screenshots?: Array<"viewport" | "full-page">;
      bundleId?: string;
    }
  | {
      kind: "screenshot";
      prototypeId: string;
      screenId: string;
      variantId: string;
      themeId?: string;
      deviceId?: string;
      inputBlobRef: string;
      bundleId?: string;
    };
```

Source root 和 adapter 只来自本地配置。Selection 只能开启或关闭已配置 Source，Local Service 和 MCP 客户端不能提交任意 Source 路径。CLI 在进入 Job 前把 screenshot path 校验并暂存为 input Blob；Service / MCP 只接收有大小和 MIME 限制的 `inputBlobRef`，不读取客户端提交的任意文件路径。

缺省值：

- screens：all；
- variants：critical；
- themes：Prototype defaultThemeId；
- devices：Workspace default device；
- screenshots：viewport；
- source：使用配置；
- 超过 `maxCasesPerJob` 时拒绝，不截断。

`critical` 由 Variant Manifest 的 type / critical 标记决定，包括 default、loading、empty、error、validation-error、所有 Overlay 打开态和业务 critical Variant。Core 不通过字符串无限猜测。

```ts
type CaptureCaseKey = {
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  scenarioId?: string;
  checkpointId?: string;
};

type ResolvedCaptureCase = CaptureCaseKey & {
  caseId: string;
  canonicalRuntimeUrl?: string;
  fragmentSelectors: FragmentSelector[];
};
```

Case 按 screen、variant、theme、device、scenario、checkpoint 字典序排列。`caseId` 对规范化 CaseKey 计算摘要。

## 8. Evidence Level

```ts
type EvidenceLevel =
  | "instrumented-source-runtime"
  | "instrumented-runtime"
  | "generic-runtime"
  | "screenshot-only";
```

Evidence Level 属于 Case 和事实。Bundle 只保存 level summary，不用最低等级 Case 降级整个 Bundle。

## 9. Bundle、Run、Case 和 Blob

### 9.1 Bundle

```ts
type BundleIdentity = SchemaIdentity & {
  bundleId: string;
  workspaceId: string;
  prototypeId: string;
  createdAt: string;
  updatedAt: string;
};

type EvidenceManifest = BundleIdentity & {
  activeRunId: string;
  runRefs: string[];
  levelSummary: Record<EvidenceLevel, number>;
  catalog: {
    prototype: string;
    tokens?: string;
    components?: string;
    assets?: string;
    navigation?: string;
  };
  screens: Array<{
    screenId: string;
    contractRef: string;
    cases: Array<{
      caseId: string;
      key: CaptureCaseKey;
      status: "captured" | "failed" | "skipped" | "unsupported";
      evidenceRef?: string;
      screenshotRefs: string[];
      inputDigest: string;
      stale: boolean;
    }>;
  }>;
};
```

`workspaceId + prototypeId` 默认只有一个 active Bundle，显式 fork 除外。

### 9.2 Run

```ts
type CaptureRunManifest = {
  captureRunId: string;
  bundleId: string;
  retryOf?: string;
  selectionDigest: string;
  status: "completed" | "partial" | "failed" | "cancelled" | "interrupted";
  sourceRevision?: string;
  runtimeRevision?: string;
  prototypeManifestDigest: string;
  captureEngineVersion: string;
  environment: CaptureEnvironment;
  caseRefs: string[];
  coverageRef: string;
  issueRef: string;
  createdAt: string;
  completedAt?: string;
};
```

Run 完成后不可变。重试创建新 Run。取消、失败和 interrupted Run 保留已提交 Case 和 Issue，只有事务成功的 Case 才能成为 active ref。

### 9.3 Case Evidence

```ts
type CaseEvidence = {
  caseId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  scenarioId?: string;
  checkpointId?: string;
  viewport: Viewport;
  evidenceLevel: EvidenceLevel;
  inputDigest: string;
  runtimeRevision?: string;
  sourceRevision?: string;
  visibleRegions: Array<EvidenceValue<RegionEvidence>>;
  elements: Array<EvidenceValue<ElementEvidence>>;
  activeStates: Array<EvidenceValue<StateValue>>;
  visibleOverlays: Array<EvidenceValue<OverlayEvidence>>;
  componentInstances: ComponentInstanceEvidence[];
  resolvedTokens: ResolvedTokenEvidence[];
  screenshots: ScreenshotRef[];
  fragments: Array<{
    fragmentRef: string;
    selector: FragmentSelector;
    evidenceRef: string;
    screenshotRef?: string;
  }>;
  differencesFromDefault?: VariantDifference[];
  issues: EvidenceIssueRef[];
};
```

`differencesFromDefault` 只与相同 Theme、Device 和 fixture 的 default Case 比较；没有同维度基线时省略并记录 unknown。

### 9.4 Blob

Blob 使用 SHA-256 内容寻址。ScreenshotRef 保存 logical name、kind、尺寸、mime、digest 和 Blob ref；实际文件名不承担 Screen / Variant 身份。

## 10. Screen、Action 和 Navigation

```ts
type ScreenContract = {
  screenId: string;
  title?: EvidenceValue<string>;
  route?: EvidenceValue<string>;
  groups: string[];
  regions: Array<EvidenceValue<SemanticRegion>>;
  states: Array<EvidenceValue<StateContract>>;
  actions: Array<EvidenceValue<ActionContract>>;
  overlays: Array<EvidenceValue<OverlayContract>>;
  dependencies: Array<EvidenceValue<DependencyRef>>;
  unknowns: UnknownFact[];
};

type ActionContract = {
  actionId: string;
  kind:
    | "navigate"
    | "open-overlay"
    | "close-overlay"
    | "apply"
    | "reset"
    | "select"
    | "input"
    | "refresh"
    | "load-more"
    | "submit"
    | "unknown";
  trigger: { pbId: string; pbKey?: string };
  target?: string;
  preconditions: StatePredicate[];
  outcomes: ActionOutcome[];
  sourceRef?: SourceRef;
  runtimeObserved: boolean;
};
```

DOM clickable 只属于 ElementEvidence，除非有 data-pb-action、Runtime Contract、Source binding 或 Scenario 引用，否则不能进入 ActionContract。

Navigation edge：

```ts
type NavigationEdge = {
  edgeId: string;
  fromScreenId: string;
  actionId: string;
  toScreenId: string;
  navigationKind: "push" | "replace" | "back";
  provenance: ProvenanceEntry[];
  refs: EvidenceRef[];
};
```

一次 runtime click 不能自动升级成完整导航图。

## 11. Component、Token 和 Asset

Catalog 只保存稳定 Contract：

- Component props schema、slots、states、events、token bindings；
- Token ID、category、default value 和 Theme override；
- Asset identity、mime、digest 和 Source / Blob ref；
- Navigation 和 Screen Contract。

Case 保存变化事实：

- Component instance；
- props 和 state；
- resolved token；
- computed value；
- visible asset；
- pbId / pbKey。

值相等只能产生 `value-match`，不能升级为显式 token binding。敏感 props 按 Schema 标记并在 Runtime 返回前遮蔽。

SourceRef 使用 repository-relative POSIX path：

```ts
type SourceRef = {
  repositoryId?: string;
  revision?: string;
  path: string;
  symbol?: string;
  line?: number;
  digest?: string;
};
```

Bundle 默认不保存绝对 repository root。

## 12. Issue、Unknown 和 Coverage

Issue 至少包含：

```ts
type EvidenceIssue = {
  issueId: string;
  code: EvidenceIssueCode;
  severity: "info" | "warning" | "error" | "fatal";
  retryable: boolean;
  screenId?: string;
  caseId?: string;
  pbId?: string;
  pbKey?: string;
  refs: EvidenceRef[];
  nextAction?: string;
};
```

主要 Issue 类别：

```text
RUNTIME_NOT_READY
VARIANT_NOT_REACHABLE
CASE_DIMENSION_MISMATCH
SCREEN_CONTRACT_MISSING
SEMANTIC_CONTRACT_INVALID
DUPLICATE_PB_ID
SOURCE_DEPENDENCY_UNRESOLVED
SOURCE_RUNTIME_CONFLICT
ACTION_UNRESOLVED
TOKEN_BINDING_UNRESOLVED
OVERLAY_NOT_VISIBLE
SCREENSHOT_FAILED
LAYOUT_UNSTABLE
STORE_LOCKED
STORE_TRANSACTION_INTERRUPTED
BLOB_REF_INVALID
CAPACITY_LIMIT_EXCEEDED
RUNTIME_ORIGIN_REJECTED
GENERIC_RUNTIME_LIMITATION
SCREENSHOT_ONLY_LIMITATION
```

```ts
type CoverageReport = {
  captureRunId: string;
  selected: { screens: number; cases: number; fragments: number };
  discovered: { screens: number; variants: number };
  captured: { screens: number; cases: number; fragments: number };
  requiredSemanticNodes: number;
  validSemanticNodes: number;
  explicitSemanticCoverage: number;
  heuristicFallbackRate: number;
  traceableFactRate: number;
  sourceOnlyStates: number;
  failedCases: number;
  unstableCases: number;
};
```

口径：

- explicit semantic coverage = valid required nodes / all required nodes；
- required denominator 来自 Contract，不来自“已标记节点”；
- heuristic fallback rate 只统计 Agent-facing facts；
- traceable fact rate 要求 Agent-facing fact refs 非空；
- Coverage 同时输出 Case 明细，不能只给汇总数字。

## 13. Scenario

Variant 是可直接 prepare 的稳定初态；Scenario 是显式动作序列；Checkpoint 生成独立 Case。

```ts
type CaptureScenario = {
  scenarioId: string;
  screenId: string;
  startVariantId: string;
  steps: ScenarioStep[];
  checkpoints: CaptureCheckpoint[];
};
```

Step 支持：

```text
click-action
fill
select
swipe
scroll
wait
assert-state
capture
```

每个 Step 必须引用 Action Contract 或稳定 pbId，具有超时、前置断言和失败策略。CSS selector 不能成为正式 Scenario Contract。每次 Scenario 从新 Context 或通过验证的 reset 开始。

## 14. Agent Handoff

```ts
type AgentHandoff = {
  bundleId: string;
  prototypeId: string;
  selection: {
    screenIds: string[];
    caseIds?: string[];
    fragments?: Array<{
      caseId: string;
      fragmentRef: string;
    }>;
  };
  intent?: string;
  recommendedResources: string[];
  unknowns: UnknownFact[];
};
```

Handoff 只传 Evidence refs 和任务意图。目标工程规范由 Agent 在目标仓库读取；source component 不等同于 target component。
