# 工程架构

## 目录边界

```text
lib/
├── app/              MaterialApp 和应用启动
├── router/           命名路由常量和注册表
├── theme/            颜色、文字、尺寸和 ThemeService
├── storage/          AppPrefs：进程外 KV，不存业务数据
├── common/
│   ├── widgets/      可复用 UI 组件
│   └── overlay/      AppPop 共享弹层入口
└── features/         按业务 feature 组织的页面、模型与页面 Notifier
```

依赖方向为：

```text
features -> common / theme / router / storage
app      -> router / theme / common / overlay / storage
theme    -> storage（仅主题偏好）
```

`common`、`theme`、`router` 和 `storage` 不依赖具体业务 feature。页面不得通过反向 import 依赖另一个 feature 的私有实现。feature 不得直接依赖 `shared_preferences`。

## 状态管理

工程只使用已安装的 `flutter_riverpod`。页面业务状态默认放进该页 feature 的 `Notifier` 或 `AsyncNotifier`，而不是页面 `State` 字段。Target adapter 不推断状态库；本文件是状态管理的权威来源。

- 应用级状态：theme、AppPrefs 读写，放在 `theme/` 或 `storage/`。
- 页面业务状态：筛选、查询、Case/variant、表单值、校验、加载/空/错误壳，放在同 feature 的 `Notifier` 或 `AsyncNotifier`。
- Flutter 控制器：`TextEditingController`、`TabController`、`ScrollController` 留在 `ConsumerStatefulWidget`；变更通过 Notifier 同步业务字段。
- 组件内部状态：仅限 `common/` 组件自有交互，例如清除按钮显隐、`RefreshController` 生命周期。

产品页使用 `ConsumerWidget` 或 `ConsumerStatefulWidget`。只有 `common` 组件和 Demo 对照区可以把 `setState` 当作默认手段。

跨页共享只有在至少两个 feature 使用且职责稳定时才提升到 `common` 之外的共享 Provider。不要在单个页面中引入第二套状态库。

## 本地存储

只通过 `AppPrefs` 访问 `SharedPreferences`。本轮允许的 key：

- `theme_mode`：`light` | `dark`

不要为列表、表单、Evidence 固定文案或截图 Case 创建存储。需要新 key 时先改本文白名单，再改 `AppPrefs`。

## 页面落点

- 一个页面及其私有模型和页面 Notifier 放在同一个 feature 目录。
- 共用状态、组件或弹层只有在至少两个 feature 使用且职责稳定时才进入 `common/`。
- 业务页面不得直接持有 `RefreshController`、`PopupHandle` 等共享基础设施的生命周期，优先使用对应 Common 组件或 `AppPop`。

## 新增页面

1. 在 `lib/features/<feature>/` 添加页面、必要模型和同目录 Notifier。
2. 在 `lib/router/routes.dart` 添加路由常量。
3. 在 `lib/router/router.dart` 注册 `WidgetBuilder`。
4. 有参数时通过 `RouteSettings.arguments` 传入，并在目标页面集中解析。
5. 只有产品入口需要时才在 Hub 增加入口。
6. 新的持久化 key 先改本文白名单，再改 `AppPrefs`。
7. 遵循 [components.md](components.md) 和 [theme.md](theme.md)。

## 禁止事项

- 不在产品页用 `StatefulWidget` + `setState` 承载筛选、表单、variant 等业务状态。
- 不在 feature 内复制 `Common*` 组件。
- 不直接写新的颜色、字号、圆角或间距数字来绕过 `TS`。
- 不把临时展示数据误写成网络请求或持久化逻辑。
- 不在 feature 中直接使用 `SharedPreferences`。
- 不为未被 Evidence 或产品需求证明的状态创建额外入口。
