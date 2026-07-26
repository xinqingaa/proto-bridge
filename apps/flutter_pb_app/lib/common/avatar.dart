import 'package:flutter/material.dart';

import '../theme/ts.dart';
import 'button.dart';

/// 对齐 pbwork `Avatar` — 官方 [CircleAvatar]。
class CommonAvatar extends StatelessWidget {
  const CommonAvatar({
    super.key,
    this.name,
    this.imageUrl,
    this.size = CommonControlSize.md,
    this.tone = CommonButtonTone.primary,
  });

  final String? name;
  final String? imageUrl;
  final CommonControlSize size;
  final CommonButtonTone tone;

  double get _diameter {
    switch (size) {
      case CommonControlSize.sm:
        return TS.sizing.avatarSm;
      case CommonControlSize.md:
        return TS.sizing.avatarMd;
      case CommonControlSize.lg:
        return TS.sizing.avatarLg;
    }
  }

  Color get _bg {
    switch (tone) {
      case CommonButtonTone.action:
        return TS.colors.actionSoft;
      case CommonButtonTone.primary:
        return TS.colors.primarySoft;
      case CommonButtonTone.secondary:
        return TS.colors.secondarySoft;
      case CommonButtonTone.error:
        return TS.colors.errorSoft;
      case CommonButtonTone.success:
        return TS.colors.successSoft;
    }
  }

  Color get _fg {
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

  String get _initials {
    final n = (name ?? '').trim();
    if (n.isEmpty) return '?';
    final parts = n.split(RegExp(r'\s+'));
    String first(String s) => s.isEmpty ? '?' : s.substring(0, 1);
    if (parts.length == 1) return first(parts.first).toUpperCase();
    return (first(parts.first) + first(parts.last)).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CircleAvatar(
      radius: _diameter / 2,
      backgroundColor: _bg,
      backgroundImage:
          imageUrl != null ? NetworkImage(imageUrl!) : null,
      child: imageUrl == null
          ? Text(
              _initials,
              style: TS.textStyle.label.copyWith(color: _fg),
            )
          : null,
    );
  }
}
