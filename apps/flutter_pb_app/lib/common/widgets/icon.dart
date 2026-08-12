import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// PBWork `icon` 的 Flutter 语义壳。
///
/// PBWork 使用 Lucide id；目标端先由调用方把稳定 id 翻译成 [IconData]，
/// 本组件只统一尺寸、颜色和装饰性语义。
class CommonIcon extends StatelessWidget {
  const CommonIcon({
    super.key,
    required this.icon,
    this.size,
    this.color,
    this.semanticLabel,
  });

  final IconData icon;
  final double? size;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Icon(
      icon,
      size: size ?? TS.sizing.iconMd,
      color: color ?? TS.colors.onSurface,
      semanticLabel: semanticLabel,
    );
  }
}
