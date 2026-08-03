import 'package:flutter/material.dart';
import 'package:flutter_pb_app/app/app.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/exception_queue_page.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/models.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/resolution_form_page.dart';
import 'package:flutter_pb_app/features/cold_chain_ops/shipment_detail_page.dart';
import 'package:flutter_pb_app/router/router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unified_popups/unified_popups.dart';

Widget _wrap(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      navigatorObservers: [Pop.routeObserver],
      builder: (context, widget) {
        return Pop.hostBuilder(
          context,
          widget ?? const SizedBox.shrink(),
        );
      },
      home: child,
      routes: {
        for (final entry in appRoutes.entries)
          if (entry.key != AppRoutes.hub) entry.key: entry.value,
      },
    ),
  );
}

Future<void> _scrollToText(WidgetTester tester, String text) async {
  await tester.scrollUntilVisible(
    find.text(text),
    400,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

void main() {
  Future<void> setPhoneSurface(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
  }

  testWidgets('queue default shows summary search filters and rows',
      (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      _wrap(const ExceptionQueuePage(variant: QueueVariant.defaultQueue)),
    );
    await tester.pumpAndSettle();

    expect(find.text('冷链异常'), findsWidgets);
    expect(find.text('当前风险'), findsOneWidget);
    expect(find.text('仅看严重异常'), findsOneWidget);
    expect(find.text('上海虹桥 → 杭州临平'), findsOneWidget);

    await _scrollToText(tester, '嘉兴南湖 → 宁波北仑');
    expect(find.text('嘉兴南湖 → 宁波北仑'), findsOneWidget);
  });

  testWidgets('focus-critical filters to severe rows only', (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      _wrap(const ExceptionQueuePage(variant: QueueVariant.defaultQueue)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('仅看严重异常'));
    await tester.pumpAndSettle();

    expect(find.text('上海虹桥 → 杭州临平'), findsOneWidget);
    expect(find.text('苏州园区 → 南京江宁'), findsOneWidget);
    expect(find.text('无锡新吴 → 常州武进'), findsNothing);
  });

  testWidgets('queue empty variant', (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      _wrap(const ExceptionQueuePage(variant: QueueVariant.empty)),
    );
    await tester.pumpAndSettle();
    expect(find.text('没有待处理异常'), findsOneWidget);
  });

  testWidgets('queue error variant', (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      _wrap(const ExceptionQueuePage(variant: QueueVariant.error)),
    );
    await tester.pumpAndSettle();
    expect(find.text('监控数据暂时不可用'), findsOneWidget);
    expect(find.text('重新加载'), findsOneWidget);
  });

  testWidgets('queue loading variant', (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      _wrap(const ExceptionQueuePage(variant: QueueVariant.loading)),
    );
    await tester.pump();
    expect(find.text('正在同步运输监控数据'), findsOneWidget);
  });

  testWidgets('opening primary exception navigates to shipment detail',
      (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          navigatorObservers: [Pop.routeObserver],
          builder: (context, widget) {
            return Pop.hostBuilder(
              context,
              widget ?? const SizedBox.shrink(),
            );
          },
          routes: {
            '/': (_) =>
                const ExceptionQueuePage(variant: QueueVariant.defaultQueue),
            for (final entry in appRoutes.entries)
              if (entry.key != AppRoutes.hub) entry.key: entry.value,
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('上海虹桥 → 杭州临平'));
    await tester.pumpAndSettle();

    expect(find.text('运输详情'), findsOneWidget);
    expect(find.text('箱温趋势'), findsOneWidget);
    await _scrollToText(tester, '开始处置');
    expect(find.text('开始处置'), findsOneWidget);
  });

  testWidgets('shipment active excursion shows alert and timeline',
      (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      _wrap(
        const ShipmentDetailPage(variant: ShipmentVariant.activeExcursion),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('持续超温 47 分钟'), findsOneWidget);
    expect(find.text('运输概览'), findsOneWidget);
    await _scrollToText(tester, '冷库交接完成');
    expect(find.text('冷库交接完成'), findsOneWidget);
  });

  testWidgets('resolution validation and ready submit paths', (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(
      _wrap(
        const ResolutionFormPage(variant: ResolutionVariant.defaultForm),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('提交处置'), findsOneWidget);
    await _scrollToText(tester, '审核并提交');
    expect(find.text('审核并提交'), findsOneWidget);

    await tester.tap(find.text('审核并提交'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.textContaining('请完善必填项'),
      -400,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('请完善必填项'), findsOneWidget);

    await tester.pumpWidget(
      _wrap(
        const ResolutionFormPage(variant: ResolutionVariant.readyToSubmit),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('提交处置'), findsOneWidget);
    await _scrollToText(tester, '审核并提交');
    expect(find.text('审核并提交'), findsOneWidget);
    expect(find.textContaining('已触发主管审批阈值'), findsOneWidget);
  });

  testWidgets('hub opens cold chain queue', (tester) async {
    await setPhoneSurface(tester);
    await tester.pumpWidget(const ProviderScope(child: PbApp()));
    await tester.pumpAndSettle();

    final entry = find.text('冷链异常 Ops');
    await tester.scrollUntilVisible(
      entry,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(entry);
    await tester.pumpAndSettle();

    expect(find.text('当前风险'), findsOneWidget);
    expect(find.text('仅看严重异常'), findsOneWidget);
  });
}
