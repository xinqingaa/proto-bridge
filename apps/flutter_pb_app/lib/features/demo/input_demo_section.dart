import 'package:flutter/material.dart';

import '../../common/widgets.dart';
import '../../theme/ts.dart';
import 'demo_layout.dart';

class InputDemoSection extends StatefulWidget {
  const InputDemoSection({super.key});

  @override
  State<InputDemoSection> createState() => _InputDemoSectionState();
}

class _InputDemoSectionState extends State<InputDemoSection> {
  bool _checked = true;
  bool _switched = false;
  String? _selectValue = 'a';
  String? _radioValue = '1';

  static const _selectOptions = [
    CommonChoiceOption(value: 'a', label: '选项 A'),
    CommonChoiceOption(value: 'b', label: '选项 B'),
    CommonChoiceOption(value: 'c', label: '选项 C'),
  ];

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return DemoCategoryPage(
      title: 'Input / 输入',
      description: '字段、有限选项与二值输入；Menu 弹层经 AppPop.dropMenu。',
      children: [
        CommonFormSection(
          title: '表单组件',
          description: 'Composition 只负责组织，输入语义仍由各组件拥有。',
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
            const CommonTextField(label: '单行输入', showLabel: true, hint: '请输入'),
            SizedBox(height: TS.spacing.md),
            const CommonTextArea(label: '多行输入', showLabel: true),
            SizedBox(height: TS.spacing.md),
            CommonMenuField<String>(
              label: '选择',
              value: _selectValue,
              options: _selectOptions,
              clearable: true,
              onChanged: (value) => setState(() => _selectValue = value),
            ),
            SizedBox(height: TS.spacing.sm),
            CommonCheckbox(
              label: '同意协议',
              value: _checked,
              onChanged: (value) => setState(() => _checked = value),
            ),
            CommonSwitch(
              label: '接收通知',
              value: _switched,
              onChanged: (value) => setState(() => _switched = value),
            ),
            CommonRadioGroup<String>(
              label: '单选',
              value: _radioValue,
              options: const [
                CommonChoiceOption(value: '1', label: '方案一'),
                CommonChoiceOption(value: '2', label: '方案二'),
              ],
              onChanged: (value) => setState(() => _radioValue = value),
            ),
            SizedBox(height: TS.spacing.md),
            const CommonSearchBar(),
          ],
        ),
      ],
    );
  }
}
