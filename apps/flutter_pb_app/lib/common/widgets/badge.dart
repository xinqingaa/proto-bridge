import 'package:flutter/material.dart';

import '../../theme/ts.dart';

enum CommonBadgeTone { primary, error, success, warning }

/// 只读数量、状态或严重度徽标。
class CommonBadge extends StatelessWidget {
  const CommonBadge({
    super.key,
    required this.label,
    this.tone = CommonBadgeTone.error,
  });

  final String label;
  final CommonBadgeTone tone;

  Color get _background => switch (tone) {
    CommonBadgeTone.primary => TS.colors.primary,
    CommonBadgeTone.error => TS.colors.error,
    CommonBadgeTone.success => TS.colors.success,
    CommonBadgeTone.warning => TS.colors.warning,
  };

  Color get _foreground => switch (tone) {
    CommonBadgeTone.primary => TS.colors.onPrimary,
    CommonBadgeTone.error => TS.colors.onError,
    CommonBadgeTone.success => TS.colors.onSuccess,
    CommonBadgeTone.warning => TS.colors.onWarning,
  };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: TS.spacing.sm,
        vertical: TS.spacing.xxs,
      ),
      decoration: BoxDecoration(
        color: _background,
        borderRadius: BorderRadius.circular(TS.radius.full),
      ),
      child: Text(
        label,
        style: TS.textStyle.captionStrong.copyWith(color: _foreground),
      ),
    );
  }
}
