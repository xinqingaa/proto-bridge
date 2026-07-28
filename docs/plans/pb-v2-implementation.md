# ProtoBridge V2 实施规格

> 权威范围：代码落点、Capture、Store、Service、PBWork、CLI、MCP、Target、迁移和测试
> 上位决策：[V2 重构计划](./pb-pbwork-v2-rearchitecture.md)
> 数据与协议：[V2 Contract 规范](./pb-v2-contracts.md)
> PBWork 交互：[PBWork V2 Capture 体验规格](./pbwork-v2-capture-experience.md)

本文件描述完整 V2 如何实现。工作包可拆任务和提交，但不能作为缩水发布范围。

阅读入口：

- 改 Core：包边界、Source、Runtime、Capture 和 Store；
- 改 PBWork：Runtime 接入、Local Service 和 PBWork Capture；
- 改 CLI / MCP / Target：对应接口章节、配置和正式切换；
- 拆实施任务：工作包、测试矩阵和正式切换。

## 1. 包边界

```text
packages/
├── core/
│   └── src/
│       ├── contracts/
│       ├── runtime-protocol/
│       ├── selection/
│       ├── capture/
│       ├── evidence/
│       ├── store/
│       └── source/
├── local-service/
│   └── src/
│       ├── server/
│       ├── jobs/
│       ├── events/
│       └── store/
├── cli/
├── mcp-server/
└── target-flutter/

apps/
└── pbwork/
    └── src/
        ├── capture/
        ├── runtime/
        ├── design-system/
        └── prototypes/
```

规则：

- 产品逻辑进入 Core；
- Service 只负责 HTTP、Job、并发、Event 和进程边界；
- CLI、MCP 和 PBWork 不复制 Selection、Capture、Evidence 或 Store 逻辑；
- PBWork 浏览器端不 import Node、文件系统或 Playwright；
- target-flutter 不被 Core Capture import；
- Capability 根据配置自动暴露，不引入人物角色或运行模式。

## 2. Source Adapter

Source Adapter 是可选增强，负责：

- route / screen → Source entry；
- SFC 和本地 component 依赖闭包；
- 条件、循环、computed 和未渲染分支；
- Variant、fixture、mock 和 action binding；
- 共享 Shell；
- Source location refs。

边界：

- DS Component 转为 Contract ref，不重复解析内部 DOM；
- 限制深度和文件数量；
- 检测循环依赖；
- unresolved import 生成 Issue；
- 不复制完整 Source 到 Screen Contract；
- Core 不包含真实项目业务词表、目录或 token mapping；
- Source 不覆盖当前 Runtime 可见事实。

## 3. Runtime Protocol 接入

PBWork pure Runtime 挂载 `window.__PROTO_BRIDGE_V2__`。

实现顺序：

1. describe / version negotiation；
2. Prototype Manifest；
3. Screen / Variant / Component / Token Contract；
4. Navigation Graph；
5. prepare-case；
6. wait-until-stable；
7. semantic-snapshot；
8. execute-scenario；
9. reset-case。

Workbench Bridge 保持独立，只负责 iframe 选择、高亮、评论和导航同步。

Capture mode 必须：

- 以 Case theme 为权威；
- 忽略 Ledger Planet 当前会话主题偏好；
- 使用声明 fixture；
- 拒绝未知 Variant、Theme 和业务 query；
- 通过 preflight 检查 duplicate pbId、pbKey、unknown role / component / action；
- 返回实际维度和 revision；
- 失败时不渲染另一个默认状态冒充成功。

## 4. Playwright Capture Orchestrator

### 4.1 生命周期

```text
Capture Job
→ resolve Selection
→ discover Manifest
→ build Case Matrix
→ start/reuse Browser
→ create isolated BrowserContext
→ configure environment
→ prepare Case
→ wait Runtime + font + stable frames
→ execute Scenario
→ capture checkpoints
→ write Case transaction
→ update Run
→ atomically update Bundle Manifest
```

### 4.2 确定性环境

每个 Case 记录并固定：

- viewport 和 deviceScaleFactor；
- locale 和 timezone；
- color scheme 和 reduced motion；
- 系统时间；
- fixture 和网络策略；
- 字体加载；
- 动画和 caret；
- 滚动位置。

随机性优先通过 fixture 消除。只允许对 `Math.random` 使用声明 seed，不替换 Web Crypto。

外部网络默认 `deny-unregistered`。已登记 HAR / route policy 或 explicit generic URL 才能访问。未登记请求产生 Issue。

### 4.3 Browser 与并发

- Job 内复用 Browser；
- 独立 Case 使用隔离 BrowserContext；
- 默认并发 2；
- 有共享状态或 Scenario 链的 Case 串行；
- 单 Case 失败不终止其他 Case；
- 失败 Case 可通过新 Run 重试；
- 取消关闭对应 Context；
- 超过 `maxCasesPerJob` 在启动前拒绝。

### 4.4 Stability

```text
goto canonical URL
→ Runtime prepare
→ document.fonts.ready
→ Runtime wait-until-stable
→ disable animation / caret
→ consecutive stable frames
→ snapshot + screenshot
```

不能只依赖 `networkidle`。

### 4.5 Screenshot 与 Trace

支持：

- viewport；
- full-page；
- fragment；
- overlay；
- 必要时的 scroll segment。

viewport 默认开启，其余由 Selection 指定。Screenshot 以 Blob digest 存储，metadata 保存 logical name 和 Case 维度。

成功 Case 不保存 Trace；失败、超时和不稳定 Case 保存 Trace、console error、page error 和 failed request。

## 5. Evidence Store

### 5.1 目录

```text
.proto-bridge/
└── evidence/
    └── <bundleId>/
        ├── manifest.json
        ├── catalog/
        │   ├── prototype.json
        │   ├── navigation.json
        │   ├── tokens.json
        │   ├── components.json
        │   ├── assets.json
        │   └── screens/<screenKey>/contract.json
        ├── cases/<caseId>/evidence.json
        ├── runs/<captureRunId>/
        │   ├── manifest.json
        │   ├── selection.json
        │   ├── cases.json
        │   ├── coverage.json
        │   ├── issues.json
        │   └── capture-log.jsonl
        ├── blobs/<sha256>.<ext>
        └── debug/<captureRunId>/
            ├── raw-dom/
            ├── raw-source/
            └── traces/
```

### 5.2 Transaction

- 所有写入先进入 Bundle 内事务目录；
- Schema、ref、digest 和容量校验成功后 atomic rename；
- Bundle 使用跨进程写锁；
- 锁记录 owner、PID、startedAt 和 lease；
- 过期锁经过进程存活检查后才能回收；
- Manifest 最后写；
- 崩溃后旧 Manifest 始终指向完整 Case 集；
- 启动时检查 orphan transaction、无引用 Blob 和 interrupted Run。

### 5.3 Digest 与 Stale

Case `inputDigest` 包含：

- CaseKey；
- fixture digest；
- Prototype Manifest；
- Runtime revision；
- Source revision；
- Component / Token Contract；
- Device；
- locale、timezone、clock；
- network policy；
- capture engine version；
- screenshot policy。

Digest 相同可复用；任一输入改变则 Case stale。

### 5.4 容量

- Blob 使用 SHA-256 去重；
- 大 JSON gzip 后存 Blob；
- 截图不内嵌 JSON；
- 生成缩略图供 PBWork 列表使用；
- raw DOM / source / trace 有独立容量和保留期；
- 配置 `maxBundleBytes / maxDebugBytes / maxRuns / retentionDays`；
- active Case、active Run 和被引用 Blob 不得清理；
- `pb clean` 必须先 dry-run。

## 6. PB Local Service

### 6.1 API

```text
GET  /api/v2/status
GET  /api/v2/prototypes
POST /api/v2/capture-preflight
GET  /api/v2/bundles
GET  /api/v2/bundles/:bundleId
GET  /api/v2/bundles/:bundleId/runs/:captureRunId
GET  /api/v2/bundles/:bundleId/cases/:caseId
GET  /api/v2/bundles/:bundleId/blobs/:sha256
POST /api/v2/bundles/:bundleId/handoffs
POST /api/v2/input-blobs
POST /api/v2/capture-jobs
GET  /api/v2/capture-jobs/:jobId
POST /api/v2/capture-jobs/:jobId/cancel
POST /api/v2/capture-jobs/:jobId/retry-selection
GET  /api/v2/events
```

接口边界：

| 接口                                | 作用                                                                        | 是否创建 Run |
| ----------------------------------- | --------------------------------------------------------------------------- | ------------ |
| `GET /prototypes`                   | 返回可选 Prototype、Screen、Variant、Theme 和 Device                        | 否           |
| `POST /capture-preflight`           | 校验 Selection 并返回规范化 Selection、Case Matrix、阻塞 Issue 和预计容量   | 否           |
| `POST /capture-jobs`                | 只接受通过同一 revision preflight 的 `CaptureRequest`                       | 是           |
| `GET /capture-jobs/:jobId` / events | 返回 Job、Case 进度和最终 Run 引用                                          | 否           |
| `cancel`                            | 请求取消尚未完成的 Case                                                     | 否           |
| `retry-selection`                   | 从失败、interrupted 或 stale 范围派生新的 Selection Draft，再进入 Preflight | 否           |
| Bundle / Run / Case / Blob GET      | 读取 Store 投影                                                             | 否           |
| `POST /bundles/:bundleId/handoffs`  | 校验选择引用并生成 `AgentHandoff`                                           | 否           |

Preflight 返回 `preflightRevision`。创建 Job 时 Core 重新检查 Manifest、Runtime revision、Selection 和 Case 数；revision 失效时返回 `PREFLIGHT_STALE`，不能使用旧 Matrix 启动。

### 6.2 Job

状态：

```text
queued
discovering
capturing
writing
completed
partial
failed
interrupted
cancelled
```

Job 状态写入 Run。Service 重启时：

- queued 可以恢复；
- discovering / capturing / writing 转为 interrupted；
- 只有显式生成 retry Selection、重新 Preflight 并创建新 Job 后才继续；
- 最终状态以落盘 Run 和 Job GET 为准。

SSE 使用 event ID；客户端通过 `Last-Event-ID` 补读。

### 6.3 安全

- 只监听 `127.0.0.1`；
- 启动生成 bearer session token；
- 严格 Origin allowlist 和 CORS；
- Runtime 只允许 `http:` / `https:`；
- 阻止 `file:`、`data:`、`javascript:`、凭据 URL和未允许重定向；
- Source / Store realpath containment；
- 拒绝 symlink escape；
- 客户端不能提交任意 output / source path；
- 客户端不能提交任意 output / source / screenshot path；
- screenshot-only 输入先通过有大小、MIME 和 digest 校验的 input Blob 接口暂存；
- input Blob 具有短 TTL，只能被同一 Job 引用；成功写入 Bundle 后使用正式 Blob ref，未使用输入自动清理；
- 不执行任意 shell；
- 限制 payload、Job 数、Case 数、并发和日志；
- Blob 校验归属、digest、mime 和大小；
- 日志不得包含 token、Source 全文、绝对 Source 路径或敏感 query。

这些是本地进程与文件安全，不是用户角色权限。

## 7. PBWork Capture

PBWork 的完整用户路径、状态和验收以 [PBWork V2 Capture 体验规格](./pbwork-v2-capture-experience.md) 为准。本计划不规定 PBWork 一级或二级导航，只规定 PBWork 通过现有导航进入 Capture 后必须保留当前 Prototype / Screen / Variant 上下文。

PBWork 必须实现四条等价入口：

1. 当前 Screen；
2. 画布选中的 Fragment；
3. 自定义多 Screen / Variant；
4. 整个 Prototype。

所有入口统一经过：

```text
Selection Draft
→ Preflight
→ Case Matrix 确认
→ Capture Job
→ Coverage / Issue / Evidence 检查
→ retry / stale recapture
→ Agent Handoff
```

PBWork 不使用“翻译代码”描述 Capture，不生成目标工程实现计划。浏览器端只通过 Local Service 操作，不直接访问文件系统、Store 或 Playwright。

## 8. CLI

V2 binary 固定为 `pb`。完整顶层命令：

```text
pb init
pb serve
pb capture
pb inspect
pb clean
pb doctor
```

### 8.1 Capture

输入模式互斥：

```bash
pb capture --prototype ledger-planet --variants critical
pb capture --screen ledger-planet.ledger-list --variants all
pb capture --url https://example.test/page \
  --prototype external --screen external.example
pb capture --screenshot /path/page.png \
  --prototype external --screen external.example
pb capture --selection selection.json
pb capture --bundle <bundleId> --selection retry.json
```

- flags 是 CaptureSelection 的投影；
- 三种输入模式统一映射到 Contract 中的 `CaptureRequest`；
- CLI 先校验 screenshot 本地路径并转成 input Blob，Job 不接收原始路径；
- 复杂选择使用 `--selection`；
- `--bundle` 向既有 Bundle 增加新 Run；
- 无 Service 时 CLI 嵌入同一个 JobHost，不复制 Job 逻辑。

### 8.2 Inspect

```bash
pb inspect prototypes
pb inspect bundles
pb inspect --bundle <bundleId>
pb inspect --bundle <bundleId> --screen <screenId>
pb inspect --bundle <bundleId> --case <caseId>
pb inspect storage
```

支持 `--format text|markdown|json`。人类视图从 Bundle 投影，不持久化重复 Review Markdown。

### 8.3 Clean

```bash
pb clean --dry-run
pb clean --apply <planId>
```

dry-run 返回短期有效的 planId、目标和预计释放容量；apply 前重新校验 active refs 和 Store revision。只清理 retention 允许的历史 Run、debug 和无引用 Blob。

### 8.4 Exit Code

| Code | 含义                    |
| ---- | ----------------------- |
| 0    | completed               |
| 1    | 参数或配置错误          |
| 2    | Runtime / Source 不可用 |
| 3    | partial，Bundle 已生成  |
| 4    | 全部 Case 失败          |
| 5    | Store 写入失败          |
| 6    | Protocol 不兼容         |

## 9. MCP

完整工具：

```text
discover_prototypes
discover_bundles
capture_selection
read_evidence
read_target_context
find_target_examples
validate_target_changes
```

工具按配置能力自动暴露：

| 配置                                 | 工具                                   |
| ------------------------------------ | -------------------------------------- |
| Runtime + Store + JobHost            | discover_prototypes、capture_selection |
| Store                                | discover_bundles、read_evidence        |
| Target adapter + 当前 target context | target context、examples、validation   |

MCP Server 启动时连接一个 PB Workspace。Evidence tools 只读取该 Workspace 的 Store；不接受 Agent 在 tool argument 中传入任意 Store 路径。`discover_bundles` 返回当前 `workspaceId`，`read_evidence` 必须校验输入中的 `workspaceId`。

Target context 与 Store 连接独立：target tool 显式 `targetRoot` 优先，否则使用当前 Agent 工作目录。目标工程不需要 ProtoBridge 配置文件。

### 9.1 Read Evidence

```ts
type ReadEvidenceInput =
  | { workspaceId: string; kind: "manifest"; bundleId: string }
  | { workspaceId: string; kind: "run"; bundleId: string; captureRunId: string }
  | {
      workspaceId: string;
      kind: "coverage";
      bundleId: string;
      captureRunId?: string;
    }
  | { workspaceId: string; kind: "screen"; bundleId: string; screenId: string }
  | { workspaceId: string; kind: "case"; bundleId: string; caseId: string }
  | {
      workspaceId: string;
      kind: "fragment";
      bundleId: string;
      caseId: string;
      fragmentRef: string;
    }
  | { workspaceId: string; kind: "issue"; bundleId: string; issueId: string }
  | { workspaceId: string; kind: "debug"; bundleId: string; ref: string };
```

Resources：

```text
proto-bridge://workspaces/{workspaceId}/bundles/{bundleId}/manifest
proto-bridge://workspaces/{workspaceId}/bundles/{bundleId}/coverage
proto-bridge://workspaces/{workspaceId}/bundles/{bundleId}/screens/{screenId}
proto-bridge://workspaces/{workspaceId}/bundles/{bundleId}/runs/{captureRunId}
proto-bridge://workspaces/{workspaceId}/bundles/{bundleId}/cases/{caseId}
proto-bridge://workspaces/{workspaceId}/bundles/{bundleId}/cases/{caseId}/fragments/{fragmentRef}
proto-bridge://workspaces/{workspaceId}/bundles/{bundleId}/blobs/{sha256}
```

规则：

- 默认返回小型结构化摘要和 refs；
- 截图使用 image resource；
- raw DOM 和 Trace 只在 debug 请求时返回；
- MCP 重启不影响 Bundle；
- resource 不依赖创建 Bundle 的进程；
- Workspace 未连接或不匹配时返回 Contract §14.2 的结构化错误；
- tool 和 resource 都不暴露 Store 物理路径；
- target 工具不写 Evidence Bundle。

## 10. Target Flutter

Flutter 能力迁移到 `packages/target-flutter`：

- 读取目标工程文档；
- 识别 routing、state、i18n、theme、component 和 file organization；
- 按 role / symbol / pattern 查找示例；
- 验证 target git changes；
- 返回文件和行号。

禁止：

- Capture 时自动扫描 target；
- 写入 Evidence Bundle；
- 生成 Widget Tree 或 target file tree；
- 按 source 名称自动选择 route / component / token；
- 因 target unknown 阻塞 Evidence 生成。

## 11. 配置

采集工作区示例：

```json
{
  "schemaVersion": 2,
  "workspace": {
    "id": "pbwork-local",
    "root": "./apps/pbwork"
  },
  "runtime": {
    "baseUrl": "http://127.0.0.1:5173",
    "protocol": "proto-bridge-v2",
    "allowedOrigins": ["http://127.0.0.1:5173"]
  },
  "source": {
    "enabled": true,
    "adapter": "vue3-prototype",
    "root": "./apps/pbwork"
  },
  "store": {
    "root": "./.proto-bridge/evidence",
    "maxBundleBytes": 1073741824,
    "maxDebugBytes": 268435456,
    "maxRuns": 50,
    "retentionDays": 30
  },
  "service": {
    "host": "127.0.0.1",
    "port": 4317,
    "allowedWorkbenchOrigins": ["http://127.0.0.1:5173"]
  },
  "capture": {
    "concurrency": 2,
    "maxCasesPerJob": 250,
    "trace": "on-failure",
    "screenshots": ["viewport"],
    "defaultDeviceId": "phone-390x844",
    "devices": {
      "phone-390x844": {
        "viewport": { "width": 390, "height": 844 },
        "deviceScaleFactor": 1
      }
    },
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai",
    "fixedTime": "2026-01-15T08:00:00.000Z",
    "network": "deny-unregistered"
  }
}
```

### 11.1 配置所有权

上面的 JSON 是 PB 采集工作区的唯一项目配置，归 PB Workspace 所有。PBWork、CLI 和 producer MCP 通过它连接同一个 Runtime、Source、Service 和 Store。

目标工程不得为了消费 Evidence 创建或提交 `proto-bridge.config.json`。尤其禁止在目标工程中保存：

- PB Workspace 的 Store root；
- PB Source root；
- Bundle 的物理路径；
- 为某次任务固定的 target root。

### 11.2 MCP 连接

MCP 到 Evidence Store 的连接属于用户、Codex 或 IDE 的运行环境配置。MCP 使用 `--config` 指向 PB 采集工作区配置，而不是目标工程内的配置：

```toml
[mcp_servers.proto-bridge]
command = "node"
args = [
  "/path/to/proto-bridge/packages/mcp-server/dist/index.js",
  "--config",
  "/path/to/pb-workspace/proto-bridge.config.json"
]
```

V2 本地范围内，一个 MCP Server 进程只连接一个 PB Workspace。Handoff 的 `workspaceId` 必须与之匹配。未来若需要同时连接多个 Workspace，应单独设计 Store Registry；V2 不通过任意路径参数实现隐式多 Store。

### 11.3 Target context

Target Adapter 解析目标根目录的优先级固定为：

```text
单次 target tool 的 targetRoot
→ 当前 Agent 工作目录
```

- `targetRoot` 是目标查询和验证的调用上下文，不属于 Evidence 或 PB Workspace 配置；
- 常规情况下 Agent 已位于目标仓库，因此无需显式传入；
- MCP 宿主无法保证工作目录时，由调用方在 target tool 参数中传入；
- Target Adapter 不读取 Store 配置，不写 Bundle。

### 11.4 Consumer Skill 草案

V2 契约尚未实现，当前不创建 `skills/proto-bridge-consumer/SKILL.md`。以下内容是随计划审查的草案；只有 Contract、MCP tools、Handoff 和端到端测试定稿后，才按草案创建正式 Skill 并同步使用指南。

```md
---
name: proto-bridge-consumer
description: Use when implementing or validating a target application from a ProtoBridge V2 Agent Handoff and Evidence Bundle.
---

# ProtoBridge V2 Evidence Consumer

本 Skill 只用于目标工程中的实现与验证，不用于维护 ProtoBridge、制作 PBWork 原型或执行上游 Capture。

## 输入

- 一个 `AgentHandoff`
- 已连接 Handoff `workspaceId` 的 ProtoBridge MCP
- 当前目标工程

Handoff 不是完整 Evidence，也不是目标实现计划。不得仅根据 Handoff 字段开始编写代码。

## 必读顺序

1. 校验 Handoff `schemaVersion`
2. 确认 MCP 当前 `workspaceId` 与 Handoff 一致
3. 读取 Bundle Manifest
4. 读取 Coverage
5. 读取 Handoff selection 指定的 Screen Contract
6. 读取 Case 或 Fragment Evidence
7. 按 `recommendedResources` 和 Evidence refs 读取 Screenshot、Asset、Issue 与 unknown
8. 阅读目标仓库代码、文档和现有测试

默认只读当前任务需要的 Evidence。除非调试采集问题，不预加载整个 Prototype、raw DOM、Source 全文或 Trace。

Handoff 为 partial、stale 或 partial-stale 时，先检查 `riskAcceptance` 是否包含对应风险；缺少确认则停止并请求任务发起者决定。已有确认时仍须在实现结果中报告风险。

## 实现边界

- ProtoBridge Evidence 决定已证明的原型事实
- 目标仓库决定文件组织、路由、状态管理、组件、Token、i18n 和测试方式
- Source component 不等同于 target component
- 名称相似只能用于查找候选，不能成为目标映射事实
- unknown、partial 和 stale 必须保留，不得自动补成确定结论

## 工作流

1. 总结本次 selection、Coverage、Issue、unknown 和 stale
2. 若存在阻断错误，停止实现并报告需要重采或修复的范围
3. 阅读目标仓库规范和相似实现
4. 决定目标文件、组件、状态、路由和 Token 表达
5. 实现当前 selection
6. 执行 format、静态检查和测试
7. 使用 `validate_target_changes` 检查目标变更
8. 报告实现结果、验证结果和仍未解决的 unknown

## 必须停止的错误

- `WORKSPACE_NOT_CONNECTED`
- `WORKSPACE_MISMATCH`
- `BUNDLE_NOT_FOUND`
- `BUNDLE_SCHEMA_UNSUPPORTED`
- `HANDOFF_REFERENCE_MISSING`

`EVIDENCE_STALE` 和 `EVIDENCE_PARTIAL` 必须显式报告；只有 Handoff 已记录相应 `riskAcceptance` 或任务发起者随后明确接受时才继续。

## 禁止

- 直接读取或解析 Evidence Store 文件目录
- 要求目标仓库保存 Store 绝对路径
- 把 Source DOM 或组件机械翻译成目标代码
- 把 source component 直接当作 target component
- 根据缺失证据编造业务动作、隐藏状态或页面关系
- 将目标工程扫描结果回写 Evidence Bundle
- 修改上游 Prototype 或 Capture Bundle
```

## 12. 实施工作包

### W1 Contract

- 建立 V2 Schema、类型和 fixture；
- 固定 ID、Vocabulary、Bundle / Run / Case / Blob；
- 固定 EvidenceValue、Issue 和 Coverage；
- 建立 invalid Contract 测试。

### W2 Runtime

- 实现 window Runtime Protocol；
- 暴露 Manifest、Screen、Variant、Navigation、Component 和 Token；
- 实现 prepare / stable / snapshot / scenario / reset；
- 增加 template lint 和 semantic preflight；
- 补齐全部现有 PBWork Prototype 标记。

### W3 Capture

- 实现 Selection resolver 和 Case Matrix；
- 合并旧 capture facade；
- 实现 Browser 复用、Context 隔离和确定性环境；
- 实现 screenshot、Scenario、failure isolation、retry、cancel 和 Trace。

### W4 Store

- 实现 Store interface 和 filesystem store；
- 实现 Catalog、Case、Run 和 Blob；
- 实现 digest、stale、增量、lock、transaction 和 recovery；
- 实现容量、retention 和 clean。

### W5 Service

- 实现 API、Job queue 和 SSE；
- 实现 cancel、retry、interrupted recovery；
- 实现 token、Origin、path 和 payload 安全。

### W6 PBWork

- 按 PBWork Capture 体验规格实现当前 Screen、选中 Fragment、自定义范围和整 Prototype 四条入口；
- 接入 Selection Draft、Preflight、Case Matrix 和 Job event；
- 实现 Evidence、Coverage、Issue、unknown、stale 和 screenshot view；
- 实现 retry、cancel、stale recapture 和 Handoff；
- 保持现有 Prototype / Screen / Variant 上下文，不在本计划规定侧边导航。

### W7 CLI / MCP

- 实现完整 CLI；
- 实现 capability-driven MCP tools；
- 实现带 `workspaceId` 的 Bundle resources；
- 实现 Workspace 连接校验和 Consumer 错误；
- 从 tool arguments 移除任意 Store path；
- 删除 MCP session page store。

### W8 Target

- 迁移 Flutter context、example search 和 validation；
- 从 Core Capture 移除 target import；
- target root 使用单次 tool 参数或当前 Agent 工作目录；
- 不要求目标工程 ProtoBridge 配置；
- 建立独立包测试。

### W9 Agent Consumer

- 定稿 Agent Handoff、Consumer 读取顺序和错误处理；
- 使用 §11.4 草案审查 Consumer Skill，但在 V2 契约定稿前不创建正式 Skill 文件；
- 编写 MCP 连接和目标工程消费使用指南；
- 建立“目标工程无 PB 配置”的 Agent 消费 E2E；
- 验证 complete、partial、stale、Workspace mismatch 和引用失效。

### W10 Migration

- 迁移 Registry 中全部 Prototype / Screen / Variant；
- 运行全量 PBWork Capture；
- 删除 V1 Planner、Artifact、CLI、MCP 和测试 fixture；
- Contract、MCP 和消费 E2E 定稿后，将 §11.4 草案落为正式 Consumer Skill；
- 更新配置、package exports、README、AGENT、docs 和 skills；
- 所有发布包升至 `0.2.0`。

## 13. 测试矩阵

### Contract

- Schema valid / invalid；
- ID、alias、Vocabulary；
- duplicate pbId / pbKey；
- Selection 和 stable caseId；
- provenance、unknown、issue 和 Evidence Level。

### Runtime

- version handshake；
- Manifest / Screen / Variant / Component / Token；
- prepare dimension match；
- theme session isolation；
- readiness 和 stable frames；
- scenario / reset；
- payload limit 和 stale runtime。

### Capture

- fixed clock、locale、timezone；
- context isolation；
- animation、font、caret；
- fragment、overlay、full-page；
- cancel、retry、partial 和 concurrency；
- failure Trace；
- screenshot repeatability。

### Store

- create、incremental update、stale；
- lock、lease 和 concurrent writer；
- atomic commit 和 interrupted recovery；
- Blob digest、dedup 和 ref integrity；
- compression、capacity、retention 和 clean；
- path containment 和 symlink escape。

### Service / PBWork

- token、Origin、CORS 和 URL policy；
- Job lifecycle 和 SSE replay；
- 当前 Screen、选中 Fragment、自定义多页和整 Prototype 四条路径；
- Selection Draft、Preflight、Matrix、超限和 stale preflight；
- progress、Issue、Evidence、Coverage、unknown 和 Handoff；
- 无稳定 pbId / pbKey 时阻止 instrumented Fragment Capture 并提供定位；
- complete、partial、failed、cancelled 和 stale 的界面状态与可用操作；
- Service restart。

### CLI / MCP

- flags 与 Selection JSON 等价；
- 完整命令和 exit code；
- 按配置暴露工具；
- persistent read；
- Case / Run / Fragment / Blob resource；
- Workspace 连接与 Handoff `workspaceId` 校验；
- Store path 不出现在 tool input、resource 或 Handoff；
- targetRoot 参数 / 当前工作目录优先级；
- process restart；
- target query 与 Capture 独立。

### 全量闭环

- Ledger Planet 18 Screens / 54 Variants；
- Field Service 和 Project 不退化；
- 四种 Evidence Level；
- PBWork 当前 Screen → Handoff → MCP → 目标实现；
- PBWork 画布 Fragment → Handoff → MCP → 局部实现；
- PBWork 多 Screen / 整 Prototype → Bundle → 按需读取；
- partial / stale → Issue → 修复 → 新 Run → 新 Handoff；
- 目标工程不含 ProtoBridge 配置时完成目标实现；
- 错误 Workspace、Bundle 不存在和 Handoff 引用失效时确定性失败；
- V1/V2 人工补充和返工对比。

## 14. 正式切换

V2 全部工作包与主计划 DoD 通过后：

1. 停止 V1 功能变更；
2. 完成全量 Registry Capture；
3. 运行 Core、PBWork、CLI、MCP、Target 全测试；
4. 删除 `page-canonical.json`、`ui-build-plan.json`、`ui-build-review.md` writer；
5. 删除 Planner、page workflow、旧 CLI `generate` 和旧 MCP resources；
6. 替换 config schema、binary、package exports、README 和 skills；
7. 发布 `0.2.0`；
8. 复跑安装包和真实目标工程闭环。

不维护双轨兼容，不自动迁移旧 output，不在 V2 未完成时提前删除正式 V1。
