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
| PBWork Workbench | `docs/architecture/pbwork.md`、`pbwork-workbench` Skill |
| Prototype Contract | Authoring Contract、PBWork prototype docs、Skill、tests |
| Identity/Role/Token Evidence/门禁 | `docs/reference/semantic-authoring.md`、Authoring Contract、ADR、相关 Skill、PBWork checklist、lint/Runtime tests |
| Token/Theme | PBWork token docs、catalog、Skill |
| Component props/behavior | Contract、实现、Registry、对应组件文档、Skill/检查单 |
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
- 暂未实现执行点的收敛规则必须列入根 `plan.md`，正式文档不得把未实现能力写成已经通过验证。

Agent 在收到组件、Token、Theme 或共享手势修改任务时，必须主动提醒文档同步义务，并在交付时说明同步了哪些文档。

## 链接与软链接

`docs/pbwork` 软链接到 `apps/pbwork/docs`，后者是唯一内容源。其它入口优先使用相对 Markdown 链接：

- package README 需要随包独立存在；
- Skill 需要独立 frontmatter；
- README、AGENT 和指南面向不同任务。

不要为已删除的旧文档创建兼容软链接；更新调用方到新的权威路径。

## 校验

```bash
pnpm docs:verify
```

文档校验至少覆盖本地链接、Skill 结构、源码路径、CLI/MCP 公共面、PBWork Contract/文档对应和禁止的过渡性表述。完整产品提交仍运行 `pnpm verify`。
