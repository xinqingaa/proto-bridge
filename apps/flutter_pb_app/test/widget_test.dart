import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_pb_app/app/app.dart';

void main() {
  testWidgets('Demo home loads', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pump();
    expect(find.text('Common 对照'), findsOneWidget);
  });
}
