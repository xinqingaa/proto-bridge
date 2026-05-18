import 'package:flutter/material.dart';

import 'routes/app_routes.dart';
import 'theme/app_tokens.dart';

class ExampleHomePage extends StatefulWidget {
  const ExampleHomePage({super.key});

  @override
  State<ExampleHomePage> createState() => _ExampleHomePageState();
}

class _ExampleHomePageState extends State<ExampleHomePage> {
  var _dark = false;
  var _english = false;

  AppPalette get _colors => _dark ? AppPalette.dark() : AppPalette.light();
  _HomeCopy get _copy => _english ? _HomeCopy.en : _HomeCopy.zh;

  @override
  Widget build(BuildContext context) {
    final colors = _colors;
    final copy = _copy;
    const textStyles = AppTextStyles();

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            Row(
              children: [
                _HomeSwitch(
                  label: _dark ? copy.dark : copy.light,
                  value: _dark,
                  colors: colors,
                  onChanged: (value) => setState(() => _dark = value),
                ),
                const SizedBox(width: AppSpacing.xs),
                _HomeSwitch(
                  label: _english ? 'EN' : '中文',
                  value: _english,
                  colors: colors,
                  onChanged: (value) => setState(() => _english = value),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              copy.brand,
              style: textStyles.caption.copyWith(
                color: colors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              copy.title,
              style: textStyles.title.copyWith(color: colors.text),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              copy.description,
              style: TextStyle(color: colors.muted, height: 1.5),
            ),
            const SizedBox(height: AppSpacing.lg),
            _OverviewPanel(colors: colors, copy: copy),
            const SizedBox(height: AppSpacing.md),
            _EntryCard(
              colors: colors,
              title: copy.holdingTitle,
              description: copy.holdingDescription,
              actionLabel: copy.open,
              onTap: () => Navigator.of(context).pushNamed(Routes.holdingList),
            ),
            const SizedBox(height: AppSpacing.sm),
            _EntryCard(
              colors: colors,
              title: copy.pnlTitle,
              description: copy.pnlDescription,
              actionLabel: copy.open,
              onTap: () => Navigator.of(context).pushNamed(Routes.pnlAnalysis),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeCopy {
  const _HomeCopy({
    required this.brand,
    required this.title,
    required this.description,
    required this.assetValue,
    required this.todayPnl,
    required this.holdingTitle,
    required this.holdingDescription,
    required this.pnlTitle,
    required this.pnlDescription,
    required this.open,
    required this.light,
    required this.dark,
  });

  final String brand;
  final String title;
  final String description;
  final String assetValue;
  final String todayPnl;
  final String holdingTitle;
  final String holdingDescription;
  final String pnlTitle;
  final String pnlDescription;
  final String open;
  final String light;
  final String dark;

  static const zh = _HomeCopy(
    brand: '资产中心',
    title: '资产总览',
    description: '查看长期组合的市值、收益和风险分布，进入持仓与盈亏页面处理日常资产管理。',
    assetValue: '资产总览',
    todayPnl: '今日收益',
    holdingTitle: '持仓列表',
    holdingDescription: '查看组合明细、行业筛选、单日收益和再平衡入口。',
    pnlTitle: '盈亏分析',
    pnlDescription: '拆解收益趋势、已实现交易、风险预算和交易记录。',
    open: '进入',
    light: '亮色',
    dark: '暗色',
  );

  static const en = _HomeCopy(
    brand: 'Asset Center',
    title: 'Asset Overview',
    description:
        'Track portfolio value, daily return, and risk distribution before opening holdings or P&L analysis.',
    assetValue: 'Asset Overview',
    todayPnl: 'Today P&L',
    holdingTitle: 'Portfolio Holdings',
    holdingDescription:
        'Review positions, sector filters, daily return, and rebalance entry.',
    pnlTitle: 'P&L Analysis',
    pnlDescription:
        'Break down trends, realized trades, risk budget, and trade records.',
    open: 'Open',
    light: 'Light',
    dark: 'Dark',
  );
}

class _HomeSwitch extends StatelessWidget {
  const _HomeSwitch({
    required this.label,
    required this.value,
    required this.colors,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final AppPalette colors;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
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
              Text('还没有生成 _proto 页面',
                  style: const AppTextStyles().sectionTitle),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '请先在仓库根目录运行 pnpm run example，然后重新启动 pnpm run example:dev 或 pnpm run example:android。',
                style: TextStyle(color: AppPalette.light().muted, height: 1.5),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('返回'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OverviewPanel extends StatelessWidget {
  const _OverviewPanel({required this.colors, required this.copy});

  final AppPalette colors;
  final _HomeCopy copy;

  @override
  Widget build(BuildContext context) {
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
                colors: colors,
                label: copy.assetValue,
                value: r'$128,420',
              ),
            ),
            Expanded(
              child: _Metric(
                colors: colors,
                label: copy.todayPnl,
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
    required this.colors,
    required this.label,
    required this.value,
    this.accent = false,
  });

  final AppPalette colors;
  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: colors.muted, fontSize: 12)),
        const SizedBox(height: AppSpacing.xs),
        Text(
          value,
          style: const AppTextStyles().metric.copyWith(
                color: accent ? colors.positive : colors.text,
              ),
        ),
      ],
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({
    required this.colors,
    required this.title,
    required this.description,
    required this.actionLabel,
    required this.onTap,
  });

  final AppPalette colors;
  final String title;
  final String description;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
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
                    child: Text(
                      title,
                      style: const AppTextStyles()
                          .sectionTitle
                          .copyWith(color: colors.text),
                    ),
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
