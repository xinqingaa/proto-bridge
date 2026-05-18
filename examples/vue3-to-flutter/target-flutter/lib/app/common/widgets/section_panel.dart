import 'package:flutter/material.dart';

import '../../theme/app_tokens.dart';
import '../../theme/theme_service.dart';

class SectionPanel extends StatelessWidget {
  const SectionPanel({
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    super.key,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: themeService.colors.surface,
        border: Border.all(color: themeService.colors.border),
        borderRadius: BorderRadius.circular(AppRadii.panel),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF203042).withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}
