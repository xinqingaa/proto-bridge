import 'package:flutter/material.dart';

import 'preferences/app_preferences_cubit.dart';
import 'routes/app_routes.dart';
import 'theme/app_tokens.dart';
import 'theme/theme_service.dart';

class ExampleHomePage extends StatelessWidget {
  const ExampleHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final preferences = context.preferences;
    final colors = context.pbColors;
    final textStyles = context.pbTextStyles;

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Row(
              children: [
                _HomeSwitch(
                  label: preferences.isDark
                      ? context.t('app.theme.dark')
                      : context.t('app.theme.light'),
                  value: preferences.isDark,
                  onChanged: (_) => context.preferencesCubit.toggleTheme(),
                ),
                const SizedBox(width: AppSpacing.xs),
                _HomeSwitch(
                  label: preferences.isEnglish
                      ? context.t('app.locale.en')
                      : context.t('app.locale.zh'),
                  value: preferences.isEnglish,
                  onChanged: (_) => context.preferencesCubit.toggleLocale(),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              context.t('app.brand'),
              style: textStyles.caption.copyWith(
                color: colors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(context.t('app.home.title'), style: textStyles.title),
            const SizedBox(height: AppSpacing.sm),
            Text(
              context.t('app.home.desc'),
              style: TextStyle(color: colors.muted, height: 1.5),
            ),
            const SizedBox(height: AppSpacing.lg),
            const _OverviewPanel(),
            const SizedBox(height: AppSpacing.md),
            _EntryCard(
              title: context.t('asset.holdings.title'),
              description: context.t('asset.holdings.desc'),
              actionLabel: context.t('asset.action.open'),
              onTap: () => Navigator.of(context).pushNamed(Routes.holdingList),
            ),
            const SizedBox(height: AppSpacing.sm),
            _EntryCard(
              title: context.t('asset.pnl.title'),
              description: context.t('asset.pnl.desc'),
              actionLabel: context.t('asset.action.open'),
              onTap: () => Navigator.of(context).pushNamed(Routes.pnlAnalysis),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeSwitch extends StatelessWidget {
  const _HomeSwitch({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border.all(color: colors.border),
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Padding(
        padding: const EdgeInsets.only(left: 10, right: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: colors.text,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
            Switch.adaptive(
              value: value,
              activeThumbColor: colors.accent,
              activeTrackColor: colors.accentSoft,
              inactiveThumbColor: colors.muted,
              inactiveTrackColor: colors.surfaceSoft,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              onChanged: onChanged,
            ),
          ],
        ),
      ),
    );
  }
}

class ProtoFallbackPage extends StatelessWidget {
  const ProtoFallbackPage({required this.titleKey, super.key});

  final String titleKey;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Scaffold(
      appBar: AppBar(title: Text(context.t(titleKey))),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.t('asset.generated.missing'),
                style: context.pbTextStyles.sectionTitle,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                context.t('asset.generated.hint'),
                style: TextStyle(color: colors.muted, height: 1.5),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(context.t('asset.action.back')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OverviewPanel extends StatelessWidget {
  const _OverviewPanel();

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border.all(color: colors.border),
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          children: [
            Expanded(
              child: _Metric(
                label: context.t('asset.overview'),
                value: r'$128,420',
              ),
            ),
            Expanded(
              child: _Metric(
                label: context.t('asset.todayPnl'),
                value: r'+$2,364',
                accent: true,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    this.accent = false,
  });

  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: colors.muted, fontSize: 12)),
        const SizedBox(height: AppSpacing.xs),
        Text(
          value,
          style: context.pbTextStyles.metric.copyWith(
            color: accent ? colors.positive : colors.text,
          ),
        ),
      ],
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({
    required this.title,
    required this.description,
    required this.actionLabel,
    required this.onTap,
  });

  final String title;
  final String description;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Material(
      color: colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.panel),
        side: BorderSide(color: colors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.panel),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child:
                        Text(title, style: context.pbTextStyles.sectionTitle),
                  ),
                  Icon(Icons.chevron_right, color: colors.muted),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                description,
                style: TextStyle(color: colors.muted, height: 1.45),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                actionLabel,
                style: TextStyle(
                  color: colors.accent,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
