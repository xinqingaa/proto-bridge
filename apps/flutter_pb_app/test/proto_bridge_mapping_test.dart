import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_pb_app/common/widgets/widgets.dart';
import 'package:flutter_pb_app/theme/proto_bridge_tokens.dart';
import 'package:flutter_pb_app/theme/ts.dart';

void main() {
  test('machine token mappings match the executable TS snapshot', () {
    final contract =
        jsonDecode(File('docs/proto-bridge.target.json').readAsStringSync())
            as Map<String, Object?>;
    final mappings = contract['tokens']! as Map<String, Object?>;

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
                icon: Icons.home_outlined,
              ),
              CommonBottomNavItem(
                value: 'tasks',
                label: '任务',
                icon: Icons.task_outlined,
              ),
            ],
          ),
        ),
      ),
    );

    expect(find.text('首页'), findsOneWidget);
    expect(find.byIcon(Icons.home_outlined), findsOneWidget);
    expect(find.byType(AnimatedPositioned), findsNothing);
  });
}
