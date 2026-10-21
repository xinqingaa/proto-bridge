import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../common/state/local_value.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class InputDemoSection extends ConsumerStatefulWidget {
  const InputDemoSection({super.key});

  @override
  ConsumerState<InputDemoSection> createState() => _InputDemoSectionState();
}

class _InputDemoSectionState extends ConsumerState<InputDemoSection> {
  final _checkedProvider = localValueProvider<bool>(true);
  final _switchedProvider = localValueProvider<bool>(false);
  final _selectValueProvider = localValueProvider<String?>('a');
  final _radioValueProvider = localValueProvider<String?>('1');

  static const _selectOptions = [
    CommonChoiceOption(value: 'a', label: '选项 A'),
    CommonChoiceOption(value: 'b', label: '选项 B'),
    CommonChoiceOption(value: 'c', label: '选项 C'),
  ];

  @override
  Widget build(BuildContext context) {
    final checked = ref.watch(_checkedProvider);
    final switched = ref.watch(_switchedProvider);
    final selectValue = ref.watch(_selectValueProvider);
    final radioValue = ref.watch(_radioValueProvider);
    final ts = TS.of(context);
    return DemoCategoryPage(
      title: 'Input / 输入',
      description: '字段、有限选项与二值输入；Menu 弹层经 AppPop.dropMenu。',
      children: [
        CommonFormSection(
          title: '表单组件',
          description: 'Composition 只负责组织，输入语义仍由各组件拥有。',
          actionLabel: '重置',
          onAction: () {
            ref.read(_selectValueProvider.notifier).set('a');
            ref.read(_checkedProvider.notifier).set(true);
            ref.read(_switchedProvider.notifier).set(false);
            ref.read(_radioValueProvider.notifier).set('1');
          },
          children: [
            const CommonTextField(hint: '无标题输入'),
            SizedBox(height: ts.spacing.md),
            const CommonTextField(label: '单行输入', showLabel: true, hint: '请输入'),
            SizedBox(height: ts.spacing.md),
            const CommonTextArea(label: '多行输入', showLabel: true),
            SizedBox(height: ts.spacing.md),
            CommonMenuField<String>(
              label: '选择',
              value: selectValue,
              options: _selectOptions,
              clearable: true,
              onChanged: (value) =>
                  ref.read(_selectValueProvider.notifier).set(value),
            ),
            SizedBox(height: ts.spacing.sm),
            CommonCheckbox(
              label: '同意协议',
              value: checked,
              onChanged: (value) =>
                  ref.read(_checkedProvider.notifier).set(value),
            ),
            CommonSwitch(
              label: '接收通知',
              value: switched,
              onChanged: (value) =>
                  ref.read(_switchedProvider.notifier).set(value),
            ),
            CommonRadioGroup<String>(
              label: '单选',
              value: radioValue,
              options: const [
                CommonChoiceOption(value: '1', label: '方案一'),
                CommonChoiceOption(value: '2', label: '方案二'),
              ],
              onChanged: (value) =>
                  ref.read(_radioValueProvider.notifier).set(value),
            ),
            SizedBox(height: ts.spacing.md),
            const CommonSearchBar(),
          ],
        ),
      ],
    );
  }
}
