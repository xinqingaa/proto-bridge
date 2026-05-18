import 'package:flutter/material.dart';

import '../../theme/app_tokens.dart';
import '../../theme/theme_service.dart';

class CommonAppBar extends StatelessWidget implements PreferredSizeWidget {
  const CommonAppBar({
    required this.title,
    this.eyebrow,
    this.leading,
    this.action,
    super.key,
  });

  final String title;
  final String? eyebrow;
  final Widget? leading;
  final Widget? action;

  @override
  Size get preferredSize => const Size.fromHeight(86);

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.xs,
        ),
        child: Row(
          children: [
            if (leading != null) ...[
              leading!,
              const SizedBox(width: AppSpacing.sm),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (eyebrow != null)
                    Text(
                      eyebrow!,
                      style: themeService.textStyles.caption.copyWith(
                        color: themeService.colors.muted,
                        letterSpacing: 0,
                      ),
                    ),
                  Text(title, style: themeService.textStyles.title),
                ],
              ),
            ),
            if (action != null) action!,
          ],
        ),
      ),
    );
  }
}
