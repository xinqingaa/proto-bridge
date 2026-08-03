import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/app_bar.dart';
import '../../common/widgets/button.dart';
import '../../common/widgets/scrollable_data_list.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'cold_chain_v3_models.dart';

/// Shipment detail — Evidence screen `cold-chain-ops.shipment-detail`.
class ColdChainV3ShipmentDetailPage extends StatefulWidget {
  const ColdChainV3ShipmentDetailPage({
    super.key,
    this.variant = ColdChainV3ShipmentVariant.activeExcursion,
  });

  final ColdChainV3ShipmentVariant variant;

  factory ColdChainV3ShipmentDetailPage.fromRouteArgs(Object? args) {
    var variant = ColdChainV3ShipmentVariant.activeExcursion;
    if (args is Map && args['variant'] is String) {
      variant = ColdChainV3ShipmentVariant.values.firstWhere(
        (v) => v.name == args['variant'],
        orElse: () => ColdChainV3ShipmentVariant.activeExcursion,
      );
    }
    return ColdChainV3ShipmentDetailPage(variant: variant);
  }

  @override
  State<ColdChainV3ShipmentDetailPage> createState() =>
      _ColdChainV3ShipmentDetailPageState();
}

class _ColdChainV3ShipmentDetailPageState
    extends State<ColdChainV3ShipmentDetailPage> {
  late ColdChainV3Shipment _shipment;

  @override
  void initState() {
    super.initState();
    _shipment = ColdChainV3Fixtures.shipmentFor(widget.variant);
  }

  Future<void> _onRefresh() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
  }

  Future<void> _openActions() async {
    final choice = await AppPop.sheet<String>(
      title: '选择处置方式',
      builder: (context, handle) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            TS.spacing.md,
            TS.spacing.sm,
            TS.spacing.md,
            TS.spacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CommonButton(
                label: '填写处置记录',
                tone: CommonButtonTone.action,
                variant: CommonButtonVariant.flat,
                block: true,
                onPressed: () => handle.complete('resolution'),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: '仅确认接手',
                tone: CommonButtonTone.action,
                variant: CommonButtonVariant.outlined,
                block: true,
                onPressed: () => handle.complete('acknowledge'),
              ),
              SizedBox(height: TS.spacing.md),
              Text(
                '确认接手不会关闭异常，提交处置记录后才会进入持续监控。',
                style: TS.textStyle.caption,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      },
    );

    if (!mounted) return;
    if (choice == 'resolution') {
      Navigator.of(context).pushNamed(
        AppRoutes.coldChainV3ResolutionForm,
        arguments: {'variant': ColdChainV3FormVariant.readyToSubmit.name},
      );
    } else if (choice == 'acknowledge') {
      await AppPop.confirm(
        title: '确认接手异常？',
        content: '接手后调度中心会将你标记为当前负责人。',
        confirmText: '确认接手',
        cancelText: '取消',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final sections = <Widget>[
      if (_shipment.alertTitle != null) _AlertBanner(shipment: _shipment),
      if (_shipment.sensorOfflineTitle != null)
        _SensorOfflineBanner(shipment: _shipment),
      _OverviewCard(shipment: _shipment),
      _TemperatureCard(shipment: _shipment),
      _TimelineCard(shipment: _shipment),
    ];

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '运输详情',
        showBack: true,
        elevated: false,
      ),
      body: Column(
        children: [
          Expanded(
            child: CommonScrollableDataList(
              itemCount: sections.length,
              onRefresh: _onRefresh,
              padding: EdgeInsets.all(TS.spacing.md),
              separatorBuilder: (_, _) => SizedBox(height: TS.spacing.md),
              itemBuilder: (context, index) => sections[index],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                TS.spacing.md,
                TS.spacing.sm,
                TS.spacing.md,
                TS.spacing.md,
              ),
              child: CommonButton(
                label: '开始处置',
                tone: CommonButtonTone.action,
                variant: CommonButtonVariant.flat,
                block: true,
                onPressed: _openActions,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({required this.shipment});

  final ColdChainV3Shipment shipment;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, color: TS.colors.error),
          SizedBox(width: TS.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shipment.alertTitle!,
                  style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  shipment.alertDescription!,
                  style: TS.textStyle.caption,
                ),
              ],
            ),
          ),
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: TS.spacing.sm,
              vertical: TS.spacing.xxs,
            ),
            decoration: BoxDecoration(
              color: TS.colors.error,
              borderRadius: BorderRadius.circular(TS.radius.full),
            ),
            child: Text(
              '严重',
              style: TS.textStyle.captionStrong.copyWith(
                color: TS.colors.onError,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SensorOfflineBanner extends StatelessWidget {
  const _SensorOfflineBanner({required this.shipment});

  final ColdChainV3Shipment shipment;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            shipment.sensorOfflineTitle!,
            style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
          ),
          SizedBox(height: TS.spacing.xxs),
          Text(
            shipment.sensorOfflineDescription!,
            style: TS.textStyle.caption,
          ),
        ],
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({required this.shipment});

  final ColdChainV3Shipment shipment;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('运输概览', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xs),
          Text(
            '${shipment.id} · 预计 ${shipment.eta} 到达',
            style: TS.textStyle.caption,
          ),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Icon(Icons.ac_unit, size: TS.sizing.iconSm, color: TS.colors.primary),
              SizedBox(width: TS.spacing.xs),
              Expanded(
                child: Text(shipment.origin, style: TS.textStyle.label),
              ),
              Expanded(
                child: Container(
                  height: 2,
                  margin: EdgeInsets.symmetric(horizontal: TS.spacing.xs),
                  color: TS.colors.primary,
                ),
              ),
              Icon(Icons.place_outlined, size: TS.sizing.iconSm, color: TS.colors.primary),
              SizedBox(width: TS.spacing.xs),
              Expanded(
                child: Text(
                  shipment.destination,
                  style: TS.textStyle.label,
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(child: _InfoCell(label: '货物', value: shipment.cargo)),
              Expanded(
                child: _InfoCell(
                  label: '车辆',
                  value: '${shipment.vehicle} · ${shipment.driver}',
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Expanded(
                child: _InfoCell(
                  label: '设备',
                  value: '${shipment.probe} · ${shipment.probeInterval}',
                ),
              ),
              Expanded(
                child: _InfoCell(label: '温区', value: shipment.tempZone),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoCell extends StatelessWidget {
  const _InfoCell({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TS.textStyle.caption),
        SizedBox(height: TS.spacing.xxs),
        Text(value, style: TS.textStyle.content),
      ],
    );
  }
}

class _TemperatureCard extends StatelessWidget {
  const _TemperatureCard({required this.shipment});

  final ColdChainV3Shipment shipment;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('箱温趋势', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text('最近 70 分钟 · 上限 8°C', style: TS.textStyle.caption),
          SizedBox(height: TS.spacing.md),
          SizedBox(
            height: 154,
            width: double.infinity,
            child: CustomPaint(
              painter: _TemperatureChartPainter(
                samples: shipment.samples,
                threshold: 8,
                primary: TS.colors.primary,
                error: TS.colors.error,
                muted: TS.colors.onSurfaceMuted,
                labelStyle: TS.textStyle.caption,
              ),
            ),
          ),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(
                child: _TempMetric(
                  label: '当前',
                  value: '${shipment.currentTemp.toStringAsFixed(1)}°C',
                ),
              ),
              Expanded(
                child: _TempMetric(
                  label: '最高',
                  value: '${shipment.maxTemp.toStringAsFixed(1)}°C',
                ),
              ),
              Expanded(
                child: _TempMetric(
                  label: '超温',
                  value: '${shipment.overTempMinutes}m',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TempMetric extends StatelessWidget {
  const _TempMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TS.textStyle.caption),
        SizedBox(height: TS.spacing.xxs),
        Text(value, style: TS.textStyle.subtitle),
      ],
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.shipment});

  final ColdChainV3Shipment shipment;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.surface,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('运输事件', style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text('自动记录与人工操作合并展示', style: TS.textStyle.caption),
          SizedBox(height: TS.spacing.md),
          for (final event in shipment.timeline) ...[
            _TimelineRow(event: event),
            SizedBox(height: TS.spacing.sm),
          ],
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.event});

  final ColdChainV3TimelineEvent event;

  Color get _dot => switch (event.tone) {
        ColdChainV3EventTone.success => TS.colors.success,
        ColdChainV3EventTone.info => TS.colors.primary,
        ColdChainV3EventTone.warning => TS.colors.warning,
        ColdChainV3EventTone.critical => TS.colors.error,
      };

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 48,
          child: Text(event.time, style: TS.textStyle.caption),
        ),
        Container(
          width: 10,
          height: 10,
          margin: EdgeInsets.only(top: TS.spacing.xs),
          decoration: BoxDecoration(color: _dot, shape: BoxShape.circle),
        ),
        SizedBox(width: TS.spacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(event.title, style: TS.textStyle.label),
              SizedBox(height: TS.spacing.xxs),
              Text(event.detail, style: TS.textStyle.caption),
            ],
          ),
        ),
      ],
    );
  }
}

class _TemperatureChartPainter extends CustomPainter {
  _TemperatureChartPainter({
    required this.samples,
    required this.threshold,
    required this.primary,
    required this.error,
    required this.muted,
    required this.labelStyle,
  });

  final List<ColdChainV3TempSample> samples;
  final double threshold;
  final Color primary;
  final Color error;
  final Color muted;
  final TextStyle labelStyle;

  @override
  void paint(Canvas canvas, Size size) {
    const minY = 4.0;
    const maxY = 12.0;
    final chartTop = 16.0;
    final chartBottom = size.height - 28;
    final chartHeight = chartBottom - chartTop;
    final barSlot = size.width / samples.length;
    final barWidth = barSlot * 0.45;

    final gridPaint = Paint()
      ..color = muted.withValues(alpha: 0.35)
      ..strokeWidth = 1;
    for (final y in [4.0, 8.0, 12.0]) {
      final dy = chartBottom - ((y - minY) / (maxY - minY)) * chartHeight;
      canvas.drawLine(Offset(24, dy), Offset(size.width, dy), gridPaint);
      _paintText(canvas, '${y.toStringAsFixed(0)}°', Offset(0, dy - 8), muted);
    }

    final thresholdY =
        chartBottom - ((threshold - minY) / (maxY - minY)) * chartHeight;
    final dashPaint = Paint()
      ..color = error
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    _drawDashedLine(
      canvas,
      Offset(24, thresholdY),
      Offset(size.width, thresholdY),
      dashPaint,
    );
    _paintText(
      canvas,
      '8°C 上限',
      Offset(size.width - 52, thresholdY - 14),
      error,
    );

    for (var i = 0; i < samples.length; i++) {
      final sample = samples[i];
      final normalized =
          ((sample.value - minY) / (maxY - minY)).clamp(0.0, 1.0);
      final top = chartBottom - normalized * chartHeight;
      final left = 24 + i * barSlot + (barSlot - barWidth) / 2;
      final paint = Paint()
        ..color = sample.value > threshold ? error : primary;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTRB(left, top, left + barWidth, chartBottom),
          const Radius.circular(4),
        ),
        paint,
      );
      _paintText(
        canvas,
        sample.label,
        Offset(left + barWidth / 2 - 14, chartBottom + 6),
        muted,
      );
    }
  }

  void _drawDashedLine(Canvas canvas, Offset a, Offset b, Paint paint) {
    const dash = 6.0;
    const gap = 4.0;
    final total = (b.dx - a.dx).abs();
    var x = a.dx;
    while (x < b.dx) {
      final end = (x + dash).clamp(a.dx, b.dx);
      canvas.drawLine(Offset(x, a.dy), Offset(end, a.dy), paint);
      x += dash + gap;
    }
    // silence unused
    assert(total >= 0);
  }

  void _paintText(Canvas canvas, String text, Offset offset, Color color) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: labelStyle.copyWith(color: color),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant _TemperatureChartPainter oldDelegate) {
    return oldDelegate.samples != samples;
  }
}
