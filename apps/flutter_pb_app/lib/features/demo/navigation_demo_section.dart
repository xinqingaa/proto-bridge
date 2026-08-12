import 'package:flutter/material.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

const _tabItems = [
  CommonTabItem(value: 'all', label: '全部'),
  CommonTabItem(value: 'active', label: '进行中'),
  CommonTabItem(value: 'done', label: '已完成'),
];

class NavigationDemoSection extends StatefulWidget {
  const NavigationDemoSection({super.key});

  @override
  State<NavigationDemoSection> createState() => _NavigationDemoSectionState();
}

class _NavigationDemoSectionState extends State<NavigationDemoSection> {
  String _filter = 'all';
  int _bottomIndex = 0;

  @override
  Widget build(BuildContext context) {
    return DemoCategoryPage(
      title: 'Navigation / 导航',
      description: '三种层级各自独立：Tabs 拥有视图区，FilterBar 只改变数据。',
      children: [
        DemoGroup(
          title: 'Primary Tabs',
          description: '普通 recessed 轨道；只有选中项使用 LiquidGlass。',
          child: SizedBox(
            height: 128,
            child: DefaultTabController(
              length: _tabItems.length,
              child: Column(
                children: [
                  const CommonPrimaryTabs(items: _tabItems),
                  SizedBox(height: TS.spacing.smPlus),
                  const Expanded(
                    child: CommonTabView(
                      children: [
                        Center(child: Text('全部内容')),
                        Center(child: Text('进行中内容')),
                        Center(child: Text('已完成内容')),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        DemoGroup(
          title: 'Secondary Tabs',
          description: '独立控制器、独立视图区，选中态仅使用文字与小三角。',
          child: SizedBox(
            height: 128,
            child: DefaultTabController(
              length: _tabItems.length,
              child: Column(
                children: [
                  const CommonSecondaryTabs(items: _tabItems),
                  SizedBox(height: TS.spacing.smPlus),
                  const Expanded(
                    child: CommonTabView(
                      children: [
                        Center(child: Text('全部明细')),
                        Center(child: Text('进行中明细')),
                        Center(child: Text('已完成明细')),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        DemoGroup(
          title: 'Filter Bar',
          child: CommonFilterBar(
            items: const [
              CommonFilterItem(value: 'all', label: '全部'),
              CommonFilterItem(value: 'open', label: '进行中'),
              CommonFilterItem(value: 'done', label: '完成'),
            ],
            selected: _filter,
            onSelected: (value) => setState(() => _filter = value),
          ),
        ),
        DemoGroup(
          title: 'Tabbar',
          child: CommonBottomNav(
            currentIndex: _bottomIndex,
            onTap: (index) => setState(() => _bottomIndex = index),
            items: const [
              CommonBottomNavItem(
                value: 'home',
                label: '首页',
                icon: CommonIconName.home,
              ),
              CommonBottomNavItem(
                value: 'tasks',
                label: '任务',
                icon: CommonIconName.list,
              ),
              CommonBottomNavItem(
                value: 'profile',
                label: '我的',
                icon: CommonIconName.user,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
