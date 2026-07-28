# ProtoBridge V2 Contract 规范

> 权威范围：V2 身份、语义、Runtime、Selection、Evidence、Coverage 和 Handoff
> 上位决策：[V2 重构计划](./pb-pbwork-v2-rearchitecture.md)
> 实现与入口：[V2 实施规格](./pb-v2-implementation.md)

本文件定义跨 Core、PBWork、CLI、MCP、Service 和 Store 共用的唯一机器契约。实现使用 Zod 或 JSON Schema 做运行时校验，并由 Schema 生成或校验 TypeScript 类型。

阅读入口：

- 制作或维护 PBWork 原型：重点阅读 ID、`data-pb-*`、语义词表、Screen / Action 和 Scenario；
- 实现 Runtime、Capture 或 Store：重点阅读 Runtime Protocol、Selection、Case、Bundle 和 Coverage；
- 实现 MCP 或 Agent Handoff：重点阅读 Evidence、Issue、Fragment 和 Handoff。

## 1. Schema 与兼容性

```ts
type SchemaIdentity = {
  schemaVersion: 2;
  schemaRevision: string; // semver
  semanticVocabularyVersion: string;
};

type PersistedIdentity = SchemaIdentity & {
  createdAt: string;
};

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
```

- `schemaVersion` 是不兼容主版本；
- Reader 拒绝未知 major；
- V2 minor 可以增加可忽略字段，删除或改变字段语义必须提升 major；
- Writer 只写当前 revision，不就地改写历史 Run；
- Bundle Manifest、Bundle Snapshot、Run、Case Attempt、Case Evidence Revision、Catalog Revision、Coverage、Issue collection、Staleness Report 和 Handoff 都携带 `SchemaIdentity`；
- 单个 Bundle 可以引用同一 major 内不同 revision 写出的历史对象；Reader 按对象自身 `schemaRevision` 读取，不能用当前 Bundle Manifest revision 冒充历史对象 revision；
- 历史对象不可就地迁移。需要语义变更时写新 revision 或提升 major；
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

| 标识          | 作用域                  | 示例                                     |
| ------------- | ----------------------- | ---------------------------------------- |
| `workspaceId` | Store 全局              | `pbwork-local`                           |
| `prototypeId` | Workspace 全局          | `ledger-planet`                          |
| `screenId`    | Workspace 全局          | `ledger-planet.ledger-list`              |
| `variantId`   | Screen 内               | `filter-sheet`                           |
| `pbId`        | Screen Contract 内      | `ledger-planet.ledger-list.filters.open` |
| `pbKey`       | 同一语义父节点内        | `record-a1`                              |
| `componentId` | Component Registry 全局 | `date-range-sheet`                       |
| `actionId`    | Screen 内               | `open-filter-sheet`                      |
| `scenarioId`  | Screen 内               | `apply-date-range`                       |
| `themeId`     | Workspace 内            | `light`                                  |
| `deviceId`    | Workspace 内            | `phone-390x844`                          |

ID 重命名视为旧身份删除和新身份创建。旧 Case 只保留在历史 Run；需要追踪迁移时由 Registry 显式声明 alias，Core 不按名称相似度自动关联。

### 2.1 公共引用

```ts
type EvidenceRef = {
  refId: string;
  kind: "contract" | "runtime" | "source" | "screenshot" | "blob" | "issue";
  uri?: string;
  digest?: string;
  bundleSnapshotId?: string;
  objectRevisionId?: string;
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
  locale: string;
  timezone: string;
  fixedTime: string;
  reducedMotion: true;
  networkPolicy: string;
};

type CaseEnvironment = CaptureEnvironment & {
  deviceId: string;
  viewport: Viewport;
  colorScheme: "light" | "dark";
};
```

## 3. `data-pb-*` Authoring Contract

| 属性                | 要求                         | 含义                  |
| ------------------- | ---------------------------- | --------------------- |
| `data-pb-id`        | 关键节点必需                 | Screen 内稳定语义节点 |
| `data-pb-key`       | 进入 Evidence 的重复实例必需 | 稳定、非敏感实例键    |
| `data-pb-role`      | 关键节点必需                 | 跨技术栈语义角色      |
| `data-pb-shell`     | Overlay 根必需               | Overlay 行为容器      |
| `data-pb-component` | 已注册 DS 组件根必需         | Component Contract ID |
| `data-pb-slot`      | 声明的 Component part 必需   | Contract slot         |
| `data-pb-action`    | 业务 action trigger 必需     | Action Contract ID    |

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

PBWork 将画布选择转换为 FragmentSelector 时必须遵守：

1. 当前 `prototypeId` 和 `screenId` 来自已握手的 Runtime 上下文，不能由 DOM 文本推断；
2. 常规交互不允许用户手写 `rootPbId` 或 CSS selector；
3. 目标节点必须具有稳定 `data-pb-id`；重复实例同时要求稳定 `data-pb-key`；
4. 只存在 Runtime 临时 handle、DOM path、数组 index 或随机 class 的节点不能提交 instrumented Fragment Capture；
5. 切换 Variant、Theme 或 Screen 后必须重新验证 selector；引用失效时返回 preflight Issue；
6. CSS selector 只能保留为 generic runtime debug 信息，不能成为正式 Fragment 身份。

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

| 事实                                 | 权威来源                                      |
| ------------------------------------ | --------------------------------------------- |
| 身份                                 | Runtime Contract / Registry / `data-pb-*`     |
| 逻辑与未渲染状态                     | 显式 Contract / Source                        |
| 当前状态、文本、bbox、computed style | Runtime                                       |
| 最终视觉                             | Screenshot + runtime computed value           |
| Accessibility                        | ARIA / semantic HTML                          |
| Navigation                           | declared、source、scenario、observed 分别保留 |

```ts
type EvidenceCandidate<T> = {
  candidateId: string;
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

type EvidenceFact<T> = {
  factId: string;
  candidates: Array<EvidenceCandidate<T>>;
  effectiveCandidateId?: string;
  resolution:
    | { kind: "single" }
    | { kind: "precedence"; reason: string }
    | { kind: "unresolved-conflict"; issueRef: EvidenceRef };
};
```

`factId` 在其所属 Contract 或 Case Evidence Revision 内稳定。同一事实冲突时保留所有 candidate；只有权威规则足以裁决时设置 `effectiveCandidateId`。无法裁决时使用 `unresolved-conflict`、生成 Issue，并保持 effective 为空。Screenshot 无权覆盖业务语义。

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
type RuntimeRequestByKind = {
  describe: { kind: "describe" };
  "prototype-manifest": { kind: "prototype-manifest"; prototypeId: string };
  "screen-contract": { kind: "screen-contract"; screenId: string };
  "variant-manifest": { kind: "variant-manifest"; screenId: string };
  "navigation-graph": { kind: "navigation-graph"; prototypeId: string };
  "component-contracts": { kind: "component-contracts"; prototypeId: string };
  "token-bindings": { kind: "token-bindings"; prototypeId: string };
  "scenario-manifest": { kind: "scenario-manifest"; screenId: string };
  "prepare-case": { kind: "prepare-case"; input: RuntimeCaseInput };
  "wait-until-stable": {
    kind: "wait-until-stable";
    caseId: string;
    timeoutMs: number;
  };
  "semantic-snapshot": { kind: "semantic-snapshot"; caseId: string };
  "execute-scenario-step": {
    kind: "execute-scenario-step";
    caseId: string;
    scenarioId: string;
    stepId: string;
  };
  "reset-case": { kind: "reset-case"; caseId: string };
};

type RuntimeDataByKind = {
  describe: RuntimeDescription;
  "prototype-manifest": PrototypeManifest;
  "screen-contract": ScreenContract;
  "variant-manifest": VariantManifest;
  "navigation-graph": NavigationGraph;
  "component-contracts": ComponentContractCatalog;
  "token-bindings": TokenCatalog;
  "scenario-manifest": ScenarioManifest;
  "prepare-case": RuntimeReadyState;
  "wait-until-stable": RuntimeReadyState;
  "semantic-snapshot": SemanticSnapshot;
  "execute-scenario-step": ScenarioStepResult;
  "reset-case": RuntimeReadyState;
};

type RuntimeRequestV2 =
  RuntimeRequestByKind[keyof RuntimeRequestByKind];

type RuntimeResponseV2<
  K extends keyof RuntimeRequestByKind = keyof RuntimeRequestByKind,
> =
  | {
      ok: true;
      requestKind: K;
      data: RuntimeDataByKind[K];
      warnings: RuntimeWarning[];
    }
  | {
      ok: false;
      requestKind: K;
      code: RuntimeProtocolErrorCode;
      message: string;
      retryable: boolean;
      refs: EvidenceRef[];
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
  expectedCanonicalRuntimeUrl: string;
  fixtureRef?: string;
};

type RuntimeDescription = {
  protocolVersion: 2;
  protocolRevision: string;
  runtimeRevision: string;
  capabilities: RuntimeCapability[];
  maxPayloadBytes: number;
};

type RuntimeCapability =
  | "prototype-manifest"
  | "screen-contract"
  | "variant-manifest"
  | "navigation-graph"
  | "semantic-snapshot"
  | "component-contracts"
  | "token-bindings"
  | "scenario-manifest"
  | "wait-until-stable"
  | "execute-scenario-step";

type RuntimeWarning = {
  code: string;
  message: string;
  refs: EvidenceRef[];
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
scenario-manifest
wait-until-stable
execute-scenario-step
```

Capability 名称必须与可调用 request kind 一一对应；`describe`、`prepare-case`、`reset-case` 是基础协议能力，不进入 capability 数组，也不另设私有请求。每个成功响应必须通过 `RuntimeDataByKind` 对应 Schema，禁止使用 `unknown` 或无标记截断。

### 6.3 Prepare

Core / Playwright 先导航到 Manifest 提供的 canonical Runtime URL，再调用 `prepare-case`。Runtime Protocol 不执行会卸载当前 document 的页面级导航。

`prepare-case` 是 instrumented capture 在当前 canonical 页面内进入状态的唯一入口。它必须：

1. 验证当前 URL 与 `expectedCanonicalRuntimeUrl` 一致；
2. 应用 Variant fixture、Theme 和业务 query；
3. 清理前一 Case 的临时状态；
4. 禁止 localStorage、session theme 或 history 偏好覆盖输入；
5. 返回实际 Screen、Variant、Theme、Device、fixture digest、canonical URL 和 runtime revision；
6. 任一维度不一致时失败，不静默回退。

```ts
type RuntimeReadyState = {
  ready: boolean;
  caseId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  canonicalRuntimeUrl: string;
  fixtureDigest?: string;
  runtimeRevision: string;
  pending: Array<
    "route" | "data" | "font" | "animation" | "layout" | "scenario"
  >;
  warnings: string[];
  stableAt?: string;
};
```

`ready=true` 要求维度完全一致、pending 为空且连续稳定帧通过。协议 payload 默认上限 256 KiB，超过上限返回 `PAYLOAD_TOO_LARGE`；V2 不提供未定义的临时 ref，也不做无标记截断。

Scenario 中的 navigation Action 必须通过 instrumented Runtime 的注册导航适配器执行：先返回 `navigation-started` 和 navigation intent，再提交同 document 的 SPA / history 导航。会直接卸载 document、导致协议响应丢失的导航在 V2 instrumented Scenario 中标记 unsupported。Core 观察实际路由、重新验证 Runtime 上下文和目标 Screen 后再继续下一个 Step。

## 7. CaptureSelection 与 Case

```ts
type VariantPolicy =
  | { mode: "default" }
  | { mode: "critical" }
  | { mode: "all" }
  | { mode: "include"; ids: string[] };

type ScreenSelection =
  | { mode: "all"; variants: VariantPolicy }
  | {
      mode: "include";
      items: Array<{
        screenId: string;
        variants: VariantPolicy;
      }>;
    };

type ScenarioSelection =
  | { mode: "none" }
  | { mode: "critical" }
  | { mode: "all" }
  | {
      mode: "include";
      refs: Array<{
        screenId: string;
        scenarioId: string;
        checkpointIds?: string[];
      }>;
    };

type CaptureSelection = {
  prototypeId: string;
  screens: ScreenSelection;
  scenarios?: ScenarioSelection;
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
      uploadSessionId: string;
      inputBlobRef: string;
      bundleId?: string;
    };
```

Source root 和 adapter 只来自本地配置。Selection 只能开启或关闭已配置 Source，Local Service 和 MCP 客户端不能提交任意 Source 路径。CLI 在进入 Job 前把 screenshot path 校验并暂存为 input Blob；Service / MCP 只接收有大小和 MIME 限制的 `inputBlobRef`，不读取客户端提交的任意文件路径。

缺省值：

- screens：`{ mode: "all", variants: { mode: "critical" } }`；
- scenarios：critical；
- themes：Prototype defaultThemeId；
- devices：Workspace default device；
- screenshots：viewport；
- source：使用配置；
- 超过 `maxCasesPerJob` 时拒绝，不截断。

`critical` 由 Variant Manifest 的 type / critical 标记决定，包括 default、loading、empty、error、validation-error、所有 Overlay 打开态和业务 critical Variant。Core 不通过字符串无限猜测。

Scenario 的 `critical` 只包含 Scenario Manifest 显式标记 `critical=true` 的项目。没有 critical Scenario 时只展开 Base Case，不通过名称猜测。Base Case 总是按 Screen / Variant / Theme / Device 展开；Scenario 只为选中的 Checkpoint 追加 Case。

校验规则：

- `include.items`、Variant `ids`、Scenario `refs`、Theme、Device 和 Screenshot 数组非空且去重；
- Fragment 的 `screenId` 必须属于 Screen selection；
- 显式 Variant 和 Scenario 必须属于对应 Screen；
- `bundleId` 存在时必须与当前 Workspace 和 Prototype 匹配；不同 Evidence Level 可以存在于同一 Bundle 的不同 Case revision 中；
- 创建新 fork 必须使用显式 `forkBundle` 操作，不能通过提交随机 `bundleId` 隐式创建；
- 零 Case、零 Screenshot 或交叉引用失效的 Selection 在 Preflight 阶段阻止。

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

### 7.1 Preflight 与 Job

Preflight 不创建 Run。它在隔离 BrowserContext 中对每个唯一 Base Case 执行无截图 dry-prepare，完成后关闭 Context；不得复用用户当前 PBWork iframe 状态。Scenario Preflight 校验 manifest、Action / pbId 引用、Checkpoint identity 和 runtime capability，但不执行会改变业务状态的 Scenario Step；Step 的实际可达性由 Capture attempt 证明。相同输入 revision 的 dry-prepare 结果可以缓存。

```ts
type CapturePreflightRequest = {
  request: CaptureRequest;
};

type PreflightCase = ResolvedCaptureCase & {
  disposition: "new" | "reusable" | "stale";
  activeEvidenceRevisionId?: string;
  estimatedScreenshotCount: number;
};

type CapturePreflightResult = PersistedIdentity & {
  preflightRevision: string;
  workspaceId: string;
  normalizedRequest: CaptureRequest;
  selectionDigest: string;
  matrixDigest: string;
  matrix: PreflightCase[];
  result: "ready" | "warning" | "blocked";
  warningIssueIds: string[];
  blockingIssueIds: string[];
  issueRefs: EvidenceRef[];
  inputRevisionSet: InputRevisionSet;
  expiresAt: string;
};

type CreateCaptureJobRequest = {
  preflightRevision: string;
  selectionDigest: string;
  matrixDigest: string;
  request: CaptureRequest;
  acceptedWarningIssueIds: string[];
};

type CaptureJobStatus =
  | "queued"
  | "discovering"
  | "capturing"
  | "writing"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled"
  | "interrupted";

type CaptureJob = PersistedIdentity & {
  jobId: string;
  workspaceId: string;
  captureRunId: string;
  status: CaptureJobStatus;
  preflightRevision: string;
  selectionDigest: string;
  matrixDigest: string;
  acceptedWarningIssueIds: string[];
  progress: {
    totalCases: number;
    completedCases: number;
    reusedCases: number;
    failedCases: number;
    skippedCases: number;
    unsupportedCases: number;
    cancelledCases: number;
    interruptedCases: number;
    remainingCases: number;
    currentCaseId?: string;
  };
  lastEventId?: string;
  resultRunRef?: string;
  resultSnapshotId?: string;
  completedAt?: string;
};

type InputUploadSession = PersistedIdentity & {
  uploadSessionId: string;
  workspaceId: string;
  expiresAt: string;
  status: "open" | "claimed" | "expired";
  inputBlobs: Array<{
    inputBlobRef: string;
    digest: string;
    mime: "image/png" | "image/jpeg" | "image/webp";
    size: number;
  }>;
  claimedByJobId?: string;
};
```

CreateJob 时 Core 重新计算 revision、Selection digest 和 Matrix digest；任何一项变化都返回 `PREFLIGHT_STALE`。`warningIssueIds` 必须全部出现在 `acceptedWarningIssueIds` 中，否则返回 `PREFLIGHT_WARNING_NOT_ACCEPTED`。

Screenshot-only 请求的 `uploadSessionId + inputBlobRef` 必须同时有效。CreateJob 成功时原子地把 session 从 open 改为 claimed 并记录 `claimedByJobId`；失败时保持 open 直到 TTL。一个 session 只能被一个 Job 认领，过期和已认领 session 不可复用。

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
type BundleIdentity = PersistedIdentity & {
  bundleId: string;
  workspaceId: string;
  prototypeId: string;
  updatedAt: string;
};

type EvidenceManifest = BundleIdentity & {
  activeSnapshotId: string;
  runRefs: string[];
  snapshotRefs: string[];
  latestStalenessReportId?: string;
  forkedFrom?: { bundleId: string; snapshotId: string };
  archivedAt?: string;
};

type CatalogRevisionRefs = {
  prototype: string;
  screens: Record<string, string>;
  tokens?: string;
  components?: string;
  assets?: string;
  navigation?: string;
  scenarios?: Record<string, string>;
};

type SnapshotCaseEntry = {
  caseId: string;
  key: CaptureCaseKey;
  activeEvidenceRevisionId?: string;
  latestAttemptRef: string;
  activeInputDigest?: string;
};

type BundleSnapshot = PersistedIdentity & {
  bundleSnapshotId: string;
  bundleId: string;
  basedOnSnapshotId?: string;
  createdBy:
    | { kind: "capture-run"; captureRunId: string }
    | {
        kind: "fork";
        sourceBundleId: string;
        sourceSnapshotId: string;
      };
  catalogRevisionRefs: CatalogRevisionRefs;
  cases: SnapshotCaseEntry[];
  coverageRef: string;
  levelSummary: Record<EvidenceLevel, number>;
};

type ForkBundleRequest = {
  sourceBundleId: string;
  sourceSnapshotId: string;
  newBundleId: string;
};

type ArchiveBundleRequest = {
  bundleId: string;
  expectedActiveSnapshotId: string;
};
```

`workspaceId + prototypeId` 默认只有一个未归档 active Bundle。Fork 必须显式指定源 `bundleId + bundleSnapshotId` 并产生新 `bundleId`。Archive 不删除历史对象；Clean 不能隐式清理未归档 active Bundle、其 active Snapshot、Handoff 固定的 Snapshot 或被这些对象引用的 Blob。

归档 Bundle 拒绝新的 Capture Job 和 active Snapshot 更新，返回 `BUNDLE_ARCHIVED`；需要继续采集时先从明确 Snapshot Fork。`newBundleId` 已存在时返回 `BUNDLE_ID_CONFLICT`，不得合并或覆盖。

### 9.2 Run

```ts
type CaptureRunStatus =
  | "completed"
  | "partial"
  | "failed"
  | "cancelled"
  | "interrupted";

type CaseAttemptStatus =
  | "captured"
  | "reused"
  | "failed"
  | "skipped"
  | "unsupported"
  | "cancelled"
  | "interrupted";

type CaseAttemptBase = PersistedIdentity & {
  caseAttemptId: string;
  captureRunId: string;
  caseId: string;
  issueRefs: EvidenceRef[];
  completedAt?: string;
};

type CaseAttempt =
  | (CaseAttemptBase & {
      status: "captured" | "reused";
      evidenceRevisionId: string;
    })
  | (CaseAttemptBase & {
      status: "failed" | "skipped" | "unsupported" | "cancelled" | "interrupted";
      evidenceRevisionId?: never;
    });

type CaptureRunManifest = PersistedIdentity & {
  captureRunId: string;
  bundleId: string;
  retryOf?: string;
  snapshotBeforeId?: string;
  committedSnapshotId?: string;
  selectionDigest: string;
  matrixDigest: string;
  preflightRevision: string;
  acceptedWarningIssueIds: string[];
  status: CaptureRunStatus;
  inputRevisionSet: InputRevisionSet;
  captureEngineVersion: string;
  environment: CaptureEnvironment;
  caseAttemptRefs: string[];
  runCoverageRef: string;
  preflightIssueRef: string;
  issueRef: string;
  completedAt?: string;
};
```

Run 和 Case Attempt 创建后只允许追加运行中事件；进入终态并完成事务后不可变。重试创建新 Run。取消、失败和 interrupted Run 保留已提交 Case Attempt 和 Issue。

Bundle Snapshot 更新规则：

- `captured` attempt 可以把其新 `evidenceRevisionId` 设为 active Evidence；
- `reused` attempt 必须引用 Snapshot 中已存在且 digest 相同的 `evidenceRevisionId`，保留或重新声明同一 active Evidence；
- `failed`、`skipped`、`unsupported`、`cancelled` 和 `interrupted` 只更新 `latestAttemptRef`，不得清除已有 `activeEvidenceRevisionId`；
- 从未成功采集的 Case 在非 captured attempt 后保持 active Evidence 为空；
- Run Coverage 描述本 Run 的 attempt；Snapshot Coverage 描述事务提交后的全部 active Case 和 latest attempt；
- `completed` 要求 Matrix 中所有 Case 为 captured 或 reused；`partial` 表示至少一个 Case captured / reused 且至少一个 Case 为其他状态；没有任何 captured / reused 时为 `failed`，用户取消为 `cancelled`，Service 中断为 `interrupted`。

### 9.3 Case Evidence

```ts
type RegionEvidence = {
  pbId: string;
  pbKey?: string;
  role: string;
  bbox?: { x: number; y: number; width: number; height: number };
};

type ElementEvidence = RegionEvidence & {
  tag?: string;
  text?: string;
  ariaRole?: string;
  interactive: boolean;
};

type StateValue = {
  stateId: string;
  value: string | number | boolean | null;
};

type OverlayEvidence = {
  pbId: string;
  shell: "sheet" | "dialog" | "modal" | "drawer" | "popover" | "toast";
  visible: boolean;
};

type ComponentInstanceEvidence = {
  componentId: string;
  pbId: string;
  pbKey?: string;
  props: Record<string, EvidenceFact<JsonValue>>;
  states: Record<string, EvidenceFact<JsonValue>>;
  slotPbIds: Record<string, string[]>;
  refs: EvidenceRef[];
};

type ResolvedTokenEvidence = {
  tokenId: string;
  pbId: string;
  property: string;
  computedValue: string;
  binding: "explicit" | "value-match";
  refs: EvidenceRef[];
};

type ScreenshotRef = {
  screenshotRef: string;
  logicalName: string;
  kind: "viewport" | "full-page" | "fragment" | "overlay" | "scroll-segment";
  width: number;
  height: number;
  mime: "image/png" | "image/jpeg" | "image/webp";
  digest: string;
  blobRef: string;
};

type VariantDifference = {
  factId: string;
  defaultFactRef: EvidenceRef;
  currentFactRef: EvidenceRef;
  difference: "added" | "removed" | "changed";
};

type CaseContractRevisionRefs = {
  prototypeCatalogRevisionId: string;
  screenContractRevisionId: string;
  componentCatalogRevisionId?: string;
  tokenCatalogRevisionId?: string;
  assetCatalogRevisionId?: string;
  navigationCatalogRevisionId?: string;
  scenarioCatalogRevisionId?: string;
};

type CaseEvidenceRevision = PersistedIdentity & {
  caseEvidenceRevisionId: string;
  caseId: string;
  capturedInRunId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  deviceId: string;
  scenarioId?: string;
  checkpointId?: string;
  environment: CaseEnvironment;
  evidenceLevel: EvidenceLevel;
  inputDigest: string;
  dependencyDigests: CaseDependencyDigests;
  contractRevisionRefs: CaseContractRevisionRefs;
  visibleRegions: Array<EvidenceFact<RegionEvidence>>;
  elements: Array<EvidenceFact<ElementEvidence>>;
  activeStates: Array<EvidenceFact<StateValue>>;
  visibleOverlays: Array<EvidenceFact<OverlayEvidence>>;
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
  issueRefs: EvidenceRef[];
};
```

`differencesFromDefault` 只与相同 Theme、Device 和 fixture 的 default Case 比较；没有同维度基线时省略并记录 unknown。

`caseEvidenceRevisionId` 对规范化 Case Evidence 内容和关键 metadata 计算摘要。相同内容可以复用同一 revision；不同内容不得覆盖已有 revision。

Bundle Snapshot 的 `catalogRevisionRefs` 表示该 Snapshot 的当前可发现 Contract；Case Evidence Revision 的 `contractRevisionRefs` 表示采集该证据时实际使用的 Contract。两者不一致时 Case 由 Staleness Report 标记 stale，但历史 Evidence 仍按自身 refs 解释。Handoff 必须收集所选 Case 实际引用的全部 Screen / Catalog revision，不能只给 Bundle 当前 Catalog。

### 9.4 Blob

Blob 使用 SHA-256 内容寻址。ScreenshotRef 保存 logical name、kind、尺寸、mime、digest 和 Blob ref；实际文件名不承担 Screen / Variant 身份。

### 9.5 Input Digest 与 Staleness

```ts
type InputRevisionSet = {
  runtimeRevision?: string;
  sourceWorkspaceRevision?: string;
  prototypeManifestDigest: string;
  captureConfigDigest: string;
  captureEngineVersion: string;
};

type CaseDependencyDigests = {
  caseKey: string;
  fixture?: string;
  screenContract: string;
  sourceClosure?: string;
  componentContracts: string[];
  tokenContracts: string[];
  assets: string[];
  scenario?: string;
  device: string;
  environment: string;
  screenshotPolicy: string;
};

type StaleReason = {
  dependency:
    | "fixture"
    | "screen-contract"
    | "source-closure"
    | "component-contract"
    | "token-contract"
    | "asset"
    | "scenario"
    | "device"
    | "environment"
    | "capture-engine"
    | "screenshot-policy";
  previousDigest?: string;
  currentDigest?: string;
};

type StalenessReport = PersistedIdentity & {
  stalenessReportId: string;
  bundleId: string;
  bundleSnapshotId: string;
  inputRevisionSet: InputRevisionSet;
  cases: Array<{
    caseId: string;
    evidenceRevisionId?: string;
    stale: boolean;
    reasons: StaleReason[];
  }>;
};
```

Staleness Report 由具有 Runtime / Source 配置的 Producer 通过显式 staleness preflight 生成。Store-only MCP 只读取已持久化 Report，不自行猜测当前 Source。Handoff 固定一个 `stalenessReportId`；后续新 Report 不改变旧 Handoff。

## 10. Screen、Action 和 Navigation

```ts
type SemanticRegion = {
  pbId: string;
  role: string;
  label?: string;
};

type StateContract = {
  stateId: string;
  valueType: "boolean" | "string" | "number" | "enum";
  allowedValues?: Array<string | number | boolean>;
};

type OverlayContract = {
  overlayId: string;
  rootPbId: string;
  shell: "sheet" | "dialog" | "modal" | "drawer" | "popover" | "toast";
};

type DependencyRef = {
  kind: "source" | "component" | "token" | "asset" | "screen" | "scenario";
  id: string;
  digest?: string;
};

type StatePredicate = {
  stateId: string;
  operator: "equals" | "not-equals" | "exists";
  value?: string | number | boolean | null;
};

type ActionOutcome = {
  kind: "state-change" | "overlay-change" | "navigation" | "data-change";
  targetId: string;
  expectedValue?: string | number | boolean | null;
};

type ScreenContract = PersistedIdentity & {
  screenContractRevisionId: string;
  screenId: string;
  title?: EvidenceFact<string>;
  route?: EvidenceFact<string>;
  groups: string[];
  requiredSemanticNodes: Array<{
    nodeId: string;
    kind: "screen-root" | "region" | "action" | "overlay" | "fragment-root" | "repeated-instance";
    pbId: string;
    pbKeyRequired: boolean;
    instances:
      | { kind: "single" }
      | { kind: "fixture-keys"; fixturePath: string };
  }>;
  regions: Array<EvidenceFact<SemanticRegion>>;
  states: Array<EvidenceFact<StateContract>>;
  actions: Array<EvidenceFact<ActionContract>>;
  overlays: Array<EvidenceFact<OverlayContract>>;
  dependencies: Array<EvidenceFact<DependencyRef>>;
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
  provenance: Array<{
    source: "runtime-contract" | "runtime-observed" | "source" | "scenario";
    confidence: "explicit" | "observed" | "inferred";
  }>;
  refs: EvidenceRef[];
};

type NavigationGraph = {
  prototypeId: string;
  edges: NavigationEdge[];
};
```

一次 runtime click 不能自动升级成完整导航图。

## 11. Component、Token 和 Asset

Catalog 只保存稳定 Contract：

- Component props schema、slots、states、events、token bindings；
- Token ID、category、default value 和 Theme override；
- Asset identity、mime、digest 和 Source / Blob ref；
- Navigation 和 Screen Contract。

```ts
type PrototypeManifest = {
  prototypeId: string;
  defaultThemeId: string;
  themeIds: string[];
  screens: Array<{
    screenId: string;
    canonicalRuntimeUrl: string;
    defaultVariantId: string;
  }>;
  digest: string;
};

type PrototypeManifestRevision = PersistedIdentity & {
  prototypeCatalogRevisionId: string;
  manifest: PrototypeManifest;
};

type VariantManifest = {
  screenId: string;
  variants: Array<{
    variantId: string;
    type:
      | "default"
      | "loading"
      | "empty"
      | "error"
      | "validation-error"
      | "overlay"
      | "business";
    critical: boolean;
    fixtureRef?: string;
    canonicalRuntimeUrl: string;
  }>;
};

type ComponentContract = {
  componentId: string;
  propsSchemaRef: string;
  sensitivePropNames: string[];
  slots: string[];
  states: string[];
  events: string[];
  tokenBindings: Record<string, string>;
};

type ComponentContractCatalog = PersistedIdentity & {
  componentCatalogRevisionId: string;
  components: ComponentContract[];
};

type TokenContract = {
  tokenId: string;
  category: string;
  defaultValue: string | number;
  themeOverrides: Record<string, string | number>;
};

type TokenCatalog = PersistedIdentity & {
  tokenCatalogRevisionId: string;
  tokens: TokenContract[];
};

type AssetContract = {
  assetId: string;
  mime: string;
  digest: string;
  sourceRef?: SourceRef;
  blobRef?: string;
};

type AssetCatalog = PersistedIdentity & {
  assetCatalogRevisionId: string;
  assets: AssetContract[];
};

type NavigationCatalogRevision = PersistedIdentity & {
  navigationCatalogRevisionId: string;
  graph: NavigationGraph;
};

type SemanticSnapshot = {
  caseId: string;
  regions: RegionEvidence[];
  elements: ElementEvidence[];
  states: StateValue[];
  overlays: OverlayEvidence[];
  components: ComponentInstanceEvidence[];
  tokens: ResolvedTokenEvidence[];
  refs: EvidenceRef[];
};
```

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

Issue 使用闭集错误码：

```ts
type EvidenceIssueCode =
  | "PROTOCOL_MISMATCH"
  | "PREFLIGHT_STALE"
  | "PREFLIGHT_WARNING_NOT_ACCEPTED"
  | "RUNTIME_NOT_READY"
  | "VARIANT_NOT_REACHABLE"
  | "SCENARIO_NOT_REACHABLE"
  | "SCENARIO_STEP_FAILED"
  | "SCENARIO_NAVIGATION_UNSUPPORTED"
  | "CASE_DIMENSION_MISMATCH"
  | "SCREEN_CONTRACT_MISSING"
  | "SEMANTIC_CONTRACT_INVALID"
  | "DUPLICATE_PB_ID"
  | "DUPLICATE_PB_KEY"
  | "SOURCE_DEPENDENCY_UNRESOLVED"
  | "SOURCE_RUNTIME_CONFLICT"
  | "ACTION_UNRESOLVED"
  | "TOKEN_BINDING_UNRESOLVED"
  | "OVERLAY_NOT_VISIBLE"
  | "SCREENSHOT_FAILED"
  | "LAYOUT_UNSTABLE"
  | "STORE_LOCKED"
  | "STORE_TRANSACTION_INTERRUPTED"
  | "BUNDLE_ARCHIVED"
  | "BUNDLE_ID_CONFLICT"
  | "BLOB_REF_INVALID"
  | "UPLOAD_SESSION_INVALID"
  | "CAPACITY_LIMIT_EXCEEDED"
  | "RUNTIME_ORIGIN_REJECTED"
  | "GENERIC_RUNTIME_LIMITATION"
  | "SCREENSHOT_ONLY_LIMITATION"
  | "WORKSPACE_NOT_CONNECTED"
  | "WORKSPACE_MISMATCH"
  | "BUNDLE_NOT_FOUND"
  | "BUNDLE_SNAPSHOT_NOT_FOUND"
  | "BUNDLE_SCHEMA_UNSUPPORTED"
  | "HANDOFF_REFERENCE_MISSING"
  | "EVIDENCE_STALE"
  | "EVIDENCE_PARTIAL";

type EvidenceIssue = PersistedIdentity & {
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

type IssueCollection = PersistedIdentity & {
  issueCollectionId: string;
  bundleId: string;
  captureRunId?: string;
  bundleSnapshotId?: string;
  issues: EvidenceIssue[];
};
```

```ts
type CoverageReport = PersistedIdentity & {
  coverageId: string;
  scope:
    | { kind: "run"; captureRunId: string }
    | { kind: "snapshot"; bundleSnapshotId: string };
  selected: { screens: number; cases: number; fragments: number };
  discovered: { screens: number; variants: number };
  captured: { screens: number; cases: number; fragments: number };
  reusedCases: number;
  requiredSemanticNodes: number;
  validSemanticNodes: number;
  explicitSemanticCoverage: number | null;
  heuristicFallbackRate: number | null;
  traceableFactRate: number | null;
  sourceOnlyStates: number;
  failedCases: number;
  skippedCases: number;
  unsupportedCases: number;
  cancelledCases: number;
  interruptedCases: number;
  missingCases: number;
  unstableCases: number;
  staleCases: number;
  caseDetails: Array<{
    caseId: string;
    activeEvidenceRevisionId?: string;
    latestAttemptStatus: CaseAttemptStatus;
    stale?: boolean;
    issueRefs: EvidenceRef[];
  }>;
};
```

口径：

- explicit semantic coverage = valid required nodes / all required nodes；
- required denominator 是所选 Screen Contract `requiredSemanticNodes` 按当前 fixture keys 展开的总数，不来自“已标记节点”；fixture path 无法解析时生成 Contract Issue，不能缩小分母；
- Agent-facing fact 是 `read_evidence` 正常摘要中返回的一个 `EvidenceFact`；candidate、debug DOM、Trace 和 raw Source 不单独计为 fact；
- heuristic fact 是 effective candidate 为 heuristic，或 unresolved fact 的全部 candidate 都是 heuristic；
- traceable fact 要求 effective candidate refs 非空；unresolved conflict 要求所有返回 candidate refs 非空；
- 所有 rate 以 `0..1` 小数保存，展示时统一保留两位百分比；分母为零时值为 `null` 并生成说明，不以 100% 代替；
- Coverage 同时输出 Case 明细，不能只给汇总数字。

## 13. Scenario

Variant 是可直接 prepare 的稳定初态；Scenario 是显式动作序列；Checkpoint 生成独立 Case。

```ts
type ScenarioTarget =
  | { actionId: string }
  | { pbId: string; pbKey?: string };

type ScenarioStepBase = {
  stepId: string;
  timeoutMs: number;
  preconditions: StatePredicate[];
  failurePolicy: "stop-scenario" | "skip-remaining";
};

type ScenarioStep =
  | (ScenarioStepBase & { kind: "click-action"; target: ScenarioTarget })
  | (ScenarioStepBase & { kind: "fill"; target: ScenarioTarget; value: string })
  | (ScenarioStepBase & { kind: "select"; target: ScenarioTarget; value: string })
  | (ScenarioStepBase & {
      kind: "swipe";
      target: ScenarioTarget;
      direction: "up" | "down" | "left" | "right";
      distance: number;
    })
  | (ScenarioStepBase & {
      kind: "scroll";
      target?: ScenarioTarget;
      x: number;
      y: number;
    })
  | (ScenarioStepBase & { kind: "wait"; durationMs: number })
  | (ScenarioStepBase & { kind: "assert-state"; predicates: StatePredicate[] })
  | (ScenarioStepBase & { kind: "capture" });

type CaptureCheckpoint = {
  checkpointId: string;
  afterStepId: string;
  expectedScreenId: string;
  expectedVariantId: string;
  capture: Array<"semantic-snapshot" | "viewport" | "full-page" | "fragments" | "overlay">;
};

type CaptureScenario = {
  scenarioId: string;
  screenId: string;
  startVariantId: string;
  critical: boolean;
  steps: ScenarioStep[];
  checkpoints: CaptureCheckpoint[];
};

type ScenarioManifest = PersistedIdentity & {
  scenarioCatalogRevisionId: string;
  screenId: string;
  scenarios: CaptureScenario[];
};

type ScenarioStepResult = {
  caseId: string;
  scenarioId: string;
  stepId: string;
  status: "completed" | "failed" | "navigation-started";
  observedScreenId?: string;
  observedVariantId?: string;
  navigationIntent?: {
    expectedUrl?: string;
    expectedScreenId?: string;
  };
  issueRefs: EvidenceRef[];
};
```

每个 Step 必须引用 Action Contract 或稳定 pbId，具有超时、前置断言和失败策略。CSS selector 不能成为正式 Scenario Contract。每次 Scenario 从新 Context 或通过验证的 reset 开始。

执行规则：

1. Core 从 `startVariantId` 创建隔离 Context、导航并 prepare Base Case；
2. Core 按顺序调用 `execute-scenario-step`；
3. Step 返回 `navigation-started` 时，Core 等待 SPA / history 导航并重新验证目标 Screen / Variant；
4. 到达 `afterStepId` 后，Core 验证 Checkpoint 的 expected identity，再执行 semantic snapshot 和 Screenshot；
5. 每个 Checkpoint 使用 `{screenId, variantId, themeId, deviceId, scenarioId, checkpointId}` 生成独立 Case；
6. Step 失败时记录 `SCENARIO_STEP_FAILED`，未到达的 Checkpoint 为 skipped；已成功事务提交的 Checkpoint 不回滚；
7. Scenario 结束后关闭 Context；只有 Runtime 明确支持且验证通过时才允许 reset 后复用。

## 14. Agent Handoff

```ts
type HandoffCaseSelection =
  | {
      caseId: string;
      evidenceRevisionId: string;
      latestAttemptStatus: "captured" | "reused";
    }
  | {
      caseId: string;
      evidenceRevisionId?: string;
      latestAttemptStatus:
        | "failed"
        | "skipped"
        | "unsupported"
        | "cancelled"
        | "interrupted";
    };

type AgentHandoff = PersistedIdentity & {
  handoffId: string;
  workspaceId: string;
  bundleId: string;
  bundleSnapshotId: string;
  stalenessReportId: string;
  prototypeId: string;
  selection: {
    screens: Array<{
      screenId: string;
      screenContractRevisionIds: string[];
    }>;
    cases: HandoffCaseSelection[];
    fragments?: Array<{
      caseId: string;
      evidenceRevisionId: string;
      fragmentRef: string;
    }>;
  };
  intent?: string;
  recommendedResources: string[];
  coverageSummary: {
    coverageId: string;
    status: "complete" | "partial" | "stale" | "partial-stale";
    selectedCases: number;
    capturedCases: number;
    reusedCases: number;
    failedCases: number;
    skippedCases: number;
    unsupportedCases: number;
    cancelledCases: number;
    interruptedCases: number;
    missingCases: number;
    staleCases: number;
  };
  riskAcceptance?: {
    accepted: Array<"partial" | "stale">;
    acceptedAt: string;
    coverageId: string;
    stalenessReportId: string;
  };
  unknowns: UnknownFact[];
};
```

Handoff 是 Evidence 生产生命周期与目标实现生命周期之间的任务索引，不是 Evidence 副本。

生成条件：

- Bundle Snapshot 已完成事务提交并可由 Store Reader 读取；
- Handoff 中的 Screen、Case、Fragment 和 `recommendedResources` 全部可解析；
- Snapshot Coverage 已读取，Staleness Report 已针对该 Snapshot 重新生成；
- `workspaceId` 与 Bundle Identity 一致；
- `status` 由 failed / skipped / unsupported / cancelled / interrupted / 缺失与 stale 的组合确定，不能由 UI 手工选择；
- complete、partial、stale 和 partial-stale 均可生成，但非 complete 必须保留风险摘要，不得伪装成完整采集；
- 用户确认继续交接 partial 或 stale 时写入 `riskAcceptance`；没有对应确认时不得生成非 complete Handoff。

`complete` 要求所有 selected Case 的 latest attempt 为 captured 或 reused、都具有 active Evidence revision 且不 stale。任一 selected Case 为 failed、skipped、unsupported、cancelled、interrupted、缺失或无 active revision 时为 partial。partial 与 stale 同时存在时为 partial-stale。

`recommendedResources` 只能使用包含 Snapshot 或 object revision 的 `proto-bridge://` URI；禁止使用省略 revision 的“当前对象”URI。

Handoff 禁止包含：

- Store root、绝对 Evidence 路径或 Source 绝对路径；
- target root；
- Flutter 文件、Widget Tree、路由、状态框架、组件或 Token 映射；
- 内嵌的完整 Case Evidence、截图或 Debug Blob；
- 从名称相似度生成的目标建议。

目标工程规范由 Agent 在目标仓库读取；source component 不等同于 target component。

### 14.1 Consumer 读取顺序

Consumer 必须按以下顺序解析 Handoff：

```text
验证 Handoff schemaVersion、schemaRevision 和 semanticVocabularyVersion
→ 验证 MCP 当前 workspaceId
→ 读取 Handoff 指定的 Bundle Snapshot
→ 读取 Snapshot Coverage 与 Handoff Staleness Report
→ 读取 selection 指定 revision 的 Screen Contract
→ 读取指定 revision 的 Case / Fragment
→ 按 recommendedResources 和 refs 读取 Screenshot / Asset
→ 读取相关 Issue 和 unknown
→ 读取目标仓库
→ 实现与验证
```

默认读取小型结构化摘要。未被当前 Selection 或 ref 引用的 Prototype 全量 Case、raw DOM、Source 全文和 Trace 不得预加载。

### 14.2 Consumer 错误

MCP、PBWork 和 Consumer 文档共用以下错误语义：

```text
WORKSPACE_NOT_CONNECTED
WORKSPACE_MISMATCH
BUNDLE_NOT_FOUND
BUNDLE_SNAPSHOT_NOT_FOUND
BUNDLE_SCHEMA_UNSUPPORTED
HANDOFF_REFERENCE_MISSING
EVIDENCE_STALE
EVIDENCE_PARTIAL
```

- `WORKSPACE_NOT_CONNECTED`：MCP 未连接任何 PB Workspace；
- `WORKSPACE_MISMATCH`：Handoff 的 `workspaceId` 与 MCP 当前 Workspace 不一致；
- `BUNDLE_NOT_FOUND`：当前 Workspace Store 中不存在 `bundleId`；
- `BUNDLE_SNAPSHOT_NOT_FOUND`：Bundle 存在，但 Handoff 固定的 Snapshot 不存在；
- `BUNDLE_SCHEMA_UNSUPPORTED`：Reader 不支持 Bundle major；
- `HANDOFF_REFERENCE_MISSING`：Handoff 引用的 Screen、Case、Fragment 或 resource 不存在；
- `EVIDENCE_STALE`：选中范围包含 stale Case；
- `EVIDENCE_PARTIAL`：选中范围存在 failed、skipped、unsupported、cancelled、interrupted、缺失或无 active Evidence 的 Case。

前六项阻止消费并要求修正连接或重新生成 Handoff。`EVIDENCE_STALE` 和 `EVIDENCE_PARTIAL` 必须显式告知 Agent 和用户。Handoff 已包含相应 `riskAcceptance` 时 Agent 可以继续，但仍须在实现结果中报告风险；未包含时停止并请求任务发起者决定。PB 不补齐缺失事实。
