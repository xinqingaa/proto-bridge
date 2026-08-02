import 'package:flutter/material.dart';

import '../../theme/ts.dart';

/// 对齐 pbwork `SearchBar`。
///
/// 有内容时显示清除按钮，对齐原型 clearable。
class CommonSearchBar extends StatefulWidget {
  const CommonSearchBar({
    super.key,
    this.controller,
    this.hint = '搜索',
    this.enabled = true,
    this.onChanged,
    this.onSubmitted,
    this.onClear,
  });

  final TextEditingController? controller;
  final String hint;
  final bool enabled;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;

  @override
  State<CommonSearchBar> createState() => _CommonSearchBarState();
}

class _CommonSearchBarState extends State<CommonSearchBar> {
  TextEditingController? _owned;
  late TextEditingController _controller;

  TextEditingController get _effective => widget.controller ?? _owned!;

  @override
  void initState() {
    super.initState();
    if (widget.controller == null) {
      _owned = TextEditingController();
    }
    _controller = _effective;
    _controller.addListener(_onText);
  }

  @override
  void didUpdateWidget(covariant CommonSearchBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      _controller.removeListener(_onText);
      if (oldWidget.controller == null) {
        _owned?.dispose();
        _owned = null;
      }
      if (widget.controller == null) {
        _owned = TextEditingController(text: _controller.text);
      }
      _controller = _effective;
      _controller.addListener(_onText);
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onText);
    _owned?.dispose();
    super.dispose();
  }

  void _onText() {
    if (mounted) setState(() {});
  }

  void _clear() {
    _controller.clear();
    widget.onChanged?.call('');
    widget.onClear?.call();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final hasText = _controller.text.isNotEmpty;

    return TextField(
      controller: _controller,
      enabled: widget.enabled,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      textInputAction: TextInputAction.search,
      style: TS.textStyle.content,
      decoration: InputDecoration(
        hintText: widget.hint,
        prefixIcon: Icon(Icons.search, color: TS.colors.onSurfaceMuted),
        suffixIcon: hasText && widget.enabled
            ? IconButton(
                tooltip: '清除',
                onPressed: _clear,
                icon: Icon(Icons.close, color: TS.colors.onSurfaceMuted),
              )
            : null,
        filled: true,
        fillColor: TS.colors.surfaceVariant,
      ),
    );
  }
}
