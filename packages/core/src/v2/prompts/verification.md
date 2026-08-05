# Verification

实现后按目标工程自身的验证入口执行，并根据风险决定验证深度：

1. 对照固定 Screenshot 检查结构树、关键区域、尺寸、间距、圆角、边框、颜色、字体和文案。
2. 逐个重放 Handoff 选中的场景导航和交互状态。
3. 运行目标工程声明的静态检查和测试。
4. 有可用的目标平台设备或模拟器时，运行同尺寸的视觉验证；没有时明确报告视觉验证未执行。
5. 仅当存在适用的 Target adapter 时调用 `validate_target_changes`，并传入限制性的 `allowedPaths` 和预期文件。
6. Authoritative Review 使用 `verify_target_claims` 验证五维 obligation。Structure 需要目标工程 deterministic Structure inspector；component/token 需要精确 occurrence/slot；state/interaction 需要 typed State/Scenario JSON inspector。state/interaction verifier result 会自动形成 assessment，其他维度把 receipt digest 写入对应 assessment；没有机器 authority 时保持 `unverified`。
7. State inspector 必须输出 shell、visible Region、keyed collection、已声明值、completeness；Scenario receipt 必须输出 pre-state、实际 action/input、post-state 和 visible result。命令退出 0、stdout hash 或“发生过点击”不能证明 checkpoint 命中。
8. 根据实际风险按需复查 structure/components/tokens/interactions/provenance；状态差异以 `read_case_delta` 和 typed verifier 为准。不要为复查默认展开完整 Contract，不要计算分数，也不要把 Evidence reference 当作必须逐项填满的配额。
9. 调用 `summarize_reconstruction_review` 汇总已处理 Case、已查看 Screenshot、已重放 Scenario、已知偏差和未验证事项；该汇总不代表独立视觉验收。

“完成”只表示 Handoff 选中范围已经实施或明确披露未实施项，不能替代对 Screenshot 最终视觉效果的判断。没有执行的视觉或交互验证必须标为未验证。

不要把桌面、Web 或不同尺寸设备的结果当作固定移动 Screenshot 的等价验收。
