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

  Widget _row(BuildContext context, int index, String source) {
    return ListTile(
      title: Text('列表项 ${index + 1}', style: TS.textStyle.content),
      subtitle: Text(source, style: TS.textStyle.caption),
      trailing: const CommonIcon(name: CommonIconName.chevronRight),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DemoCategoryPage(
      title: 'Data / 数据',
      description: 'DataList 使用 Flutter ListView；刷新列表使用 pull_to_refresh。',
      children: [
        DemoGroup(
          title: 'DataList',
          child: CommonDataList(
            itemCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemBuilder: (context, index) => _row(context, index, 'DataList'),
          ),
        ),
        DemoGroup(
          title: 'ScrollableDataList',
          description: '下拉刷新、上拉加载和有限回弹由公共组件拥有。',
          child: SizedBox(
            height: 420,
            child: CommonScrollableDataList(
              itemCount: _listCount,
              hasMore: _listCount < 30,
              onRefresh: () async {
                await Future<void>.delayed(const Duration(milliseconds: 800));
                setState(() => _listCount = 12);
              },
              onLoadMore: () async {
                await Future<void>.delayed(const Duration(milliseconds: 800));
                setState(() => _listCount += 6);
              },
              separatorBuilder: (_, _) => Divider(
                height: TS.border.widthHairline,
                color: TS.colors.border,
              ),
              itemBuilder: (context, index) =>
                  _row(context, index, 'ScrollableDataList'),
            ),
          ),
        ),
      ],
    );
  }
}
