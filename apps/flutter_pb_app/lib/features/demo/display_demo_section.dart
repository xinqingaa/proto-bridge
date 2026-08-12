import 'package:flutter/material.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class DisplayDemoSection extends StatelessWidget {
  const DisplayDemoSection({super.key});

  @override
  Widget build(BuildContext context) {
    return DemoCategoryPage(
      title: 'Display / 展示',
      description: '只读表面、状态信息与加载反馈。',
      children: [
        DemoGroup(
          title: 'Avatar / Badge / Chip',
          child: Wrap(
            spacing: TS.spacing.sm,
            runSpacing: TS.spacing.sm,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: const [
              CommonAvatar(name: 'Lin Rui'),
              CommonBadge(label: '99+', tone: CommonBadgeTone.error),
              CommonChip(label: '待领取', tone: CommonChipTone.warning),
            ],
          ),
        ),
        const DemoGroup(
          title: 'Card',
          child: CommonCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [Text('卡片标题'), Text('副标题说明'), Text('卡片内容')],
            ),
          ),
        ),
        DemoGroup(
          title: 'Divider / Progress / Spinner',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CommonDivider(label: '分隔'),
              SizedBox(height: TS.spacing.md),
              const CommonProgress(value: 45, label: '进度 45%'),
              SizedBox(height: TS.spacing.md),
              const CommonSpinner(label: '加载中'),
            ],
          ),
        ),
        const DemoGroup(
          title: 'EmptyState',
          child: CommonEmptyState(
            title: '暂无数据',
            description: '调整筛选条件，或创建第一条记录。',
            actionLabel: '刷新',
          ),
        ),
      ],
    );
  }
}
