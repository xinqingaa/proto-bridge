import 'package:flutter/material.dart';
import 'package:unified_popups/unified_popups.dart';

/// App 层弹窗封装：业务/组件只调 [AppPop]，不直接调 [Pop]。
///
/// 对齐 pbwork：
/// - DialogPanel → [confirm]
/// - BottomSheet → [sheet]
/// - FlowSheet → [flowSheet]
/// - SnackbarToast → [toast]
/// - Loading → [loading] / [hideLoading]
/// - Select 备选 → [menu] / [dropMenu]
abstract final class AppPop {
  static void toast(
    String message, {
    ToastType type = ToastType.none,
  }) {
    Pop.toast(
      ToastConfig.text(message, type: type),
    );
  }

  static void success(String message) =>
      toast(message, type: ToastType.success);

  static void error(String message) => toast(message, type: ToastType.error);

  static void warn(String message) => toast(message, type: ToastType.warn);

  /// 全局阻塞 Loading；[message] 为空时仅显示转圈。
  ///
  /// 传入 [until] 时，Future settled 后自动关闭（异常仍由调用方处理）。
  static void loading({
    String? message,
    Future<void>? until,
  }) {
    if (message == null || message.isEmpty) {
      Pop.loading(
        LoadingConfig.indicator(
          lifetime: until == null
              ? const PopupLifetime.manual()
              : PopupLifetime.until(until),
        ),
      );
      return;
    }
    Pop.loading(
      LoadingConfig.text(
        message,
        lifetime: until == null
            ? const PopupLifetime.manual()
            : PopupLifetime.until(until),
      ),
    );
  }

  /// 关闭全局 Loading。
  static Future<void> hideLoading() => Pop.hideLoading();

  /// 跑异步任务并自动展示 / 关闭 Loading。
  static Future<T> runLoading<T>({
    String message = '加载中',
    required Future<T> task,
  }) async {
    final settled = task.then<void>((_) {});
    AppPop.loading(message: message, until: settled);
    return task;
  }

  /// 对齐 pbwork DialogPanel / confirm。
  static Future<bool> confirm({
    required String title,
    String content = '',
    String confirmText = '确定',
    String cancelText = '取消',
  }) async {
    return await Pop.confirm(
          ConfirmConfig(
            title: title,
            content: content,
            confirmAction: ConfirmAction.text(confirmText),
            cancelAction: ConfirmAction.text(cancelText),
          ),
        ).result ??
        false;
  }

  /// 对齐 pbwork BottomSheet。
  static Future<T?> sheet<T>({
    String? title,
    required Widget Function(BuildContext context, PopupHandle<T> handle)
        builder,
    bool showCloseButton = true,
  }) {
    return Pop.sheet<T>(
      SheetConfig<T>(
        header: SheetHeaderConfig(
          title: title,
          showCloseButton: title != null && showCloseButton,
        ),
        builder: builder,
      ),
    ).result;
  }

  /// 对齐 pbwork FlowSheet — 多步底部面板（内嵌页面栈）。
  ///
  /// 每次调用应新建 [FlowSheetController]；不要复用已关闭的实例。
  static Future<R?> flowSheet<R>({
    required FlowSheetController<R> controller,
    required FlowSheetPage initialPage,
    String? title,
    bool showCloseButton = true,
    SheetSizeConfig size = const SheetSizeConfig(
      maxHeight: SheetDimension.fraction(0.9),
    ),
    SheetDragConfig drag = const SheetDragConfig(
      mode: SheetDragDismissMode.handleOnly,
    ),
  }) {
    return Pop.flowSheet<R>(
      FlowSheetConfig<R>(
        controller: controller,
        initialPage: initialPage,
        header: SheetHeaderConfig(
          title: title,
          showCloseButton: title != null && showCloseButton,
        ),
        size: size,
        drag: drag,
        barrier: const PopupBarrierConfig(dismissible: true),
      ),
    ).result;
  }

  /// 锚定自定义菜单。
  static Future<T?> menu<T>({
    required PopupAnchorController anchor,
    required Widget Function(BuildContext context, PopupHandle<T> handle)
        builder,
    MenuPlacement placement = MenuPlacement.belowStart,
  }) {
    return Pop.menu<T>(
      MenuConfig<T>(
        anchor: anchor,
        placement: placement,
        builder: builder,
      ),
    ).result;
  }

  /// 数据驱动下拉菜单（SelectField 备选方案）。
  static Future<T?> dropMenu<T>({
    required PopupAnchorController anchor,
    required DropMenu<T> menu,
    ValueChanged<T>? onSelected,
    MenuPlacement placement = MenuPlacement.belowStart,
  }) {
    return Pop.dropMenu<T>(
      DropMenuConfig<T>(
        anchor: anchor,
        menu: menu,
        onSelected: onSelected,
        placement: placement,
      ),
    ).result;
  }
}
