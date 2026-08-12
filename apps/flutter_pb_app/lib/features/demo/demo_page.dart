import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'action_demo_section.dart';
import 'data_demo_section.dart';
import 'display_demo_section.dart';
import 'feedback_demo_section.dart';
import 'input_demo_section.dart';
import 'navigation_demo_section.dart';

class DemoPage extends ConsumerStatefulWidget {
  const DemoPage({super.key});

  @override
  ConsumerState<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends ConsumerState<DemoPage> {
  int _categoryIndex = 0;

  static const _categories = [
    _DemoCategory(
      label: 'Action',
      description: '操作',
      icon: CommonIconName.plus,
      page: ActionDemoSection(),
    ),
    _DemoCategory(
      label: 'Input',
      description: '输入',
      icon: CommonIconName.fileText,
      page: InputDemoSection(),
    ),
    _DemoCategory(
      label: 'Display',
      description: '展示',
      icon: CommonIconName.inbox,
      page: DisplayDemoSection(),
    ),
    _DemoCategory(
      label: 'Navigation',
      description: '导航',
      icon: CommonIconName.home,
      page: NavigationDemoSection(),
    ),
    _DemoCategory(
      label: 'Data',
      description: '数据',
      icon: CommonIconName.list,
      page: DataDemoSection(),
    ),
    _DemoCategory(
      label: 'Feedback',
      description: '反馈',
      icon: CommonIconName.alertCircle,
      page: FeedbackDemoSection(),
    ),
  ];

  void _selectCategory(int index) {
    setState(() => _categoryIndex = index);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final mode = ref.watch(themeModeProvider);
    final category = _categories[_categoryIndex];

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: CommonAppBar(
        title: '${category.label} · ${category.description}',
        showAction: true,
        actionIcon: CommonIconName.settings,
        actionLabel: '切换主题',
        onAction: () {
          ref.read(themeModeProvider.notifier).state = mode == ThemeMode.dark
              ? ThemeMode.light
              : ThemeMode.dark;
        },
      ),
      drawer: NavigationDrawer(
        selectedIndex: _categoryIndex,
        onDestinationSelected: _selectCategory,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              TS.spacing.md,
              TS.spacing.lg,
              TS.spacing.md,
              TS.spacing.sm,
            ),
            child: Text('组件分类', style: TS.textStyle.titleSm),
          ),
          for (final category in _categories)
            NavigationDrawerDestination(
              icon: CommonIcon(name: category.icon),
              label: Text('${category.label} / ${category.description}'),
            ),
        ],
      ),
      body: IndexedStack(
        index: _categoryIndex,
        children: [for (final item in _categories) item.page],
      ),
    );
  }
}

class _DemoCategory {
  const _DemoCategory({
    required this.label,
    required this.description,
    required this.icon,
    required this.page,
  });

  final String label;
  final String description;
  final CommonIconName icon;
  final Widget page;
}
