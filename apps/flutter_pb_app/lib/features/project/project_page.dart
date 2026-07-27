import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import '../../common/widgets/widgets.dart';

/// Placeholder for pbwork `prototypes/project`.
class ProjectPage extends StatelessWidget {
  const ProjectPage({super.key});

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: 'Project', showBack: true),
      body: const CommonEmptyState(
        title: '待还原',
        description: '对应 pbwork prototypes/project，页面将落在 features/project/',
      ),
    );
  }
}
