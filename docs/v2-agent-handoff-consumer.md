# ProtoBridge V2 Agent Handoff Consumer

> 状态：阶段五正式消费指南
> 适用对象：通过 MCP 消费持久 Evidence 并修改目标仓库的 Coding Agent

Handoff 是固定 Evidence 索引，不是实现计划。Consumer 必须使用 Handoff
指定的 Workspace、Snapshot、Staleness Report 和具体 revision，不能改读
active/latest，也不能直接解析 Store 目录。

## 强制读取顺序

1. 调用 `inspect_evidence_workspace`，再调用 `read_agent_handoff`。
2. 校验 Workspace；不匹配立即停止，不能猜测 Store 路径。
3. 在编辑代码前报告 `mandatoryRiskReport` 中的全部风险。Producer 已确认风险
   不代表 Consumer 可以省略。
4. 读取 Handoff 固定的 Snapshot、Coverage 和 Staleness Report。
5. 按实现范围读取固定 Case revision；局部任务再读取对应 Fragment。
6. 保留每个 Fact 的 provenance、unknown 和 unresolved conflict，不补造隐藏事实。
7. 阅读目标仓库自身的说明、测试和既有实现。
8. 必要时使用 `read_target_conventions` 和 `find_target_examples`。Target 查询
   与 Source Evidence 独立，结果不能写回 Evidence Bundle。
9. Agent 自行决定文件、组件、状态、路由和 Token，完成实现并运行目标原生验证。
10. 调用 `validate_target_changes`，报告变更文件、验证结果、所有原始风险和剩余风险。

## 必须报告的风险

- `partial-coverage`
- `stale-evidence`
- `required-unknown`
- `unresolved-conflict`
- `evidence-level-limitation`
- `manual-promotion`

风险确认只允许任务继续，不会把风险改成事实或成功。

## 硬失败

- Workspace 不匹配；
- 固定 Snapshot、revision、Staleness Report 或 Handoff 不存在；
- revision 不能由 Handoff Snapshot 到达；
- Schema major 不受支持；
- Debug/Trace 未经显式请求；
- 目标路径越界或目标仓库无法验证。

以上情况不得通过切换到 active/latest、手工拼 Store 路径或重新解释旧对象恢复。

## 目标仓库边界

目标仓库不需要 `proto-bridge.config` 或 `proto-bridge.v2.json`。Target root 来自
Agent 当前工作目录或单次 tool 参数。ProtoBridge 不选择 Flutter 文件、
Widget Tree、路由、状态框架或 Token，也不修改目标仓库。
