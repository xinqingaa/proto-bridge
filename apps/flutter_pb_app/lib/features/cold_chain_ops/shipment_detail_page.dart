import 'package:flutter/material.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'models.dart';

/// Evidence: `cold-chain-ops.shipment-detail`
class ShipmentDetailPage extends StatefulWidget {
  const ShipmentDetailPage({
    super.key,
    this.shipmentId = 'SH-2048',
    this.variant = 'default',
  });

  final String shipmentId;
  final String variant;

  static ShipmentDetailPage fromRouteArgs(Object? args) {
    final map = args is Map ? args : const <String, String>{};
    return ShipmentDetailPage(
      shipmentId: map['shipmentId']?.toString() ?? 'SH-2048',
      variant: map['variant']?.toString() ?? 'default',
    );
  }

  @override
  State<ShipmentDetailPage> createState() => _ShipmentDetailPageState();
}

class _ShipmentDetailPageState extends State<ShipmentDetailPage> {
  late String _variant;
  bool _overlayScheduled = false;

  @override
  void initState() {
    super.initState();
    _variant = widget.variant;
  }

  @override
  void didUpdateWidget(covariant ShipmentDetailPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.variant != widget.variant) {
      setState(() {
        _variant = widget.variant;
        _overlayScheduled = false;
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_overlayScheduled) return;
    _overlayScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_variant == 'action-sheet-open') {
        _openActionSheet();
      } else if (_variant == 'acknowledge-dialog-open') {
        _openAcknowledgeDialog();
      }
    });
  }

  ShipmentDetail get _data => shipmentForVariant(_variant);

  Future<void> _openActionSheet() async {
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
                tone: CommonButtonTone.action,
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
      _openResolution();
    } else if (choice == 'acknowledge') {
      await _openAcknowledgeDialog();
    }
  }

  Future<void> _openAcknowledgeDialog() async {
    final ok = await AppPop.confirm(
      title: '确认接手异常？',
      content: '接手后调度中心会将你标记为当前负责人。',
      confirmText: '确认接手',
      cancelText: '取消',
    );
    if (!mounted || !ok) return;
    AppPop.success('已接手异常');
  }

  void _openResolution() {
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainResolutionForm,
      arguments: <String, String>{
        'shipmentId': _data.shipmentId,
        'variant': 'ready-to-submit',
      },
    );
  }

  Future<void> _refresh() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final data = _data;
    final showExcursion = _variant == 'active-excursion' ||
        _variant == 'action-sheet-open' ||
        _variant == 'acknowledge-dialog-open';
    final showOffline = _variant == 'sensor-offline';

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '运输详情', showBack: true),
      body: CommonScrollableDataList(
        padding: EdgeInsets.all(TS.spacing.md),
        onRefresh: _refresh,
        itemCount: 4,
        itemBuilder: (context, index) {
          return switch (index) {
            0 => Column(
                children: [
                  if (showExcursion) ...[
                    const _ExcursionAlert(),
                    SizedBox(height: TS.spacing.smPlus),
                  ],
                  if (showOffline) ...[
                    const _OfflineAlert(),
                    SizedBox(height: TS.spacing.smPlus),
                  ],
                  _OverviewCard(data: data),
                  SizedBox(height: TS.spacing.smPlus),
                ],
              ),
            1 => Padding(
                padding: EdgeInsets.only(bottom: TS.spacing.smPlus),
                child: _TemperatureCard(data: data),
              ),
            2 => Padding(
                padding: EdgeInsets.only(bottom: TS.spacing.smPlus),
                child: _TimelineCard(data: data),
              ),
            _ => CommonButton(
                label: '开始处置',
                block: true,
                onPressed: _openActionSheet,
              ),
          };
        },
      ),
    );
  }
}

class _ExcursionAlert extends StatelessWidget {
  const _ExcursionAlert();

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
                  '持续超温 47 分钟',
                  style: TS.textStyle.subtitle.copyWith(color: TS.colors.error),
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  '当前 10.8°C，已高于运输上限 2.8°C',
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
          const CommonBadge(
            label: '严重',
            semanticTone: CommonBadgeTone.error,
          ),
        ],
      ),
    );
  }
}

class _OfflineAlert extends StatelessWidget {
  const _OfflineAlert();

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: TS.colors.warningSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
        border: Border.all(color: TS.colors.warning.withValues(alpha: 0.35)),
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
                  '探头 T-07 已离线 18 分钟',
                  style: TS.textStyle.subtitle.copyWith(
                    color: TS.colors.warning,
                  ),
                ),
                SizedBox(height: TS.spacing.xxs),
                Text(
                  '当前温度不可确认，请联系司机检查探头电源。',
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
      title: '运输概览',
      subtitle: '${data.shipmentId} · ${data.eta}',
      child: Column(
        children: [
          Row(
            children: [
              Icon(Icons.ac_unit, size: TS.sizing.iconMd, color: TS.colors.primary),
              SizedBox(width: TS.spacing.xs),
              Expanded(
                child: Text(data.origin, style: TS.textStyle.content),
              ),
            ],
          ),
          Padding(
            padding: EdgeInsets.symmetric(vertical: TS.spacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 3,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          TS.colors.primary,
                          TS.colors.primary,
                          TS.colors.border,
                        ],
                        stops: const [0, 0.45, 0.45],
                      ),
                      borderRadius: BorderRadius.circular(TS.radius.full),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              Icon(
                Icons.location_on_outlined,
                size: TS.sizing.iconMd,
                color: TS.colors.onSurfaceMuted,
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
              Expanded(child: _Meta(label: '货物', value: data.cargo)),
              Expanded(child: _Meta(label: '车辆', value: data.vehicle)),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Expanded(child: _Meta(label: '设备', value: data.equipment)),
              Expanded(child: _Meta(label: '温区', value: data.tempZone)),
            ],
          ),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.label, required this.value});

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
          style: TS.textStyle.caption.copyWith(
            color: TS.colors.onSurfaceMuted,
          ),
        ),
        SizedBox(height: TS.spacing.xxs),
        Text(value, style: TS.textStyle.content),
      ],
    );
  }
}

class _TemperatureCard extends StatelessWidget {
  const _TemperatureCard({required this.data});

  final ShipmentDetail data;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      title: '箱温趋势',
      subtitle: '最近 70 分钟 · 上限 ${data.limitC.toStringAsFixed(0)}°C',
      child: Column(
        children: [
          _TempChart(samples: data.samples, limitC: data.limitC),
          SizedBox(height: TS.spacing.md),
          Row(
            children: [
              Expanded(
                child: _Stat(
                  label: '当前',
                  value: '${data.currentC.toStringAsFixed(1)}°C',
                ),
              ),
              Expanded(
                child: _Stat(
                  label: '最高',
                  value: '${data.maxC.toStringAsFixed(1)}°C',
                ),
              ),
              Expanded(
                child: _Stat(label: '超温', value: '${data.overTempMinutes}m'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Column(
      children: [
        Text(
          label,
          style: TS.textStyle.caption.copyWith(
            color: TS.colors.onSurfaceMuted,
          ),
        ),
        SizedBox(height: TS.spacing.xxs),
        Text(value, style: TS.textStyle.subtitle),
      ],
    );
  }
}

class _TempChart extends StatelessWidget {
  const _TempChart({required this.samples, required this.limitC});

  final List<TempSample> samples;
  final double limitC;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    const minY = 4.0;
    const maxY = 12.0;
    return Container(
      height: 180,
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: TS.colors.surfaceVariant,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        children: [
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  width: 28,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('12°', style: TS.textStyle.caption),
                      Text('8°', style: TS.textStyle.caption),
                      Text('4°', style: TS.textStyle.caption),
                    ],
                  ),
                ),
                SizedBox(width: TS.spacing.xs),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final limitTop =
                          (1 - ((limitC - minY) / (maxY - minY))) *
                              constraints.maxHeight;
                      return Stack(
                        children: [
                          Positioned(
                            top: limitTop,
                            left: 0,
                            right: 0,
                            child: Row(
                              children: [
                                Expanded(
                                  child: CustomPaint(
                                    painter: _DashedLinePainter(
                                      color: TS.colors.error,
                                    ),
                                    size: Size(constraints.maxWidth - 36, 1),
                                  ),
                                ),
                                SizedBox(width: TS.spacing.xs),
                                Text(
                                  '${limitC.toStringAsFixed(0)}°C 上限',
                                  style: TS.textStyle.caption.copyWith(
                                    color: TS.colors.error,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              for (final sample in samples) ...[
                                Expanded(
                                  child: Align(
                                    alignment: Alignment.bottomCenter,
                                    child: FractionallySizedBox(
                                      heightFactor:
                                          ((sample.valueC - minY) /
                                                  (maxY - minY))
                                              .clamp(0.05, 1.0),
                                      child: Container(
                                        margin: EdgeInsets.symmetric(
                                          horizontal: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: sample.valueC > limitC
                                              ? TS.colors.error
                                              : TS.colors.primary,
                                          borderRadius: BorderRadius.circular(
                                            TS.radius.xs,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                              const SizedBox(width: 36),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.xs),
          Row(
            children: [
              const SizedBox(width: 28),
              for (final sample in samples)
                Expanded(
                  child: Text(
                    sample.label,
                    textAlign: TextAlign.center,
                    style: TS.textStyle.caption.copyWith(
                      color: TS.colors.onSurfaceMuted,
                    ),
                  ),
                ),
              const SizedBox(width: 36),
            ],
          ),
        ],
      ),
    );
  }
}

class _DashedLinePainter extends CustomPainter {
  _DashedLinePainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    const dash = 4.0;
    const gap = 3.0;
    var x = 0.0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, 0), Offset(x + dash, 0), paint);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant _DashedLinePainter oldDelegate) =>
      oldDelegate.color != color;
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.data});

  final ShipmentDetail data;

  Color _dot(TimelineTone tone) => switch (tone) {
        TimelineTone.success => TS.colors.success,
        TimelineTone.info => TS.colors.primary,
        TimelineTone.warning => TS.colors.warning,
        TimelineTone.error => TS.colors.error,
      };

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return CommonCard(
      title: '运输事件',
      subtitle: '自动记录与人工操作合并展示',
      child: Column(
        children: [
          for (var i = 0; i < data.events.length; i++) ...[
            if (i > 0) ...[
              SizedBox(height: TS.spacing.sm),
              const CommonDivider(),
              SizedBox(height: TS.spacing.sm),
            ],
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  margin: EdgeInsets.only(top: 6),
                  decoration: BoxDecoration(
                    color: _dot(data.events[i].tone),
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: TS.spacing.sm),
                Text(
                  data.events[i].time,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
                SizedBox(width: TS.spacing.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(data.events[i].title, style: TS.textStyle.subtitle),
                      SizedBox(height: TS.spacing.xxs),
                      Text(
                        data.events[i].detail,
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
