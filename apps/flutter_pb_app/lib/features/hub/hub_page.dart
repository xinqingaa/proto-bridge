import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../router/routes.dart';
import '../../theme/ts.dart';
import '../../common/widgets.dart';

/// App hub: Demo + prototype entry points.
class HubPage extends ConsumerWidget {
  const HubPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    TS.of(context);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: CommonAppBar(
        title: 'flutter_pb_app',
        showAction: true,
        actionIcon: CommonIconName.settings,
        actionLabel: '切换主题',
        onAction: () {
          ref.read(themeModeProvider.notifier).toggle();
        },
      ),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          Text('入口', style: TS.textStyle.titleSm),
          SizedBox(height: TS.spacing.sm),
          Text(
            'Demo 为组件对照；各原型对应 pbwork prototypes，供后续落页。',
            style: TS.textStyle.caption,
          ),
          SizedBox(height: TS.spacing.lg),
          _HubEntry(
            title: 'Demo 对照',
            subtitle: 'widgets / theme / AppPop',
            icon: CommonIconName.home,
            route: AppRoutes.demo,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: 'Cold Chain Ops',
            subtitle: 'prototypes/cold-chain-ops-evidence',
            icon: CommonIconName.snowflake,
            route: AppRoutes.coldChainExceptionQueue,
          ),
        ],
      ),
    );
  }
}

class _HubEntry extends StatelessWidget {
  const _HubEntry({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
  });

  final String title;
  final String subtitle;
  final CommonIconName icon;
  final String route;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      child: InkWell(
        onTap: () => Navigator.of(context).pushNamed(route),
        child: Row(
          children: [
            CommonIcon(name: icon, tone: CommonIconTone.primary),
            SizedBox(width: TS.spacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TS.textStyle.subtitle),
                  Text(subtitle, style: TS.textStyle.caption),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
