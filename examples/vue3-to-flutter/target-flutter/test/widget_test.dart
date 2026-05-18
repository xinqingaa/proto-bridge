import 'package:flutter_test/flutter_test.dart';
import 'package:proto_bridge_target/app/app.dart';

void main() {
  testWidgets('shows fallback before generated proto pages exist',
      (tester) async {
    await tester.pumpWidget(const ProtoBridgeTargetApp());

    expect(find.text('Generated Flutter Preview'), findsOneWidget);
    expect(find.text('Portfolio Holdings'), findsOneWidget);

    await tester.tap(find.text('Portfolio Holdings'));
    await tester.pumpAndSettle();

    expect(find.text('Proto page is not generated yet'), findsOneWidget);
  });
}
