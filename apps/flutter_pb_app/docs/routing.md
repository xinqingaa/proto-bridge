# 路由

工程使用 Navigator 1.0 命名路由。

## 注册位置

- 路由常量定义在 `lib/router/routes.dart`。
- 页面注册在 `lib/router/router.dart` 的 `appRoutes`。
- 页面跳转优先使用 `Navigator.of(context).pushNamed(...)`。
- 返回行为使用 `maybePop` 或页面已有的 `CommonAppBar` 返回动作。

## 参数

需要参数时通过 `RouteSettings.arguments` 传递，并在目标页面集中解析；不要在多个 widget 中重复解析同一参数。当前路由：

- `/` Flutter 启动入口，用户开始后替换为展示工程。
- `/demo` 主题 / 组件目录。
- `/settings` 展示设置，切换主题与深浅色。
- `/launch` 手动启动页预览，关闭后回到原页面。

业务页面由固定 PBWork Handoff 按 Screen 新增；新增时同时补路由常量、注册、参数解析和 Widget test，不把页面私有解析散落到多个 widget。

## 新增路由检查表

1. 添加 `AppRoutes` 常量。
2. 添加 `appRoutes` 注册。
3. 确认返回行为和参数缺省值。
4. 在产品自身的导航流程中接入入口。
5. 在 Widget test 中覆盖打开、返回和主要参数状态。

页面内部的临时弹层使用 `AppPop`，不改变 Navigator 返回栈。
