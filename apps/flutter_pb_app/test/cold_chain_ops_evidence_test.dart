import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_pb_app/app/app.dart';
import 'package:flutter_pb_app/common/widgets/widgets.dart';
import 'package:flutter_pb_app/router/routes.dart';

void main() {
  Future<void> pumpRoute(
    WidgetTester tester, {
    required String route,
    Object? args,
  }) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    final context = tester.element(find.text('flutter_pb_app'));
    Navigator.of(context).pushNamed(route, arguments: args);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
  }

  Future<void> dragList(WidgetTester tester, double dy) async {
    final list = find.byType(CommonScrollableDataList);
    if (list.evaluate().isNotEmpty) {
      await tester.drag(list.first, Offset(0, dy));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      return;
    }
    await tester.drag(find.byType(ListView).first, Offset(0, dy));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
  }

  testWidgets('Hub lists Cold Chain Ops Evidence entry', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.drag(find.byType(ListView).first, const Offset(0, -400));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Cold Chain Ops Evidence'), findsOneWidget);
  });

  testWidgets('Exception queue default shows fixed Evidence rows', (
    tester,
  ) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceExceptionQueue,
    );
    expect(find.text('冷链异常'), findsOneWidget);
    expect(find.text('当前风险'), findsOneWidget);
    expect(find.text('仅看严重异常'), findsOneWidget);
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);
    await dragList(tester, -260);
    expect(find.text('EX-024 · SH-2113'), findsOneWidget);
    expect(find.text('EX-029 · SH-2164'), findsOneWidget);
  });

  testWidgets('focus-critical filters to severe rows', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceExceptionQueue,
    );
    await tester.tap(find.text('仅看严重异常'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);
    expect(find.text('EX-024 · SH-2113'), findsNothing);
    expect(find.text('EX-029 · SH-2164'), findsNothing);
  });

  testWidgets('Queue opens active-excursion shipment detail', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceExceptionQueue,
    );
    await tester.tap(find.text('EX-017 · SH-2048'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('运输详情'), findsOneWidget);
    expect(find.text('持续超温 47 分钟'), findsOneWidget);
    expect(find.text('运输概览'), findsOneWidget);
    await dragList(tester, -500);
    expect(find.text('开始处置'), findsOneWidget);
  });

  testWidgets('Shipment action sheet reveals resolution entry', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceShipmentDetail,
      args: <String, String>{
        'variant': 'active-excursion',
        'exceptionId': 'ex-017',
        'shipmentId': 'SH-2048',
      },
    );
    await dragList(tester, -560);
    await tester.tap(find.text('开始处置'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('选择处置方式'), findsOneWidget);
    expect(find.text('填写处置记录'), findsOneWidget);
    expect(find.text('仅确认接手'), findsOneWidget);
  });

  testWidgets('Resolution form validates incomplete submission', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceResolutionForm,
      args: <String, String>{'variant': 'validation-error'},
    );
    expect(find.text('提交处置'), findsOneWidget);
    expect(find.text('SH-2048 · 严重超温'), findsOneWidget);
    expect(find.text('请补全异常原因、处置动作和三项现场确认。'), findsOneWidget);
    expect(find.text('请选择异常原因'), findsOneWidget);
    expect(find.text('请选择处置动作'), findsOneWidget);
  });

  testWidgets('Resolution ready-to-submit opens confirm dialog', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceResolutionForm,
      args: <String, String>{'variant': 'ready-to-submit'},
    );
    await tester.dragUntilVisible(
      find.text('审核并提交'),
      find.byType(ListView).first,
      const Offset(0, -120),
    );
    await tester.tap(find.text('审核并提交'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('确认提交处置记录？'), findsOneWidget);
    expect(find.text('确认提交'), findsOneWidget);
  });

  testWidgets('loading shell shows sync copy', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceExceptionQueue,
      args: <String, String>{'variant': 'loading'},
    );
    expect(find.text('正在同步运输监控数据'), findsOneWidget);
  });

  testWidgets('error shell shows retry copy', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceExceptionQueue,
      args: <String, String>{'variant': 'error'},
    );
    expect(find.text('监控数据暂时不可用'), findsOneWidget);
  });

  testWidgets('empty shell shows empty state', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceExceptionQueue,
      args: <String, String>{'variant': 'empty'},
    );
    expect(find.text('没有待处理异常'), findsOneWidget);
  });

  testWidgets('sensor-offline shows probe banner', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceShipmentDetail,
      args: <String, String>{'variant': 'sensor-offline'},
    );
    expect(find.textContaining('探头 T-07 已离线'), findsOneWidget);
  });

  testWidgets('approval-validation-error shows supervisor message', (tester) async {
    await pumpRoute(
      tester,
      route: AppRoutes.coldChainEvidenceResolutionForm,
      args: <String, String>{'variant': 'approval-validation-error'},
    );
    expect(find.textContaining('必须指定值班主管'), findsOneWidget);
  });
}
