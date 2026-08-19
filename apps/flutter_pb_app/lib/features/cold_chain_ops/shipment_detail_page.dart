import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../common/overlay/app_pop.dart';
import '../../common/widgets.dart';
import '../../router/routes.dart';
import '../../theme/ts.dart';
import 'cold_chain_fixtures.dart';
import 'cold_chain_models.dart';
import 'cold_chain_providers.dart';
import 'temperature_chart.dart';

class ShipmentDetailPage extends ConsumerStatefulWidget {
  const ShipmentDetailPage({super.key, required this.args});

  final ShipmentDetailArgs args;

  @override
  ConsumerState<ShipmentDetailPage> createState() => _ShipmentDetailPageState();
}

class _ShipmentDetailPageState extends ConsumerState<ShipmentDetailPage> {
  var _overlayScheduled = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _overlayScheduled) return;
      _overlayScheduled = true;
      _presentInitialOverlay();
    });
  }

  Future<void> _presentInitialOverlay() async {
    switch (widget.args.variantId) {
      case 'action-sheet-open':
        await _openActions();
      case 'acknowledge-dialog-open':
        await _acknowledge();
    }
  }

  Future<void> _openActions() async {
    final choice = await AppPop.sheet<String>(
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
                key: ColdChainKeys.openResolution,
                label: '填写处置记录',
                block: true,
                onPressed: () => handle.complete('resolution'),
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                key: ColdChainKeys.acknowledge,
                label: '仅确认接手',
                kind: CommonButtonKind.outlined,
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
    if (choice == 'resolution') {
      _openResolution();
    } else if (choice == 'acknowledge') {
      await _acknowledge();
    }
  }

  void _openResolution() {
    Navigator.of(context).pushNamed(
      AppRoutes.coldChainResolution,
      arguments: ResolutionFormArgs(
        variantId: 'ready-to-submit',
        shipmentId: widget.args.shipmentId,
      ),
    );
  }

  Future<void> _acknowledge() async {
    await AppPop.confirm(
      title: '确认接手异常？',
      content: '接手后调度中心会将你标记为当前负责人。',
      confirmText: '确认接手',
    );
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final state = ref.watch(shipmentDetailProvider(widget.args));
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: CommonAppBar(
        title: '运输详情',
        showBack: true,
        onBack: () => Navigator.of(context).maybePop(),
      ),
      body: CommonScrollableDataList(
        itemCount: 1,
        itemBuilder: (context, index) {
          return Padding(
            padding: EdgeInsets.fromLTRB(
              TS.spacing.md,
              TS.spacing.md,
              TS.spacing.md,
              TS.spacing.lg,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (state.hasExcursion) ...[
                  _AlertBanner(
                    icon: CommonIconName.alertTriangle,
                    iconTone: CommonIconTone.error,
                    background: TS.colors.errorSoft,
                    title: '持续超温 47 分钟',
                    titleColor: TS.colors.error,
                    description: '当前 10.8°C，已高于运输上限 2.8°C',
                    badge: const CommonBadge(
                      label: '严重',
                      tone: CommonBadgeTone.error,
                    ),
                  ),
                  SizedBox(height: TS.spacing.smPlus),
                ],
                if (state.sensorOffline) ...[
                  const _AlertBanner(
                    icon: CommonIconName.radio,
                    iconTone: CommonIconTone.warning,
                    title: '探头 T-07 已离线 18 分钟',
                    description: '当前温度不可确认，请联系司机检查探头电源。',
                  ),
                  SizedBox(height: TS.spacing.smPlus),
                ],
                CommonCard(
                  semanticRole: CommonCardSemanticRole.summary,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('运输概览', style: TS.textStyle.subtitle),
                      SizedBox(height: TS.spacing.xxs),
                      Text(
                        '${state.shipmentId} · 预计 16:20 到达',
                        style: TS.textStyle.caption,
                      ),
                      SizedBox(height: TS.spacing.md),
                      Row(
                        children: [
                          const CommonIcon(name: CommonIconName.snowflake),
                          SizedBox(width: TS.spacing.xs),
                          const Expanded(child: Text('上海虹桥冷库')),
                          Expanded(
                            child: Container(
                              height: 4,
                              margin: EdgeInsets.symmetric(
                                horizontal: TS.spacing.sm,
                              ),
                              decoration: BoxDecoration(
                                color: TS.colors.primarySoft,
                                borderRadius: BorderRadius.circular(
                                  TS.radius.full,
                                ),
                              ),
                              alignment: Alignment.centerLeft,
                              child: FractionallySizedBox(
                                widthFactor: 0.68,
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: TS.colors.primary,
                                    borderRadius: BorderRadius.circular(
                                      TS.radius.full,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const CommonIcon(name: CommonIconName.mapPin),
                          SizedBox(width: TS.spacing.xs),
                          const Expanded(child: Text('杭州临平中心')),
                        ],
                      ),
                      SizedBox(height: TS.spacing.md),
                      const _FactGrid(),
                    ],
                  ),
                ),
                SizedBox(height: TS.spacing.smPlus),
                CommonCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('箱温趋势', style: TS.textStyle.subtitle),
                      SizedBox(height: TS.spacing.xxs),
                      Text('最近 70 分钟 · 上限 8°C', style: TS.textStyle.caption),
                      SizedBox(height: TS.spacing.md),
                      const TemperatureTrendChart(),
                      SizedBox(height: TS.spacing.md),
                      Row(
                        children: [
                          Expanded(
                            child: _TempMetric(
                              label: '当前',
                              value:
                                  '${state.currentTemperature.toStringAsFixed(1)}°C',
                              color: state.hasExcursion
                                  ? TS.colors.error
                                  : TS.colors.onSurface,
                            ),
                          ),
                          const Expanded(
                            child: _TempMetric(label: '最高', value: '10.8°C'),
                          ),
                          const Expanded(
                            child: _TempMetric(label: '超温', value: '47m'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                SizedBox(height: TS.spacing.smPlus),
                CommonCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('运输事件', style: TS.textStyle.subtitle),
                      SizedBox(height: TS.spacing.xxs),
                      Text('自动记录与人工操作合并展示', style: TS.textStyle.caption),
                      SizedBox(height: TS.spacing.md),
                      for (final event in shipmentEvents) ...[
                        _EventRow(event: event),
                        if (event.id != shipmentEvents.last.id)
                          SizedBox(height: TS.spacing.smPlus),
                      ],
                    ],
                  ),
                ),
                SizedBox(height: TS.spacing.md),
                CommonButton(
                  key: ColdChainKeys.openActions,
                  label: '开始处置',
                  block: true,
                  onPressed: _openActions,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({
    required this.icon,
    required this.iconTone,
    required this.title,
    required this.description,
    this.background,
    this.titleColor,
    this.badge,
  });

  final CommonIconName icon;
  final CommonIconTone iconTone;
  final String title;
  final String description;
  final Color? background;
  final Color? titleColor;
  final Widget? badge;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      padding: EdgeInsets.all(TS.spacing.md),
      decoration: BoxDecoration(
        color: background ?? TS.colors.warningSoft,
        borderRadius: BorderRadius.circular(TS.radius.lg),
      ),
      child: Row(
        children: [
          CommonIcon(name: icon, size: CommonIconSize.lg, tone: iconTone),
          SizedBox(width: TS.spacing.smPlus),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TS.textStyle.subtitle.copyWith(color: titleColor),
                ),
                Text(
                  description,
                  style: TS.textStyle.caption.copyWith(
                    color: TS.colors.onSurfaceMuted,
                  ),
                ),
              ],
            ),
          ),
          if (badge != null) ...[SizedBox(width: TS.spacing.sm), badge!],
        ],
      ),
    );
  }
}

class _FactGrid extends StatelessWidget {
  const _FactGrid();

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    const facts = [
      ('货物', '生物制剂 · 18 箱'),
      ('车辆', '沪A·7K21 · 周其明'),
      ('设备', '探头 T-07 · 2 分钟/次'),
      ('温区', '2–8°C'),
    ];
    return Column(
      children: [
        for (var i = 0; i < facts.length; i += 2)
          Padding(
            padding: EdgeInsets.only(bottom: i == 0 ? TS.spacing.sm : 0),
            child: Row(
              children: [
                Expanded(
                  child: _Fact(label: facts[i].$1, value: facts[i].$2),
                ),
                Expanded(
                  child: _Fact(label: facts[i + 1].$1, value: facts[i + 1].$2),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TS.textStyle.caption.copyWith(color: TS.colors.onSurfaceMuted),
        ),
        Text(value, style: TS.textStyle.content),
      ],
    );
  }
}

class _TempMetric extends StatelessWidget {
  const _TempMetric({required this.label, required this.value, this.color});

  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: TS.textStyle.caption),
        Text(value, style: TS.textStyle.title.copyWith(color: color)),
      ],
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event});

  final ShipmentEvent event;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final color = switch (event.tone) {
      EventTone.success => TS.colors.success,
      EventTone.primary => TS.colors.primary,
      EventTone.warning => TS.colors.warning,
      EventTone.error => TS.colors.error,
    };
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 8,
          height: 8,
          margin: EdgeInsets.only(top: TS.spacing.sm),
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        SizedBox(width: TS.spacing.sm),
        SizedBox(
          width: 48,
          child: Text(event.time, style: TS.textStyle.caption),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(event.title, style: TS.textStyle.content),
              Text(
                event.detail,
                style: TS.textStyle.caption.copyWith(
                  color: TS.colors.onSurfaceMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
