import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unified_popups/unified_popups.dart';

import 'package:flutter_pb_app/common/widgets.dart';
import 'package:flutter_pb_app/theme/proto_bridge_tokens.dart';
import 'package:flutter_pb_app/theme/ts.dart';

void main() {
  test('machine token mappings match the executable TS snapshot', () {
    final contract =
        jsonDecode(File('proto-bridge.target.json').readAsStringSync())
            as Map<String, Object?>;
    final mappings = contract['tokens']! as Map<String, Object?>;
    final components = contract['components']! as Map<String, Object?>;

    expect(mappings, hasLength(153));
    expect(components, hasLength(31));
    final catalog =
        jsonDecode(
              File(
                '../pbwork/src/design-system/tokens/tokens.json',
              ).readAsStringSync(),
            )
            as List<Object?>;
    final catalogIds = catalog
        .cast<Map<String, Object?>>()
        .map((token) => token['id']! as String)
        .toSet();
    final contractIds =
        Directory('../pbwork/src/design-system/components/contracts')
            .listSync()
            .whereType<File>()
            .where((file) => file.path.endsWith('.json'))
            .map(
              (file) =>
                  (jsonDecode(file.readAsStringSync())
                          as Map<String, Object?>)['id']!
                      as String,
            )
            .toSet();

    expect(mappings.keys.toSet(), catalogIds);
    expect(components.keys.toSet(), contractIds);
    expect(protoBridgeTokenSnapshot().keys.toSet(), mappings.keys.toSet());
    expect(mappings, isNot(contains('transparent')));
    expect(mappings, isNot(contains('none')));
  });

  testWidgets('Tabbar mapping defaults to icon-label without indicator', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeService.of(Brightness.light).toThemeData(),
        home: Scaffold(
          bottomNavigationBar: CommonBottomNav(
            currentIndex: 0,
            onTap: (_) {},
            items: const [
              CommonBottomNavItem(
                value: 'home',
                label: '首页',
                icon: CommonIconName.home,
              ),
              CommonBottomNavItem(
                value: 'tasks',
                label: '任务',
                icon: CommonIconName.list,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('首页'), findsOneWidget);
    expect(find.byIcon(CommonIconName.home.data), findsOneWidget);
    expect(find.byType(AnimatedPositioned), findsNothing);
  });

  testWidgets('primary tabs keep the track plain and glass on selection only', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeService.of(Brightness.light).toThemeData(),
        home: const Scaffold(
          body: DefaultTabController(
            length: 2,
            child: CommonPrimaryTabs(
              items: [
                CommonTabItem(value: 'all', label: '全部'),
                CommonTabItem(value: 'done', label: '完成'),
              ],
            ),
          ),
        ),
      ),
    );

    final track = tester.widget<DecoratedBox>(
      find.byKey(const ValueKey('primary-tabs-track')),
    );
    final decoration = track.decoration as BoxDecoration;
    expect(decoration.color, TS.colors.surfaceRecessed);
    expect(decoration.boxShadow, isNull);

    expect(find.byType(LiquidGlass), findsOneWidget);
    final selection = tester.widget<LiquidGlass>(
      find.byKey(const ValueKey('primary-tabs-selection')),
    );
    expect(selection.enableShadow, isTrue);
    expect(selection.blurSigma, TS.effect.glassBackdropBlur);
  });

  testWidgets(
    'secondary tabs use compact label spacing and controlled height',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeService.of(Brightness.light).toThemeData(),
          home: const Scaffold(
            body: DefaultTabController(
              length: 2,
              child: CommonSecondaryTabs(
                items: [
                  CommonTabItem(value: 'all', label: '全部'),
                  CommonTabItem(value: 'done', label: '完成'),
                ],
              ),
            ),
          ),
        ),
      );

      final tabBar = tester.widget<TabBar>(find.byType(TabBar));
      expect(
        tabBar.labelPadding,
        EdgeInsets.symmetric(horizontal: TS.spacing.sm),
      );
      expect(
        tester.widgetList<Tab>(find.byType(Tab)).map((tab) => tab.height),
        everyElement(TS.sizing.controlMd),
      );
    },
  );

  test('dark theme consumes the Producer glass-opacity override', () {
    expect(ThemeService.of(Brightness.light).opacity.glass, 0.76);
    expect(ThemeService.of(Brightness.dark).opacity.glass, 0.8);
  });

  test('all curated Lucide ids resolve', () {
    expect(CommonIconName.values, hasLength(26));
    expect(
      CommonIconName.values.map((name) => name.data.codePoint).toSet(),
      hasLength(26),
    );
  });

  testWidgets('pull refresh settles at the boundary without a second rebound', (
    tester,
  ) async {
    var refreshCount = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeService.of(Brightness.light).toThemeData(),
        home: Scaffold(
          body: CommonScrollableDataList(
            itemCount: 20,
            itemBuilder: (_, index) =>
                SizedBox(height: 48, child: Text('row $index')),
            onRefresh: () async {
              refreshCount += 1;
            },
          ),
        ),
      ),
    );

    final scrollableFinder = find.byType(Scrollable).first;
    await tester.drag(scrollableFinder, const Offset(0, 180));
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();

    final scrollable = tester.state<ScrollableState>(scrollableFinder);
    expect(refreshCount, 1);
    expect(scrollable.position.outOfRange, isFalse);
    expect(
      scrollable.position.pixels,
      closeTo(scrollable.position.minScrollExtent, 0.5),
    );
  });

  testWidgets(
    'loading button retains its label and progress uses percent input',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeService.of(Brightness.light).toThemeData(),
          home: const Scaffold(
            body: Column(
              children: [
                CommonButton(label: '提交中', loading: true),
                CommonProgress(value: 68),
              ],
            ),
          ),
        ),
      );

      expect(find.text('提交中'), findsOneWidget);
      final progress = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(progress.value, closeTo(0.68, 0.001));
    },
  );
}
