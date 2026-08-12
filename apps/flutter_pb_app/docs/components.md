# 公共组件

公共组件位于 `lib/common/widgets/`，统一从 `widgets.dart` 导入。组件负责稳定的交互语义、尺寸和 Theme 映射；业务页面只传入数据、状态和回调。弹层统一走 `lib/common/overlay/app_pop.dart` 的 `AppPop`。

## 组件职责

| 组件                               | 语义和适用场景                                                   |
| ---------------------------------- | ---------------------------------------------------------------- |
| `CommonAppBar`                     | 页面标题、返回和顶部操作；页面不要重复创建返回 AppBar            |
| `CommonCard`                       | 纯 surface 容器：背景、边框、圆角与可选抬升；业务结构由 child 组合 |
| `CommonFormSection`                | 表单字段的标题、描述、操作和字段分组；不是内容卡片               |
| `CommonBadge`                      | 只读状态或严重度标签；不承担选择交互                             |
| `CommonChip`                       | 轻量标签或可点击的短选项；不能代替状态 Badge                     |
| `CommonFilterBar`                  | 横向筛选项和可选筛选动作；需要稳定滚动和选中状态                 |
| `CommonDataList`                   | 列表外观容器：分隔、inset、surface、圆角与阴影                   |
| `CommonScrollableDataList`         | 下拉刷新、加载更多；刷新头为文案 + Spinner（非水滴）             |
| `CommonSearchBar`                  | 搜索输入、提交、清除                                             |
| `CommonSelect`                     | 单选下拉；支持清除、加载中、错误文案；Dropdown / AppPop 两种实现 |
| `CommonTextField`                  | 单行文本输入                                                     |
| `CommonTextArea`                   | 多行文本输入                                                     |
| `CommonRadioGroup`                 | 互斥选项集合                                                     |
| `CommonCheckbox`                   | 独立勾选项                                                       |
| `CommonSwitch`                     | 二值开关设置；不能用 Checkbox 静默替代                           |
| `CommonButton`                     | 主要、次要、危险和加载动作                                       |
| `CommonIconButton`                 | 单图标动作（含 loading）；必须提供 tooltip                       |
| `CommonTabs` / `CommonTabView`     | 同一页面内的互斥视图切换                                         |
| `CommonEmptyState`                 | 空数据或未配置状态                                               |
| `CommonSpinner` / `CommonProgress` | 加载指示和进度展示                                               |
| `CommonDivider`                    | 语义分隔线                                                       |
| `CommonAvatar`                     | 人员或主体头像/首字母                                            |
| `CommonBottomNav`                  | 顶级页面导航；默认固定 icon + label、无顶部指示条                |
| `CommonIcon`                       | 稳定图标尺寸/颜色壳；调用方负责 Lucide id → Flutter IconData 翻译 |

## AppPop 弹层

| 方法                                     | 对齐                    |
| ---------------------------------------- | ----------------------- |
| `toast` / `success` / `error` / `warn`   | SnackbarToast           |
| `confirm`                                | DialogPanel             |
| `sheet`                                  | BottomSheet             |
| `flowSheet`                              | FlowSheet（多步页面栈） |
| `loading` / `hideLoading` / `runLoading` | 全局阻塞 Loading        |
| `menu` / `dropMenu`                      | 锚定菜单 / Select 备选  |

业务代码只调 `AppPop`，不直接调 `Pop`。

`CommonCard` 的 `title` / `subtitle` / `onTap` 以及 `CommonBottomNav` 的显示模式/指示条参数仅为已有 feature 的过渡兼容；新 ProtoBridge 实现按 Producer Contract 组合 child 和交互，不把这些旧参数当作源 API。

## 重要语义边界

- `CommonBadge` 是展示语义，`CommonChip` 可以有选择交互；两者不能按外观互换。
- `CommonFilterBar` 负责筛选布局和选中状态，不能用任意 `Wrap` 拼出等价实现。
- `CommonScrollableDataList` 负责刷新、加载更多和 footer，不能用普通 `ListView` 静默替代。
- `CommonFormSection` 负责表单分组，不等于带边框的 `CommonCard`。
- `CommonSwitch` 和 `CommonCheckbox` 的交互语义不同。

## 受控交互契约

- `CommonFilterBar` 必须接收可写的选中状态，并通过完整回调更新页面状态；回调后可见内容必须反映筛选结果。
- `CommonSearchBar` 有查询语义时必须连接到当前可见列表或空态；不能只更新输入框文本。
- `CommonScrollableDataList` 的刷新必须更新可观察的加载或数据状态，并在完成后反馈结果。
- `CommonSelect`、`CommonRadioGroup`、`CommonSwitch`、`CommonCheckbox` 和按钮不得提交空的 `onSelected`、`onChanged`、`onPressed` 或等价回调。
- 页面负责把组件状态接入业务模型；组件负责稳定的交互语义、尺寸和 Theme 映射。

## 参数和实现依据

- 先检查组件构造参数和相似页面，再决定视觉变体。
- 组件内部已有的尺寸、圆角、边框和颜色必须优先通过 `TS` 继承。
- Evidence 要求组件存在但本地组件参数不足时，先报告缺口，再决定是否扩展组件；不要在 feature 中手写第二份公共实现。
- 组件使用示例以 `lib/features/` 和 `lib/features/demo/demo_page.dart` 为准。
- 精确 DS component id 落点以 [proto-bridge.md](proto-bridge.md) 与 `proto-bridge.target.json` 为准；映射不是靠本表的外观描述推断。
