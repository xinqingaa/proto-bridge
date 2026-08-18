import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_pb_app/common/widgets.dart';
import 'package:flutter_pb_app/features/cold_chain/exception_queue/exception_queue_page.dart';
import 'package:flutter_pb_app/theme/ts.dart';

void main() {
  Future<void> pumpQueue(WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: ThemeService.of(Brightness.light).toThemeData(),
          home: const ExceptionQueuePage(),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('renders the fixed exception baseline', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpQueue(tester);

    expect(find.text('冷链异常'), findsOneWidget);
    expect(find.text('当前风险'), findsOneWidget);
    expect(find.text('华东区域 · 14:35 更新'), findsOneWidget);
    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);
    expect(find.byType(CommonScrollableDataList), findsOneWidget);
  });

  testWidgets('severity tabs filter the queue through feature state', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await pumpQueue(tester);
    await tester.tap(
      find.descendant(
        of: find.byType(CommonPrimaryTabs),
        matching: find.text('严重'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('EX-017 · SH-2048'), findsOneWidget);
    expect(find.text('EX-031 · SH-2196'), findsOneWidget);
    expect(find.text('EX-024 · SH-2113'), findsNothing);
  });
}
