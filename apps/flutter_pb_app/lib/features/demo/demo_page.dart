import 'package:flutter/material.dart';
import '../../common/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'action_demo_section.dart';
import 'display_demo_section.dart';
import 'input_demo_section.dart';
import 'navigation_demo_section.dart';
import 'data_demo_section.dart';
import 'feedback_demo_section.dart';
import 'extended_demo_section.dart';
import 'theme_settings_page.dart';

class DemoPage extends StatefulWidget {
  const DemoPage({super.key});
  @override
  State<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends State<DemoPage> {
  int _index = 0;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: CommonAppBar(
      title: _index == 0 ? '主题' : '组件',
      showAction: true,
      actionIcon: CommonIconName.settings,
      actionLabel: '展示设置',
      onAction: () => Navigator.of(context).pushNamed(AppRoutes.settings),
    ),
    body: IndexedStack(
      index: _index,
      children: const [ThemeSettingsContent(), _ComponentCatalog()],
    ),
    bottomNavigationBar: CommonBottomNav(
      currentIndex: _index,
      onTap: (value) => setState(() => _index = value),
      items: const [
        CommonBottomNavItem(
          value: 'themes',
          label: '主题',
          icon: CommonIconName.sparkles,
        ),
        CommonBottomNavItem(
          value: 'components',
          label: '组件',
          icon: CommonIconName.inbox,
        ),
      ],
    ),
  );
}

class _ComponentCatalog extends StatelessWidget {
  const _ComponentCatalog();
  @override
  Widget build(BuildContext context) {
    final ts = TS.of(context);
    final groups = <String, Map<String, Widget>>{
      '操作': {'按钮与图标': const ActionDemoSection()},
      '输入': {
        '字段与选择': const InputDemoSection(),
        'Stepper': const ExtendedDemoSection(only: 'Stepper'),
        'WheelPicker': const ExtendedDemoSection(only: 'WheelPicker'),
      },
      '导航': {
        'Tabs、筛选与视口': const NavigationDemoSection(),
        'LaunchScreen': const ExtendedDemoSection(only: 'LaunchScreen'),
      },
      '展示': {
        '基础展示': const DisplayDemoSection(),
        'Metric / RingProgress / Tag': const ExtendedDemoSection(
          only: 'Metric / RingProgress / Tag',
        ),
        'BrandMark / GlassSurface': const ExtendedDemoSection(
          only: 'BrandMark / GlassSurface',
        ),
      },
      '列表': {
        '列表与刷新': const DataDemoSection(),
        'GroupedList / ListCell': const ExtendedDemoSection(
          only: 'GroupedList / ListCell',
        ),
      },
      '图表与日期': {
        for (final title in ['MiniBars', 'Heatmap', 'MonthCalendar'])
          title: ExtendedDemoSection(only: title),
      },
      '弹层与反馈': {
        'Toast、确认、面板与流程': const FeedbackDemoSection(),
        'ActionSheet': const ExtendedDemoSection(only: 'ActionSheet'),
      },
    };
    return ListView(
      padding: EdgeInsets.all(ts.spacing.md),
      children: [
        for (final group in groups.entries) ...[
          Padding(
            padding: EdgeInsets.symmetric(vertical: ts.spacing.md),
            child: Text(group.key, style: ts.textStyle.subtitle),
          ),
          for (final example in group.value.entries)
            ListTile(
              title: Text(example.key, style: ts.textStyle.content),
              trailing: const CommonIcon(name: CommonIconName.chevronRight),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => Scaffold(
                    appBar: CommonAppBar(title: example.key, showBack: true),
                    body: example.value,
                  ),
                ),
              ),
            ),
        ],
      ],
    );
  }
}
