import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../common/overlay/app_pop.dart';
import '../../theme/ts.dart';
import '../../common/widgets/widgets.dart';

/// 组件对照页：方便与 pbwork playground 肉眼对齐。
class DemoPage extends ConsumerStatefulWidget {
  const DemoPage({super.key});

  @override
  ConsumerState<DemoPage> createState() => _DemoPageState();
}

class _DemoPageState extends ConsumerState<DemoPage> {
  int _tabIndex = 0;
  bool _checked = true;
  bool _switched = false;
  String? _selectValue = 'a';
  String? _radioValue = '1';
  final Set<String> _filters = {'all'};
  int _listCount = 12;

  static const _selectOptions = [
    CommonSelectOption(value: 'a', label: '选项 A'),
    CommonSelectOption(value: 'b', label: '选项 B'),
    CommonSelectOption(value: 'c', label: '选项 C'),
  ];

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final mode = ref.watch(themeModeProvider);

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: CommonAppBar(
        title: 'Demo 对照',
        showBack: true,
        actions: [
          CommonIconButton(
            icon: mode == ThemeMode.dark
                ? Icons.light_mode
                : Icons.dark_mode,
            tooltip: '切换主题',
            onPressed: () {
              ref.read(themeModeProvider.notifier).state =
                  mode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _tabIndex,
        children: [
          _buildBasics(),
          _buildForms(),
          _buildLists(),
          _buildOverlay(),
        ],
      ),
      bottomNavigationBar: CommonBottomNav(
        currentIndex: _tabIndex,
        onTap: (i) => setState(() => _tabIndex = i),
        items: const [
          CommonBottomNavItem(
            value: 'basic',
            label: '基础',
            icon: Icons.widgets_outlined,
          ),
          CommonBottomNavItem(
            value: 'form',
            label: '表单',
            icon: Icons.edit_outlined,
          ),
          CommonBottomNavItem(
            value: 'list',
            label: '列表',
            icon: Icons.list_alt_outlined,
          ),
          CommonBottomNavItem(
            value: 'overlay',
            label: '弹层',
            icon: Icons.layers_outlined,
          ),
        ],
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Padding(
      padding: EdgeInsets.all(TS.spacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TS.textStyle.titleSm),
          SizedBox(height: TS.spacing.sm),
          ...children,
        ],
      ),
    );
  }

  Widget _buildBasics() {
    return ListView(
      children: [
        _section('Button / IconButton', [
          Wrap(
            spacing: TS.spacing.sm,
            runSpacing: TS.spacing.sm,
            children: [
              CommonButton(
                label: 'Flat Action',
                onPressed: () => AppPop.toast('flat'),
              ),
              CommonButton(
                label: 'Tonal',
                variant: CommonButtonVariant.tonal,
                tone: CommonButtonTone.primary,
                onPressed: () {},
              ),
              CommonButton(
                label: 'Outlined',
                variant: CommonButtonVariant.outlined,
                tone: CommonButtonTone.primary,
                onPressed: () {},
              ),
              CommonButton(
                label: 'Text',
                variant: CommonButtonVariant.text,
                tone: CommonButtonTone.primary,
                onPressed: () {},
              ),
              CommonIconButton(
                icon: Icons.add,
                onPressed: () {},
              ),
            ],
          ),
        ]),
        _section('Chip / Badge / Avatar', [
          Wrap(
            spacing: TS.spacing.sm,
            runSpacing: TS.spacing.sm,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const CommonChip(label: 'Chip'),
              const CommonBadge(label: '99+', tone: CommonButtonTone.error),
              const CommonAvatar(name: 'Lin Rui'),
            ],
          ),
        ]),
        _section('Card / Divider / Progress / Spinner', [
          const CommonCard(
            title: '卡片标题',
            subtitle: '副标题说明',
            child: Text('卡片内容'),
          ),
          SizedBox(height: TS.spacing.md),
          const CommonDivider(label: '分隔'),
          SizedBox(height: TS.spacing.md),
          const CommonProgress(value: 0.45, label: '进度 45%'),
          SizedBox(height: TS.spacing.md),
          const CommonSpinner(label: '加载中'),
        ]),
        _section('EmptyState', [
          const CommonEmptyState(
            title: '暂无数据',
            description: '对齐 pbwork EmptyState',
            actionLabel: '刷新',
          ),
        ]),
        _section('Tabs + TabView', [
          SizedBox(
            height: 160,
            child: DefaultTabController(
              length: 3,
              child: Column(
                children: [
                  const CommonTabs(
                    items: [
                      CommonTabItem(value: '1', label: '全部'),
                      CommonTabItem(value: '2', label: '进行中'),
                      CommonTabItem(value: '3', label: '已完成'),
                    ],
                  ),
                  const Expanded(
                    child: CommonTabView(
                      children: [
                        Center(child: Text('Tab 1')),
                        Center(child: Text('Tab 2')),
                        Center(child: Text('Tab 3')),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ]),
      ],
    );
  }

  Widget _buildForms() {
    return ListView(
      padding: EdgeInsets.all(TS.spacing.md),
      children: [
        CommonFormSection(
          title: '表单分组',
          description: '对齐 FormSection',
          actionLabel: '重置',
          onAction: () {
            setState(() {
              _selectValue = 'a';
              _checked = true;
              _switched = false;
              _radioValue = '1';
            });
          },
          children: [
            const CommonTextField(label: '单行输入', hint: '请输入'),
            SizedBox(height: TS.spacing.md),
            const CommonTextArea(label: '多行输入'),
            SizedBox(height: TS.spacing.md),
            CommonSelect<String>(
              label: '选择',
              value: _selectValue,
              options: _selectOptions,
              implementation: CommonSelectImplementation.dropMenu,
              onChanged: (v) => setState(() => _selectValue = v),
            ),
            SizedBox(height: TS.spacing.md),
            CommonCheckbox(
              label: '同意协议',
              value: _checked,
              onChanged: (v) => setState(() => _checked = v ?? false),
            ),
            CommonSwitch(
              label: '接收通知',
              value: _switched,
              onChanged: (v) => setState(() => _switched = v),
            ),
            CommonRadioGroup<String>(
              label: '单选',
              value: _radioValue,
              options: const [
                CommonSelectOption(value: '1', label: '方案一'),
                CommonSelectOption(value: '2', label: '方案二'),
              ],
              onChanged: (v) => setState(() => _radioValue = v),
            ),
            SizedBox(height: TS.spacing.md),
            const CommonSearchBar(),
            SizedBox(height: TS.spacing.md),
            CommonFilterBar(
              items: const [
                CommonFilterItem(value: 'all', label: '全部'),
                CommonFilterItem(value: 'open', label: '进行中'),
                CommonFilterItem(value: 'done', label: '完成'),
              ],
              selected: _filters,
              showFilterAction: true,
              onSelected: (v) {
                setState(() {
                  if (_filters.contains(v)) {
                    _filters.remove(v);
                  } else {
                    _filters.add(v);
                  }
                });
              },
              onFilterTap: () => AppPop.toast('高级筛选'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLists() {
    return CommonScrollableDataList(
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
      separatorBuilder: (_, _) => Divider(height: 1, color: TS.colors.divider),
      itemBuilder: (context, index) {
        return ListTile(
          title: Text('列表项 ${index + 1}', style: TS.textStyle.content),
          subtitle: Text('ScrollableDataList', style: TS.textStyle.caption),
          trailing: const Icon(Icons.chevron_right),
        );
      },
    );
  }

  Widget _buildOverlay() {
    return ListView(
      padding: EdgeInsets.all(TS.spacing.md),
      children: [
        Text('AppPop（封装 unified_popups）', style: TS.textStyle.titleSm),
        SizedBox(height: TS.spacing.md),
        CommonButton(
          label: 'Toast',
          block: true,
          onPressed: () => AppPop.success('操作成功'),
        ),
        SizedBox(height: TS.spacing.sm),
        CommonButton(
          label: 'Confirm',
          block: true,
          variant: CommonButtonVariant.tonal,
          tone: CommonButtonTone.primary,
          onPressed: () async {
            final ok = await AppPop.confirm(
              title: '确认删除',
              content: '删除后无法恢复',
            );
            AppPop.toast(ok ? '已确认' : '已取消');
          },
        ),
        SizedBox(height: TS.spacing.sm),
        CommonButton(
          label: 'Sheet',
          block: true,
          variant: CommonButtonVariant.outlined,
          tone: CommonButtonTone.primary,
          onPressed: () {
            AppPop.sheet<void>(
              title: '底部面板',
              builder: (context, handle) {
                return Padding(
                  padding: EdgeInsets.all(TS.spacing.md),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('对齐 BottomSheet', style: TS.textStyle.content),
                      SizedBox(height: TS.spacing.md),
                      CommonButton(
                        label: '关闭',
                        block: true,
                        onPressed: handle.dismiss,
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }
}
