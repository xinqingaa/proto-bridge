# ADR 0008：Workspace generation 与绑定式 Reset

状态：Accepted

日期：2026-08-04

## 决策

每个已初始化 Workspace manifest 必须包含 `storeLayoutVersion` 和不可复用的 `generationId`。普通 reopen 保持 generation；成功 reset 或外部破坏后的显式 reinitialize 创建新 generation。只读 Consumer 不迁移 legacy manifest；取得 writer lock 的初始化可执行一次 manifest-only legacy generation 升级并留下 migration receipt。

Reset 是两步、不可恢复的生命周期操作：preview 持久化 generation、Evidence/Delivery/未导出 Review 范围、inventory digest、运行任务和过期时间；apply 必须同时提交 `planId + generationId`。范围、任务、generation 或有效期变化都会以 typed error 拒绝。

活跃 writer 保存 Store root 与 lock 的文件身份。root 被外部删除/替换时进入 `external-store-destroyed`，lock 丢失时进入 `writer-lock-lost`；旧进程不得创建目录后继续。`doctor repair` 只修复不改变 Evidence 身份的状态。root 整体丢失只能在停止 Service 后，通过带 Workspace 精确确认的 `workspace reinitialize` 创建新 generation。

## 理由

固定 Handoff 只在原 Workspace generation 内具有运行时连续性。把 generation、reset inventory 和 writer identity 变成可执行 Contract，才能让 MCP、PBWork、Local Service 和后续 Review Session 对 reset、进程重启与外部破坏给出相同的终止结果。

## 后果

- 旧 session、MCP task 和 Review task 不能跨 generation 继续；
- PBWork 检测 session/generation 变化后清空 Workspace 范围缓存并重新同步；
- reset audit 位于 Store root 外，不随 reset 删除；
- 固定实验 Workspace 可以保持 legacy read-only；迁移只在备份副本验证后才可决定是否做 manifest-only 升级；
- reset 不是回退机制，不能用来删除或重采固定 Evidence。
