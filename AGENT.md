# ProtoBridge Agent 规范

面向在 **本仓库** 协作的 AI coding agent 与开发者。

- 改 ProtoBridge：读本文 + `skills/proto-bridge`  
- 产品是什么 / 产物字段 / 怎么调用：`docs/overview.md`、`docs/artifacts.md`、`docs/usage.md`  
- 在 YouFi 按产物还原 Flutter 页：`skills/youfi-flutter-restore`（真实项目示例，不是本仓改法）

ProtoBridge 产出证据与实现契约；它不替代在目标 Flutter 工程里写代码的 agent。

## 必读顺序

1. 本文（硬约束）  
2. 相关 `docs/*`  
3. `skills/proto-bridge`（落点与检查单）  

不要用 `youfi-flutter-restore` 指导本仓库改动。

## 架构红线

- Capability-first：共享行为进 `packages/core`；CLI / MCP 只做入口适配。  
- 证据分层：source → 逻辑架构；target → 工程表达；runtime / screenshot → 视觉事实。  
- `ui-build-plan.json` 是实现蓝图；`ui-build-review.md` 只是投影。  
- Restoration profile（配置字段 `profile`）只提供候选与增强，**不能伪造** target 扫描证据。  
- 项目 / 业务经验放进 `packages/core/src/profile/`，不要写回通用 source adapter、planner 或默认 token 表。  
- 高置信组件、theme、i18n、routing 必须以 target 扫描或 `targetConventions` 为证。

## 改动落点

| 区域 | 路径 |
| --- | --- |
| 编排 | `packages/core/src/workflows/capability-first` |
| Capabilities | `packages/core/src/capabilities` |
| Profile | `packages/core/src/profile` |
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
| 示例脚本 / Flutter target | `pnpm run example` 等 |

不要提交：`output/`、示例 `output/`、`_proto` 生成文件、Flutter `build/` / `.dart_tool/`。

## 文档与 skill 同步

| 改动 | 必同步 |
| --- | --- |
| 契约字段 / 权威链 | `docs/artifacts.md` |
| 入口参数 / 工作流 / 发布 | `docs/usage.md` |
| 架构 / profile / 包边界 | `docs/overview.md` |
| 本仓工作流 | 本文 + `skills/proto-bridge` |
| YouFi 还原细则 | `skills/youfi-flutter-restore` |

同一概念只在最合适处详述；README / AGENT / skill / docs 互相链接，不复制第二套说明书。

正式文档只描述当前行为。禁止「本轮优化」「之前没有」「为了解决某次问题」等演进口吻。有效信息应保留或整合，删的是重复、不一致与过时路径。
