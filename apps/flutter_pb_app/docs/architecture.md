# 工程架构

## 目录边界

```text
lib/
├── app/              MaterialApp 和应用启动
├── router/           命名路由常量和注册表
├── theme/            颜色、文字、尺寸和 ThemeService
├── common/
│   ├── widgets/      可复用 UI 组件
│   └── overlay/      AppPop 共享弹层入口
└── features/         按业务 feature 组织的页面和模型
```

依赖方向为：

```text
features -> common / theme / router
app      -> router / theme / common / overlay
```

`common`、`theme` 和 `router` 不依赖具体业务 feature。页面不得通过反向 import 依赖另一个 feature 的私有实现。

## 页面落点

- 一个页面及其私有模型放在同一个 feature 目录。
- 页面级临时状态优先使用页面自己的 `StatefulWidget`。
- 跨页面或应用级状态使用现有 Riverpod 入口；不要在单个页面中引入第二套状态库。
- 共用状态、组件或弹层只有在至少两个 feature 使用且职责稳定时才进入 `common/`。
- 业务页面不得直接持有 `RefreshController`、`PopupHandle` 等共享基础设施的生命周期，优先使用对应 Common 组件或 `AppPop`。

## 新增页面

1. 在 `lib/features/<feature>/` 添加页面和必要模型。
2. 在 `lib/router/routes.dart` 添加路由常量。
3. 在 `lib/router/router.dart` 注册 `WidgetBuilder`。
4. 有参数时通过 `RouteSettings.arguments` 传入，并在目标页面集中解析。
5. 只有产品入口需要时才在 Hub 增加入口。
6. 遵循 [components.md](components.md) 和 [theme.md](theme.md)。

## 禁止事项

- 不在 feature 内复制 `Common*` 组件。
- 不直接写新的颜色、字号、圆角或间距数字来绕过 `TS`。
- 不把临时展示数据误写成网络请求或持久化逻辑。
- 不为未被 Evidence 或产品需求证明的状态创建额外入口。
