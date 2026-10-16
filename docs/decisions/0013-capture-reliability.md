# ADR 0013：采集失败与恢复必须保留可追溯事实

- 状态：已接受
- 日期：2026-10-16

## 背景

采集中途退出、必需 Screenshot 写入失败、同 ID Issue 内容变化和并发 Job 都可能使报告与磁盘事实不一致。失败后的恢复不能依赖浏览器会话或 journal 中的成功文案。

## 决策

- 每个 Case 完成后先持久暂存 Attempt、Revision 与 Blob 字节，再记录完成事件。重启时只恢复实际暂存的产物，未完成 Case 如实记录 interrupted；缺失必需 Screenshot 的 Case 不能成为 captured。
- 同一 Workspace writer 按队列单飞执行 Job；等待中的 Job 保持 queued，可以取消。Bundle 提交锁与 active pointer 原子切换共同保护历史视图。
- Issue 的逻辑身份与内容版本分开。沿用现有 Fact `issueRef` 字符串承载逻辑 ID 与内容摘要，不新增公共 Schema 字段；Store 保存全部内容版本，历史引用不重定向。
- Local Service 的启动参数只由 Core 从 Workspace 配置解析。CLI、操作脚本和服务入口共用该结果，清理脚本也不能另猜 host 或 port。
- 定稿风险对账复用输入身份匹配的评估缓存；确认风险、构建交付及输入变化时重新校验。日常轮询不不断生成持久 Staleness Report。

## 影响

staging 属于内部恢复机制，不作为 Consumer 可读取的 Evidence。失败仍需经过 Run/Snapshot 提交才能成为固定事实；提交失败不移动 active pointer。精确现行行为见 [采集链路](../architecture/capture-pipeline.md) 与 [Evidence 模型](../architecture/evidence-model.md)。

Workspace 单飞保证针对同一个 writer 实例；跨进程写入仍由 Store writer lock 排他保护。
