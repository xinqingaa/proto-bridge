import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../theme/ts.dart';
import '../composition/density.dart';
import '../display/glass_surface.dart';
import 'choice_option.dart';

/// A local single-choice control. It never owns a viewport or route history.
class CommonSegmentedControl<T> extends StatefulWidget {
  const CommonSegmentedControl({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.label,
    this.disabled = false,
    this.density = CommonDensity.regular,
    this.material = CommonSurfaceMaterial.solid,
  });
  final List<CommonChoiceOption<T>> options;
  final T value;
  final ValueChanged<T>? onChanged;
  final String? label;
  final bool disabled;
  final CommonDensity density;
  final CommonSurfaceMaterial material;

  @override
  State<CommonSegmentedControl<T>> createState() =>
      _CommonSegmentedControlState<T>();
}

class _CommonSegmentedControlState<T> extends State<CommonSegmentedControl<T>> {
  final Map<T, FocusNode> _nodes = {};

  bool get _enabled => !widget.disabled && widget.onChanged != null;
  List<CommonChoiceOption<T>> get _available =>
      widget.options.where((item) => item.enabled).toList();

  void _select(CommonChoiceOption<T> option) {
    if (!_enabled || !option.enabled) return;
    widget.onChanged!(option.value);
    _nodes[option.value]?.requestFocus();
  }

  void _move(int direction, {bool edge = false}) {
    final available = _available;
    if (!_enabled || available.isEmpty) return;
    final current = available.indexWhere(
      (item) => _nodes[item.value]?.hasFocus ?? false,
    );
    final selected = current >= 0
        ? current
        : available.indexWhere((item) => item.value == widget.value);
    final index = edge
        ? (direction > 0 ? available.length - 1 : 0)
        : (selected + direction).clamp(0, available.length - 1);
    _select(available[index]);
  }

  @override
  void dispose() {
    for (final node in _nodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ts = TS.of(context);
    final values = widget.options.map((item) => item.value).toSet();
    assert(
      values.length == widget.options.length,
      'Segment identities must be unique.',
    );
    for (final value
        in _nodes.keys.where((value) => !values.contains(value)).toList()) {
      _nodes.remove(value)!.dispose();
    }
    final available = _available;
    final focusValue = available.any((item) => item.value == widget.value)
        ? widget.value
        : available.firstOrNull?.value;
    for (final item in widget.options) {
      final node = _nodes.putIfAbsent(item.value, () => FocusNode());
      node.skipTraversal =
          !_enabled || !item.enabled || item.value != focusValue;
    }
    final compact = widget.density == CommonDensity.compact;
    final trackHeight = compact ? ts.sizing.compactHeight : ts.sizing.controlMd;
    final selectedHeight = compact
        ? ts.sizing.compactSelectionHeight
        : trackHeight - ts.spacing.xs * 2;
    final radius = BorderRadius.circular(compact ? ts.radius.sm : ts.radius.md);
    Widget track = DecoratedBox(
      decoration: BoxDecoration(
        color: ts.colors.surfaceRecessed,
        borderRadius: radius,
      ),
    );
    if (widget.material == CommonSurfaceMaterial.glass) {
      track = CommonGlassSurface(
        borderRadius: radius,
        child: const SizedBox.expand(),
      );
    }
    return Semantics(
      label: widget.label,
      child: CallbackShortcuts(
        bindings: {
          const SingleActivator(LogicalKeyboardKey.arrowLeft): () => _move(-1),
          const SingleActivator(LogicalKeyboardKey.arrowRight): () => _move(1),
          const SingleActivator(LogicalKeyboardKey.home): () =>
              _move(-1, edge: true),
          const SingleActivator(LogicalKeyboardKey.end): () =>
              _move(1, edge: true),
        },
        child: Opacity(
          opacity: widget.disabled ? ts.opacity.disabled : ts.opacity.visible,
          child: SizedBox(
            height: ts.sizing.touch,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Positioned(
                  left: 0,
                  right: 0,
                  height: trackHeight,
                  child: track,
                ),
                Row(
                  children: [
                    for (final option in widget.options)
                      Expanded(
                        child: Semantics(
                          selected: option.value == widget.value,
                          inMutuallyExclusiveGroup: true,
                          child: InkWell(
                            focusNode: _nodes[option.value],
                            canRequestFocus: _enabled && option.enabled,
                            onTap: _enabled && option.enabled
                                ? () => _select(option)
                                : null,
                            borderRadius: radius,
                            child: SizedBox(
                              height: ts.sizing.touch,
                              child: Center(
                                child: Padding(
                                  padding: EdgeInsets.symmetric(
                                    horizontal: ts.spacing.xs,
                                  ),
                                  child: AnimatedContainer(
                                    height: selectedHeight,
                                    alignment: Alignment.center,
                                    duration:
                                        MediaQuery.disableAnimationsOf(context)
                                        ? Duration.zero
                                        : ts.motion.durationFast,
                                    curve: ts.motion.easingStandard,
                                    decoration: BoxDecoration(
                                      borderRadius: radius,
                                      color: option.value == widget.value
                                          ? ts.colors.surfaceSelected
                                          : Colors.transparent,
                                      boxShadow: option.value == widget.value
                                          ? ts.elevation.surface
                                          : null,
                                    ),
                                    child: Opacity(
                                      opacity: option.enabled
                                          ? ts.opacity.visible
                                          : ts.opacity.disabled,
                                      child: Text(
                                        option.label,
                                        style:
                                            (compact
                                                    ? ts.textStyle.bodySm
                                                    : ts.textStyle.label)
                                                .copyWith(
                                                  color:
                                                      option.value ==
                                                          widget.value
                                                      ? ts.colors.onSurface
                                                      : ts
                                                            .colors
                                                            .onSurfaceMuted,
                                                ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
