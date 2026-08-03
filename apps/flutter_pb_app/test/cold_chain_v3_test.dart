import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_pb_app/app/app.dart';
import 'package:flutter_pb_app/router/routes.dart';
import 'package:flutter_pb_app/features/cold_chain_v3/cold_chain_v3_models.dart';

NavigatorState _nav(WidgetTester tester) {
  return Navigator.of(tester.element(find.byType(Scaffold).first));
}

Future<void> _openHubEntry(WidgetTester tester) async {
  await tester.pumpWidget(const ProviderScope(child: PbApp()));
  await tester.pumpAndSettle();
  await tester.drag(find.byType(ListView).first, const Offset(0, -600));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('冷链异常 V3'));
  await tester.tap(find.text('冷链异常 V3'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Hub exposes Cold Chain V3 entry', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.text('冷链异常 V3'), findsOneWidget);
  });

  testWidgets('V3 queue default shows evidence rows', (tester) async {
    await _openHubEntry(tester);

    expect(find.text('当前风险'), findsOneWidget);
    expect(find.text('仅看严重异常'), findsOneWidget);
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);

    await tester.drag(find.byType(Scrollable).last, const Offset(0, -400));
    await tester.pumpAndSettle();
    expect(find.textContaining('EX-024'), findsOneWidget);
  });

  testWidgets('focus-critical filters to critical rows only', (tester) async {
    await _openHubEntry(tester);

    await tester.tap(find.text('仅看严重异常'));
    await tester.pumpAndSettle();

    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);
    expect(find.textContaining('EX-024'), findsNothing);
  });

  testWidgets('inspect-primary-exception opens active shipment', (tester) async {
    await _openHubEntry(tester);

    await tester.tap(find.text('EX-017 · SH-2048'));
    await tester.pumpAndSettle();

    expect(find.text('运输详情'), findsOneWidget);
    expect(find.text('持续超温 47 分钟'), findsOneWidget);
    expect(find.text('开始处置'), findsOneWidget);
    expect(find.text('箱温趋势'), findsOneWidget);
  });

  testWidgets('reveal-response-options shows action sheet', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    _nav(tester).pushNamed(
      AppRoutes.coldChainV3ShipmentDetail,
      arguments: {'variant': ColdChainV3ShipmentVariant.activeExcursion.name},
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('开始处置'));
    await tester.tap(find.text('开始处置'));
    await tester.pumpAndSettle();

    expect(find.text('选择处置方式'), findsOneWidget);
    expect(find.text('填写处置记录'), findsOneWidget);
    expect(find.text('仅确认接手'), findsOneWidget);
  });

  testWidgets('start-resolution opens ready form', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    _nav(tester).pushNamed(
      AppRoutes.coldChainV3ShipmentDetail,
      arguments: {'variant': ColdChainV3ShipmentVariant.activeExcursion.name},
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('开始处置'));
    await tester.tap(find.text('开始处置'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('填写处置记录'));
    await tester.pumpAndSettle();

    expect(find.text('提交处置'), findsOneWidget);
    expect(find.text('制冷机组异常'), findsOneWidget);
    expect(find.text('切换备用制冷'), findsOneWidget);
    await tester.drag(find.byType(Scrollable).last, const Offset(0, -800));
    await tester.pumpAndSettle();
    expect(find.text('华东值班经理 · 林岚'), findsOneWidget);
    expect(find.text('审核并提交'), findsOneWidget);
  });

  testWidgets('reject-incomplete-resolution shows validation', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    _nav(tester).pushNamed(
      AppRoutes.coldChainV3ResolutionForm,
      arguments: {'variant': ColdChainV3FormVariant.empty.name},
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();

    expect(find.text('请补全异常原因、处置动作和三项现场确认。'), findsOneWidget);
  });

  testWidgets('reject-missing-supervisor shows approval error', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    _nav(tester).pushNamed(
      AppRoutes.coldChainV3ResolutionForm,
      arguments: {'variant': ColdChainV3FormVariant.approvalRequired.name},
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();

    expect(find.text('超温已持续 47 分钟，必须指定值班主管后才能提交。'), findsOneWidget);
    await tester.drag(find.byType(Scrollable).last, const Offset(0, -900));
    await tester.pumpAndSettle();
    expect(find.text('主管审批'), findsOneWidget);
    expect(find.text('确认提交处置记录？'), findsNothing);
  });

  testWidgets('confirm-complete-resolution shows confirm dialog', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    _nav(tester).pushNamed(
      AppRoutes.coldChainV3ResolutionForm,
      arguments: {'variant': ColdChainV3FormVariant.readyToSubmit.name},
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();

    expect(find.text('确认提交处置记录？'), findsOneWidget);
    expect(find.text('确认提交'), findsOneWidget);
  });

  testWidgets('queue empty and error variants render evidence copy', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();

    _nav(tester).pushNamed(
      AppRoutes.coldChainV3,
      arguments: {'variant': ColdChainV3QueueVariant.empty.name},
    );
    await tester.pumpAndSettle();
    expect(find.text('没有待处理异常'), findsOneWidget);
    expect(find.text('当前筛选范围内的运输温度全部正常。'), findsOneWidget);

    _nav(tester).pop();
    await tester.pumpAndSettle();
    _nav(tester).pushNamed(
      AppRoutes.coldChainV3,
      arguments: {'variant': ColdChainV3QueueVariant.error.name},
    );
    await tester.pumpAndSettle();
    expect(find.text('监控数据暂时不可用'), findsOneWidget);
    expect(find.text('重新加载'), findsOneWidget);
  });
}
