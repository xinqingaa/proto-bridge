import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'models.dart';

class V6ShipmentDetailPage extends StatefulWidget {
  const V6ShipmentDetailPage({
    super.key,
    this.initialMode = V6ShipmentMode.defaultState,
  });

  final V6ShipmentMode initialMode;

  factory V6ShipmentDetailPage.fromRouteArgs(Object? args) {
    return V6ShipmentDetailPage(
      initialMode: V6ShipmentModeParsing.fromArgs(args),
    );
  }

  @override
  State<V6ShipmentDetailPage> createState() => _V6ShipmentDetailPageState();
}

class _V6ShipmentDetailPageState extends State<V6ShipmentDetailPage> {
  late V6ShipmentMode _mode;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  Future<void> _openActions() async {
    await AppPop.sheet<void>(
      title: '选择处置方式',
      builder: (context, handle) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            TS.spacing.md,
            TS.spacing.sm,
            TS.spacing.md,
            TS.spacing.md,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CommonButton(
                label: '填写处置记录',
                block: true,
                onPressed: () {
                  handle.dismiss();
                  Navigator.of(this.context).pushNamed(
                    AppRoutes.v6ResolutionForm,
                    arguments: {'variant': 'ready-to-submit'},
                  );
                },
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: '仅确认接手',
                block: true,
                variant: CommonButtonVariant.outlined,
                tone: CommonButtonTone.action,
                onPressed: () {
                  handle.dismiss();
                  _confirmAcknowledge();
                },
              ),
              SizedBox(height: TS.spacing.sm),
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
  }

  Future<void> _confirmAcknowledge() async {
    final confirmed = await AppPop.confirm(
      title: '确认接手异常?',
      content: '接手后调度中心会将你标记为当前负责人。',
      confirmText: '确认接手',
      cancelText: '取消',
    );
    if (confirmed && mounted) {
      AppPop.success('已确认接手异常');
    }
  }

  List<Widget> _sections() {
    return [
      if (_mode == V6ShipmentMode.activeExcursion)
        const _StatusBanner(
          icon: Icons.warning_amber_rounded,
          title: '持续超温 47 分钟',
          detail: '当前 10.8°C，已高于运输上限 2.8°C',
          tone: _BannerTone.error,
          badge: '严重',
        ),
      if (_mode == V6ShipmentMode.sensorOffline)
        const _StatusBanner(
          icon: Icons.sensors_off_outlined,
          title: '探头 T-07 已离线 18 分钟',
          detail: '当前温度不可确认，请联系司机检查探头电源。',
          tone: _BannerTone.warning,
        ),
      const _OverviewCard(),
      _TemperatureCard(active: _mode == V6ShipmentMode.activeExcursion),
      const _EventsCard(),
      CommonButton(
        label: '处置操作',
        block: true,
        tone: CommonButtonTone.action,
        onPressed: _openActions,
      ),
      SizedBox(height: TS.spacing.md),
    ];
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final sections = _sections();

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '运输详情',
        showBack: true,
        elevated: false,
      ),
      body: CommonScrollableDataList(
        key: const ValueKey('v6-page-scroll'),
        padding: EdgeInsets.all(TS.spacing.md),
        itemCount: sections.length,
        onRefresh: () async {},
        itemBuilder: (_, index) => sections[index],
        separatorBuilder: (_, _) => SizedBox(height: TS.spacing.md),
      ),
    );
  }
}

enum _BannerTone { error, warning }

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({
    required this.icon,
    required this.title,
    required this.detail,
    required this.tone,
    this.badge,
  });

  final IconData icon;
  final String title;
  final String detail;
  final _BannerTone tone;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    final color = tone == _BannerTone.error
        ? TS.colors.error
        : TS.colors.warning;
    final background = tone == _BannerTone.error
        ? TS.colors.errorSoft
        : TS.colors.warningSoft;

    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: TS.sizing.iconLg),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: TS.textStyle.subtitle.copyWith(color: color),
                      ),
                    ),
                    if (badge != null)
                      CommonBadge(
                        label: badge!,
                        semanticTone: CommonBadgeTone.error,
                      ),
                  ],
                ),
                SizedBox(height: TS.spacing.xs),
                Text(
                  detail,
                  style: TS.textStyle.content.copyWith(
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
  const _OverviewCard();

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '运输概览',
      subtitle: 'SH-2048 · 预计 16:20 到达',
      child: Column(
        children: [
          Row(
            children: [
              Icon(Icons.ac_unit, color: TS.colors.onSurface, size: 22),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: Text(
                  '上海虹桥冷库',
                  style: TS.textStyle.content,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(
                width: TS.spacing.lg,
                child: Divider(color: TS.colors.primary, thickness: 2),
              ),
              SizedBox(width: TS.spacing.sm),
              Icon(
                Icons.location_on_outlined,
                color: TS.colors.onSurface,
                size: 22,
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: Text(
                  '杭州临平中心',
                  style: TS.textStyle.content,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.md),
          const _InfoGrid(),
        ],
      ),
    );
  }
}

class _InfoGrid extends StatelessWidget {
  const _InfoGrid();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            const Expanded(
              child: _InfoCell(label: '货物', value: '生物制剂 · 18 箱'),
            ),
            SizedBox(width: TS.spacing.md),
            const Expanded(
              child: _InfoCell(label: '车辆', value: '沪A·7K21 · 周其明'),
            ),
          ],
        ),
        SizedBox(height: TS.spacing.smPlus),
        Row(
          children: [
            const Expanded(
              child: _InfoCell(label: '设备', value: '探头 T-07 · 2 分钟/次'),
            ),
            SizedBox(width: TS.spacing.md),
            const Expanded(
              child: _InfoCell(label: '温区', value: '2–8°C'),
            ),
          ],
        ),
      ],
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
        SizedBox(height: TS.spacing.xs),
        Text(
          value,
          style: TS.textStyle.content,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

class _TemperatureCard extends StatelessWidget {
  const _TemperatureCard({required this.active});

  final bool active;

  @override
  Widget build(BuildContext context) {
    final current = active ? '10.8°C' : '6.1°C';

    return CommonCard(
      title: '箱温趋势',
      subtitle: '最近 70 分钟 · 上限 8°C',
      child: Column(
        children: [
          Container(
            height: TS.spacing.xxxl * 2.5,
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
              painter: _TemperaturePainter(active: active),
              child: const SizedBox.expand(),
            ),
          ),
          SizedBox(height: TS.spacing.smPlus),
          Row(
            children: [
              Expanded(
                child: _TemperatureStat(label: '当前', value: current),
              ),
              const Expanded(
                child: _TemperatureStat(label: '最高', value: '10.8°C'),
              ),
              const Expanded(
                child: _TemperatureStat(label: '超温', value: '47m'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TemperatureStat extends StatelessWidget {
  const _TemperatureStat({required this.label, required this.value});

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

class _TemperaturePainter extends CustomPainter {
  const _TemperaturePainter({required this.active});

  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    final values = active
        ? const [0.46, 0.48, 0.53, 0.57, 0.72, 0.79, 0.88, 0.98]
        : const [0.46, 0.48, 0.53, 0.57, 0.72, 0.79, 0.88, 0.93];
    final barWidth = size.width / (values.length * 1.65);
    final gap = barWidth * 0.65;
    final baseline = size.height - TS.spacing.lg;
    final chartHeight = size.height - TS.spacing.lgPlus;
    final thresholdY = baseline - chartHeight * 0.62;
    final thresholdPaint = Paint()
      ..color = TS.colors.error
      ..strokeWidth = 1;
    canvas.drawLine(
      Offset(0, thresholdY),
      Offset(size.width, thresholdY),
      thresholdPaint,
    );

    for (var index = 0; index < values.length; index++) {
      final x = index * (barWidth + gap);
      final height = chartHeight * values[index];
      final isHot = index >= 4;
      final paint = Paint()
        ..color = isHot ? TS.colors.error : TS.colors.primary;
      canvas.drawRect(
        Rect.fromLTWH(x, baseline - height, barWidth, height),
        paint,
      );
    }

    final axisPaint = Paint()
      ..color = TS.colors.border
      ..strokeWidth = 1;
    canvas.drawLine(
      Offset(0, baseline),
      Offset(size.width, baseline),
      axisPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _TemperaturePainter oldDelegate) =>
      oldDelegate.active != active;
}

class _EventsCard extends StatelessWidget {
  const _EventsCard();

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '运输事件',
      subtitle: '自动记录与人工操作合并展示',
      child: Column(
        children: [
          _EventRow(
            color: TS.colors.success,
            time: '11:48',
            title: '冷库交接完成',
            detail: '探头 T-07 校准正常，箱温 4.6°C',
          ),
          SizedBox(height: TS.spacing.md),
          _EventRow(
            color: TS.colors.info,
            time: '12:16',
            title: '车辆离开上海虹桥冷库',
            detail: '司机 周其明 · 沪A·7K21',
          ),
        ],
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({
    required this.color,
    required this.time,
    required this.title,
    required this.detail,
  });

  final Color color;
  final String time;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.only(top: TS.spacing.xs),
          child: Icon(Icons.circle, size: TS.spacing.sm, color: color),
        ),
        SizedBox(width: TS.spacing.md),
        SizedBox(
          width: TS.spacing.lgPlus,
          child: Text(time, style: TS.textStyle.caption),
        ),
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
