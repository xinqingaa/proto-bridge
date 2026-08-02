import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';

class ShipmentDetailV2Page extends StatelessWidget {
  const ShipmentDetailV2Page({super.key});

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '运输详情',
        showBack: true,
        elevated: false,
        centerTitle: false,
      ),
      body: CommonScrollableDataList(
        padding: EdgeInsets.fromLTRB(
          TS.spacing.smPlus,
          TS.spacing.md,
          TS.spacing.smPlus,
          TS.spacing.xl,
        ),
        itemCount: 5,
        onRefresh: () async {},
        separatorBuilder: (_, _) => SizedBox(height: TS.spacing.smPlus),
        itemBuilder: (context, index) => switch (index) {
          0 => const _ExcursionAlert(),
          1 => const _ShipmentSummary(),
          2 => const _TemperatureSection(),
          3 => const _TimelineSection(),
          _ => CommonButton(
            label: '开始处置',
            tone: CommonButtonTone.action,
            block: true,
            onPressed: () {},
          ),
        },
      ),
    );
  }
}

class _ExcursionAlert extends StatelessWidget {
  const _ExcursionAlert();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.errorSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        children: [
          Icon(
            Icons.warning_amber_rounded,
            color: TS.colors.error,
            size: TS.sizing.iconLg,
          ),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '持续超温 47 分钟',
                  style: TS.textStyle.title.copyWith(color: TS.colors.error),
                ),
                Text('当前 10.8°C，已高于运输上限 2.8°C', style: TS.textStyle.caption),
              ],
            ),
          ),
          const CommonBadge(label: '严重', tone: CommonButtonTone.error),
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
      elevated: false,
      child: Column(
        children: [
          Row(
            children: [
              Icon(Icons.ac_unit, color: TS.colors.onSurface),
              SizedBox(width: TS.spacing.sm),
              const Expanded(child: Text('上海虹桥冷库')),
              Container(width: 48, height: 3, color: TS.colors.primary),
              SizedBox(width: TS.spacing.sm),
              Icon(Icons.location_on_outlined, color: TS.colors.onSurface),
              SizedBox(width: TS.spacing.xs),
              const Expanded(child: Text('杭州临平中心')),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          const Row(
            children: [
              Expanded(
                child: _DetailField(label: '货物', value: '生物制剂 · 18 箱'),
              ),
              Expanded(
                child: _DetailField(label: '车辆', value: '沪A·7K21 · 周其明'),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          const Row(
            children: [
              Expanded(
                child: _DetailField(label: '设备', value: '探头 T-07 · 2 分钟/次'),
              ),
              Expanded(
                child: _DetailField(label: '温区', value: '2–8°C'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailField extends StatelessWidget {
  const _DetailField({required this.label, required this.value});

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
  const _TemperatureSection();

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '箱温趋势',
      subtitle: '最近 70 分钟 · 上限 8°C',
      elevated: false,
      child: Column(
        children: [
          Container(
            height: 190,
            padding: EdgeInsets.all(TS.spacing.sm),
            decoration: BoxDecoration(
              color: TS.colors.surfaceVariant,
              borderRadius: BorderRadius.circular(TS.radius.md),
            ),
            child: CustomPaint(
              painter: _TemperatureChartPainter(),
              child: const SizedBox.expand(),
            ),
          ),
          SizedBox(height: TS.spacing.md),
          const Row(
            children: [
              Expanded(
                child: _TemperatureMetric(label: '当前', value: '10.8°C'),
              ),
              Expanded(
                child: _TemperatureMetric(label: '最高', value: '10.8°C'),
              ),
              Expanded(
                child: _TemperatureMetric(label: '超温', value: '47m'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TemperatureMetric extends StatelessWidget {
  const _TemperatureMetric({required this.label, required this.value});

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

class _TemperatureChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final values = [8.4, 8.5, 8.8, 9.1, 9.4, 9.8, 10.5, 10.8];
    final labels = [
      '13:20',
      '13:30',
      '13:40',
      '13:50',
      '14:00',
      '14:10',
      '14:20',
      '14:30',
    ];
    final chartTop = 20.0;
    final chartBottom = size.height - 36;
    final chartHeight = chartBottom - chartTop;
    final slot = size.width / values.length;
    final barWidth = math.min(18.0, slot * 0.48);
    final thresholdY = chartBottom - ((8 - 4) / 8) * chartHeight;

    final thresholdPaint = Paint()
      ..color = TS.colors.error
      ..strokeWidth = 1.2;
    canvas.drawLine(
      Offset(0, thresholdY),
      Offset(size.width, thresholdY),
      thresholdPaint,
    );

    for (var index = 0; index < values.length; index++) {
      final normalized = ((values[index] - 4) / 8).clamp(0.0, 1.0);
      final top = chartBottom - normalized * chartHeight;
      final centerX = slot * index + slot / 2;
      final paint = Paint()
        ..color = values[index] > 9 ? TS.colors.error : TS.colors.primary;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTRB(
            centerX - barWidth / 2,
            top,
            centerX + barWidth / 2,
            chartBottom,
          ),
          Radius.circular(TS.radius.sm),
        ),
        paint,
      );
      _paintText(canvas, labels[index], Offset(centerX - 19, chartBottom + 8));
    }

    _paintText(canvas, '12°', const Offset(0, 0));
    _paintText(canvas, '8°', Offset(0, thresholdY - 16));
    _paintText(canvas, '4°', Offset(0, chartBottom - 14));
    _paintText(
      canvas,
      '8°C 上限',
      Offset(size.width - 62, thresholdY - 18),
      color: TS.colors.error,
    );
  }

  void _paintText(Canvas canvas, String text, Offset offset, {Color? color}) {
    final painter = TextPainter(
      text: TextSpan(
        text: text,
        style: TS.textStyle.caption.copyWith(color: color),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TimelineSection extends StatelessWidget {
  const _TimelineSection();

  static const _events = [
    ('11:48', '冷库交接完成', '探头 T-07 校准正常，箱温 4.6°C'),
    ('12:16', '车辆离开上海虹桥冷库', '司机 周其明 · 沪A·7K21'),
    ('13:45', '温度接近上限', '连续 5 分钟高于 7.5°C'),
    ('14:02', '确认持续超温', '超过 8°C 已持续 30 分钟，自动升级为严重'),
  ];

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '运输事件',
      subtitle: '自动记录与人工操作合并展示',
      elevated: false,
      child: Column(
        children: [
          for (var index = 0; index < _events.length; index++) ...[
            _TimelineEvent(
              time: _events[index].$1,
              title: _events[index].$2,
              detail: _events[index].$3,
              critical: index == _events.length - 1,
            ),
            if (index < _events.length - 1) SizedBox(height: TS.spacing.md),
          ],
        ],
      ),
    );
  }
}

class _TimelineEvent extends StatelessWidget {
  const _TimelineEvent({
    required this.time,
    required this.title,
    required this.detail,
    required this.critical,
  });

  final String time;
  final String title;
  final String detail;
  final bool critical;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: TS.spacing.smPlus,
          height: TS.spacing.smPlus,
          margin: EdgeInsets.only(top: TS.spacing.xs),
          decoration: BoxDecoration(
            color: critical ? TS.colors.error : TS.colors.success,
            shape: BoxShape.circle,
          ),
        ),
        SizedBox(width: TS.spacing.smPlus),
        SizedBox(width: 48, child: Text(time, style: TS.textStyle.caption)),
        SizedBox(width: TS.spacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TS.textStyle.subtitle),
              SizedBox(height: TS.spacing.xs),
              Text(detail, style: TS.textStyle.caption),
            ],
          ),
        ),
      ],
    );
  }
}
