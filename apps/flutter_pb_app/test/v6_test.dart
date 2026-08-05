import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_pb_app/app/app.dart';
import 'package:flutter_pb_app/router/routes.dart';

Future<void> _pumpV6Route(
  WidgetTester tester,
  String route, {
  Object? arguments,
  bool settle = true,
}) async {
  await tester.binding.setSurfaceSize(const Size(390, 844));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(const ProviderScope(child: PbApp()));
  await tester.pumpAndSettle();

  final navigator = tester.state<NavigatorState>(find.byType(Navigator));
  navigator.pushNamedAndRemoveUntil(
    route,
    (route) => false,
    arguments: arguments,
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
  }
}

Future<void> _scrollTo(WidgetTester tester, Finder target) async {
  final host = find.byKey(const ValueKey('v6-page-scroll'));
  for (var index = 0; index < 8; index++) {
    if (target.evaluate().isNotEmpty) {
      final rect = tester.getRect(target);
      if (rect.top >= 0 && rect.bottom <= 844) break;
    }
    await tester.drag(host, const Offset(0, -500), warnIfMissed: false);
    await tester.pump();
  }
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'v6 queue filters critical exceptions and opens shipment detail',
    (tester) async {
      await _pumpV6Route(tester, AppRoutes.v6ExceptionQueue);

      expect(find.text('冷链异常'), findsOneWidget);
      expect(find.text('EX-017 · SH-2048'), findsOneWidget);
      expect(find.text('EX-024 · SH-2113'), findsOneWidget);

      await tester.tap(find.text('仅看严重异常'));
      await tester.pumpAndSettle();
      expect(find.text('EX-017 · SH-2048'), findsOneWidget);
      expect(find.text('EX-024 · SH-2113'), findsNothing);

      await tester.tap(find.text('EX-017 · SH-2048'));
      await tester.pumpAndSettle();
      expect(find.text('运输详情'), findsOneWidget);
      expect(find.text('持续超温 47 分钟'), findsOneWidget);
    },
  );

  testWidgets('v6 queue renders empty case', (tester) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ExceptionQueue,
      arguments: {'variant': 'empty'},
    );
    expect(find.text('没有待处理异常'), findsOneWidget);
    expect(find.text('当前筛选范围内的运输温度全部正常。'), findsOneWidget);
  });

  testWidgets('v6 queue renders loading case', (tester) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ExceptionQueue,
      arguments: {'variant': 'loading'},
      settle: false,
    );
    expect(find.text('正在同步运输监控数据'), findsOneWidget);
  });

  testWidgets('v6 queue renders error case and reloads', (tester) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ExceptionQueue,
      arguments: {'variant': 'error'},
    );
    expect(find.text('监控数据暂时不可用'), findsOneWidget);
    await tester.tap(find.text('重新加载'));
    await tester.pumpAndSettle();
    expect(find.text('当前风险'), findsOneWidget);
  });

  testWidgets(
    'v6 shipment action sheet exposes resolution and acknowledge flows',
    (tester) async {
      await _pumpV6Route(tester, AppRoutes.v6ShipmentDetail);
      await _scrollTo(tester, find.text('处置操作'));

      await tester.tap(find.text('处置操作'));
      await tester.pumpAndSettle();
      expect(find.text('选择处置方式'), findsOneWidget);
      expect(find.text('填写处置记录'), findsOneWidget);
      expect(find.text('仅确认接手'), findsOneWidget);

      await tester.tap(find.text('仅确认接手'));
      await tester.pumpAndSettle();
      expect(find.text('确认接手异常?'), findsOneWidget);
      expect(find.text('接手后调度中心会将你标记为当前负责人。'), findsOneWidget);
      await tester.tap(find.text('取消'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('处置操作'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('填写处置记录'));
      await tester.pumpAndSettle();
      expect(find.text('提交处置'), findsOneWidget);
    },
  );

  testWidgets('v6 shipment renders offline sensor state', (tester) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ShipmentDetail,
      arguments: {'variant': 'sensor-offline'},
    );
    expect(find.text('探头 T-07 已离线 18 分钟'), findsOneWidget);
    expect(find.text('当前温度不可确认，请联系司机检查探头电源。'), findsOneWidget);
  });

  testWidgets('v6 resolution reports incomplete required fields', (
    tester,
  ) async {
    await _pumpV6Route(tester, AppRoutes.v6ResolutionForm);
    await _scrollTo(tester, find.text('审核并提交'));

    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();
    await tester.drag(
      find.byKey(const ValueKey('v6-page-scroll')),
      const Offset(0, 700),
      warnIfMissed: false,
    );
    await tester.pumpAndSettle();
    expect(
      find.text('请补全异常原因、处置动作和三项现场确认。', skipOffstage: false),
      findsOneWidget,
    );
    expect(find.text('请选择异常原因'), findsOneWidget);
    expect(find.text('请选择处置动作'), findsOneWidget);
  });

  testWidgets('v6 resolution shows approval validation state', (tester) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ResolutionForm,
      arguments: {'variant': 'approval-validation-error'},
    );
    expect(find.text('超温已持续 47 分钟，必须指定值班主管后才能提交。'), findsOneWidget);
    expect(find.text('制冷机组异常'), findsOneWidget);
    expect(find.text('切换备用制冷'), findsOneWidget);
  });

  testWidgets('v6 resolution requires supervisor before confirmation', (
    tester,
  ) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ResolutionForm,
      arguments: {'variant': 'approval-required'},
    );
    await _scrollTo(tester, find.text('审核并提交'));

    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();
    await tester.drag(
      find.byKey(const ValueKey('v6-page-scroll')),
      const Offset(0, 700),
      warnIfMissed: false,
    );
    await tester.pumpAndSettle();
    expect(
      find.text('超温已持续 47 分钟，必须指定值班主管后才能提交。'),
      findsOneWidget,
    );
  });

  testWidgets('v6 resolution confirms and submits a ready record', (
    tester,
  ) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ResolutionForm,
      arguments: {'variant': 'ready-to-submit'},
    );
    await _scrollTo(tester, find.text('审核并提交'));

    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();
    expect(find.text('确认提交处置记录?'), findsOneWidget);

    await tester.tap(find.text('确认提交'));
    await tester.pumpAndSettle();
    expect(find.text('处置记录已提交，异常转为持续监控'), findsOneWidget);
  });

  testWidgets('v6 resolution opens confirmation dialog case', (tester) async {
    await _pumpV6Route(
      tester,
      AppRoutes.v6ResolutionForm,
      arguments: {'variant': 'confirm-dialog-open'},
    );
    expect(find.text('确认提交处置记录?'), findsOneWidget);
    expect(find.text('提交后异常将转为持续监控，当前记录不可直接覆盖。'), findsOneWidget);
  });
}
