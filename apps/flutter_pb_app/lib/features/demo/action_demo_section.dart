import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class ActionDemoSection extends StatelessWidget {
  const ActionDemoSection({super.key});

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return DemoCategoryPage(
      title: 'Action / 操作',
      description: 'Button、Icon 与 IconButton 的受控状态和语义档位。',
      children: [
        DemoGroup(
          title: 'Button / IconButton',
          child: Wrap(
            spacing: TS.spacing.sm,
            runSpacing: TS.spacing.sm,
            children: [
              CommonButton(
                label: 'Flat Action',
                onPressed: () => AppPop.toast('flat'),
              ),
              CommonButton(
                label: 'Tonal',
                variant: CommonButtonVariant.tonal,
                tone: CommonButtonTone.primary,
                onPressed: () {},
              ),
              CommonButton(
                label: 'Outlined',
                variant: CommonButtonVariant.outlined,
                tone: CommonButtonTone.primary,
                onPressed: () {},
              ),
              CommonButton(
                label: 'Text',
                variant: CommonButtonVariant.text,
                tone: CommonButtonTone.primary,
                onPressed: () {},
              ),
              CommonIconButton(
                name: CommonIconName.plus,
                label: '新增',
                onPressed: () {},
              ),
              const CommonIconButton(
                name: CommonIconName.plus,
                label: '加载中',
                loading: true,
              ),
            ],
          ),
        ),
        DemoGroup(
          title: 'Icon',
          child: Wrap(
            spacing: TS.spacing.md,
            runSpacing: TS.spacing.md,
            children: const [
              CommonIcon(name: CommonIconName.home, label: '首页'),
              CommonIcon(name: CommonIconName.search, label: '搜索'),
              CommonIcon(name: CommonIconName.settings, label: '设置'),
              CommonIcon(name: CommonIconName.alertTriangle, label: '警告'),
            ],
          ),
        ),
      ],
    );
  }
}
