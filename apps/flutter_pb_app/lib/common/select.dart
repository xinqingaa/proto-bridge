import 'package:flutter/material.dart';
import 'package:unified_popups/unified_popups.dart';

import '../overlay/app_pop.dart';
import '../theme/ts.dart';

/// Select 实现方案：
/// - [dropdown]：官方 [DropdownButtonFormField]（默认）
/// - [dropMenu]：备选 [AppPop.dropMenu]（内部 Pop.dropMenu）
///
/// 切换 [CommonSelect.implementation] 或实例参数对比效果。
enum CommonSelectImplementation { dropdown, dropMenu }

class CommonSelectOption<T> {
  const CommonSelectOption({required this.value, required this.label});

  final T value;
  final String label;
}

/// 对齐 pbwork `SelectField`。
class CommonSelect<T> extends StatefulWidget {
  const CommonSelect({
    super.key,
    required this.options,
    this.value,
    this.label,
    this.hint,
    this.enabled = true,
    this.onChanged,
    this.implementation = CommonSelectImplementation.dropdown,
  });

  /// 全局默认实现，方便整页切换对比。
  static CommonSelectImplementation defaultImplementation =
      CommonSelectImplementation.dropdown;

  final List<CommonSelectOption<T>> options;
  final T? value;
  final String? label;
  final String? hint;
  final bool enabled;
  final ValueChanged<T?>? onChanged;
  final CommonSelectImplementation? implementation;

  @override
  State<CommonSelect<T>> createState() => _CommonSelectState<T>();
}

class _CommonSelectState<T> extends State<CommonSelect<T>> {
  final PopupAnchorController _anchor = PopupAnchorController();

  CommonSelectImplementation get _impl =>
      widget.implementation ?? CommonSelect.defaultImplementation;

  @override
  void dispose() {
    _anchor.attached.dispose();
    super.dispose();
  }

  Future<void> _openDropMenu() async {
    if (!widget.enabled) return;
    final selected = await AppPop.dropMenu<T>(
      anchor: _anchor,
      menu: DropMenu<T>.single(
        selectedValue: widget.value,
        items: [
          for (final opt in widget.options)
            DropMenuItem<T>(
              value: opt.value,
              label: opt.label,
              selected: opt.value == widget.value,
            ),
        ],
      ),
    );
    if (selected != null) {
      widget.onChanged?.call(selected);
    }
  }

  String? get _selectedLabel {
    for (final opt in widget.options) {
      if (opt.value == widget.value) return opt.label;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);

    // —— 方案 A：DropdownButtonFormField（默认）——
    if (_impl == CommonSelectImplementation.dropdown) {
      return DropdownButtonFormField<T>(
        // Flutter 3.33+：FormField 用 initialValue；受控更新靠 key 重建。
        key: ValueKey(widget.value),
        initialValue: widget.value,
        decoration: InputDecoration(
          labelText: widget.label,
          hintText: widget.hint,
        ),
        items: [
          for (final opt in widget.options)
            DropdownMenuItem<T>(
              value: opt.value,
              child: Text(opt.label),
            ),
        ],
        onChanged: widget.enabled ? widget.onChanged : null,
      );
    }

    // —— 方案 B：AppPop.dropMenu（备选，对齐 Pop.dropMenu）——
    final label = _selectedLabel;

    return PopupAnchor(
      controller: _anchor,
      child: InkWell(
        onTap: widget.enabled ? _openDropMenu : null,
        borderRadius: BorderRadius.circular(TS.radius.md),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hint,
            suffixIcon: const Icon(Icons.arrow_drop_down),
            enabled: widget.enabled,
          ),
          child: Text(
            label ?? widget.hint ?? '',
            style: TS.textStyle.content.copyWith(
              color: label == null ? TS.colors.onSurfaceMuted : null,
            ),
          ),
        ),
      ),
    );
  }
}
