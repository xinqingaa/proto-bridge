import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import '../../common/widgets/widgets.dart';

/// Placeholder for pbwork `prototypes/field-service`.
/// Proto-bridge will land reconstructed pages under this feature.
class FieldServicePage extends StatelessWidget {
  const FieldServicePage({super.key});

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: 'Field Service', showBack: true),
      body: const CommonEmptyState(
        title: '待还原',
        description: '对应 pbwork prototypes/field-service，页面将落在 features/field_service/',
      ),
    );
  }
}
