# 文档维护规范

## 写作原则

- 主体文档描述当前产品，不写阶段完成记录或旧版本操作。
- 历史比较只进入 `docs/history`，设计理由进入 `docs/decisions`。
- 一个概念只有一个完整定义，其余文档链接到权威来源。
- 命令、Tool、字段、路径和状态必须能由源码或测试验证。
- 规范使用 MUST/禁止时，应存在 Contract、测试、检查单或明确人工验收。
- 业务原型的临时视觉偏好不提升为通用规范。

## 所有权

| 变化 | 必须同步 |
| --- | --- |
| 产品职责/闭环 | `docs/product`、根 README、相关 ADR |
| Evidence Schema/引用 | `docs/architecture/evidence-model.md`、词汇、Core README |
| Capture/Runtime Protocol | `docs/architecture/capture-pipeline.md`、Authoring Contract |
| Workspace/环境变量/安全 | `docs/reference/configuration.md`、使用指南 |
| CLI 命令/退出语义 | `packages/cli/README.md`、使用指南 |
| MCP Tool/Resource/Prompt | `packages/mcp-server/README.md`、Agent 消费指南 |
| PBWork Workbench | `docs/architecture/pbwork.md`、`pbwork` Skill 的 Workbench reference |
| Prototype Contract | Authoring Contract、PBWork prototype docs、Skill、tests |
| PBWork 产品/视觉设计与结构性增量 | 原型设计工作流、`pbwork` Skill 的 prototype-design reference、`prototypes/{id}/docs/design.md` |
| Identity/Role/Token Evidence/门禁 | `docs/reference/semantic-authoring.md`、Authoring Contract、ADR、相关 Skill、PBWork checklist、lint/Runtime tests |
| Token/Theme | PBWork token docs、catalog、Skill、Target sync 状态/基线 |
| Component props/behavior | Contract、实现、Registry、对应组件文档、Skill/检查单、Target sync 状态/基线 |
| Role/绑定字面量闭集 | Core vocabulary、PBWork schema/Bind 池、Authoring 文档、Target sync 门禁 |
| Target 映射/API | Target `docs/proto-bridge.md`、根目录 `proto-bridge.target.json`、公开 API、根目录 `proto-bridge.sync.json` |
| 手势/导航/组合 | PBWork 共享规范、相关组件页、测试 |

## PBWork 组件变更

修改组件时必须在同一个任务中检查：

1. `components/contracts/{id}.json`
2. Vue 实现
3. `components/registry.ts`
4. `components/scenarios.ts`（如适用）
5. `apps/pbwork/docs/components/**/{id}.md`
6. Unit/Playwright tests

组件的 semantic role policy、默认/允许 role、Inspect registration 和 Token binding provenance 属于 Contract 原子变更，不能只修改 Vue 根节点属性。

## 规范强度

- `Block` 必须有 Schema、Registry validation、authoring lint、Runtime/Core validation 或 CI 中至少一个确定性执行点；
- `Warning` 必须进入 Inspector、Preflight 或 CI 报告，并能记录处理理由；
- `Info` 只用于不影响 Evidence 诚实性的作者提示；
- 没有执行点的提案不得写成现行 `Block` 或已验证能力；升级为正式规则时，文档、实现和测试必须在同一变更中落地。

Agent 在收到组件、Token、Theme 或共享手势修改任务时，必须主动提醒文档同步义务，并在交付时说明同步了哪些文档。

完整 Catalog 的一次性 Agent 读取已经废弃：它会淹没任务上下文，不得作为 Target 同步或页面实现的前置步骤。Target Agent 按当前组件读取 Producer Contract、文档及必要源码；目标工程自己的完整映射文件不等于重新开放 Store Catalog。

DS 连续迭代不要求每轮都做 Flutter 视觉精修，但每轮必须运行 `pnpm ds:target-sync:verify` 让 Schema、Contract、role、Token/Theme 与 Target API 漂移显式可见。稳定批次必须同时更新 Target 映射/公开 API 与完整 sync baseline，使清单恢复 `synced`；`pnpm verify` 不接受 pending、过期 fingerprint 或不一致的计数/分区/逐组件元数据。

## 链接与软链接

`docs/pbwork` 软链接到 `apps/pbwork/docs`，后者是唯一内容源。其它入口优先使用相对 Markdown 链接：

- package README 需要随包独立存在；
- Skill 需要独立 frontmatter；
- README、AGENTS 和指南面向不同任务。

不要为已删除的旧文档创建兼容软链接；更新调用方到新的权威路径。

## 仓库级 Skill

- 仓库 Skill 的唯一位置是 `.agents/skills/`，确保克隆仓库后可由支持 Agent Skills 的工具发现；禁止恢复根 `skills/` 平行目录。
- `.agents/skills/frontend-design` 来自 `anthropics/skills`，当前同步 commit 为 `f17010c9bb483898c1d9c9f42dde2b3a98889434`；`SKILL.md` SHA-256 为 `1608ea77fbb6fc30d13a97d12cfa8ebf31358d40f0dd97beed24829d6b3f45dd`。
- 仓库只保留 `frontend-design`、`pbwork` 和 `proto-bridge` 三个 Skill 入口。PBWork 的不同任务通过 `pbwork/references/` 按需加载，不再拆成多个相互跳转的 Skill。
- 保持第三方 Skill 与 `LICENSE.txt` 原样；PBWork 专属规则写入 `pbwork`，不直接修改上游视觉 Skill。
- 通用产品设计不是 ProtoBridge 的仓库职责。其它项目应在自己的仓库中安装所需视觉 Skill，并由该项目的 Skill 或 `AGENTS.md` 定义产品文档工作流。
- 更新第三方 Skill 时核对上游 commit、文件哈希和许可证，并运行 `pnpm docs:verify`。

## 校验

```bash
pnpm docs:verify
pnpm ds:target-sync:verify
```

文档校验至少覆盖本地链接、Skill 结构、源码路径、CLI/MCP 公共面、PBWork Contract/文档对应、Flutter 当前/兼容映射叙事和禁止的过渡性表述。完整产品提交仍运行 `pnpm verify`；该门禁同时执行 Flutter `analyze` 与完整测试。
