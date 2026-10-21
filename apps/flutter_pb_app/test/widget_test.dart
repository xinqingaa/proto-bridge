import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_pb_app/common/widgets.dart';
import 'package:flutter_pb_app/theme/ts.dart';

import 'support/pump_app.dart';

void main() {
  testWidgets('Demo is the reference application entry', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpPbApp(tester);
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Action · 操作'), findsOneWidget);
    expect(find.byType(CommonBottomNav), findsOneWidget);
  });

  testWidgets('Demo opens the shared component comparison', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpPbApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Button / IconButton'), findsOneWidget);
    expect(find.text('Action / 操作'), findsOneWidget);
  });

  testWidgets('Demo Tabbar navigates to primary and secondary tab examples', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpPbApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byType(Drawer), findsNothing);
    expect(find.byType(CommonBottomNav), findsOneWidget);
    await tester.tap(find.text('导航'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Navigation · 导航'), findsOneWidget);
    expect(find.text('Primary Tabs'), findsOneWidget);
    expect(find.text('Secondary Tabs'), findsOneWidget);
    expect(find.byType(CommonPrimaryTabs), findsOneWidget);
    expect(find.byType(CommonSecondaryTabs), findsOneWidget);
    expect(find.byType(CommonTabView), findsNWidgets(2));
  });

  testWidgets('Demo More keeps Data and Feedback visible without a drawer', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpPbApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('更多'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('More · 更多'), findsOneWidget);
    expect(find.text('数据'), findsOneWidget);
    expect(find.text('反馈'), findsOneWidget);
    expect(find.text('Data / 数据'), findsOneWidget);

    await tester.tap(find.text('反馈'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Feedback / 反馈'), findsOneWidget);
  });

  testWidgets(
    'extended component gallery renders controlled inputs and charts',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(390, 844));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await pumpPbApp(tester);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.tap(find.text('更多'));
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.text('扩展'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(CommonSegmentedControl<String>), findsOneWidget);
      expect(find.byType(CommonStepper), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Demo text follows the completed theme transition', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpPbApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('更多'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    Text dataTitle() => tester.widget<Text>(find.text('Data / 数据'));

    expect(
      dataTitle().style?.color,
      TS(brightness: Brightness.light).textStyle.title.color,
    );

    await tester.tap(find.byTooltip('切换主题'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(
      dataTitle().style?.color,
      TS(brightness: Brightness.dark).textStyle.title.color,
    );

    await tester.tap(find.byTooltip('切换主题'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(
      dataTitle().style?.color,
      TS(brightness: Brightness.light).textStyle.title.color,
    );
  });

  testWidgets('Demo Data exposes pull-to-refresh from the page top', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpPbApp(tester);
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.text('更多'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('已刷新 0 次'), findsOneWidget);
    final scrollables = find.descendant(
      of: find.byType(CommonScrollableDataList),
      matching: find.byType(Scrollable),
    );
    expect(scrollables, findsNWidgets(2));
    final viewport = tester.getRect(scrollables.first);
    final gesture = await tester.startGesture(
      Offset(viewport.center.dx, viewport.bottom - 60),
    );
    await gesture.moveBy(const Offset(0, 40));
    await tester.pump();
    await gesture.moveBy(const Offset(0, 400));
    await tester.pump();
    final scrollableState = tester.state<ScrollableState>(scrollables.first);
    expect(
      scrollableState.position.pixels,
      lessThan(
        -TS
            .of(tester.element(find.byType(CommonScrollableDataList)))
            .layout
            .pullRefreshThreshold,
      ),
    );
    expect(find.text('松开刷新'), findsOneWidget);
    await gesture.up();
    for (var i = 0; i < 10; i += 1) {
      await tester.pump(const Duration(milliseconds: 200));
    }
    expect(find.text('已刷新 1 次'), findsOneWidget);
  });
}
