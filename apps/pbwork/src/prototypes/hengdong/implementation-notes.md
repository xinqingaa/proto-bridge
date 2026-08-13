# 恒动实现说明

## 导航

- 一级页面由 `HengdongRoot` 组合 `TabViewport + Tabbar`，根目的地关闭横滑。
- 一级 Tab 切换使用 replace；二/三级进入使用 push，并在 history state 记录 parent 与所属 Tab。
- 栈页统一通过 `HengdongShell` 返回，嵌入 Runtime 时 replace 到 parent，深链回退到所属 Tab。

## 滚动和反馈

- 常规内容页只使用一个 `ScrollableDataList` 作为纵滚所有者。
- 训练执行页使用固定摘要、单一动作列表滚动区和底部操作区。
- Sheet、Confirm 与 Toast 使用 PBWork DS 并注册可直接打开的 Variant。

## Evidence

- 所有 Screen default Variant 都声明 required boundary。
- DS 实例使用 `hengdong.{screen}.{slot}` inspectId。
- 两个业务局部图表显式声明 id、role 与 Token bindings。
- 核心交互覆盖开始推荐训练、打开计划和完成训练生成记录。
