import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_pb_app/app/app.dart';

void main() {
  testWidgets('Hub lists the current demo and prototype entries', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();

    expect(find.text('flutter_pb_app'), findsOneWidget);
    expect(find.text('Demo 对照'), findsOneWidget);
    expect(find.text('Cold Chain Ops'), findsOneWidget);
  });

  testWidgets('Demo entry opens the shared component comparison', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Demo 对照'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Button / IconButton'), findsOneWidget);
    expect(find.text('Card / Divider / Progress / Spinner'), findsOneWidget);
  });
}
