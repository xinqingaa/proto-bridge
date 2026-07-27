import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'button.dart';
import 'icon_button.dart';

/// 对齐 pbwork `AppBar` — 官方 [AppBar] 配置封装。
class CommonAppBar extends StatelessWidget implements PreferredSizeWidget {
  const CommonAppBar({
    super.key,
    required this.title,
    this.showBack = false,
    this.onBack,
    this.actions,
    this.elevated = false,
    this.centerTitle = true,
  });

  final String title;
  final bool showBack;
  final VoidCallback? onBack;
  final List<Widget>? actions;
  final bool elevated;
  final bool centerTitle;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return AppBar(
      title: Text(title, style: TS.textStyle.title),
      centerTitle: centerTitle,
      elevation: elevated ? TS.elevation.card : TS.elevation.none,
      backgroundColor: TS.colors.surface,
      foregroundColor: TS.colors.onSurface,
      leading: showBack
          ? CommonIconButton(
              icon: Icons.arrow_back,
              tooltip: '返回',
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
              variant: CommonButtonVariant.text,
            )
          : null,
      actions: actions,
    );
  }
}
