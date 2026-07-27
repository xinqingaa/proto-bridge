import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import '../../common/widgets/widgets.dart';

/// Placeholder for pbwork `prototypes/ledger-planet`.
class LedgerPlanetPage extends StatelessWidget {
  const LedgerPlanetPage({super.key});

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: 'Ledger Planet', showBack: true),
      body: const CommonEmptyState(
        title: '待还原',
        description: '对应 pbwork prototypes/ledger-planet，页面将落在 features/ledger_planet/',
      ),
    );
  }
}
