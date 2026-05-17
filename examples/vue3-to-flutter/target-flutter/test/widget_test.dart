import 'package:flutter_test/flutter_test.dart';
import 'package:proto_bridge_target/app/app.dart';

void main() {
  testWidgets('opens the simple holding page from the example entry', (
    tester,
  ) async {
    await tester.pumpWidget(const ProtoBridgeTargetApp());

    expect(find.text('Flutter Restored Effect'), findsOneWidget);
    expect(find.text('Portfolio Holdings'), findsOneWidget);

    await tester.tap(find.text('Portfolio Holdings'));
    await tester.pumpAndSettle();

    expect(find.text('Positions'), findsOneWidget);
    expect(find.text('NVDA'), findsOneWidget);
  });
}
