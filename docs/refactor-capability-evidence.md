# ProtoBridge Core 重构与 Capability / Evidence 编排方案

本文档用于指导 ProtoBridge 下一阶段重构。目标不是简单新增一个 adapter，而是把现有 CLI / MCP 中混杂的页面分析能力重新整理为可插拔、可复用、可开源的核心结构。

## 1. 背景与问题

当前 ProtoBridge 已经形成两条明确 workflow：

```text
CLI = Source-aware Migration
MCP = UI Reconstruction
```

但随着能力增加，项目出现了几个明显问题：

- CLI / MCP 的编排层与底层页面分析实现耦合偏紧。
- `shared` 目前过薄，主要还是路径和读文件工具，没有承接真正的跨 workflow 共享能力。
- `snapshot` 中已经出现较多通用页面证据提取逻辑，但尚未形成可插拔的能力模型。
- `target/flutter-app` 中同时承载 conventions、examples、token mapping、planning 等多种职责，部分能力实际上已经具备跨 workflow 复用价值。
- 新增能力时，常常需要重新进入大量上下文，导致维护成本高。

本次重构的重点是：先理顺能力边界，再增强 CLI / MCP，而不是直接把更多逻辑继续堆进 workflow 或 adapter。

## 2. 重构目标

本次重构目标定义为：

```text
让 ProtoBridge 从“两个 workflow + 一组混杂能力”
演进为
“多个可插拔 capability + 统一 evidence + 两个清晰 workflow”
```

具体目标：

- 让 CLI 和 MCP 共享同一套页面能力探测逻辑。
- 让 `__getPageMetadata()` / `__getPageList()` 成为可选增强能力，而不是工作流前提。
- 把页面证据统一收敛到标准中间模型，降低 workflow 直接处理实现细节的需要。
- 让新增能力优先通过新增 capability / enricher 完成，而不是修改整条工作流。
- 为未来开源保留通用性，不把某个内部原型 runtime 方案写死为唯一标准。

## 3. 核心原则

### 3.1 `__getPageMetadata()` / `__getPageList()` 是可选 capability，不是通用前提

ProtoBridge 未来面向开源时，不能假设所有 Vue 项目都已经实现这两个函数。因此这类能力应被定义为：

- 若页面支持，则用于增强页面证据质量。
- 若页面不支持，workflow 仍然可以回退到 DOM / screenshot / OCR 等通用途径。

### 3.2 Workflow 只负责编排，不拥有大量底层页面分析逻辑

CLI 与 MCP 的核心职责应保持为：

- 组织输入
- 触发能力探测
- 组织 evidence enrichment
- 调用 target knowledge / planner
- 写出 artifacts

而不是直接持有越来越多的页面感知实现。

### 3.3 `shared` 要升级为真正的跨 workflow 共享层

`shared` 不应继续只是工具函数目录，而应承接：

- 协议定义
- capability detection
- evidence normalization / merge
- 通用 artifact / id / path 规则

但 `shared` 不应成为大杂烩，目标技术栈专属知识不能无差别放入全局 shared。

### 3.4 Flutter 知识继续保留 target 归属

以下能力虽然可跨 CLI / MCP 复用，但仍属于 Flutter target 知识，不建议直接挪到全局 shared：

- token catalog / token mapping
- component catalog
- conventions scan
- example finder
- validation

这些能力应继续保留在 `target/flutter-app` 下，只是内部职责可以拆得更清楚。

## 4. 建议的新编排模型

建议将页面处理拆为四层：

```text
Capability / Protocol
  -> Evidence
  -> Workflow
  -> Target Knowledge / Planner
```

含义如下：

- `Capability / Protocol`：页面是否支持额外能力，例如 runtime metadata、page list、tab traversal、asset extraction、OCR。
- `Evidence`：把 screenshot、DOM、metadata、assets、OCR 等信息统一成标准页面证据。
- `Workflow`：CLI / MCP 只组织执行顺序，不深度耦合页面细节。
- `Target Knowledge / Planner`：读取 Flutter target conventions、examples、mapping、validation，并生成 plan / spec。

## 5. Capability Detection

在 CLI 或 MCP 进入深层分析前，统一执行一轮 capability detection。

建议首批固定检测以下项目：

- 页面是否存在 `__getPageMetadata`
- 页面是否存在 `__getPageList`
- 页面是否存在 tab 容器特征
- 页面是否可提取图片资源
- 页面是否需要 OCR

建议形成统一结果：

```ts
type DetectedCapabilities = {
  runtimeMetadata: boolean;
  pageList: boolean;
  tabTraversal: boolean;
  assetExtraction: boolean;
  needsOcr: boolean;
  warnings: string[];
};
```

这一步的价值：

- 让 `__getPageMetadata()` 和 `__getPageList()` 成为增强路径，而不是刚性依赖。
- 让 CLI / MCP 都能走相同的能力探测流程。
- 让后续新增能力时，只需要增加 detector 和 enricher，而不是改动整条 workflow。

## 6. Evidence Pipeline

建议统一采用如下流水线：

```text
1. base capture
2. detect capabilities
3. enrich evidence
4. normalize evidence
5. build plan / spec
6. validate output
```

### 6.1 Base Capture

基础 capture 负责：

- screenshot
- viewport
- 基础 DOM
- 可见文本
- 基础 asset 线索

这一步必须尽量通用，不依赖业务方额外接入。

### 6.2 Detect Capabilities

检测页面是否支持额外能力：

- runtime metadata
- page list
- tab traversal
- image export
- OCR fallback

### 6.3 Enrich Evidence

按能力逐步增强页面证据。首批建议的 enricher：

- `generic-dom`
- `annotated-runtime-metadata`
- `page-list`
- `tab-traversal`
- `asset-extraction`
- `ocr`

注意：

- 每个 enricher 都应是可选的。
- 某个 enricher 失败时应记录 warnings，不阻断主流程。
- planner 不应该依赖某个特定 enricher 必然存在。

### 6.4 Normalize Evidence

不同来源的页面信息最终统一进入标准 `PageEvidence`。

## 7. PageEvidence 建议

建议为 CLI / MCP 引入统一中间模型 `PageEvidence`。第一版不要求覆盖所有信息，只需要覆盖两条 workflow 真正会消费的核心字段。

建议最小结构：

```ts
type PageEvidence = {
  id: string;
  source: {
    kind: 'url' | 'route' | 'vue' | 'rendered-html' | 'screenshot';
    url?: string;
    route?: string;
    vuePath?: string;
  };
  screenshot?: {
    path?: string;
    width: number;
    height: number;
  };
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  };
  sections: unknown[];
  nodes: unknown[];
  text: string[];
  assets: unknown[];
  interactions: unknown[];
  tokens?: unknown[];
  componentHints?: unknown[];
  tabStates?: unknown[];
  warnings: string[];
  provenance: Array<{
    source: 'dom' | 'runtime-metadata' | 'page-list' | 'ocr' | 'heuristic';
    fields: string[];
  }>;
};
```

关键点：

- planner 消费统一 evidence，而不是分别消费 DOM、metadata、OCR。
- `provenance` 用于保留证据来源，避免推断和事实混淆。
- `PageEvidence` 是跨 workflow 共享模型，不应绑定 Flutter，也不应直接携带 target-specific 规则。

## 8. `__getPageMetadata()` / `__getPageList()` 的建议落点

这两个能力适合进入 core，但不建议直接塞进现有基础工具式 `shared`。

更合适的组织方式：

```text
packages/core/src/shared/protocols/
packages/core/src/shared/evidence/
packages/core/src/snapshot/capabilities/
packages/core/src/snapshot/enrichers/
```

建议做法：

- 在 `shared/protocols` 中定义 runtime page protocol 的类型、detect helper、read helper。
- 在 `snapshot/enrichers` 中实现基于 runtime protocol 的 evidence enrichment。
- 在 `shared/evidence` 中完成 normalize / merge。

建议同时兼容两层协议：

1. 未来推荐协议，例如：

```ts
window.__PROTO_BRIDGE__ = {
  version: '1',
  capabilities: {
    pageMetadata: true,
    pageList: true,
  },
  getPageMetadata() {},
  getPageList() {},
}
```

2. 现有兼容协议：

- `window.__getPageMetadata`
- `window.__getPageList`

这样可以先吸收现有成果，又不会把内部接口写死成未来的唯一标准。

## 9. CLI / MCP 的建议调整

### 9.1 CLI

CLI 继续保持 source-aware migration 定位，但允许在适合的场景下消费统一 `PageEvidence`。

CLI 未来输入链路可以是：

```text
source facts
  + optional runtime capabilities
  + optional capture evidence
  -> normalized PageEvidence
  -> target planning / migration spec
```

这样 `__getPageMetadata()` / `__getPageList()` 也能辅助 CLI，而不再只是 MCP 私有思路。

### 9.2 MCP

MCP 继续保持 snapshot UI reconstruction 定位，但改为消费 capability-based evidence pipeline：

```text
capture_page_evidence
  -> base capture
  -> detect capabilities
  -> enrich evidence
  -> write page-evidence.json / screenshot.png

build_ui_implementation_plan
  -> read normalized PageEvidence
  -> read target conventions / examples
  -> build ui-implementation-plan.json
```

这样 MCP 的增强重点会从“只做 snapshot”转向“先把页面看得更准，再规划”。

## 10. 目录重构建议

建议在不打断现有对外语义的前提下，逐步演进到类似结构：

```text
packages/core/src/
├── shared/
│   ├── paths.ts
│   ├── protocols/
│   │   └── runtime-page.ts
│   ├── evidence/
│   │   ├── types.ts
│   │   ├── normalize.ts
│   │   └── merge.ts
│   └── index.ts
├── snapshot/
│   ├── browser-capture/
│   ├── capabilities/
│   │   └── detect-page-capabilities.ts
│   ├── enrichers/
│   │   ├── annotated-runtime.ts
│   │   ├── page-list.ts
│   │   ├── tab-traversal.ts
│   │   ├── assets.ts
│   │   └── ocr.ts
│   ├── types.ts
│   └── index.ts
├── source/
├── target/
│   └── flutter-app/
│       ├── conventions/
│       ├── mapping/
│       ├── examples/
│       ├── planning/
│       ├── validation/
│       └── index.ts
├── workflows/
└── types/
```

该目录只是方向，不要求一次到位。

## 11. 迁移步骤建议

建议按以下顺序推进，避免一次性大改：

### 阶段一：建立共享证据模型

- 定义 `PageEvidence` 最小结构。
- 定义 capability detection 结果结构。
- 让 MCP 先写出统一 evidence。

### 阶段二：接入 runtime metadata capability

- 增加 runtime page protocol detect / read helper。
- 兼容 `__getPageMetadata()` / `__getPageList()`。
- 把 metadata / page list 作为 enricher 接入 evidence pipeline。

### 阶段三：CLI / MCP 统一消费 evidence

- CLI 在 capture 可用场景中接入统一 evidence。
- MCP 的 plan builder 直接消费 `PageEvidence`。
- 减少 workflow 对底层 capture / metadata 实现细节的直接依赖。

### 阶段四：清理 Flutter target 职责

- 拆分 conventions / mapping / examples / planning / validation。
- 保留 target 归属，不将 Flutter 专属知识直接挪到全局 shared。

### 阶段五：回归验证与文档更新

- 重新验证 CLI 和 MCP 效果。
- 复查架构边界是否清晰。
- 更新 architecture / workflows / integration 文档。

## 12. 验收标准

本次重构完成后，至少应满足以下标准：

- 新增一个 runtime capability 时，不需要重读大半个项目。
- CLI 和 MCP 共享同一套 capability detection。
- 页面支持 metadata 时，效果增强；不支持时，也能正常回退。
- `PageEvidence` 成为 workflow 间的稳定中间模型。
- `shared` 承接跨 workflow 共享协议与证据模型，但不变成大杂烩。
- Flutter target-specific 逻辑继续保留 target 归属。
- planner / spec / validation 不再直接绑定某一种页面输入实现。

## 13. 风险与注意事项

- 不要把本次重构理解为“所有共用逻辑都往 shared 搬”；应优先抽协议、证据和能力边界。
- 不要让 `__getPageMetadata()` 成为唯一标准；它只能是增强路径。
- 不要一次性重写所有 workflow；建议先从 MCP evidence pipeline 着手，再逐步回灌 CLI。
- 不要把 Flutter target-specific catalog、token、component rule 无差别地升到全局 shared。
- 类型拆分要就近进行，避免继续把所有内容集中到单一大类型文件中。

## 14. 总结

本次重构的本质不是“把同事项目的能力合并进 ProtoBridge”，而是：

```text
把 ProtoBridge 重构成一个支持可插拔页面能力探测、
统一证据模型、双 workflow 复用的桥接平台
```

`__getPageMetadata()` 和 `__getPageList()` 是第一批高价值 capability，应被吸收进 core，但必须以“可选 runtime protocol”的方式接入，并通过 capability detection 与 evidence enrichment 服务 CLI 和 MCP，而不是成为未来通用工作流的硬编码前提。
