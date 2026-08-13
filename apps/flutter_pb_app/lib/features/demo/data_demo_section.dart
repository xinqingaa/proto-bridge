import 'package:flutter/material.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class DataDemoSection extends StatefulWidget {
  const DataDemoSection({super.key});

  @override
  State<DataDemoSection> createState() => _DataDemoSectionState();
}

class _DataDemoSectionState extends State<DataDemoSection> {
  int _listCount = 12;
  int _refreshCount = 0;

  Widget _row(BuildContext context, int index, String source) {
    return ListTile(
      title: Text('列表项 ${index + 1}', style: TS.textStyle.content),
      subtitle: Text(source, style: TS.textStyle.caption),
      trailing: const CommonIcon(name: CommonIconName.chevronRight),
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonScrollableDataList(
      padding: EdgeInsets.all(TS.spacing.md),
      itemCount: _listCount + 1,
      hasMore: _listCount < 30,
      onRefresh: () async {
        await Future<void>.delayed(const Duration(milliseconds: 800));
        if (!mounted) return;
        setState(() {
          _listCount = 12;
          _refreshCount += 1;
        });
      },
      onLoadMore: () async {
        await Future<void>.delayed(const Duration(milliseconds: 800));
        if (!mounted) return;
        setState(() => _listCount += 6);
      },
      separatorBuilder: (_, index) => index == 0
          ? const SizedBox.shrink()
          : Divider(height: TS.border.widthHairline, color: TS.colors.border),
      itemBuilder: (context, index) {
        if (index > 0) {
          return _row(context, index - 1, 'ScrollableDataList');
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Data / 数据', style: TS.textStyle.title),
            SizedBox(height: TS.spacing.xs),
            Text(
              'DataList 使用 Flutter ListView；刷新列表使用 pull_to_refresh。',
              style: TS.textStyle.caption,
            ),
            SizedBox(height: TS.spacing.lg),
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
                '已刷新 $_refreshCount 次',
                key: const ValueKey('data-refresh-count'),
                style: TS.textStyle.caption,
              ),
            ),
          ],
        );
      },
    );
  }
}
