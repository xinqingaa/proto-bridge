# ProtoBridge Agent 规范

面向在 **本仓库** 协作的 AI coding agent 与开发者。

- 改 ProtoBridge：读本文 + `skills/proto-bridge`  
- 产品是什么 / 产物字段 / 怎么调用：`docs/overview.md`、`docs/artifacts.md`、`docs/usage.md`  
- 原型工作台与当前源码约定：`docs/design.md`、`docs/conventions.md`

ProtoBridge 产出证据与实现契约；它不替代在目标 Flutter 工程里写代码的 agent。

## 必读顺序

1. 本文（硬约束）  
2. 相关 `docs/*`  
3. `skills/proto-bridge`（落点与检查单）  

## 架构红线

- Capability-first：共享行为进 `packages/core`；CLI / MCP 只做入口适配。  
- 证据分层：source → 逻辑架构；target → 工程表达；runtime / screenshot → 视觉事实。  
- `ui-build-plan.json` 是精确实现蓝图；`ui-build-review.md` 是人类优先阅读的自然语言投影，并保留显式人工修订。
- 页面事实、来源语义、运行态与样式事实是权威契约；route/module/component/theme 等 B 接入结论默认只是 advisory guidance。
- 低置信名称或路径相似度只能用于检索候选，不能自动成为 target route、module、component 或 token。
- Core 只保留 Vue 3 / Flutter 等技术通用解析规则，不包含真实项目名称、符号、目录、业务词表或 token 映射。
- A / B 的模块、组件、主题、路由、i18n 与文件组织必须从本次 source / target 扫描取得；扫描不到就保持 `unknown`。
- 不提供项目 preset / profile，也不通过配置补录项目架构。项目 README 和代码是扫描证据的一部分。
- 高置信组件、theme、i18n、routing 必须以 target 扫描或 `targetConventions` 为证。
- 私有项目消费规范可放在 gitignored `skills/private/`，只能指导实现 agent，不能被 Core 读取为隐形 preset。

## 改动落点

| 区域 | 路径 |
| --- | --- |
| 编排 | `packages/core/src/workflows/capability-first` |
| Capabilities | `packages/core/src/capabilities` |
| Source | `packages/core/src/source` |
| Snapshot | `packages/core/src/snapshot` |
| Target / plan / validate | `packages/core/src/target` |
| Artifacts 写出 | `packages/core/src/artifacts` |
| Config | `packages/core/src/config` |
| CLI | `packages/cli` |
| MCP | `packages/mcp-server` |

## 验证矩阵

| 改动范围 | 至少执行 |
| --- | --- |
| 文档 / skill / AGENT | 检查链接、命令名、字段名与三层导航一致；禁止演进口吻 |
| TypeScript | `pnpm run typecheck`（必要时 `build`） |
| Config | `pnpm run test:config` |
| CLI / artifact 契约 | `pnpm run test:e2e:cli` |
| MCP / validation | `pnpm run test:e2e:mcp` |
| PBWork 文档 / Contract | 检查 `docs/design.md` 的类型、Schema、错误码、固定内容与 README / usage / conventions 一致 |
| PBWork TypeScript / Vue | `pnpm --filter @proto-bridge/pbwork typecheck` |
| PBWork 注册表 / 单元 | `pnpm --filter @proto-bridge/pbwork test` |
| PBWork Runtime / 写回 | `pnpm --filter @proto-bridge/pbwork test:e2e`，并按 `docs/design.md` §17.1 执行对应里程碑矩阵 |
| PBWork → PB 闭环 | 根仓 `pnpm run test:e2e`，使用 canonical Runtime URL 验证 source + runtime capture |

不要提交：`output/`、Flutter `build/` / `.dart_tool/`。

## 文档与 skill 同步

| 改动 | 必同步 |
| --- | --- |
| 契约字段 / 权威链 | `docs/artifacts.md` |
| 入口参数 / 工作流 / 发布 | `docs/usage.md` |
| 架构 / 扫描边界 / 包边界 / 适配器 | `docs/overview.md` |
| 原型工作台定稿 | `docs/design.md` |
| 原型 Source 约定 | `docs/conventions.md` |
| 本仓工作流 | 本文 + `skills/proto-bridge` |

同一概念只在最合适处详述；README / AGENT / skill / docs 互相链接，不复制第二套说明书。

正式文档只描述当前行为。禁止「本轮优化」「之前没有」「为了解决某次问题」等演进口吻。有效信息应保留或整合，删的是重复、不一致与过时路径。
