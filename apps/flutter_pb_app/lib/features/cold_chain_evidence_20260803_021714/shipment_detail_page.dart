import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'fixtures.dart';
import 'models.dart';

class EvidenceShipmentDetailPage extends StatefulWidget {
  const EvidenceShipmentDetailPage({
    super.key,
    this.initialVariant = EvidenceShipmentVariant.activeExcursion,
    this.showActionSheet = false,
    this.showAcknowledgeDialog = false,
  });

  factory EvidenceShipmentDetailPage.fromRouteArgs(Object? arguments) {
    final args = arguments is Map ? arguments : const <Object?, Object?>{};
    final variant = args['variant'];
    return EvidenceShipmentDetailPage(
      initialVariant: shipmentVariantFrom(variant),
      showActionSheet: variant == 'action-sheet-open',
      showAcknowledgeDialog: variant == 'acknowledge-dialog-open',
    );
  }

  final EvidenceShipmentVariant initialVariant;
  final bool showActionSheet;
  final bool showAcknowledgeDialog;

  @override
  State<EvidenceShipmentDetailPage> createState() =>
      _EvidenceShipmentDetailPageState();
}

class _EvidenceShipmentDetailPageState
    extends State<EvidenceShipmentDetailPage> {
  late final EvidenceShipmentVariant _variant = widget.initialVariant;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.showActionSheet) {
        _openActions();
      } else if (widget.showAcknowledgeDialog) {
        _confirmAcknowledge();
      }
    });
  }

  Future<void> _openActions() async {
    final result = await AppPop.sheet<String>(
      title: '选择处置方式',
      builder: (context, handle) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            TS.spacing.lg,
            TS.spacing.sm,
            TS.spacing.lg,
            TS.spacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CommonButton(
                label: '填写处置记录',
                block: true,
                size: CommonControlSize.lg,
                onPressed: () => handle.complete('resolution'),
              ),
              SizedBox(height: TS.spacing.smPlus),
              CommonButton(
                label: '仅确认接手',
                block: true,
                size: CommonControlSize.lg,
                variant: CommonButtonVariant.outlined,
                onPressed: () => handle.complete('acknowledge'),
              ),
              SizedBox(height: TS.spacing.smPlus),
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
    if (result == 'resolution') {
      Navigator.of(context).pushNamed(
        AppRoutes.evidence20260803ResolutionForm,
        arguments: const {'variant': 'ready-to-submit'},
      );
    } else if (result == 'acknowledge') {
      await _confirmAcknowledge();
    }
  }

  Future<void> _confirmAcknowledge() async {
    final confirmed = await AppPop.confirm(
      title: '确认接手异常？',
      content: '接手后调度中心会将你标记为当前负责人。',
      confirmText: '确认接手',
      cancelText: '取消',
    );
    if (confirmed && mounted) {
      AppPop.success('已接手异常');
    }
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      appBar: const CommonAppBar(title: '运输详情', showBack: true),
      body: CommonScrollableDataList(
        itemCount: 1,
        onRefresh: () async {
          await Future<void>.delayed(TS.motion.durationNormal);
          if (mounted) setState(() {});
        },
        itemBuilder: (context, index) => Padding(
          padding: EdgeInsets.all(TS.spacing.md),
          child: Column(
            children: [
              if (_variant == EvidenceShipmentVariant.activeExcursion) ...[
                const _ExcursionAlert(),
                SizedBox(height: TS.spacing.smPlus),
              ],
              if (_variant == EvidenceShipmentVariant.sensorOffline) ...[
                const _SensorOfflineAlert(),
                SizedBox(height: TS.spacing.smPlus),
              ],
              const _ShipmentSummary(),
              SizedBox(height: TS.spacing.smPlus),
              _TemperatureSection(
                active: _variant == EvidenceShipmentVariant.activeExcursion,
              ),
              SizedBox(height: TS.spacing.smPlus),
              const _TimelineCard(),
              SizedBox(height: TS.spacing.smPlus),
              CommonButton(label: '开始处置', block: true, onPressed: _openActions),
              SizedBox(height: TS.spacing.lg),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExcursionAlert extends StatelessWidget {
  const _ExcursionAlert();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: TS.colors.error),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '持续超温 47 分钟',
                  style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
                ),
                SizedBox(height: TS.spacing.xs),
                Text('当前 10.8°C，已高于运输上限 2.8°C', style: TS.textStyle.caption),
              ],
            ),
          ),
          const CommonBadge(label: '严重', semanticTone: CommonBadgeTone.error),
        ],
      ),
    );
  }
}

class _SensorOfflineAlert extends StatelessWidget {
  const _SensorOfflineAlert();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.warningSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        children: [
          Icon(Icons.sensors_off_outlined, color: TS.colors.warning),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '探头 T-07 已离线 18 分钟',
                  style: TS.textStyle.subtitle.copyWith(
                    color: TS.colors.warning,
                  ),
                ),
                SizedBox(height: TS.spacing.xs),
                Text('当前温度不可确认，请联系司机检查探头电源。', style: TS.textStyle.caption),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ShipmentSummary extends StatelessWidget {
  const _ShipmentSummary();

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '运输概览',
      subtitle: 'SH-2048 · 预计 16:20 到达',
      child: Column(
        children: [
          Row(
            children: [
              const Expanded(
                child: _RoutePoint(icon: Icons.ac_unit, label: '上海虹桥冷库'),
              ),
              Container(width: 48, height: 2, color: TS.colors.primary),
              const Expanded(
                child: _RoutePoint(
                  icon: Icons.location_on_outlined,
                  label: '杭州临平中心',
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          const Row(
            children: [
              Expanded(
                child: _DetailValue(label: '货物', value: '生物制剂 · 18 箱'),
              ),
              Expanded(
                child: _DetailValue(label: '车辆', value: '沪A·7K21 · 周其明'),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          const Row(
            children: [
              Expanded(
                child: _DetailValue(label: '设备', value: '探头 T-07 · 2 分钟/次'),
              ),
              Expanded(
                child: _DetailValue(label: '温区', value: '2–8°C'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RoutePoint extends StatelessWidget {
  const _RoutePoint({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: TS.sizing.iconLg),
        SizedBox(width: TS.spacing.xs),
        Expanded(child: Text(label, style: TS.textStyle.content)),
      ],
    );
  }
}

class _DetailValue extends StatelessWidget {
  const _DetailValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TS.textStyle.caption),
        SizedBox(height: TS.spacing.xs),
        Text(value, style: TS.textStyle.content),
      ],
    );
  }
}

class _TemperatureSection extends StatelessWidget {
  const _TemperatureSection({required this.active});

  final bool active;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '箱温趋势',
      subtitle: '最近 70 分钟 · 上限 8°C',
      child: Column(
        children: [
          const _TemperatureChart(),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(
                child: _Metric(label: '当前', value: active ? '10.8°C' : '6.1°C'),
              ),
              const Expanded(
                child: _Metric(label: '最高', value: '10.8°C'),
              ),
              const Expanded(
                child: _Metric(label: '超温', value: '47m'),
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
    return Column(
      children: [
        Text(label, style: TS.textStyle.caption),
        SizedBox(height: TS.spacing.xs),
        Text(value, style: TS.textStyle.title),
      ],
    );
  }
}

class _TemperatureChart extends StatelessWidget {
  const _TemperatureChart();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 154,
      padding: EdgeInsets.fromLTRB(
        TS.spacing.smPlus,
        TS.spacing.sm,
        TS.spacing.smPlus,
        TS.spacing.xs,
      ),
      decoration: BoxDecoration(
        color: TS.colors.surfaceVariant,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: CustomPaint(
        painter: _TemperatureChartPainter(),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _TemperatureChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final labelStyle = TS.textStyle.caption.copyWith(fontSize: 10);
    final chartLeft = 26.0;
    final chartTop = 10.0;
    final chartBottom = size.height - 28;
    final chartHeight = chartBottom - chartTop;
    final step = (size.width - chartLeft) / evidenceTemperatures.length;

    void paintText(String value, Offset offset, {Color? color}) {
      final painter = TextPainter(
        text: TextSpan(
          text: value,
          style: labelStyle.copyWith(color: color),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      painter.paint(canvas, offset);
    }

    paintText('12°', const Offset(0, 0));
    paintText('8°', Offset(0, chartTop + chartHeight * 0.42));
    paintText('4°', Offset(0, chartBottom - 10));

    final thresholdY = chartTop + chartHeight * 0.42;
    final dashPaint = Paint()
      ..color = TS.colors.error
      ..strokeWidth = 1;
    for (double x = chartLeft; x < size.width; x += 6) {
      canvas.drawLine(
        Offset(x, thresholdY),
        Offset((x + 3).clamp(chartLeft, size.width).toDouble(), thresholdY),
        dashPaint,
      );
    }
    paintText(
      '8°C 上限',
      Offset(size.width - 53, thresholdY - 14),
      color: TS.colors.error,
    );

    for (var i = 0; i < evidenceTemperatures.length; i++) {
      final value = evidenceTemperatures[i];
      final normalized = ((value - 4) / 8).clamp(0.0, 1.0);
      final height = chartHeight * normalized;
      final x = chartLeft + i * step + step * 0.22;
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, chartBottom - height, step * 0.52, height),
        Radius.circular(TS.radius.sm),
      );
      canvas.drawRRect(
        rect,
        Paint()..color = i >= 4 ? TS.colors.error : TS.colors.primary,
      );
      paintText(evidenceTemperatureTimes[i], Offset(x - 3, chartBottom + 5));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard();

  Color _color(TimelineTone tone) => switch (tone) {
    TimelineTone.success => TS.colors.success,
    TimelineTone.primary => TS.colors.primary,
    TimelineTone.warning => TS.colors.warning,
    TimelineTone.error => TS.colors.error,
  };

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '运输事件',
      subtitle: '自动记录与人工操作合并展示',
      child: Column(
        children: [
          for (var index = 0; index < evidenceTimeline.length; index++) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  margin: EdgeInsets.only(top: TS.spacing.xs),
                  decoration: BoxDecoration(
                    color: _color(evidenceTimeline[index].tone),
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: TS.spacing.smPlus),
                SizedBox(
                  width: 48,
                  child: Text(
                    evidenceTimeline[index].time,
                    style: TS.textStyle.caption,
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        evidenceTimeline[index].title,
                        style: TS.textStyle.content,
                      ),
                      SizedBox(height: TS.spacing.xxs),
                      Text(
                        evidenceTimeline[index].detail,
                        style: TS.textStyle.caption,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (index < evidenceTimeline.length - 1) ...[
              SizedBox(height: TS.spacing.sm),
              const CommonDivider(),
              SizedBox(height: TS.spacing.sm),
            ],
          ],
        ],
      ),
    );
  }
}
