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
    final ts = TS.of(context);
    return ListView(
      padding: EdgeInsets.all(ts.spacing.md),
      children: [
        Text(title, style: ts.textStyle.title),
        SizedBox(height: ts.spacing.xs),
        Text(description, style: ts.textStyle.caption),
        SizedBox(height: ts.spacing.lg),
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
    final ts = TS.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: ts.spacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: ts.textStyle.titleSm),
          if (description != null) ...[
            SizedBox(height: ts.spacing.xxs),
            Text(description!, style: ts.textStyle.caption),
          ],
          SizedBox(height: ts.spacing.smPlus),
          child,
        ],
      ),
    );
  }
}
