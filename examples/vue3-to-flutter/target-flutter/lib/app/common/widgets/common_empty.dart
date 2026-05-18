import 'package:flutter/material.dart';

import '../../theme/app_tokens.dart';
import '../../theme/theme_service.dart';

class CommonEmpty extends StatelessWidget {
  const CommonEmpty({required this.message, super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Center(
        child: Text(
          message,
          style: TextStyle(color: colors.muted),
        ),
      ),
    );
  }
}
