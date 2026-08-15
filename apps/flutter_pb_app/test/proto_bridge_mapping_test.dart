import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'package:flutter_pb_app/common/widgets.dart';
import 'package:flutter_pb_app/common/widgets/navigation/liquid_glass_decoration.dart';
import 'package:flutter_pb_app/theme/proto_bridge_tokens.dart';
import 'package:flutter_pb_app/theme/ts.dart';

void main() {
  test('machine token mappings match the executable TS snapshot', () {
    final contract =
        jsonDecode(File('proto-bridge.target.json').readAsStringSync())
            as Map<String, Object?>;
    final mappings = contract['tokens']! as Map<String, Object?>;
    final components = contract['components']! as Map<String, Object?>;

    expect(mappings, hasLength(154));
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
    await tester.pump();

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
    await tester.pump();

    final track = tester.widget<DecoratedBox>(
      find.byKey(const ValueKey('primary-tabs-track')),
    );
    final decoration = track.decoration as BoxDecoration;
    expect(decoration.color, TS.colors.surfaceRecessed);
    expect(decoration.boxShadow, isNull);

    final tabBar = tester.widget<TabBar>(find.byType(TabBar));
    final selection = tabBar.indicator! as LiquidGlassDecoration;
    expect(tabBar.indicatorSize, TabBarIndicatorSize.tab);
    expect(tabBar.indicatorAnimation, TabIndicatorAnimation.linear);
    expect(
      tabBar.indicatorPadding,
      EdgeInsets.symmetric(vertical: TS.spacing.xs),
    );
    expect(selection.surfaceColor, TS.colors.surfaceSelected);
    expect(selection.opacity, TS.opacity.glass);
    expect(selection.borderRadius, BorderRadius.circular(TS.radius.full));
    expect(selection.shadow, TS.elevation.glass);
    expect(
      tester.getSize(find.byKey(const ValueKey('primary-tabs-track'))).height,
      TS.sizing.controlMd + TS.spacing.xs * 2,
    );
    expect(
      tester.getSize(find.byType(TabBar)).height -
          tabBar.indicatorPadding.vertical,
      TS.sizing.controlMd,
    );
  });

  testWidgets('primary indicator follows a TabBarView drag before it settles', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeService.of(Brightness.light).toThemeData(),
        home: const Scaffold(
          body: DefaultTabController(
            length: 2,
            child: Column(
              children: [
                CommonPrimaryTabs(
                  grow: true,
                  items: [
                    CommonTabItem(value: 'all', label: '全部'),
                    CommonTabItem(value: 'done', label: '完成'),
                  ],
                ),
                Expanded(
                  child: CommonTabView(children: [Text('全部内容'), Text('完成内容')]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    final tabContext = tester.element(find.byType(CommonPrimaryTabs));
    final controller = DefaultTabController.of(tabContext);
    expect(controller.animation!.value, 0);

    final gesture = await tester.startGesture(
      tester.getCenter(find.byType(TabBarView)),
    );
    await gesture.moveBy(const Offset(-100, 0));
    await tester.pump();

    expect(controller.animation!.value, greaterThan(0));
    expect(controller.animation!.value, lessThan(1));
    expect(
      tester.widget<TabBar>(find.byType(TabBar)).indicator,
      isA<LiquidGlassDecoration>(),
    );

    await gesture.up();
    await tester.pumpAndSettle();
    expect(controller.index, 0);
  });

  testWidgets('primary grow mode honors a non-first initial index', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeService.of(Brightness.light).toThemeData(),
        home: const Scaffold(
          body: DefaultTabController(
            length: 3,
            initialIndex: 1,
            child: CommonPrimaryTabs(
              grow: true,
              items: [
                CommonTabItem(value: 'short', label: '短'),
                CommonTabItem(value: 'middle', label: '较长标签'),
                CommonTabItem(value: 'long', label: '第三项'),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    final controller = DefaultTabController.of(
      tester.element(find.byType(CommonPrimaryTabs)),
    );
    final tabBar = tester.widget<TabBar>(find.byType(TabBar));
    expect(controller.index, 1);
    expect(controller.animation!.value, 1);
    expect(tabBar.isScrollable, isFalse);
    expect(tabBar.tabAlignment, TabAlignment.fill);
    expect(tabBar.indicatorSize, TabBarIndicatorSize.tab);
  });

  testWidgets('primary track fills a loosely constrained parent', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeService.of(Brightness.light).toThemeData(),
        home: const Scaffold(
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DefaultTabController(
                length: 2,
                child: CommonPrimaryTabs(
                  items: [
                    CommonTabItem(value: 'short', label: '短'),
                    CommonTabItem(value: 'long', label: '较长标签'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(
      tester.getSize(find.byKey(const ValueKey('primary-tabs-track'))).width,
      390,
    );
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

  test('glass elevation keeps the Producer single-layer shadow', () {
    final light = ThemeService.of(Brightness.light).elevation.glass;
    final dark = ThemeService.of(Brightness.dark).elevation.glass;

    expect(light.blurRadius, 18);
    expect(light.offset, const Offset(0, 6));
    expect(light.color, const Color.fromRGBO(15, 23, 42, 0.08));
    expect(dark.blurRadius, 18);
    expect(dark.offset, const Offset(0, 6));
    expect(dark.color, const Color.fromRGBO(0, 0, 0, 0.28));
  });

  test('all curated Lucide ids resolve', () {
    expect(CommonIconName.values, hasLength(33));
    expect(
      CommonIconName.values.map((name) => name.data.codePoint).toSet(),
      hasLength(33),
    );
    expect(CommonIconName.eye.data, LucideIcons.eye);
    expect(CommonIconName.eyeOff.data, LucideIcons.eyeOff);
    expect(CommonIconName.dumbbell.data, LucideIcons.dumbbell);
    expect(CommonIconName.footprints.data, LucideIcons.footprints);
    expect(CommonIconName.personStanding.data, LucideIcons.personStanding);
    expect(CommonIconName.sparkles.data, LucideIcons.sparkles);
    expect(CommonIconName.x.data, LucideIcons.x);
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
