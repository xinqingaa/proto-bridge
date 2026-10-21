import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import '../action/button.dart';
import '../action/icon.dart';
import '../action/icon_button.dart';
import '../display/glass_surface.dart';

enum CommonAppBarSurface { theme, solid, glass, transparent }

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
    this.background = CommonAppBarSurface.theme,
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
  final CommonAppBarSurface background;

  @override
  Size get preferredSize => Size.fromHeight(dense ? 48 : kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final ts = TS.of(context);
    final glass =
        background == CommonAppBarSurface.glass ||
        (background == CommonAppBarSurface.theme &&
            ts.pack.surfaceTreatment == AppSurfaceTreatment.glass);
    final transparent = glass || background == CommonAppBarSurface.transparent;
    return AppBar(
      automaticallyImplyLeading: false,
      forceMaterialTransparency: transparent,
      flexibleSpace: glass
          ? const CommonGlassSurface(child: SizedBox.expand())
          : null,
      toolbarHeight: preferredSize.height,
      title: title.trim().isEmpty
          ? null
          : Text(
              title,
              style: ts.textStyle.subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
      centerTitle: true,
      elevation: elevated ? ts.elevation.card : ts.elevation.none,
      backgroundColor: transparent ? Colors.transparent : ts.colors.surface,
      foregroundColor: ts.colors.onSurface,
      shape: Border(bottom: ts.border.hairline),
      leading: showBack
          ? CommonIconButton(
              name: CommonIconName.chevronRight,
              label: backLabel,
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
              quarterTurns: 2,
              variant: CommonIconButtonVariant.text,
            )
          : null,
      actions: showAction
          ? [
              CommonIconButton(
                name: actionIcon,
                label: actionLabel,
                onPressed: onAction,
                size: CommonControlSize.sm,
                variant: CommonIconButtonVariant.text,
              ),
            ]
          : null,
    );
  }
}
