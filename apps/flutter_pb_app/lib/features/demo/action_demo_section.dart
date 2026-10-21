import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class ActionDemoSection extends StatelessWidget {
  const ActionDemoSection({super.key});

  @override
  Widget build(BuildContext context) {
    final ts = TS.of(context);
    return DemoCategoryPage(
      title: 'Action / 操作',
      description: 'Button、Icon 与 IconButton 的受控状态和语义档位。',
      children: [
        DemoGroup(
          title: 'Button / IconButton',
          child: Wrap(
            spacing: ts.spacing.sm,
            runSpacing: ts.spacing.sm,
            children: [
              CommonButton(
                label: '主要',
                onPressed: () => AppPop.toast(context, 'primary'),
              ),
              CommonButton(
                label: '次要',
                kind: CommonButtonKind.secondary,
                onPressed: () => AppPop.toast(context, '操作已触发'),
              ),
              CommonButton(
                label: '描边',
                kind: CommonButtonKind.outlined,
                onPressed: () => AppPop.toast(context, '操作已触发'),
              ),
              for (final kind in [
                CommonButtonKind.accent,
                CommonButtonKind.danger,
                CommonButtonKind.quiet,
              ])
                CommonButton(
                  label: kind.name,
                  kind: kind,
                  onPressed: () => AppPop.toast(context, kind.name),
                ),
              CommonButton(
                label: '玻璃圆角',
                material: CommonSurfaceMaterial.glass,
                shape: CommonButtonShape.rounded,
                onPressed: () => AppPop.toast(context, '玻璃操作'),
              ),
              const CommonButton(label: '处理中', loading: true),
              const CommonButton(label: '不可用', disabled: true),
              CommonIconButton(
                name: CommonIconName.plus,
                label: '新增',
                onPressed: () => AppPop.toast(context, '操作已触发'),
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
            spacing: ts.spacing.md,
            runSpacing: ts.spacing.md,
            children: [
              for (final name in CommonIconName.values)
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CommonIcon(name: name, label: name.name),
                    Text(name.name, style: ts.textStyle.caption),
                  ],
                ),
            ],
          ),
        ),
      ],
    );
  }
}
