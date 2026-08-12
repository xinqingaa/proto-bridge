import 'package:flutter/material.dart';

import '../../theme/ts.dart';

class DemoCategoryPage extends StatelessWidget {
  const DemoCategoryPage({
    super.key,
    required this.title,
    required this.description,
    required this.children,
  });

  final String title;
  final String description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.all(TS.spacing.md),
      children: [
        Text(title, style: TS.textStyle.title),
        SizedBox(height: TS.spacing.xs),
        Text(description, style: TS.textStyle.caption),
        SizedBox(height: TS.spacing.lg),
        ...children,
      ],
    );
  }
}

class DemoGroup extends StatelessWidget {
  const DemoGroup({
    super.key,
    required this.title,
    required this.child,
    this.description,
  });

  final String title;
  final String? description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: TS.spacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TS.textStyle.titleSm),
          if (description != null) ...[
            SizedBox(height: TS.spacing.xxs),
            Text(description!, style: TS.textStyle.caption),
          ],
          SizedBox(height: TS.spacing.smPlus),
          child,
        ],
      ),
    );
  }
}
