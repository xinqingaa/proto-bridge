import 'package:flutter/material.dart';

import 'routes/app_routes.dart';
import 'theme/app_tokens.dart';
import 'theme/theme_service.dart';

class ExampleHomePage extends StatelessWidget {
  const ExampleHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            const SizedBox(height: AppSpacing.sm),
            Text(
              'ProtoBridge Target',
              style: themeService.textStyles.caption.copyWith(
                color: themeService.colors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Generated Flutter Preview',
              style: themeService.textStyles.title,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Run pnpm run example at the repository root to generate the ProtoBridge output and Flutter _proto pages.',
              style: TextStyle(color: themeService.colors.muted, height: 1.5),
            ),
            const SizedBox(height: AppSpacing.lg),
            _EntryCard(
              label: 'Simple',
              title: 'Portfolio Holdings',
              description:
                  'Title, summary, filter chips, list and basic states.',
              onTap: () => Navigator.of(context).pushNamed(Routes.holdingList),
            ),
            const SizedBox(height: AppSpacing.sm),
            _EntryCard(
              label: 'Complex',
              title: 'P&L Analysis',
              description:
                  'Tabs, metrics, chart, records, filter sheet and detail sheet.',
              onTap: () => Navigator.of(context).pushNamed(Routes.pnlAnalysis),
            ),
          ],
        ),
      ),
    );
  }
}

class ProtoFallbackPage extends StatelessWidget {
  const ProtoFallbackPage({required this.title, super.key});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Proto page is not generated yet',
                  style: themeService.textStyles.sectionTitle),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Run pnpm run example at the repository root, then start pnpm run example:dev or pnpm run example:android again.',
                style: TextStyle(color: themeService.colors.muted, height: 1.5),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({
    required this.label,
    required this.title,
    required this.description,
    required this.onTap,
  });

  final String label;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: themeService.colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadii.panel),
        side: BorderSide(color: themeService.colors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadii.panel),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  color: themeService.colors.primarySoft,
                  borderRadius: BorderRadius.circular(AppRadii.chip),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 4,
                  ),
                  child: Text(
                    label,
                    style: TextStyle(
                      color: themeService.colors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(title, style: themeService.textStyles.sectionTitle),
              const SizedBox(height: AppSpacing.xs),
              Text(
                description,
                style: TextStyle(
                  color: themeService.colors.muted,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
