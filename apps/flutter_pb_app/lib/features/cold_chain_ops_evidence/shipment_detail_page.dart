import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.shipment-detail`
class ShipmentDetailEvidencePage extends StatefulWidget {
  const ShipmentDetailEvidencePage({
    super.key,
    this.exceptionId = 'ex-017',
    this.shipmentId = 'SH-2048',
    this.variant = 'default',
  });

  final String exceptionId;
  final String shipmentId;
  final String variant;

  static ShipmentDetailEvidencePage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const <String, String>{};
    return ShipmentDetailEvidencePage(
      exceptionId: map['exceptionId']?.toString() ?? 'ex-017',
      shipmentId: map['shipmentId']?.toString() ?? 'SH-2048',
      variant: map['variant']?.toString() ?? 'default',
    );
  }

  @override
  State<ShipmentDetailEvidencePage> createState() =>
      _ShipmentDetailEvidencePageState();
}

class _ShipmentDetailEvidencePageState
    extends State<ShipmentDetailEvidencePage> {
  late String _variant;

  @override
  void initState() {
    super.initState();
    _variant = widget.variant;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_variant == 'action-sheet-open') {
        _openActionSheet(recordOpened: false);
      } else if (_variant == 'acknowledge-dialog-open') {
        _openAcknowledgeDialog(recordOpened: false);
      }
    });
  }

  ShipmentDetail get _data => kShipmentSh2048;

  bool get _showAlert =>
      _variant == 'active-excursion' ||
      _variant == 'action-sheet-open' ||
      _variant == 'acknowledge-dialog-open';

  bool get _showSensorError => _variant == 'sensor-offline';

  String get _currentTemp => _showAlert ? '10.8°C' : _data.currentTemp;

  Future<void> _openActionSheet({bool recordOpened = true}) async {
    if (recordOpened) setState(() => _variant = 'action-sheet-open');
    final action = await AppPop.sheet<String>(
      title: '选择处置方式',
      builder: (context, handle) {
        TS.of(context);
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
                variant: CommonButtonVariant.flat,
                tone: CommonButtonTone.action,
                block: true,
                onPressed: () => handle.complete('resolution'),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: '仅确认接手',
                variant: CommonButtonVariant.outlined,
                tone: CommonButtonTone.action,
                block: true,
                onPressed: () => handle.complete('acknowledge'),
              ),
              SizedBox(height: TS.spacing.smPlus),
              Text(
                '确认接手不会关闭异常，提交处置记录后才会进入持续监控。',
                style: TS.textStyle.caption.copyWith(
                  color: TS.colors.onSurfaceMuted,
                ),
              ),
            ],
          ),
        );
      },
    );
    if (!mounted) return;
    if (action == 'resolution') {
      _openResolution();
    } else if (action == 'acknowledge') {
      await _openAcknowledgeDialog();
    } else {
      setState(() => _variant = 'active-excursion');
    }
  }

  Future<void> _openAcknowledgeDialog({bool recordOpened = true}) async {
    if (recordOpened) {
      setState(() => _variant = 'acknowledge-dialog-open');
    }
    final ok = await AppPop.confirm(
      title: '确认接手异常？',
      content: '接手后调度中心会将你标记为当前负责人。',
      confirmText: '确认接手',
      cancelText: '取消',
    );
    if (!mounted) return;
    setState(() => _variant = 'active-excursion');
    if (ok) {
      AppPop.toast('已确认接手');
    }
  }

  void _openResolution() {
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainResolutionForm,
      arguments: <String, String>{
        'exceptionId': widget.exceptionId,
        'shipmentId': widget.shipmentId,
        'variant': 'ready-to-submit',
      },
    );
    setState(() => _variant = 'active-excursion');
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final data = _data;
    final sections = <Widget>[
      if (_showAlert) ...[
        _AlertBanner(
          title: data.alertTitle,
          description: data.alertDescription,
        ),
        SizedBox(height: TS.spacing.md),
      ],
      if (_showSensorError) ...[
        _SensorErrorBanner(
          title: data.sensorOfflineTitle,
          description: data.sensorOfflineDescription,
        ),
        SizedBox(height: TS.spacing.md),
      ],
      _OverviewCard(data: data),
      SizedBox(height: TS.spacing.md),
      _TemperatureCard(data: data, currentTemp: _currentTemp),
      SizedBox(height: TS.spacing.md),
      _TimelineCard(events: data.events),
      SizedBox(height: TS.spacing.md),
      CommonButton(
        label: '开始处置',
        variant: CommonButtonVariant.flat,
        tone: CommonButtonTone.action,
        size: CommonControlSize.md,
        block: true,
        onPressed: () => _openActionSheet(),
      ),
      SizedBox(height: TS.spacing.lg),
    ];

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '运输详情', showBack: true),
      body: CommonScrollableDataList(
        padding: EdgeInsets.all(TS.spacing.md),
        itemCount: sections.length,
        itemBuilder: (context, index) => sections[index],
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
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
                  title,
                  style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  description,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
          const CommonBadge(label: '严重', tone: CommonBadgeTone.error),
        ],
      ),
    );
  }
}

class _SensorErrorBanner extends StatelessWidget {
  const _SensorErrorBanner({required this.title, required this.description});

  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.warningSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.sensors_off, color: TS.colors.warning),
          SizedBox(width: TS.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TS.textStyle.subtitle.copyWith(
                    color: TS.colors.warning,
                  ),
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  description,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({required this.data});

  final ShipmentDetail data;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      elevated: false,
      child: Column(
        children: [
          _CardHeading(
            title: '运输概览',
            subtitle: '${data.shipmentId} · ${data.eta}',
          ),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Icon(
                Icons.ac_unit,
                size: TS.sizing.iconMd,
                color: TS.colors.primary,
              ),
              SizedBox(width: TS.spacing.xs),
              Expanded(child: Text(data.origin, style: TS.textStyle.content)),
              Expanded(
                child: Container(
                  height: 2,
                  margin: EdgeInsets.symmetric(horizontal: TS.spacing.xs),
                  color: TS.colors.primary,
                ),
              ),
              Icon(
                Icons.location_on_outlined,
                size: TS.sizing.iconMd,
                color: TS.colors.onSurface,
              ),
              SizedBox(width: TS.spacing.xs),
              Expanded(
                child: Text(data.destination, style: TS.textStyle.content),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(
                child: _Kv(label: '货物', value: data.cargo),
              ),
              Expanded(
                child: _Kv(label: '车辆', value: data.vehicle),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Expanded(
                child: _Kv(label: '设备', value: data.device),
              ),
              Expanded(
                child: _Kv(label: '温区', value: data.tempZone),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Kv extends StatelessWidget {
  const _Kv({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TS.textStyle.caption.copyWith(color: TS.colors.onSurfaceMuted),
        ),
        SizedBox(height: TS.spacing.xxs),
        Text(value, style: TS.textStyle.content),
      ],
    );
  }
}

class _TemperatureCard extends StatelessWidget {
  const _TemperatureCard({required this.data, required this.currentTemp});

  final ShipmentDetail data;
  final String currentTemp;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      elevated: false,
      child: Column(
        children: [
          _CardHeading(title: '箱温趋势', subtitle: data.chartSubtitle),
          SizedBox(height: TS.spacing.md),
          SizedBox(
            height: 180,
            width: double.infinity,
            child: _TempChart(samples: data.samples, limit: 8),
          ),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(
                child: _Metric(label: '当前', value: currentTemp),
              ),
              Expanded(
                child: _Metric(label: '最高', value: data.maxTemp),
              ),
              Expanded(
                child: _Metric(label: '超温', value: data.overTempDuration),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      children: [
        Text(
          label,
          style: TS.textStyle.caption.copyWith(color: TS.colors.onSurfaceMuted),
        ),
        SizedBox(height: TS.spacing.xxs),
        Text(value, style: TS.textStyle.subtitle),
      ],
    );
  }
}

class _TempChart extends StatelessWidget {
  const _TempChart({required this.samples, required this.limit});

  final List<TempSample> samples;
  final double limit;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.fromLTRB(
        TS.spacing.sm,
        TS.spacing.sm,
        TS.spacing.sm,
        TS.spacing.xs,
      ),
      decoration: BoxDecoration(
        color: TS.colors.surfaceVariant,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: CustomPaint(
        painter: _TempChartPainter(
          samples: samples,
          limit: limit,
          barOk: TS.colors.primary,
          barHot: TS.colors.error,
          axis: TS.colors.onSurfaceMuted,
          limitColor: TS.colors.error,
          labelStyle: TS.textStyle.caption.copyWith(
            color: TS.colors.onSurfaceMuted,
          ),
        ),
      ),
    );
  }
}

class _TempChartPainter extends CustomPainter {
  _TempChartPainter({
    required this.samples,
    required this.limit,
    required this.barOk,
    required this.barHot,
    required this.axis,
    required this.limitColor,
    required this.labelStyle,
  });

  final List<TempSample> samples;
  final double limit;
  final Color barOk;
  final Color barHot;
  final Color axis;
  final Color limitColor;
  final TextStyle labelStyle;

  @override
  void paint(Canvas canvas, Size size) {
    const minY = 4.0;
    const maxY = 12.0;
    final chart = Rect.fromLTWH(28, 8, size.width - 48, size.height - 36);
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (final tick in [4.0, 8.0, 12.0]) {
      final y = chart.bottom - ((tick - minY) / (maxY - minY)) * chart.height;
      textPainter.text = TextSpan(text: '${tick.toInt()}°', style: labelStyle);
      textPainter.layout();
      textPainter.paint(canvas, Offset(0, y - textPainter.height / 2));
    }

    final limitY =
        chart.bottom - ((limit - minY) / (maxY - minY)) * chart.height;
    final limitPaint = Paint()
      ..color = limitColor
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;
    const dash = 4.0;
    var x = chart.left;
    while (x < chart.right) {
      canvas.drawLine(
        Offset(x, limitY),
        Offset(math.min(x + dash, chart.right), limitY),
        limitPaint,
      );
      x += dash * 2;
    }
    textPainter.text = TextSpan(
      text: '8°C 上限',
      style: labelStyle.copyWith(color: limitColor),
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset(chart.right - textPainter.width, limitY - 14),
    );

    if (samples.isEmpty) return;
    final gap = chart.width / samples.length;
    final barWidth = gap * 0.55;
    for (var i = 0; i < samples.length; i++) {
      final sample = samples[i];
      final h =
          ((sample.value - minY) / (maxY - minY)).clamp(0.0, 1.0) *
          chart.height;
      final left = chart.left + gap * i + (gap - barWidth) / 2;
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(left, chart.bottom - h, barWidth, h),
        const Radius.circular(4),
      );
      final paint = Paint()
        ..color = sample.value > limit ? barHot : barOk
        ..style = PaintingStyle.fill;
      canvas.drawRRect(rect, paint);

      textPainter.text = TextSpan(text: sample.label, style: labelStyle);
      textPainter.layout(minWidth: 0, maxWidth: gap);
      canvas.save();
      canvas.translate(left + barWidth / 2, chart.bottom + 4);
      canvas.rotate(-0.6);
      textPainter.paint(canvas, Offset(-textPainter.width / 2, 0));
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _TempChartPainter oldDelegate) =>
      oldDelegate.samples != samples || oldDelegate.limit != limit;
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.events});

  final List<TimelineEvent> events;

  Color _dot(TimelineTone tone) {
    switch (tone) {
      case TimelineTone.success:
        return TS.colors.success;
      case TimelineTone.info:
        return TS.colors.primary;
      case TimelineTone.warning:
        return TS.colors.warning;
      case TimelineTone.error:
        return TS.colors.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      elevated: false,
      child: Column(
        children: [
          const _CardHeading(title: '运输事件', subtitle: '自动记录与人工操作合并展示'),
          SizedBox(height: TS.spacing.md),
          for (var i = 0; i < events.length; i++) ...[
            if (i > 0) Divider(height: TS.spacing.md, color: TS.colors.border),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  margin: EdgeInsets.only(top: 6),
                  decoration: BoxDecoration(
                    color: _dot(events[i].tone),
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: TS.spacing.sm),
                SizedBox(
                  width: 44,
                  child: Text(
                    events[i].time,
                    style: TS.textStyle.caption.copyWith(
                      color: TS.colors.onSurfaceMuted,
                    ),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(events[i].title, style: TS.textStyle.content),
                      SizedBox(height: TS.spacing.xxs),
                      Text(
                        events[i].detail,
                        style: TS.textStyle.caption.copyWith(
                          color: TS.colors.onSurfaceMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _CardHeading extends StatelessWidget {
  const _CardHeading({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TS.textStyle.subtitle),
          SizedBox(height: TS.spacing.xxs),
          Text(subtitle, style: TS.textStyle.caption),
        ],
      ),
    );
  }
}
