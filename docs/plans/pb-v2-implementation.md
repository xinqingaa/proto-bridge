# ProtoBridge V2 实施规格

> 权威范围：代码落点、Capture、Store、Service、PBWork、CLI、MCP、Target、迁移和测试
> 上位决策：[V2 重构计划](./pb-pbwork-v2-rearchitecture.md)
> 数据与协议：[V2 Contract 规范](./pb-v2-contracts.md)

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
GET  /api/v2/bundles
GET  /api/v2/bundles/:bundleId
GET  /api/v2/bundles/:bundleId/runs/:captureRunId
GET  /api/v2/bundles/:bundleId/cases/:caseId
GET  /api/v2/bundles/:bundleId/blobs/:sha256
POST /api/v2/input-blobs
POST /api/v2/capture-jobs
GET  /api/v2/capture-jobs/:jobId
POST /api/v2/capture-jobs/:jobId/cancel
POST /api/v2/capture-jobs/:jobId/retry
GET  /api/v2/events
```

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
- 只有显式 retry 创建新 Run 后才继续；
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

本计划不规定 PBWork 一级或二级导航。通过 PBWork 导航进入以下能力并保留当前 Prototype / Screen 上下文：

- Selection；
- Capture Matrix；
- Job progress；
- screenshot grid；
- Coverage；
- Issue；
- Evidence Inspector；
- Fragment selection；
- retry / cancel / stale recapture；
- Bundle ID；
- Agent Handoff。

PBWork 浏览器端通过 Local Service 操作，不直接访问文件系统或 Playwright。

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

| Code | 含义 |
| --- | --- |
| 0 | completed |
| 1 | 参数或配置错误 |
| 2 | Runtime / Source 不可用 |
| 3 | partial，Bundle 已生成 |
| 4 | 全部 Case 失败 |
| 5 | Store 写入失败 |
| 6 | Protocol 不兼容 |

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

| 配置 | 工具 |
| --- | --- |
| Runtime + Store + JobHost | discover_prototypes、capture_selection |
| Store | discover_bundles、read_evidence |
| Target adapter + target root | target context、examples、validation |

### 9.1 Read Evidence

```ts
type ReadEvidenceInput =
  | { kind: "manifest"; bundleId: string }
  | { kind: "run"; bundleId: string; captureRunId: string }
  | { kind: "coverage"; bundleId: string; captureRunId?: string }
  | { kind: "screen"; bundleId: string; screenId: string }
  | { kind: "case"; bundleId: string; caseId: string }
  | { kind: "fragment"; bundleId: string; caseId: string; fragmentRef: string }
  | { kind: "issue"; bundleId: string; issueId: string }
  | { kind: "debug"; bundleId: string; ref: string };
```

Resources：

```text
proto-bridge://bundles/{bundleId}/manifest
proto-bridge://bundles/{bundleId}/coverage
proto-bridge://bundles/{bundleId}/screens/{screenId}
proto-bridge://bundles/{bundleId}/runs/{captureRunId}
proto-bridge://bundles/{bundleId}/cases/{caseId}
proto-bridge://bundles/{bundleId}/cases/{caseId}/fragments/{fragmentRef}
proto-bridge://bundles/{bundleId}/blobs/{sha256}
```

规则：

- 默认返回小型结构化摘要和 refs；
- 截图使用 image resource；
- raw DOM 和 Trace 只在 debug 请求时返回；
- MCP 重启不影响 Bundle；
- resource 不依赖创建 Bundle 的进程；
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

目标工程示例：

```json
{
  "schemaVersion": 2,
  "store": {
    "root": "/path/to/proto-bridge/.proto-bridge/evidence"
  },
  "target": {
    "adapter": "flutter-app",
    "root": "."
  }
}
```

由于没有 Runtime，目标工程配置自然不暴露 capture 工具。

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

- 接入 Selection、Matrix、Job event；
- 实现 Evidence、Coverage、Issue 和 screenshot view；
- 实现 Fragment、retry、cancel、stale 和 Handoff。

### W7 CLI / MCP

- 实现完整 CLI；
- 实现 capability-driven MCP tools；
- 实现 Bundle resources；
- 删除 MCP session page store。

### W8 Target

- 迁移 Flutter context、example search 和 validation；
- 从 Core Capture 移除 target import；
- 建立独立包测试。

### W9 Migration

- 迁移 Registry 中全部 Prototype / Screen / Variant；
- 运行全量 PBWork Capture；
- 删除 V1 Planner、Artifact、CLI、MCP 和测试 fixture；
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
- Selection、Matrix、progress、Issue、Evidence、Handoff；
- Service restart。

### CLI / MCP

- flags 与 Selection JSON 等价；
- 完整命令和 exit code；
- 按配置暴露工具；
- persistent read；
- Case / Run / Fragment / Blob resource；
- process restart；
- target query 与 Capture 独立。

### 全量闭环

- Ledger Planet 18 Screens / 54 Variants；
- Field Service 和 Project 不退化；
- 四种 Evidence Level；
- MCP 读取后完成目标实现；
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
