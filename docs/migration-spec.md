# migration-spec.md 兼容说明

`migration-spec.md` 是 ProtoBridge 早期的 source-aware 迁移说明书产物。它在 source + target facts 可用时仍会输出一个版本周期，用于兼容旧流程和旧消费者；但它不再是最终机器契约，也不再与 `ui-build-review.md` 共同组成实现裁判。

当前权威链如下：

| 产物 | 角色 |
| --- | --- |
| `ui-build-plan.json` | 唯一机器契约。包含 `targetConventions`、`implementationContract`、`implementationContract.sourceSemantics` 和 `visualPlan`。 |
| `ui-build-review.md` | 从 `ui-build-plan.json` 渲染的人类可读 brief。 |
| `migration-spec.md` | legacy/compat redirect。提醒读者 source semantics 已进入 plan，并指向最终 contract。 |

## 为什么降级

早期 `migration-spec.md` 承载了很多有价值的 source semantics，例如业务区块、状态意图、Widget contract、生命周期/交互意图和禁止直译建议。但 Markdown 不适合作为 agent 严格遵守的机器契约，而且历史内容容易混入具体目标工程表达，例如某个项目的状态管理、路由或组件命名。

现在这些有价值内容进入 `implementationContract.sourceSemantics`，再由 `targetConventions` 归一到当前 target repo 扫描出的工程表达。这样可以避免把某个项目的 GetX、flutter_bloc、Riverpod、Provider、Navigator、go_router、context.t、AppLocalizations、themeService、context.pbColors、CommonAppBar 等写成 ProtoBridge 默认偏好。

## 冲突处理

如果 `migration-spec.md`、`ui-build-review.md` 和 `ui-build-plan.json` 之间出现差异：

1. 以 `ui-build-plan.json` 为唯一机器契约。
2. target 工程表达以 `targetConventions.architectureProfile` 的扫描证据为准。
3. source semantics 以 `implementationContract.sourceSemantics` 为准。
4. runtime/screenshot 视觉事实以 `visualPlan`、`themeMappings`、`componentMappings` 和 screenshots 为准。
5. target profile unknown 时，不猜测具体框架或组件，保留抽象建议并输出 warnings/manual questions。

## 后续方向

后续版本可以继续保留生成开关，例如 `sourceBrief` 或新的 `legacyMigrationSpec` 配置；也可以默认关闭该产物。无论保留还是关闭，source-aware 价值都应沉淀在 `ui-build-plan.json` 的结构化 contract 中，而不是依赖第二份 Markdown。
