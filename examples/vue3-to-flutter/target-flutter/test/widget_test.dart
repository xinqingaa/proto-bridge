import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:proto_bridge_target/app/app.dart';

void main() {
  testWidgets('shows fallback before generated proto pages exist',
      (tester) async {
    await tester.pumpWidget(const ProtoBridgeTargetApp());

    expect(find.text('资产总览'), findsWidgets);
    expect(find.text('持仓列表'), findsOneWidget);

    await tester.tap(find.text('持仓列表'));
    await tester.pumpAndSettle();

    expect(find.text('还没有生成 _proto 页面'), findsOneWidget);
  });

  testWidgets('keeps locale preference when navigating', (tester) async {
    await tester.pumpWidget(const ProtoBridgeTargetApp());

    await tester.tap(find.byType(Switch).at(1));
    await tester.pumpAndSettle();

    expect(find.text('Asset Overview'), findsWidgets);
    expect(find.text('Portfolio Holdings'), findsOneWidget);

    await tester.tap(find.text('Portfolio Holdings'));
    await tester.pumpAndSettle();

    expect(find.text('Proto page is not generated yet'), findsOneWidget);
  });
}
