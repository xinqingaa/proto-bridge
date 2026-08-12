import 'package:flutter/material.dart';

import '../../../theme/ts.dart';
import '../action/button.dart';

enum CommonAvatarTone { primary, secondary }

class CommonAvatar extends StatelessWidget {
  const CommonAvatar({
    super.key,
    required this.name,
    this.imageUrl,
    this.size = CommonControlSize.md,
    this.tone = CommonAvatarTone.primary,
  });

  final String name;
  final String? imageUrl;
  final CommonControlSize size;
  final CommonAvatarTone tone;

  double get _diameter => switch (size) {
    CommonControlSize.sm => TS.sizing.avatarSm,
    CommonControlSize.md => TS.sizing.avatarMd,
    CommonControlSize.lg => TS.sizing.avatarLg,
  };

  String get _initials {
    final normalized = name.trim();
    if (normalized.isEmpty) return '?';
    final parts = normalized.split(RegExp(r'\s+'));
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return '${parts.first.characters.first}${parts.last.characters.first}'
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final primary = tone == CommonAvatarTone.primary;
    return CircleAvatar(
      radius: _diameter / 2,
      backgroundColor: primary ? TS.colors.primary : TS.colors.secondary,
      foregroundImage: imageUrl == null ? null : NetworkImage(imageUrl!),
      child: Text(
        _initials,
        style: TS.textStyle.label.copyWith(
          color: primary ? TS.colors.onPrimary : TS.colors.onSecondary,
        ),
      ),
    );
  }
}
