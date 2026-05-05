# ProtoBridge 架构路线图

## 1. 产品定位

ProtoBridge 不是代码翻译器。

它要连接三个项目：

- **A：Source project** - 需求或原型所在项目。
- **B：Target project** - 真实功能最终要落地的工程项目。
- **C：ProtoBridge** - 读取 A 和 B 后，生成面向实现的 Markdown 说明书的桥接工具。

第一阶段支持的场景是：

```text
A = Vue3 原型平台
B = Flutter App
C = ProtoBridge
```

稳定的产品目标是：

```text
读取 A 中的某个目标需求或页面。
读取 B 的工程架构、开发规范和可复用代码。
生成一篇架构优先的 Markdown，指导这个需求如何在 B 中实现。
```

生成文档可以使用自然语言辅助说明，但核心价值应该是工程结构：

- 目标模块建议
- 路由接入方式
- 状态管理形态
- 主题和 token 使用方式
- i18n 处理方式
- 资源处理方式
- 可复用组件
- 实现风险
- 人工 review checklist

## 2. 非目标

ProtoBridge 不应该变成：

- Vue 到 Flutter 的逐行翻译器
- 第一阶段直接生成 Dart 代码的工具
- 固化 A/B 项目业务规则的地方
- 人工 review 的替代品
- 只能通过 MCP 使用、无法脚本化或 CI 使用的工具

## 3. A/B/C 模型

A/B/C 模型是固定的，但 A 和 B 的技术栈不是固定的。

```text
source project A
  -> source adapter
  -> requirement context

target project B
  -> target adapter
  -> implementation context

ProtoBridge C
  -> project resolver
  -> adapter orchestration
  -> prompt/spec generation
  -> CLI and MCP entrypoints
```

第一阶段：

- source adapter：`vue3-prototype`
- target adapter：`flutter-app`

未来可能支持的 adapter 组合包括：

- `react-prototype -> flutter-app`
- `flutter-app -> vue-app`
- `flutter-app -> react-app`
- `figma-design -> flutter-app`

core 主流程不应该假设一定是 Vue 或 Flutter。Vue 和 Flutter 细节应该放在 adapter 后面。

## 4. 核心模块

### 4.1 ProjectResolver

负责把项目位置解析成可读取的本地目录。

需要支持：

- 本地路径
- 远程 GitLab 仓库
- branch 或 tag ref
- 缓存到 `.proto-bridge/cache/repos`
- 解析后的元信息，例如 repo URL、ref、commit hash、本地路径

远程仓库默认是公司私有 GitLab 仓库。第一版可以假设开发者本机已经配置好 Git 凭据、SSH key 或 credential helper。

如果 remote 访问对团队流程来说风险过大或不够稳定，用户可以回退到本地路径，其他架构不需要变化。

### 4.2 SourceAdapter

负责理解 source project A。

对于 `vue3-prototype`，包括：

- route 到 screen config 的解析
- Vue SFC 源码
- 原型 notes
- i18n 文件
- source 项目的 README 和 docs
- source 侧需求元信息

adapter 应该产出 source context，而不是 target 实现建议。

### 4.3 TargetAdapter

负责理解 target project B。

对于 `flutter-app`，包括：

- 模块结构
- 路由文件
- 状态管理约定
- theme service 和设计 token
- i18n 约定
- 资源目录
- 可复用 widgets/components
- target 项目的 README 和 docs
- 相似的已有页面

adapter 应该产出 target implementation context，而不是 source 解析细节。

### 4.4 SpecGenerator

负责组合：

- A 的 source context
- B 的 target context
- A 和 B 的项目规范
- 可选的 runtime capture
- 可选的 LLM 输出

第一阶段实现可以继续生成确定性的模板文档。

下一阶段应该加入 LLM 抽象，但暂不绑定具体 provider。provider 接口需要预留，以便后续接入 OpenAI、公司内部模型网关或其他公司允许的模型。

### 4.5 Entrypoints

CLI 和 MCP 都应该调用同一套 core 函数。

CLI 是稳定的操作入口：

- 本地调试
- 团队脚本
- CI 集成
- 可重复生成

MCP 是 AI 工具入口：

- Cursor
- Claude Code
- Codex CLI
- 其他兼容 MCP 的工具

MCP 必须保持为薄协议封装，不应该拥有业务逻辑。

## 5. 配置方向

当前配置使用固定字段：

```json
{
  "prototypeRoot": "/path/to/TradeAppPrd",
  "flutterRoot": "/path/to/youfi"
}
```

规划中的配置应该升级为 A/B 项目描述：

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/prototype.git",
      "ref": "main"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "remote",
      "repo": "git@gitlab.company.com:group/mobile-app.git",
      "ref": "develop"
    }
  },
  "input": {
    "route": "/prototype/trade"
  },
  "outputDir": "./output/stock-trade",
  "noCapture": true
}
```

本地模式仍然保留：

```json
{
  "source": {
    "kind": "vue3-prototype",
    "location": {
      "type": "local",
      "path": "/Users/name/work/TradeAppPrd"
    }
  },
  "target": {
    "kind": "flutter-app",
    "location": {
      "type": "local",
      "path": "/Users/name/work/youfi"
    }
  }
}
```

第一版通过 `ref` 支持 branch 和 tag。以后如果对可复现性要求更高，可以再加入 commit pinning。

## 6. 仓库规范发现

ProtoBridge 不应该把 A/B 的开发规范保存在 C 中。

它应该从 A 和 B 自己的仓库中发现并读取规范：

- `README.md`
- `AGENT.md`
- `CLAUDE.md`
- `docs/**`
- 项目专属架构文档
- source adapter 已知路径
- target adapter 已知路径

对于第一组 `vue3-prototype -> flutter-app` adapter：

- A 的规范可能来自原型 README、docs、notes、screen config 和 i18n 结构。
- B 的规范可能来自 Flutter README、模块结构、路由文件、theme service、translations 和可复用 widgets。

在可行时，生成的 spec 应该说明哪些本地文件影响了某条建议。

## 7. 规划输出文件

每次生成应该保留三份可 review 文件：

```text
output/<screen>/
├── migration-context.json
├── llm-prompt.md
└── migration-spec.md
```

### migration-context.json

机器可读上下文。

应该包含：

- 已解析的 source 项目元信息
- 已解析的 target 项目元信息
- source 分析结果
- target 分析结果
- 发现的规范文件
- capture metadata，如果启用 capture
- token 和架构映射
- warnings 和未解决问题

### llm-prompt.md

为 LLM 准备的完整 prompt 或 prompt package。

即使还没有具体 LLM provider，这个文件也有价值，因为用户可以手动复制到 Cursor、Claude Code、Codex CLI 或其他 AI 工具中。

后续接入 LLM provider 后，这个文件仍然可用于调试、review 和复现。

### migration-spec.md

最终给人 review 的实现说明书。

在 template-only 模式下，ProtoBridge 直接写入该文件。

在 LLM 模式下，ProtoBridge 应该先生成 prompt，再调用 provider 抽象，并在校验和轻量后处理之后，把模型结果写入该文件。

## 8. LLM 策略

项目应该预留 LLM 接口，但在规划阶段不实现具体 provider。

这个抽象未来应该支持：

- prompt 输入
- model/provider 选择
- 结构化上下文附件
- response text
- token/cost metadata，如果 provider 可用
- error 和 fallback mode

provider 配置不能硬编码。未来应该可以接入：

- 公司内部模型网关
- OpenAI-compatible API
- 其他公司允许的 provider

在 provider 实现之前，`llm-prompt.md` 就是交接产物。

## 9. Remote 仓库风险

Remote Git 支持可以提升团队可用性，因为开发者不再需要各自配置 A 和 B 的本地路径。

需要记录和管理的风险：

- 私有 GitLab 认证依赖用户本机环境
- 第一次 clone 可能较慢
- 仓库可能很大
- branch/tag 可能随时间变化
- 当前 JS config 解析不应该执行不可信 remote 仓库代码

resolver 应该优先使用标准 Git 命令，并把 clone 下来的仓库放在：

```text
.proto-bridge/cache/repos
```

该目录必须被 Git 忽略。

## 10. 实施阶段

### Phase 1：文档化架构方向

状态：文档规划中。

- 定义 A/B/C 模型
- 定义 adapter 架构
- 定义 local/remote 配置方向
- 定义 CLI/MCP 关系
- 定义 LLM 占位策略

### Phase 2：配置兼容层

- 保持当前配置可用
- 引入 `source` 和 `target`
- 内部把旧字段映射成新字段
- 更新 examples

### Phase 3：ProjectResolver

- 支持 local path
- 支持 remote GitLab branch/tag
- 缓存到 `.proto-bridge/cache/repos`
- 在 context 中记录 resolved metadata

### Phase 4：Adapter 重构

- 把当前 Vue 原型逻辑移动到 `vue3-prototype` 后面
- 把当前 Flutter 逻辑移动到 `flutter-app` 后面
- 保持现有 CLI 行为不破坏

### Phase 5：Prompt Package 生成

- 生成 `llm-prompt.md`
- 包含 source context
- 包含 target context
- 包含发现到的 A/B 规范
- 保留确定性的 `migration-spec.md` fallback

### Phase 6：LLM Provider 接口

- 只新增 provider 抽象
- 初期不绑定具体 provider
- 保持手动 prompt 工作流仍然可用

### Phase 7：MCP Transport

- 通过 MCP tools 暴露 core
- 保持 MCP 为薄封装
- 为常见 AI 工具编写配置说明

## 11. 第一组 Adapter 验收标准

对于 `vue3-prototype -> flutter-app`，工具应该能够：

- 从本地路径或 GitLab branch/tag 解析 A 和 B
- 分析 A 中的一个 route
- 读取 A 的页面源码、notes、i18n 和相关 docs
- 分析 B 的 modules、routes、theme、translations、assets 和 reusable widgets
- 生成 `migration-context.json`
- 生成 `llm-prompt.md`
- 生成 `migration-spec.md`
- 在没有 MCP 的情况下保持 CLI 可用
- 把 MCP 作为附加入口继续规划

