import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_pb_app/common/widgets.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/cold_chain_models.dart';
import 'package:flutter_pb_app/review/authoritative_review_harness.dart';
import 'package:flutter_pb_app/router/routes.dart';

import 'support/pump_app.dart';

void main() {
  Future<void> pumpPhone(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await pumpPbApp(tester);
    await tester.pumpAndSettle();
  }

  Future<void> settleRoute(WidgetTester tester) async {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
  }

  NavigatorState navigator() =>
      ProtoBridgeReviewHarness.navigatorKey.currentState!;

  testWidgets('Hub opens the cold-chain exception queue', (tester) async {
    await pumpPhone(tester);
    expect(find.text('冷链异常'), findsOneWidget);
    await tester.tap(find.text('冷链异常'));
    await settleRoute(tester);
    expect(find.text('当前风险'), findsOneWidget);
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('搜索异常、运单或线路'), findsOneWidget);
  });

  testWidgets('critical filter hides non-critical rows', (tester) async {
    await pumpPhone(tester);
    await tester.tap(find.text('冷链异常'));
    await settleRoute(tester);
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    await tester.tap(find.text('仅看严重异常'));
    await settleRoute(tester);
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);
    expect(find.text('EX-024 · SH-2113'), findsNothing);
    expect(find.text('EX-029 · SH-2164'), findsNothing);
  });

  testWidgets('search filters exception identities', (tester) async {
    await pumpPhone(tester);
    await tester.tap(find.text('冷链异常'));
    await settleRoute(tester);
    await tester.enterText(find.byType(CommonSearchBar), 'SH-2164');
    await tester.pump();
    expect(find.text('EX-029 · SH-2164'), findsOneWidget);
    expect(find.text('EX-017 · SH-2048'), findsNothing);
  });

  testWidgets('empty and error variants keep authored copy', (tester) async {
    await pumpPhone(tester);
    navigator().pushNamed(
      AppRoutes.coldChainExceptions,
      arguments: const ExceptionQueueArgs(variantId: 'empty'),
    );
    await settleRoute(tester);
    expect(find.text('没有待处理异常'), findsOneWidget);

    navigator().pushNamed(
      AppRoutes.coldChainExceptions,
      arguments: const ExceptionQueueArgs(variantId: 'error'),
    );
    await settleRoute(tester);
    expect(find.text('监控数据暂时不可用'), findsOneWidget);
    await tester.tap(find.text('重新加载'));
    await settleRoute(tester);
    expect(find.text('当前风险'), findsOneWidget);
  });

  testWidgets('loading variant shows the sync spinner', (tester) async {
    await pumpPhone(tester);
    navigator().pushNamed(
      AppRoutes.coldChainExceptions,
      arguments: const ExceptionQueueArgs(variantId: 'loading'),
    );
    await settleRoute(tester);
    expect(find.text('正在同步运输监控数据'), findsOneWidget);
    expect(find.byType(CommonSpinner), findsOneWidget);
  });

  testWidgets('row tap opens shipment detail and start-resolution form', (
    tester,
  ) async {
    await pumpPhone(tester);
    await tester.tap(find.text('冷链异常'));
    await settleRoute(tester);
    await tester.tap(find.text('EX-017 · SH-2048'));
    await settleRoute(tester);
    expect(find.text('运输详情'), findsOneWidget);
    expect(find.text('持续超温 47 分钟'), findsOneWidget);
    await tester.ensureVisible(find.text('冷库交接完成'));
    await tester.pump();
    expect(find.text('冷库交接完成'), findsOneWidget);
    await tester.ensureVisible(find.text('开始处置'));
    await tester.pump();
    await tester.tap(find.text('开始处置'));
    await settleRoute(tester);
    expect(find.text('选择处置方式'), findsOneWidget);
    await tester.tap(find.text('填写处置记录'));
    await settleRoute(tester);
    expect(find.text('提交处置'), findsOneWidget);
    expect(find.text('制冷机组异常'), findsOneWidget);
  });

  testWidgets('resolution form blocks incomplete submit', (tester) async {
    await pumpPhone(tester);
    navigator().pushNamed(
      AppRoutes.coldChainResolution,
      arguments: const ResolutionFormArgs(),
    );
    await settleRoute(tester);
    expect(find.text('提交处置'), findsOneWidget);
    expect(find.byKey(ColdChainKeys.submitResolution), findsOneWidget);
    await tester.ensureVisible(find.byKey(ColdChainKeys.submitResolution));
    await tester.pump();
    await tester.tap(find.byKey(ColdChainKeys.submitResolution));
    await tester.pump();
    expect(find.text('请补全异常原因、处置动作和三项现场确认。'), findsOneWidget);
  });
}
