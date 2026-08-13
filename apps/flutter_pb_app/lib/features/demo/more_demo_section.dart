import 'package:flutter/material.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'data_demo_section.dart';
import 'feedback_demo_section.dart';

const _moreTabs = [
  CommonTabItem(value: 'data', label: '数据'),
  CommonTabItem(value: 'feedback', label: '反馈'),
];

/// 第五个根目的地：在不突破 Tabbar 2–5 个目的地约束的前提下承接其余分类。
class MoreDemoSection extends StatelessWidget {
  const MoreDemoSection({super.key});

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return DefaultTabController(
      length: _moreTabs.length,
      animationDuration: TS.motion.durationSlow,
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              TS.spacing.md,
              TS.spacing.md,
              TS.spacing.md,
              TS.spacing.none,
            ),
            child: const CommonPrimaryTabs(items: _moreTabs, grow: true),
          ),
          const Expanded(
            child: CommonTabView(
              children: [DataDemoSection(), FeedbackDemoSection()],
            ),
          ),
        ],
      ),
    );
  }
}
