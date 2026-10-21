import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../common/state/local_value.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class DataDemoSection extends ConsumerStatefulWidget {
  const DataDemoSection({super.key});

  @override
  ConsumerState<DataDemoSection> createState() => _DataDemoSectionState();
}

class _DataDemoSectionState extends ConsumerState<DataDemoSection> {
  final _listCountProvider = localValueProvider<int>(12);
  final _refreshCountProvider = localValueProvider<int>(0);

  Widget _row(BuildContext context, int index, String source) {
    final ts = TS.of(context);
    return ListTile(
      title: Text('列表项 ${index + 1}', style: ts.textStyle.content),
      subtitle: Text(source, style: ts.textStyle.caption),
      trailing: const CommonIcon(name: CommonIconName.chevronRight),
    );
  }

  @override
  Widget build(BuildContext context) {
    final listCount = ref.watch(_listCountProvider);
    final refreshCount = ref.watch(_refreshCountProvider);
    final ts = TS.of(context);
    return CommonScrollableDataList(
      padding: EdgeInsets.all(ts.spacing.md),
      itemCount: listCount + 1,
      hasMore: listCount < 30,
      onRefresh: () async {
        await Future<void>.delayed(const Duration(milliseconds: 800));
        if (!mounted) return;
        ref.read(_listCountProvider.notifier).set(12);
        ref.read(_refreshCountProvider.notifier).update((value) => value + 1);
      },
      onLoadMore: () async {
        await Future<void>.delayed(const Duration(milliseconds: 800));
        if (!mounted) return;
        ref.read(_listCountProvider.notifier).update((value) => value + 6);
      },
      separatorBuilder: (_, index) => index == 0
          ? const SizedBox.shrink()
          : Divider(height: ts.border.widthHairline, color: ts.colors.border),
      itemBuilder: (context, index) {
        if (index > 0) {
          return _row(context, index - 1, 'ScrollableDataList');
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Data / 数据', style: ts.textStyle.title),
            SizedBox(height: ts.spacing.xs),
            Text(
              'DataList 使用 Flutter ListView；刷新列表使用 pull_to_refresh。',
              style: ts.textStyle.caption,
            ),
            SizedBox(height: ts.spacing.lg),
            DemoGroup(
              title: 'DataList',
              child: CommonDataList(
                itemCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemBuilder: (context, index) =>
                    _row(context, index, 'DataList'),
              ),
            ),
            DemoGroup(
              title: 'ScrollableDataList',
              description: '下拉刷新、上拉加载和有限回弹由公共组件拥有。',
              child: Text(
                '已刷新 $refreshCount 次',
                key: const ValueKey('data-refresh-count'),
                style: ts.textStyle.caption,
              ),
            ),
          ],
        );
      },
    );
  }
}
