import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'fixtures.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.shipment-detail`
class ShipmentDetailPage extends StatefulWidget {
  const ShipmentDetailPage({
    super.key,
    this.variant = ShipmentVariant.activeExcursion,
    this.shipmentId = 'SH-2048',
  });

  final ShipmentVariant variant;
  final String shipmentId;

  static ShipmentDetailPage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const {};
    return ShipmentDetailPage(
      variant: parseShipmentVariant(map['variant']),
      shipmentId: map['shipmentId']?.toString() ?? 'SH-2048',
    );
  }

  @override
  State<ShipmentDetailPage> createState() => _ShipmentDetailPageState();
}

class _ShipmentDetailPageState extends State<ShipmentDetailPage> {
  late ShipmentVariant _variant;

  @override
  void initState() {
    super.initState();
    _variant = widget.variant;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_variant == ShipmentVariant.actionSheetOpen) {
        _openActions();
      } else if (_variant == ShipmentVariant.acknowledgeDialogOpen) {
        _acknowledgeOnly();
      }
    });
  }

  ShipmentDetail get _data {
    return switch (_variant) {
      ShipmentVariant.sensorOffline => kSensorOfflineShipment,
      ShipmentVariant.defaultShipment => kDefaultShipment,
      _ => kPrimaryShipment,
    };
  }

  Future<void> _refresh() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
  }

  Future<void> _openActions() async {
    final choice = await AppPop.sheet<String>(
      title: '选择处置方式',
      builder: (context, handle) {
        TS.of(context);
        return Padding(
          padding: EdgeInsets.fromLTRB(
            TS.spacing.md,
            0,
            TS.spacing.md,
            TS.spacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CommonButton(
                label: '填写处置记录',
                block: true,
                tone: CommonButtonTone.action,
                onPressed: () => handle.complete('resolution'),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: '仅确认接手',
                block: true,
                variant: CommonButtonVariant.outlined,
                tone: CommonButtonTone.secondary,
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
    if (choice == 'resolution') {
      await _openResolution(ready: true);
    } else if (choice == 'acknowledge') {
      await _acknowledgeOnly();
    }
  }

  Future<void> _acknowledgeOnly() async {
    final ok = await AppPop.confirm(
      title: '确认接手该异常？',
      content: '接手后异常仍保持打开，需要继续填写处置记录。',
      confirmText: '确认接手',
      cancelText: '取消',
    );
    if (!mounted || !ok) return;
    AppPop.success('已确认接手');
  }

  Future<void> _openResolution({required bool ready}) async {
    await Navigator.of(context).pushNamed(
      AppRoutes.coldChainOpsResolutionForm,
      arguments: {
        'variant': ready ? 'ready-to-submit' : 'default',
        'shipmentId': _data.shipmentId,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final data = _data;
    // scroll-list children: summary, temperature-section, timeline-card, open-actions
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '运输详情', showBack: true),
      body: CommonScrollableDataList(
        padding: EdgeInsets.fromLTRB(
          TS.spacing.md,
          TS.spacing.md,
          TS.spacing.md,
          TS.spacing.lg,
        ),
        onRefresh: _refresh,
        onLoadMore: () async {},
        hasMore: false,
        itemCount: 4,
        separatorBuilder: (_, _) => SizedBox(height: TS.spacing.md),
        itemBuilder: (context, index) {
          switch (index) {
            case 0:
              return _SummaryBlock(data: data);
            case 1:
              return _TemperatureSection(data: data);
            case 2:
              return _TimelineCard(events: data.events);
            default:
              return CommonButton(
                label: '开始处置',
                block: true,
                tone: CommonButtonTone.action,
                onPressed: _openActions,
              );
          }
        },
      ),
    );
  }
}

class _SummaryBlock extends StatelessWidget {
  const _SummaryBlock({required this.data});

  final ShipmentDetail data;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      children: [
        if (data.sensorOffline)
          _AlertBanner(
            icon: Icons.signal_wifi_off_outlined,
            title: data.sensorOfflineTitle!,
            detail: data.sensorOfflineDetail!,
            soft: TS.colors.warningSoft,
            strong: TS.colors.warning,
            badge: null,
          )
        else if (data.alertTitle != null)
          _AlertBanner(
            icon: Icons.warning_amber_rounded,
            title: data.alertTitle!,
            detail: data.alertDetail!,
            soft: TS.colors.errorSoft,
            strong: TS.colors.error,
            badge: data.alertSeverity?.label,
          ),
        if (data.alertTitle != null || data.sensorOffline)
          SizedBox(height: TS.spacing.md),
        CommonCard(
          title: '运输概览',
          subtitle: '${data.shipmentId} · 预计 ${data.eta} 到达',
          child: Column(
            children: [
              _RouteRow(origin: data.origin, destination: data.destination),
              SizedBox(height: TS.spacing.smPlus),
              _Kv(label: '货物', value: data.cargo),
              _Kv(label: '车辆', value: '${data.vehicle} · ${data.driver}'),
              _Kv(label: '设备', value: '探头 ${data.probe} · ${data.sampleInterval}'),
              _Kv(label: '温区', value: data.zoneLabel),
            ],
          ),
        ),
      ],
    );
  }
}

extension on ExceptionSeverity {
  String get label => switch (this) {
        ExceptionSeverity.critical => '严重',
        ExceptionSeverity.warning => '警告',
        ExceptionSeverity.watch => '关注',
      };
}

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({
    required this.icon,
    required this.title,
    required this.detail,
    required this.soft,
    required this.strong,
    required this.badge,
  });

  final IconData icon;
  final String title;
  final String detail;
  final Color soft;
  final Color strong;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: soft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: strong, size: TS.sizing.iconMd),
          SizedBox(width: TS.spacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: TS.textStyle.subtitle.copyWith(color: strong),
                      ),
                    ),
                    if (badge != null)
                      CommonBadge(
                        label: badge!,
                        semanticTone: CommonBadgeTone.error,
                      ),
                  ],
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  detail,
                  style: TS.textStyle.caption.copyWith(color: strong),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RouteRow extends StatelessWidget {
  const _RouteRow({required this.origin, required this.destination});

  final String origin;
  final String destination;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(origin, style: TS.textStyle.content),
        ),
        Icon(Icons.arrow_forward,
            size: TS.sizing.iconSm, color: TS.colors.onSurfaceMuted),
        SizedBox(width: TS.spacing.xs),
        Expanded(
          child: Text(
            destination,
            style: TS.textStyle.content,
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}

class _Kv extends StatelessWidget {
  const _Kv({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: TS.spacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 48,
            child: Text(
              label,
              style: TS.textStyle.caption.copyWith(
                color: TS.colors.onSurfaceMuted,
              ),
            ),
          ),
          Expanded(child: Text(value, style: TS.textStyle.content)),
        ],
      ),
    );
  }
}

class _TemperatureSection extends StatelessWidget {
  const _TemperatureSection({required this.data});

  final ShipmentDetail data;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      title: '箱温趋势',
      subtitle: data.chartWindowLabel,
      child: Column(
        children: [
          SizedBox(
            height: 160,
            width: double.infinity,
            child: CustomPaint(
              painter: _TempChartPainter(
                samples: data.samples,
                limitC: data.limitC,
                inRange: TS.colors.primary,
                over: TS.colors.error,
                grid: TS.colors.border,
                muted: TS.colors.onSurfaceMuted,
                labelStyle: TS.textStyle.caption,
              ),
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          Row(
            children: [
              Expanded(
                child: _TempMetric(
                  label: '当前',
                  value: '${data.currentC.toStringAsFixed(1)}°C',
                ),
              ),
              Expanded(
                child: _TempMetric(
                  label: '最高',
                  value: '${data.maxC.toStringAsFixed(1)}°C',
                ),
              ),
              Expanded(
                child: _TempMetric(
                  label: '超温',
                  value: data.overTempMinutes == 0
                      ? '—'
                      : '${data.overTempMinutes}m',
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

class _TempChartPainter extends CustomPainter {
  _TempChartPainter({
    required this.samples,
    required this.limitC,
    required this.inRange,
    required this.over,
    required this.grid,
    required this.muted,
    required this.labelStyle,
  });

  final List<TempSample> samples;
  final double limitC;
  final Color inRange;
  final Color over;
  final Color grid;
  final Color muted;
  final TextStyle labelStyle;

  @override
  void paint(Canvas canvas, Size size) {
    if (samples.isEmpty) return;
    const topPad = 12.0;
    const bottomPad = 22.0;
    const leftPad = 28.0;
    const rightPad = 8.0;
    final chart = Rect.fromLTRB(
      leftPad,
      topPad,
      size.width - rightPad,
      size.height - bottomPad,
    );
    const minY = 4.0;
    const maxY = 12.0;

    double yFor(double v) {
      final t = ((v - minY) / (maxY - minY)).clamp(0.0, 1.0);
      return chart.bottom - t * chart.height;
    }

    final axis = Paint()
      ..color = grid
      ..strokeWidth = 1;
    final axisLabelStyle = labelStyle.copyWith(color: muted);
    for (final mark in [4.0, 8.0, 12.0]) {
      final y = yFor(mark);
      canvas.drawLine(Offset(chart.left, y), Offset(chart.right, y), axis);
      final tp = TextPainter(
        text: TextSpan(
          text: '${mark.toStringAsFixed(0)}°',
          style: axisLabelStyle,
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(0, y - tp.height / 2));
    }

    final limitY = yFor(limitC);
    final limitPaint = Paint()
      ..color = over
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;
    const dash = 4.0;
    var x = chart.left;
    while (x < chart.right) {
      canvas.drawLine(
        Offset(x, limitY),
        Offset((x + dash).clamp(chart.left, chart.right), limitY),
        limitPaint,
      );
      x += dash * 2;
    }

    final barW = chart.width / (samples.length * 1.6);
    final gap = barW * 0.6;
    for (var i = 0; i < samples.length; i++) {
      final sample = samples[i];
      final left = chart.left + i * (barW + gap) + gap;
      final top = yFor(sample.valueC);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTRB(left, top, left + barW, chart.bottom),
        const Radius.circular(3),
      );
      final paint = Paint()
        ..color = sample.valueC > limitC ? over : inRange;
      canvas.drawRRect(rect, paint);
      if (i == 0 || i == samples.length - 1 || i % 2 == 0) {
        final tp = TextPainter(
          text: TextSpan(
            text: sample.label,
            style: axisLabelStyle,
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(
          canvas,
          Offset(left + barW / 2 - tp.width / 2, chart.bottom + 4),
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _TempChartPainter oldDelegate) =>
      oldDelegate.samples != samples ||
      oldDelegate.limitC != limitC ||
      oldDelegate.labelStyle != labelStyle;
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.events});

  final List<TimelineEvent> events;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      title: '运输事件',
      subtitle: '自动记录与人工操作合并展示',
      child: Column(
        children: [
          for (var i = 0; i < events.length; i++) ...[
            if (i > 0) SizedBox(height: TS.spacing.smPlus),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 44,
                  child: Text(
                    events[i].time,
                    style: TS.textStyle.caption.copyWith(
                      color: TS.colors.onSurfaceMuted,
                    ),
                  ),
                ),
                Container(
                  width: 8,
                  height: 8,
                  margin: EdgeInsets.only(top: TS.spacing.xs),
                  decoration: BoxDecoration(
                    color: TS.colors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: TS.spacing.sm),
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
