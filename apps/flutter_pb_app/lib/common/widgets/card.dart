import 'package:flutter/material.dart';

import '../../theme/ts.dart';

enum CommonCardSemanticRole { section, card, summary }

/// 只拥有 surface；业务内容和操作由 [child] 自己定义。
class CommonCard extends StatelessWidget {
  const CommonCard({
    super.key,
    required this.child,
    this.elevated = false,
    this.semanticRole = CommonCardSemanticRole.section,
  });

  final Widget child;
  final bool elevated;
  final CommonCardSemanticRole semanticRole;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Semantics(
      container: true,
      child: Card(
        color: TS.colors.surface,
        elevation: elevated ? TS.elevation.card : TS.elevation.none,
        shadowColor: TS.colors.scrim,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(TS.radius.lg),
          side: TS.border.defaultBorder,
        ),
        child: Padding(padding: EdgeInsets.all(TS.spacing.md), child: child),
      ),
    );
  }
}
