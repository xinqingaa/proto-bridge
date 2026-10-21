import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class ExtendedDemoSection extends StatefulWidget {
  const ExtendedDemoSection({super.key, this.only});
  final String? only;
  @override
  State<ExtendedDemoSection> createState() => _ExtendedDemoSectionState();
}

class _ExtendedDemoSectionState extends State<ExtendedDemoSection> {
  double _goal = 3;
  List<Object> _wheel = [1, 2];
  String _month = '2026-07';
  String _date = '2026-07-16';
  String _heatmapDate = '2026-07-16';
  bool _notifications = true;
  static const _columns = [
    CommonWheelColumn(
      id: 'first',
      label: '第一列',
      unit: '项',
      numeric: true,
      options: [
        CommonWheelOption(value: 0, label: '0'),
        CommonWheelOption(value: 1, label: '1'),
        CommonWheelOption(value: 2, label: '2'),
      ],
    ),
    CommonWheelColumn(
      id: 'second',
      label: '第二列',
      unit: '项',
      numeric: true,
      options: [
        CommonWheelOption(value: 0, label: '0'),
        CommonWheelOption(value: 1, label: '1'),
        CommonWheelOption(value: 2, label: '2'),
        CommonWheelOption(value: 3, label: '3'),
      ],
    ),
  ];
  static final _days = List.generate(
    84,
    (index) => CommonHeatmapDay(
      date: DateTime.utc(
        2026,
        7,
        1,
      ).add(Duration(days: index)).toIso8601String().substring(0, 10),
      value: (index % 7).toDouble(),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final ts = TS.of(context);
    final groups = <DemoGroup>[
      DemoGroup(
        title: 'Stepper',
        child: CommonStepper(
          label: '每日目标',
          value: _goal,
          onChanged: (value) => setState(() => _goal = value),
        ),
      ),
      DemoGroup(
        title: 'WheelPicker',
        child: CommonWheelPicker(
          columns: _columns,
          values: _wheel,
          onChanged: (values) => setState(() => _wheel = values),
        ),
      ),
      DemoGroup(
        title: 'Metric / RingProgress / Tag',
        child: Wrap(
          spacing: ts.spacing.md,
          runSpacing: ts.spacing.sm,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: const [
            CommonMetric(label: '本周完成', value: 24, unit: '次', change: 3),
            CommonRingProgress(label: '今日目标', value: 68),
            CommonTag(label: '进行中', tone: CommonTagTone.primary),
          ],
        ),
      ),
      const DemoGroup(
        title: 'MiniBars',
        child: CommonMiniBars(
          items: [
            CommonBarItem(id: 'mon', label: '一', value: 3),
            CommonBarItem(id: 'tue', label: '二', value: 5),
            CommonBarItem(id: 'wed', label: '三', value: 0),
            CommonBarItem(id: 'thu', label: '四', value: 4),
            CommonBarItem(id: 'fri', label: '五', value: 2),
            CommonBarItem(id: 'sat', label: '六', value: 6),
            CommonBarItem(id: 'sun', label: '日', value: 4),
          ],
        ),
      ),
      DemoGroup(
        title: 'Heatmap',
        child: CommonHeatmap(
          days: _days,
          value: _heatmapDate,
          onChanged: (date) => setState(() => _heatmapDate = date),
        ),
      ),
      DemoGroup(
        title: 'MonthCalendar',
        child: CommonMonthCalendar(
          month: _month,
          value: _date,
          today: '2026-07-16',
          disabledDates: const {'2026-07-15'},
          onChanged: (date) => setState(() => _date = date),
          onMonthChanged: (month) => setState(() => _month = month),
        ),
      ),
      DemoGroup(
        title: 'GroupedList / ListCell',
        child: CommonGroupedList(
          density: CommonDensity.compact,
          groups: [
            CommonListGroup(
              id: 'preferences',
              title: '设置',
              items: [
                CommonListItem(
                  id: 'notifications',
                  title: '提醒通知',
                  description: '在目标时间提醒',
                  switchValue: _notifications,
                ),
                const CommonListItem(
                  id: 'details',
                  title: '查看明细',
                  value: '每天',
                  navigation: true,
                ),
              ],
            ),
          ],
          onChanged: (_, _, value) => setState(() => _notifications = value),
          onNavigate: (_, _) => AppPop.toast(context, '打开明细'),
        ),
      ),
      DemoGroup(
        title: 'BrandMark / GlassSurface',
        child: CommonGlassSurface(
          borderRadius: BorderRadius.circular(ts.radius.lg),
          child: Padding(
            padding: EdgeInsets.all(ts.spacing.md),
            child: const CommonBrandMark(name: 'PBWork'),
          ),
        ),
      ),
      DemoGroup(
        title: 'LaunchScreen',
        child: CommonButton(
          label: '打开欢迎页',
          onPressed: () =>
              Navigator.of(context).pushNamed(AppRoutes.launchPreview),
        ),
      ),
      DemoGroup(
        title: 'ActionSheet',
        child: CommonButton(
          label: '打开动作列表',
          onPressed: () async {
            final result = await AppPop.actionSheet<String>(
              context,
              title: '操作',
              material: CommonSurfaceMaterial.glass,
              actions: const [
                AppSheetAction(value: 'archive', label: '归档'),
                AppSheetAction(value: 'delete', label: '删除', danger: true),
              ],
            );
            if (result != null && context.mounted) {
              AppPop.toast(context, result);
            }
          },
        ),
      ),
    ];
    return DemoCategoryPage(
      title: widget.only ?? '组合与图表',
      description: '输入由调用者控制，日期由明确参数提供。',
      children: groups
          .where((group) => widget.only == null || group.title == widget.only)
          .toList(),
    );
  }
}
