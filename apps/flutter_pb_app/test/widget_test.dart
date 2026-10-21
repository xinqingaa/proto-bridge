import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_pb_app/app/app.dart';
import 'package:flutter_pb_app/common/widgets.dart';
import 'package:flutter_pb_app/storage/providers.dart';
import 'package:flutter_pb_app/storage/app_prefs.dart';
import 'package:flutter_pb_app/theme/ts.dart';
import 'support/fake_app_prefs.dart';

Future<void> start(WidgetTester tester, FakeAppPrefs prefs) async {
  await tester.binding.setSurfaceSize(const Size(390, 844));
  await tester.pumpWidget(
    ProviderScope(
      overrides: [appPrefsProvider.overrideWithValue(prefs)],
      child: const PbApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('authored colored icons bypass theme tinting', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: TS(brightness: Brightness.dark).toThemeData(),
        home: const Scaffold(
          body: CommonIcon(
            name: CommonIconName.yikeMechanicalFocusHigh,
            tone: CommonIconTone.primary,
          ),
        ),
      ),
    );
    final image = tester.widget<Image>(find.byType(Image));
    expect(image.color, isNull);
    expect(image.filterQuality, FilterQuality.high);
  });

  testWidgets('ready app enters the gallery directly without a launch route', (
    tester,
  ) async {
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await start(tester, FakeAppPrefs());
    expect(find.byType(CommonLaunchScreen), findsNothing);
    expect(find.byType(CommonBottomNav), findsOneWidget);
    expect(find.text('主题与外观'), findsOneWidget);
    final context = tester.element(find.byType(CommonBottomNav));
    expect(Navigator.of(context).canPop(), isFalse);
  });
  testWidgets(
    'settings select real themes and modes and restore them after app restart',
    (tester) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final prefs = FakeAppPrefs();
      await start(tester, prefs);
      await tester.tap(find.byTooltip('展示设置'));
      await tester.pump();
      await tester.pumpAndSettle();
      final water = find.byWidgetPredicate(
        (w) => w is RadioListTile<String> && w.value == 'yike/water',
      );
      await tester.ensureVisible(water.last);
      await tester.tap(water.last);
      await tester.pumpAndSettle();
      expect(prefs.readString(AppPrefs.themePackKey), 'yike/water');
      final dark = find.byWidgetPredicate(
        (w) => w is RadioListTile<ThemeMode> && w.value == ThemeMode.dark,
      );
      await tester.ensureVisible(dark.last);
      await tester.tap(dark.last);
      await tester.pumpAndSettle();
      final ts = TS.of(
        tester.element(find.byType(CommonRadioGroup<ThemeMode>).last),
      );
      expect(ts.pack.id, 'yike/water');
      expect(ts.isDark, isTrue);
      expect(prefs.readThemeMode(), 'dark');
      await tester.pumpWidget(const SizedBox.shrink());
      await start(tester, prefs);
      final restored = TS.of(tester.element(find.byType(CommonBottomNav)));
      expect(restored.pack.id, 'yike/water');
      expect(restored.isDark, isTrue);
    },
  );
  testWidgets(
    'component catalog opens focused examples and supports returning',
    (tester) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await start(tester, FakeAppPrefs());
      await tester.tap(find.text('组件').last);
      await tester.pump();
      await tester.tap(find.text('Stepper'));
      await tester.pump();
      await tester.pumpAndSettle();
      expect(find.byType(CommonStepper), findsOneWidget);
      expect(find.byType(CommonHeatmap), findsNothing);
      await tester.tap(find.byTooltip('返回'));
      await tester.pump();
      await tester.pumpAndSettle();
      expect(find.text('按钮与图标'), findsOneWidget);
    },
  );
}
