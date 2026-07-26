import 'package:flutter/material.dart';

import '../theme/ts.dart';

/// 对齐 pbwork `DataList` — 官方 [ListView] 表面容器。
class CommonDataList extends StatelessWidget {
  const CommonDataList({
    super.key,
    required this.children,
    this.divided = true,
    this.shrinkWrap = true,
    this.physics,
    this.padding,
  });

  final List<Widget> children;
  final bool divided;
  final bool shrinkWrap;
  final ScrollPhysics? physics;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    if (!divided) {
      return ListView(
        shrinkWrap: shrinkWrap,
        physics: physics ?? const NeverScrollableScrollPhysics(),
        padding: padding ?? EdgeInsets.zero,
        children: children,
      );
    }

    final items = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      items.add(children[i]);
      if (i < children.length - 1) {
        items.add(Divider(height: 1, color: TS.colors.divider));
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.md),
        border: Border.all(color: TS.colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: ListView(
        shrinkWrap: shrinkWrap,
        physics: physics ?? const NeverScrollableScrollPhysics(),
        padding: padding ?? EdgeInsets.zero,
        children: items,
      ),
    );
  }
}
