# 公共组件

公共组件位于 `lib/common/widgets/`，统一从 `widgets.dart` 导入。组件负责稳定的交互语义、尺寸和 Theme 映射；业务页面只传入数据、状态和回调。

## 组件职责

| 组件 | 语义和适用场景 |
| --- | --- |
| `CommonAppBar` | 页面标题、返回和顶部操作；页面不要重复创建返回 AppBar |
| `CommonCard` | 独立内容容器，可带标题、描述、边框、抬升和点击 |
| `CommonFormSection` | 表单字段的标题、描述、操作和字段分组；不是内容卡片 |
| `CommonBadge` | 只读状态或严重度标签；不承担选择交互 |
| `CommonChip` | 轻量标签或可点击的短选项；不能代替状态 Badge |
| `CommonFilterBar` | 横向筛选项和可选筛选动作；需要稳定滚动和选中状态 |
| `CommonDataList` | 不需要刷新控制的列表容器 |
| `CommonScrollableDataList` | 需要下拉刷新、加载更多或 footer 的列表容器 |
| `CommonSearchBar` | 搜索输入、提交和搜索图标 |
| `CommonSelect` | 单选下拉；支持默认 Dropdown 和 AppPop 菜单两种实现 |
| `CommonTextField` | 单行文本输入 |
| `CommonTextArea` | 多行文本输入 |
| `CommonRadioGroup` | 互斥选项集合 |
| `CommonCheckbox` | 独立勾选项 |
| `CommonSwitch` | 二值开关设置；不能用 Checkbox 静默替代 |
| `CommonButton` | 主要、次要、危险和加载动作 |
| `CommonIconButton` | 单图标动作，必须提供 tooltip |
| `CommonTabs` / `CommonTabView` | 同一页面内的互斥视图切换 |
| `CommonEmptyState` | 空数据或未配置状态 |
| `CommonSpinner` / `CommonProgress` | 加载指示和进度展示 |
| `CommonDivider` | 语义分隔线 |
| `CommonAvatar` | 人员或主体头像/首字母 |
| `CommonBottomNav` | 顶级页面导航 |

## 重要语义边界

- `CommonBadge` 是展示语义，`CommonChip` 可以有选择交互；两者不能按外观互换。
- `CommonFilterBar` 负责筛选布局和选中状态，不能用任意 `Wrap` 拼出等价实现。
- `CommonScrollableDataList` 负责刷新、加载更多和 footer，不能用普通 `ListView` 静默替代。
- `CommonFormSection` 负责表单分组，不等于带边框的 `CommonCard`。
- `CommonSwitch` 和 `CommonCheckbox` 的交互语义不同。

## 参数和实现依据

- 先检查组件构造参数和相似页面，再决定视觉变体。
- 组件内部已有的尺寸、圆角、边框和颜色必须优先通过 `TS` 继承。
- Evidence 要求组件存在但本地组件参数不足时，先报告缺口，再决定是否扩展组件；不要在 feature 中手写第二份公共实现。
- 组件使用示例以 `lib/features/` 和 `lib/features/demo/demo_page.dart` 为准。
