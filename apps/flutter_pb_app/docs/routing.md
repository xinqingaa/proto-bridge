# 路由

工程使用 Navigator 1.0 命名路由。

## 注册位置

- 路由常量定义在 `lib/router/routes.dart`。
- 页面注册在 `lib/router/router.dart` 的 `appRoutes`。
- 页面跳转优先使用 `Navigator.of(context).pushNamed(...)`。
- 返回行为使用 `maybePop` 或页面已有的 `CommonAppBar` 返回动作。

## 参数

需要参数时通过 `RouteSettings.arguments` 传递，并在目标页面集中解析；不要在多个 widget 中重复解析同一参数。当前业务路由：

- `/` Hub
- `/demo` Demo 对照
- `/cold-chain/exceptions` 异常队列，参数 `ExceptionQueueArgs.variantId`
- `/cold-chain/shipment` 运输详情，参数 `ShipmentDetailArgs`
- `/cold-chain/resolution` 处置表单，参数 `ResolutionFormArgs`

## 新增路由检查表

1. 添加 `AppRoutes` 常量。
2. 添加 `appRoutes` 注册。
3. 确认返回行为和参数缺省值。
4. 若是顶级入口，才在 Hub 增加入口。
5. 在 Widget test 中覆盖打开、返回和主要参数状态。

页面内部的临时弹层使用 `AppPop` 或既有 Material 弹层 API，不改变 Navigator 返回栈。
