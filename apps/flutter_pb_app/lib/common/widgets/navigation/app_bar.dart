import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import '../action/button.dart';
import '../action/icon.dart';
import '../action/icon_button.dart';

class CommonAppBar extends StatelessWidget implements PreferredSizeWidget {
  const CommonAppBar({
    super.key,
    required this.title,
    this.dense = false,
    this.elevated = false,
    this.showBack = false,
    this.backLabel = '返回',
    this.onBack,
    this.showAction = false,
    this.actionIcon = CommonIconName.more,
    this.actionLabel = '更多操作',
    this.onAction,
  });

  final String title;
  final bool dense;
  final bool elevated;
  final bool showBack;
  final String backLabel;
  final VoidCallback? onBack;
  final bool showAction;
  final CommonIconName actionIcon;
  final String actionLabel;
  final VoidCallback? onAction;

  @override
  Size get preferredSize => Size.fromHeight(dense ? 48 : kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return AppBar(
      toolbarHeight: preferredSize.height,
      title: Text(title, style: TS.textStyle.subtitle),
      centerTitle: true,
      elevation: elevated ? TS.elevation.card : TS.elevation.none,
      backgroundColor: TS.colors.surface,
      foregroundColor: TS.colors.onSurface,
      shape: Border(bottom: TS.border.hairline),
      leading: showBack
          ? CommonIconButton(
              name: CommonIconName.chevronRight,
              label: backLabel,
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
              quarterTurns: 2,
              variant: CommonButtonVariant.text,
            )
          : null,
      actions: showAction
          ? [
              CommonIconButton(
                name: actionIcon,
                label: actionLabel,
                onPressed: onAction,
                size: CommonControlSize.sm,
                variant: CommonButtonVariant.text,
              ),
            ]
          : null,
    );
  }
}
