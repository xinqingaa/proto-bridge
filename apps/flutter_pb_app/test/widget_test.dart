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
    expect(find.text('Ledger Planet'), findsOneWidget);
    expect(find.text('Ledger Planet V2'), findsOneWidget);
  });

  testWidgets('Ledger Planet task list opens claimable detail', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Ledger Planet'));
    await tester.pumpAndSettle();

    expect(find.text('任务'), findsOneWidget);
    expect(find.text('记一笔'), findsOneWidget);
    expect(find.text('查看本周图表'), findsOneWidget);
    expect(find.text('连续记账 3 天'), findsOneWidget);
    expect(find.text('待领取'), findsOneWidget);

    await tester.tap(find.text('查看本周图表'));
    await tester.pumpAndSettle();

    expect(find.text('任务详情'), findsOneWidget);
    expect(find.text('已达成'), findsOneWidget);
    expect(find.text('领取奖励'), findsOneWidget);
    expect(find.text('完成进度'), findsOneWidget);
    expect(find.text('1/1'), findsOneWidget);
  });

  testWidgets('Ledger Planet V2 task list opens claimable detail',
      (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Ledger Planet V2'));
    await tester.pumpAndSettle();

    expect(find.text('任务'), findsOneWidget);
    expect(find.text('记一笔'), findsOneWidget);
    expect(find.text('查看本周图表'), findsOneWidget);
    expect(find.text('连续记账 3 天'), findsOneWidget);
    expect(find.text('待领取'), findsOneWidget);

    await tester.tap(find.text('查看本周图表'));
    await tester.pumpAndSettle();

    expect(find.text('任务详情'), findsOneWidget);
    expect(find.text('已达成'), findsOneWidget);
    expect(find.text('领取奖励'), findsOneWidget);
    expect(find.text('完成进度'), findsOneWidget);
    expect(find.text('1/1'), findsOneWidget);
    expect(find.text('奖励 ¥3 体验券'), findsOneWidget);
  });

  testWidgets('Ledger Planet V2 tabs filter by fixed Evidence', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Ledger Planet V2'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('待完成'));
    await tester.pumpAndSettle();
    expect(find.text('记一笔'), findsOneWidget);
    expect(find.text('连续记账 3 天'), findsOneWidget);
    expect(find.text('查看本周图表'), findsNothing);
    expect(find.text('待领取'), findsNothing);

    await tester.tap(find.text('已完成'));
    await tester.pumpAndSettle();
    expect(find.text('查看本周图表'), findsOneWidget);
    expect(find.text('待领取'), findsOneWidget);
    expect(find.text('记一笔'), findsNothing);
    expect(find.text('连续记账 3 天'), findsNothing);
  });
}
