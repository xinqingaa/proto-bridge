import 'package:flutter/material.dart';

import '../theme/ts.dart';
import 'button.dart';

/// 对齐 pbwork `Badge`。
class CommonBadge extends StatelessWidget {
  const CommonBadge({
    super.key,
    required this.label,
    this.tone = CommonButtonTone.primary,
  });

  final String label;
  final CommonButtonTone tone;

  Color get _bg {
    switch (tone) {
      case CommonButtonTone.action:
        return TS.colors.action;
      case CommonButtonTone.primary:
        return TS.colors.primary;
      case CommonButtonTone.secondary:
        return TS.colors.secondary;
      case CommonButtonTone.error:
        return TS.colors.error;
      case CommonButtonTone.success:
        return TS.colors.success;
    }
  }

  Color get _fg {
    switch (tone) {
      case CommonButtonTone.action:
        return TS.colors.onAction;
      case CommonButtonTone.primary:
        return TS.colors.onPrimary;
      case CommonButtonTone.secondary:
        return TS.colors.onSecondary;
      case CommonButtonTone.error:
        return TS.colors.onError;
      case CommonButtonTone.success:
        return TS.colors.onSuccess;
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
