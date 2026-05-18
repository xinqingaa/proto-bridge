// ignore_for_file: prefer_interpolation_to_compose_strings

import 'package:flutter/material.dart';

import '../../../common/widgets/section_panel.dart';
import '../../../preferences/app_preferences_cubit.dart';
import '../../../theme/app_tokens.dart';
import '../../../theme/theme_service.dart';
import 'account_proto_models.dart';

class ProtoSummaryCard extends StatelessWidget {
  const ProtoSummaryCard({required this.summary, super.key});

  final ProtoHoldingSummary summary;

  @override
  Widget build(BuildContext context) {
    return SectionPanel(
      child: Row(
        children: [
          Expanded(
            child: _Metric(
              label: context.t('asset.holdings.marketValue'),
              value: summary.marketValue,
            ),
          ),
          Expanded(
            child: _Metric(
              label: context.t('asset.todayPnl'),
              value: summary.dayPnl,
              caption: summary.dayPnlRate,
              positive: true,
            ),
          ),
          Expanded(
            child: _Metric(
              label: context.t('asset.holdings.risk'),
              value: context.t('risk.balanced'),
            ),
          ),
        ],
      ),
    );
  }
}

class ProtoFilterOption {
  const ProtoFilterOption({required this.value, required this.labelKey});

  final String value;
  final String labelKey;
}

class ProtoFilterBar extends StatelessWidget {
  const ProtoFilterBar({
    required this.options,
    required this.selected,
    required this.onSelected,
    super.key,
  });

  final List<ProtoFilterOption> options;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: options.map((option) {
          final active = option.value == selected;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: ChoiceChip(
              selected: active,
              showCheckmark: false,
              visualDensity: VisualDensity.compact,
              labelStyle: TextStyle(
                color: active ? colors.accent : colors.muted,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
              label: Text(context.t(option.labelKey)),
              onSelected: (_) => onSelected(option.value),
              selectedColor: colors.accentSoft,
              backgroundColor: colors.surface,
              shape: RoundedRectangleBorder(
                side: BorderSide(color: active ? colors.accent : colors.border),
                borderRadius: BorderRadius.circular(AppRadii.chip),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class ProtoHoldingTile extends StatelessWidget {
  const ProtoHoldingTile({required this.holding, super.key});

  final ProtoHolding holding;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    final pnlColor = holding.isPositive ? colors.positive : colors.negative;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            flex: 12,
            child: _TextStack(title: holding.symbol, subtitle: holding.name),
          ),
          Expanded(
            flex: 10,
            child: _TextStack(
              title: holding.amount,
              subtitle:
                  holding.shares + ' ' + context.t('asset.holdings.shares'),
            ),
          ),
          Expanded(
            flex: 8,
            child: _TextStack(
              title: holding.pnl,
              subtitle: holding.pnlRate,
              alignEnd: true,
              color: pnlColor,
            ),
          ),
        ],
      ),
    );
  }
}

class ProtoMetricCard extends StatelessWidget {
  const ProtoMetricCard({required this.metric, super.key});

  final ProtoPnlMetric metric;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    final color = switch (metric.tone) {
      ProtoMetricTone.positive => colors.positive,
      ProtoMetricTone.negative => colors.negative,
      ProtoMetricTone.neutral => colors.text,
    };
    return SectionPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _metricLabel(context, metric.label),
            style: TextStyle(color: colors.muted, fontSize: 12),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            metric.value,
            style: context.pbTextStyles.metric.copyWith(color: color),
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            metric.delta,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class ProtoRecordTile extends StatelessWidget {
  const ProtoRecordTile({required this.record, required this.onTap, super.key});

  final ProtoPnlRecord record;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    final amountColor = record.isPositive ? colors.positive : colors.negative;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          children: [
            Expanded(
              child: _TextStack(
                title: record.symbol,
                subtitle:
                    _recordAction(context, record.action) + ' · ' + record.time,
              ),
            ),
            _TextStack(
              title: record.amount,
              subtitle: _riskLabel(context, record.risk),
              alignEnd: true,
              color: amountColor,
            ),
          ],
        ),
      ),
    );
  }
}

class ProtoTrendChart extends StatelessWidget {
  const ProtoTrendChart({required this.points, super.key});

  final List<double> points;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Container(
      height: 132,
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: colors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: CustomPaint(
        painter: _TrendChartPainter(points, colors),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class ProtoBreakdownTile extends StatelessWidget {
  const ProtoBreakdownTile({required this.item, super.key});

  final ProtoBreakdownItem item;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    final color = switch (item.tone) {
      ProtoMetricTone.positive => colors.positive,
      ProtoMetricTone.negative => colors.negative,
      ProtoMetricTone.neutral => colors.text,
    };
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: colors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              item.label,
              style: TextStyle(color: colors.muted, fontSize: 12),
            ),
          ),
          Text(
            item.value,
            style: context.pbTextStyles.bodyStrong.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}

class ProtoExposureTile extends StatelessWidget {
  const ProtoExposureTile({required this.item, super.key});

  final ProtoExposureItem item;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: colors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              _exposureLabel(context, item.label),
              style: TextStyle(color: colors.muted, fontSize: 12),
            ),
          ),
          Text(item.value, style: context.pbTextStyles.bodyStrong),
        ],
      ),
    );
  }
}

class ProtoRiskMeter extends StatelessWidget {
  const ProtoRiskMeter({required this.value, super.key});

  final double value;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        value: value,
        minHeight: 9,
        backgroundColor: colors.surfaceSoft,
        valueColor: AlwaysStoppedAnimation<Color>(colors.accent),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    this.caption,
    this.positive = false,
  });

  final String label;
  final String value;
  final String? caption;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    final color = positive ? colors.positive : colors.text;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: colors.muted, fontSize: 12)),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            value,
            style: context.pbTextStyles.bodyStrong.copyWith(color: color),
            overflow: TextOverflow.ellipsis,
          ),
          if (caption != null)
            Text(caption!,
                style: TextStyle(color: colors.positive, fontSize: 12)),
        ],
      ),
    );
  }
}

class _TextStack extends StatelessWidget {
  const _TextStack({
    required this.title,
    required this.subtitle,
    this.alignEnd = false,
    this.color,
  });

  final String title;
  final String subtitle;
  final bool alignEnd;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colors = context.pbColors;
    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: context.pbTextStyles.bodyStrong.copyWith(color: color),
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          subtitle,
          style: TextStyle(color: color ?? colors.muted, fontSize: 12),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

class _TrendChartPainter extends CustomPainter {
  const _TrendChartPainter(this.points, this.colors);

  final List<double> points;
  final AppPalette colors;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [colors.accent, colors.primary],
      ).createShader(Offset.zero & size);
    const gap = 8.0;
    final width = (size.width - gap * (points.length - 1)) / points.length;
    for (var i = 0; i < points.length; i++) {
      final height = size.height * (points[i].clamp(0, 100) / 100);
      final left = i * (width + gap);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(left, size.height - height, width, height),
        const Radius.circular(6),
      );
      canvas.drawRRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _TrendChartPainter oldDelegate) {
    return oldDelegate.points != points || oldDelegate.colors != colors;
  }
}

String _metricLabel(BuildContext context, String label) {
  return switch (label) {
    '总收益' => context.t('pnl.metric.total'),
    '已实现' => context.t('pnl.metric.realized'),
    '未实现' => context.t('pnl.metric.unrealized'),
    '风险预算' => context.t('pnl.metric.riskBudget'),
    _ => label,
  };
}

String _recordAction(BuildContext context, String action) {
  return switch (action) {
    '止盈' => context.t('record.takeProfit'),
    '备兑开仓' => context.t('record.coveredCall'),
    '止损' => context.t('record.stopLoss'),
    '加仓' => context.t('record.addPosition'),
    _ => action,
  };
}

String _riskLabel(BuildContext context, String risk) {
  return switch (risk) {
    'Low' => context.t('risk.low'),
    'Medium' => context.t('risk.medium'),
    'High' => context.t('risk.high'),
    _ => risk,
  };
}

String _exposureLabel(BuildContext context, String label) {
  return switch (label) {
    '半导体' => context.t('sector.semiconductor'),
    '消费电子' => context.t('sector.consumer'),
    '新能源车' => context.t('sector.ev'),
    _ => label,
  };
}
