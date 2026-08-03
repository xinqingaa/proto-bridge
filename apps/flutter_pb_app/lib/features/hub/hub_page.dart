import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../router/routes.dart';
import '../../theme/ts.dart';
import '../../common/widgets/widgets.dart';

/// App hub: Demo + prototype entry points.
class HubPage extends ConsumerWidget {
  const HubPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    TS.of(context);
    final mode = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: CommonAppBar(
        title: 'flutter_pb_app',
        actions: [
          CommonIconButton(
            icon: mode == ThemeMode.dark ? Icons.light_mode : Icons.dark_mode,
            tooltip: '切换主题',
            onPressed: () {
              ref.read(themeModeProvider.notifier).state =
                  mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
            },
          ),
        ],
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
            icon: Icons.widgets_outlined,
            route: AppRoutes.demo,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: 'Field Service',
            subtitle: 'prototypes/field-service',
            icon: Icons.handyman_outlined,
            route: AppRoutes.fieldService,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: 'Ledger Planet',
            subtitle: 'prototypes/ledger-planet',
            icon: Icons.account_balance_wallet_outlined,
            route: AppRoutes.ledgerPlanet,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: 'Ledger Planet V2',
            subtitle: 'prototypes/ledger-planet-v2',
            icon: Icons.auto_awesome_outlined,
            route: AppRoutes.ledgerPlanetV2,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: '冷链异常',
            subtitle: 'prototypes/cold-chain',
            icon: Icons.thermostat,
            route: AppRoutes.coldChain,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: '冷链异常 V2',
            subtitle: 'prototypes/cold-chain-v2',
            icon: Icons.device_thermostat,
            route: AppRoutes.coldChainV2,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: '冷链异常 V3',
            subtitle: 'prototypes/cold-chain-v3',
            icon: Icons.severe_cold,
            route: AppRoutes.coldChainV3,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: '冷链异常 V4 GPT',
            subtitle: 'prototypes/cold-chain-v4-gpt',
            icon: Icons.ac_unit,
            route: AppRoutes.coldChainV4Gpt,
          ),
          SizedBox(height: TS.spacing.sm),
          _HubEntry(
            title: '冷链异常 Ops',
            subtitle: 'deliveries/2026-08-03/cold-chain-ops',
            icon: Icons.thermostat_auto,
            route: AppRoutes.coldChainOpsQueue,
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
  final IconData icon;
  final String route;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: title,
      subtitle: subtitle,
      onTap: () => Navigator.of(context).pushNamed(route),
      child: Icon(icon, color: TS.colors.primary),
    );
  }
}
