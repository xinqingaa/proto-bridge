import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unified_popups/unified_popups.dart';

import 'package:flutter_pb_app/features/cold_chain_v4_gpt/exception_queue_page.dart';
import 'package:flutter_pb_app/features/cold_chain_v4_gpt/models.dart';
import 'package:flutter_pb_app/features/cold_chain_v4_gpt/resolution_form_page.dart';
import 'package:flutter_pb_app/features/cold_chain_v4_gpt/shipment_detail_page.dart';
import 'package:flutter_pb_app/router/routes.dart';
import 'package:flutter_pb_app/theme/ts.dart';

Widget _harness(Widget home) {
  TS.bind(Brightness.light);
  return MaterialApp(
    theme: ThemeService.of(Brightness.light).toThemeData(),
    navigatorObservers: [Pop.routeObserver],
    builder: (context, child) => Pop.hostBuilder(
      context,
      TsBinder(child: child ?? const SizedBox.shrink()),
    ),
    home: home,
    routes: {
      AppRoutes.coldChainV4GptShipmentDetail: (context) =>
          EvidenceShipmentDetailPage.fromRouteArgs(
            ModalRoute.of(context)?.settings.arguments,
          ),
      AppRoutes.coldChainV4GptResolutionForm: (context) =>
          EvidenceResolutionFormPage.fromRouteArgs(
            ModalRoute.of(context)?.settings.arguments,
          ),
    },
  );
}

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  testWidgets('queue renders the fixed exceptions and critical filter', (
    tester,
  ) async {
    await tester.pumpWidget(_harness(const EvidenceExceptionQueuePage()));
    await tester.pumpAndSettle();

    expect(find.text('当前风险'), findsOneWidget);

    await tester.tap(find.text('仅看严重异常'));
    await tester.pumpAndSettle();
    final ex017 = find.textContaining('EX-017');
    final ex031 = find.textContaining('EX-031');
    await tester.scrollUntilVisible(
      ex017,
      250,
      scrollable: find.byType(Scrollable).first,
    );

    expect(ex017, findsOneWidget);
    await tester.scrollUntilVisible(
      ex031,
      250,
      scrollable: find.byType(Scrollable).first,
    );
    expect(ex031, findsOneWidget);
    expect(find.textContaining('EX-024'), findsNothing);
    expect(find.textContaining('EX-029'), findsNothing);
  });

  testWidgets('queue evidence variants have explicit feedback', (tester) async {
    await tester.pumpWidget(
      _harness(
        const EvidenceExceptionQueuePage(
          key: ValueKey('loading'),
          initialVariant: EvidenceQueueVariant.loading,
        ),
      ),
    );
    expect(find.text('正在同步运输监控数据'), findsOneWidget);

    await tester.pumpWidget(
      _harness(
        const EvidenceExceptionQueuePage(
          key: ValueKey('empty'),
          initialVariant: EvidenceQueueVariant.empty,
        ),
      ),
    );
    await tester.pump();
    expect(find.text('没有待处理异常'), findsOneWidget);

    await tester.pumpWidget(
      _harness(
        const EvidenceExceptionQueuePage(
          key: ValueKey('error'),
          initialVariant: EvidenceQueueVariant.error,
        ),
      ),
    );
    await tester.pump();
    expect(find.text('监控数据暂时不可用'), findsOneWidget);
    expect(find.text('重新加载'), findsOneWidget);
  });

  testWidgets('detail action sheet continues to the ready resolution form', (
    tester,
  ) async {
    await tester.pumpWidget(
      _harness(
        const EvidenceShipmentDetailPage(
          initialVariant: EvidenceShipmentVariant.activeExcursion,
          showActionSheet: true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('选择处置方式'), findsOneWidget);
    expect(find.text('填写处置记录'), findsOneWidget);
    await tester.tap(find.text('填写处置记录'));
    await tester.pumpAndSettle();

    expect(find.text('提交处置'), findsOneWidget);
    expect(find.text('SH-2048 · 严重超温'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('审核并提交'),
      350,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('审核并提交'), findsOneWidget);
  });

  testWidgets('incomplete resolution shows evidence validation', (
    tester,
  ) async {
    await tester.pumpWidget(_harness(const EvidenceResolutionFormPage()));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('审核并提交'),
      350,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, 1600));
    await tester.pumpAndSettle();

    expect(find.text('请补全异常原因、处置动作和三项现场确认。'), findsOneWidget);
    expect(find.text('确认提交处置记录？'), findsNothing);
  });

  testWidgets('complete resolution asks for final confirmation', (
    tester,
  ) async {
    await tester.pumpWidget(
      _harness(
        const EvidenceResolutionFormPage(
          initialVariant: EvidenceResolutionVariant.readyToSubmit,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('审核并提交'),
      350,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();

    expect(find.text('确认提交处置记录？'), findsOneWidget);
    expect(find.text('确认提交'), findsOneWidget);
  });
}
