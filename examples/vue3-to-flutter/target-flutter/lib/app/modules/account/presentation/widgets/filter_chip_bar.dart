import 'package:flutter/material.dart';

import '../../../../theme/app_tokens.dart';
import '../../../../theme/theme_service.dart';

class FilterChipBar extends StatelessWidget {
  const FilterChipBar({
    required this.options,
    required this.selected,
    required this.onSelected,
    super.key,
  });

  final List<String> options;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: options.map((option) {
          final active = option == selected;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: ChoiceChip(
              selected: active,
              showCheckmark: false,
              visualDensity: VisualDensity.compact,
              labelStyle: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
              label: Text(option),
              onSelected: (_) => onSelected(option),
              selectedColor: themeService.colors.primarySoft,
              shape: RoundedRectangleBorder(
                side: BorderSide(
                  color: active
                      ? themeService.colors.primary
                      : themeService.colors.border,
                ),
                borderRadius: BorderRadius.circular(AppRadii.chip),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
