import 'package:flutter/material.dart';

import '../../theme/app_tokens.dart';
import '../../theme/theme_service.dart';

class CommonButton extends StatelessWidget {
  const CommonButton({
    required this.label,
    required this.onPressed,
    this.primary = false,
    super.key,
  });

  final String label;
  final VoidCallback onPressed;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(42),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.panel),
        ),
        backgroundColor: primary
            ? themeService.colors.primary
            : themeService.colors.accentSoft,
        foregroundColor: primary ? Colors.white : themeService.colors.accent,
      ),
      onPressed: onPressed,
      child: Text(label, overflow: TextOverflow.ellipsis),
    );
  }
}
