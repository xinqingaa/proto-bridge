import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'button.dart';

enum CommonBadgeTone { action, primary, secondary, error, success, warning }

/// 对齐 pbwork `Badge`。
class CommonBadge extends StatelessWidget {
  const CommonBadge({
    super.key,
    required this.label,
    this.tone = CommonButtonTone.primary,
    this.semanticTone,
  });

  final String label;
  final CommonButtonTone tone;
  final CommonBadgeTone? semanticTone;

  CommonBadgeTone get _tone =>
      semanticTone ??
      switch (tone) {
        CommonButtonTone.action => CommonBadgeTone.action,
        CommonButtonTone.primary => CommonBadgeTone.primary,
        CommonButtonTone.secondary => CommonBadgeTone.secondary,
        CommonButtonTone.error => CommonBadgeTone.error,
        CommonButtonTone.success => CommonBadgeTone.success,
      };

  Color get _bg {
    switch (_tone) {
      case CommonBadgeTone.action:
        return TS.colors.action;
      case CommonBadgeTone.primary:
        return TS.colors.primary;
      case CommonBadgeTone.secondary:
        return TS.colors.secondary;
      case CommonBadgeTone.error:
        return TS.colors.error;
      case CommonBadgeTone.success:
        return TS.colors.success;
      case CommonBadgeTone.warning:
        return TS.colors.warning;
    }
  }

  Color get _fg {
    switch (_tone) {
      case CommonBadgeTone.action:
        return TS.colors.onAction;
      case CommonBadgeTone.primary:
        return TS.colors.onPrimary;
      case CommonBadgeTone.secondary:
        return TS.colors.onSecondary;
      case CommonBadgeTone.error:
        return TS.colors.onError;
      case CommonBadgeTone.success:
        return TS.colors.onSuccess;
      case CommonBadgeTone.warning:
        return TS.colors.onWarning;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: TS.spacing.sm,
        vertical: TS.spacing.xxs,
      ),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(TS.radius.full),
      ),
      child: Text(
        label,
        style: TS.textStyle.captionStrong.copyWith(color: _fg),
      ),
    );
  }
}
