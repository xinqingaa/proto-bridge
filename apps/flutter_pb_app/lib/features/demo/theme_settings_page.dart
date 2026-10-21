import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../common/widgets.dart';
import '../../common/overlay/app_pop.dart';
import '../../theme/ts.dart';

class DemoSettingsPage extends StatelessWidget {
  const DemoSettingsPage({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
    appBar: CommonAppBar(title: '展示设置', showBack: true),
    body: ThemeSettingsContent(),
  );
}

/// One set of controls shares application providers with the entire gallery.
class ThemeSettingsContent extends ConsumerWidget {
  const ThemeSettingsContent({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ts = TS.of(context);
    final packs = ref.watch(themePacksProvider);
    final selected = ref.watch(themePackProvider);
    final mode = ref.watch(themeModeProvider);
    return ListView(
      padding: EdgeInsets.all(ts.spacing.md),
      children: [
        Text('主题与外观', style: ts.textStyle.title),
        SizedBox(height: ts.spacing.md),
        CommonRadioGroup<ThemeMode>(
          label: '深浅色',
          value: mode,
          options: const [
            CommonChoiceOption(value: ThemeMode.light, label: '浅色'),
            CommonChoiceOption(value: ThemeMode.dark, label: '深色'),
          ],
          onChanged: (value) {
            if (value != null) {
              ref.read(themeModeProvider.notifier).setMode(value);
            }
          },
        ),
        SizedBox(height: ts.spacing.md),
        CommonRadioGroup<String>(
          label: '主题包与主题',
          value: selected.id,
          options: [
            for (final pack in packs)
              CommonChoiceOption(value: pack.id, label: pack.label),
          ],
          onChanged: (id) {
            if (id != null) ref.read(themePackProvider.notifier).select(id);
          },
        ),
        SizedBox(height: ts.spacing.lg),
        CommonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CommonBrandMark(name: selected.label),
              SizedBox(height: ts.spacing.md),
              Text('当前主题预览', style: ts.textStyle.subtitle),
              SizedBox(height: ts.spacing.sm),
              Text('设置应用于整个展示工程，并在重启后恢复。', style: ts.textStyle.content),
              SizedBox(height: ts.spacing.md),
              CommonButton(
                label: '操作按钮',
                onPressed: () =>
                    AppPop.toast(context, '当前主题：${selected.label}'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
