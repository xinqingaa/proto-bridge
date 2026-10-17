# ADR 0015：主题一致性探针与声明时钟

- 状态：已接受
- 日期：2026-10-17

## 背景

对每套主题反复采集会扩大 Case 数，却不能替代“主题不能改变结构与绑定”的约束。使用系统时间还会让同一个 Case 产生不同文字和截图。

## 决策

- Case 身份仍由 Core 定义，只保留模式身份；Selection/Handoff 固定主题包及默认主题，不另建 PBWork Case 算法。
- Preflight 对每个主题与模式运行结构一致性探针，验证所需节点的存在、可见性、角色和绑定。隐藏或改变必需节点的主题不能通过探针。
- Capture 采集默认主题，固定包/键目录摘要和完整主题 × 模式解析表。未采集组合如实说明，不把取值表当成截图证据。
- 原型可声明固定 instant/timeZone；Runtime 的 `useClock()` 读 Date，Core/Playwright 固定环境再准备与采集。业务时间文案复用该时钟，不再引入第二套时间源。

## 影响

探针是主题结构门禁；截图与运行事实仍以固定 Case Evidence 为准。协议、主题表与时钟声明由 Core 作为语义权威，详见[采集链路](../architecture/capture-pipeline.md)、[Evidence 模型](../architecture/evidence-model.md)和[主题包模型](../architecture/theme-packs.md)。采集失败恢复沿用 [ADR 0013](./0013-capture-reliability.md)。
