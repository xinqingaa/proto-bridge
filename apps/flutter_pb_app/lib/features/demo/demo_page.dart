import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'action_demo_section.dart';
import 'display_demo_section.dart';
import 'input_demo_section.dart';
import 'more_demo_section.dart';
import 'navigation_demo_section.dart';

class DemoPage extends ConsumerStatefulWidget {
  const DemoPage({super.key});

  @override
  ConsumerState<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends ConsumerState<DemoPage> {
  int _categoryIndex = 0;

  static const _destinations = [
    _DemoDestination(
      value: 'action',
      label: 'Action',
      description: '操作',
      icon: CommonIconName.plus,
      page: ActionDemoSection(),
    ),
    _DemoDestination(
      value: 'input',
      label: 'Input',
      description: '输入',
      icon: CommonIconName.fileText,
      page: InputDemoSection(),
    ),
    _DemoDestination(
      value: 'display',
      label: 'Display',
      description: '展示',
      icon: CommonIconName.inbox,
      page: DisplayDemoSection(),
    ),
    _DemoDestination(
      value: 'navigation',
      label: 'Navigation',
      description: '导航',
      icon: CommonIconName.home,
      page: NavigationDemoSection(),
    ),
    _DemoDestination(
      value: 'more',
      label: 'More',
      description: '更多',
      icon: CommonIconName.more,
      page: MoreDemoSection(),
    ),
  ];

  void _selectDestination(int index) {
    setState(() => _categoryIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final mode = ref.watch(themeModeProvider);
    final destination = _destinations[_categoryIndex];

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: CommonAppBar(
        title: '${destination.label} · ${destination.description}',
        showAction: true,
        actionIcon: CommonIconName.settings,
        actionLabel: '切换主题',
        onAction: () {
          ref.read(themeModeProvider.notifier).state = mode == ThemeMode.dark
              ? ThemeMode.light
              : ThemeMode.dark;
        },
      ),
      body: IndexedStack(
        index: _categoryIndex,
        children: [for (final item in _destinations) item.page],
      ),
      bottomNavigationBar: CommonBottomNav(
        currentIndex: _categoryIndex,
        onTap: _selectDestination,
        items: [
          for (final item in _destinations)
            CommonBottomNavItem(
              value: item.value,
              label: item.description,
              icon: item.icon,
            ),
        ],
      ),
    );
  }
}

class _DemoDestination {
  const _DemoDestination({
    required this.value,
    required this.label,
    required this.description,
    required this.icon,
    required this.page,
  });

  final String value;
  final String label;
  final String description;
  final CommonIconName icon;
  final Widget page;
}
