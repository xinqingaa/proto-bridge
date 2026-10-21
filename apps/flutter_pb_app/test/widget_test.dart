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

Future<void> enterGallery(WidgetTester tester) async {
  await tester.tap(find.text('开始'));
  await tester.pump();
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'startup fills the viewport and replaces itself with the gallery',
    (tester) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await start(tester, FakeAppPrefs());
      expect(tester.getSize(find.byType(CommonLaunchScreen)).width, 390);
      await enterGallery(tester);
      expect(find.byType(CommonBottomNav), findsOneWidget);
      expect(find.text('主题与外观'), findsOneWidget);
      final context = tester.element(find.byType(CommonBottomNav));
      expect(Navigator.of(context).canPop(), isFalse);
    },
  );
  testWidgets(
    'settings select real themes and modes and restore them after app restart',
    (tester) async {
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final prefs = FakeAppPrefs();
      await start(tester, prefs);
      await enterGallery(tester);
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
      await enterGallery(tester);
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
      await enterGallery(tester);
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
