import 'package:flutter_test/flutter_test.dart';
import 'package:proto_bridge_target/app/app.dart';

void main() {
  testWidgets('shows fallback before generated proto pages exist',
      (tester) async {
    await tester.pumpWidget(const ProtoBridgeTargetApp());

    expect(find.text('跨端还原示例'), findsOneWidget);
    expect(find.text('持仓列表'), findsOneWidget);

    await tester.tap(find.text('持仓列表'));
    await tester.pumpAndSettle();

    expect(find.text('还没有生成 _proto 页面'), findsOneWidget);
  });
}
