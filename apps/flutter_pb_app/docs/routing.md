# 路由

工程使用 Navigator 1.0 命名路由。

## 注册位置

- 路由常量定义在 `lib/router/routes.dart`。
- 页面注册在 `lib/router/router.dart` 的 `appRoutes`。
- 页面跳转优先使用 `Navigator.of(context).pushNamed(...)`。
- 返回行为使用 `maybePop` 或页面已有的 `CommonAppBar` 返回动作。

## 参数

需要参数时通过 `RouteSettings.arguments` 传递，并在目标页面集中解析；不要在多个 widget 中重复解析同一参数。当前可用路由以 `lib/router/routes.dart` 与 `appRoutes` 为准，应用初始路由由 `lib/app/app.dart` 指定。

业务页面由固定 PBWork Handoff 按 Screen 新增；新增时同时补路由常量、注册、参数解析和 Widget test，不把页面私有解析散落到多个 widget。

## 新增路由检查表

1. 添加 `AppRoutes` 常量。
2. 添加 `appRoutes` 注册。
3. 确认返回行为和参数缺省值。
4. 在产品自身的导航流程中接入入口。
5. 在 Widget test 中覆盖打开、返回和主要参数状态。

页面内部的临时弹层使用 `AppPop`，不改变 Navigator 返回栈。

## 应用准备与启动页

`main.dart` 在绑定初始化后立即运行 `AppStartup`。入口只启动一次存储准备任务，等待期间展示 `CommonLaunchScreen(mode: launch)`；完成后注入 AppPrefs 并启动正式 MaterialApp，直接进入初始路由。准备失败提供重试，不使用固定计时或“开始”按钮。

准备状态属于应用入口，不属于命名路由。页面跳转、主题切换及回前台不会重新初始化或重置导航；首帧回调不能替代存储、主题等真实准备任务。新增必要初始化应集中加入入口准备流程，不在业务页面重复实现启动门禁。Flutter 内容只在引擎能绘制后出现，原生首帧之前的启动资源单独管理。
