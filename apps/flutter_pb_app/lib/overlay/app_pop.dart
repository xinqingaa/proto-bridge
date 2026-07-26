import 'package:flutter/material.dart';
import 'package:unified_popups/unified_popups.dart';

/// App 层弹窗封装：业务/组件只调 [AppPop]，不直接调 [Pop]。
///
/// 对齐 pbwork：
/// - DialogPanel → [confirm]
/// - BottomSheet → [sheet]
/// - SnackbarToast → [toast]
/// - Select 备选 → [menu]
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
