import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_pb_app/app/app.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/exception_queue_page.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/resolution_form_page.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/shipment_detail_page.dart';

void main() {
  testWidgets('Cold Chain queue default lists exceptions and filters critical', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Cold Chain Ops'));
    await tester.pumpAndSettle();

    expect(find.text('冷链异常'), findsOneWidget);
    expect(find.text('当前风险'), findsOneWidget);
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-024 · SH-2113'), findsOneWidget);
    expect(find.text('搜索异常、运单或线路'), findsOneWidget);

    await tester.tap(find.text('仅看严重异常'));
    await tester.pumpAndSettle();

    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);
    expect(find.text('EX-024 · SH-2113'), findsNothing);
  });

  testWidgets('Cold Chain queue opens active excursion shipment', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cold Chain Ops'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('上海虹桥 → 杭州临平'));
    await tester.pumpAndSettle();

    expect(find.text('运输详情'), findsOneWidget);
    expect(find.text('持续超温 47 分钟'), findsOneWidget);
    expect(find.text('运输概览'), findsOneWidget);
    expect(find.text('箱温趋势'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('开始处置'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    expect(find.text('开始处置'), findsOneWidget);
  });

  testWidgets('Shipment action sheet reveals resolution entry', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cold Chain Ops'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('上海虹桥 → 杭州临平'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('开始处置'),
      200,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('开始处置'));
    await tester.pumpAndSettle();

    expect(find.text('选择处置方式'), findsOneWidget);
    expect(find.text('填写处置记录'), findsOneWidget);
    expect(find.text('仅确认接手'), findsOneWidget);
  });

  testWidgets('Resolution form validation and ready submit states', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: ResolutionFormPage(variant: 'validation-error'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('提交处置'), findsOneWidget);
    expect(find.text('请补全异常原因、处置动作和三项现场确认。'), findsOneWidget);
    expect(find.text('请选择异常原因'), findsOneWidget);

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: ResolutionFormPage(variant: 'ready-to-submit'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('温度开始回落'), findsOneWidget);
    expect(find.text('已联系司机并确认车辆安全'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('保持每 2 分钟温度监控'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('保持每 2 分钟温度监控'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('主管审批'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('主管审批'), findsOneWidget);
    expect(find.text('审核并提交'), findsOneWidget);
  });

  testWidgets('Exception queue loading and empty variants', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: ExceptionQueuePage(variant: 'loading')),
      ),
    );
    await tester.pump();
    expect(find.text('正在同步运输监控数据'), findsOneWidget);

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: ExceptionQueuePage(variant: 'empty')),
      ),
    );
    await tester.pump();
    expect(find.text('冷链异常'), findsOneWidget);
    expect(find.text('当前风险'), findsOneWidget);
    // Empty copy may sit below the fold under summary/search/filter.
    await tester.drag(find.byType(ListView).first, const Offset(0, -500));
    await tester.pump();
    expect(find.text('没有待处理异常'), findsOneWidget);
  });

  testWidgets('Sensor offline shipment shows probe alert', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: ShipmentDetailPage(variant: 'sensor-offline'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('探头 T-07 已离线 18 分钟'), findsOneWidget);
  });
}
