# Verification

实现后按目标工程自身的验证入口执行，并根据风险决定验证深度：

1. 对照固定 Screenshot 检查结构树、关键区域、尺寸、间距、圆角、边框、颜色、字体和文案。
2. 逐个重放 Handoff 选中的场景导航和交互状态。
3. 运行目标工程声明的静态检查和测试。
4. 有可用的目标平台设备或模拟器时，运行同尺寸的视觉验证；没有时明确报告视觉验证未执行。
5. 仅当存在适用的 Target adapter 时调用 `validate_target_changes`，并传入限制性的 `allowedPaths` 和预期文件。
6. 按 Acceptance Contract 输出 structure/components/tokens/states/interactions 五维 pass/fail/unverified；机器未验证的 critical requirement 只能是 unverified。
7. 调用 `evaluate_acceptance` 计算最终结果；不得自行改写权重、门槛或把缺失 requirement 从分母移除。

通过门槛：目标总分 90，最低总分 85，任一维度不得低于 80；任一 hard gate 失败即整体失败，不能用其它维度加权抵消。

不要把桌面、Web 或不同尺寸设备的结果当作固定移动 Screenshot 的等价验收。
