# Verification

实现后按目标工程自身的验证入口执行，并根据风险决定验证深度：

1. 对照固定 Screenshot 检查结构树、关键区域、尺寸、间距、圆角、边框、颜色、字体和文案。
2. 逐个重放 Handoff 选中的场景导航和交互状态。
3. 运行目标工程声明的静态检查和测试。
4. 如果本次实际执行了目标平台视觉验证，报告设备环境和结果；未执行时明确标为未验证，但不为此临时引入设备自动化或 Runtime Harness。
5. 仅当存在适用的 Target adapter 时调用 `validate_target_changes`，并传入限制性的 `allowedPaths` 和预期文件。
6. 完成上述验证后应用后续 `Acceptance Discipline`，按固定 selected scope 形成五维 observations 和 Review completeness；不要计算分数。

“实施完成”只表示 Handoff 选中范围已经实现或明确披露未实现项；“Review complete”只表示验收动作完整。两者都不能替代对 Screenshot 最终视觉效果的判断。没有执行的视觉或交互验证必须标为 `unverified`。

不要把桌面、Web 或不同尺寸设备的结果当作固定移动 Screenshot 的等价验收。
