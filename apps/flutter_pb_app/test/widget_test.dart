import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_pb_app/app/app.dart';

void main() {
  testWidgets('Hub loads with prototype entries', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    expect(find.text('flutter_pb_app'), findsOneWidget);
    expect(find.text('Demo 对照'), findsOneWidget);
    expect(find.text('Field Service'), findsOneWidget);
  });
}
