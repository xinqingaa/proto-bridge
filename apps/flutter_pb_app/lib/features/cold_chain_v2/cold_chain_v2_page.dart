import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';
import 'cold_chain_v2_models.dart';
import 'shipment_detail_v2_page.dart';

/// Cold-chain exception queue backed by the fixed ProtoBridge handoff cases.
class ColdChainV2Page extends StatefulWidget {
  const ColdChainV2Page({
    super.key,
    this.initialVariant = ColdChainV2Variant.defaultView,
  });

  final ColdChainV2Variant initialVariant;

  @override
  State<ColdChainV2Page> createState() => _ColdChainV2PageState();
}

class _ColdChainV2PageState extends State<ColdChainV2Page> {
  static const _filters = [
    CommonFilterItem(value: 'all', label: '全部'),
    CommonFilterItem(value: 'critical', label: '严重'),
    CommonFilterItem(value: 'warning', label: '警告'),
    CommonFilterItem(value: 'watch', label: '关注'),
  ];

  late ColdChainV2Variant _variant;

  @override
  void initState() {
    super.initState();
    _variant = widget.initialVariant;
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(
        title: '冷链异常',
        elevated: false,
        centerTitle: false,
      ),
      body: switch (_variant) {
        ColdChainV2Variant.loading => const _LoadingState(),
        ColdChainV2Variant.error => const _ErrorState(),
        _ => _QueueState(
          variant: _variant,
          filters: _filters,
          onShowCritical: _showCritical,
          onOpenException: _openException,
        ),
      },
    );
  }

  void _showCritical() {
    setState(() => _variant = ColdChainV2Variant.criticalOnly);
  }

  void _openException(ColdChainException exception) {
    if (exception.id != 'EX-017') return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const ShipmentDetailV2Page()),
    );
  }
}

class _QueueState extends StatelessWidget {
  const _QueueState({
    required this.variant,
    required this.filters,
    required this.onShowCritical,
    required this.onOpenException,
  });

  final ColdChainV2Variant variant;
  final List<CommonFilterItem> filters;
  final VoidCallback onShowCritical;
  final ValueChanged<ColdChainException> onOpenException;

  @override
  Widget build(BuildContext context) {
    final criticalOnly = variant == ColdChainV2Variant.criticalOnly;
    final rows = criticalOnly
        ? coldChainExceptions
              .where((item) => item.severity == ColdChainSeverity.critical)
              .toList()
        : coldChainExceptions;

    return CommonScrollableDataList(
      padding: EdgeInsets.fromLTRB(
        TS.spacing.smPlus,
        TS.spacing.md,
        TS.spacing.smPlus,
        TS.spacing.xl,
      ),
      itemCount: 5,
      onRefresh: () async {},
      separatorBuilder: (_, _) => SizedBox(height: TS.spacing.smPlus),
      itemBuilder: (context, index) {
        return switch (index) {
          0 => _RiskSummary(onShowCritical: onShowCritical),
          1 => const CommonSearchBar(hint: '搜索异常、运单或线路'),
          2 => CommonFilterBar(
            items: filters,
            selected: {criticalOnly ? 'critical' : 'all'},
            onSelected: (value) {
              if (value == 'critical') onShowCritical();
            },
          ),
          3 =>
            variant == ColdChainV2Variant.empty
                ? const SizedBox(
                    height: 240,
                    child: CommonEmptyState(
                      title: '没有待处理异常',
                      description: '当前筛选范围内的运输温度全部正常。',
                      icon: Icons.inbox_outlined,
                    ),
                  )
                : _ExceptionList(rows: rows, onOpen: onOpenException),
          _ => Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: TS.spacing.lg),
              child: Text('没有更多了', style: TS.textStyle.caption),
            ),
          ),
        };
      },
    );
  }
}

class _RiskSummary extends StatelessWidget {
  const _RiskSummary({required this.onShowCritical});

  final VoidCallback onShowCritical;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      title: '当前风险',
      subtitle: '华东区域 · 14:35 更新',
      elevated: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Expanded(
                child: _RiskMetric(
                  icon: Icons.warning_amber_rounded,
                  value: '2',
                  label: '严重异常',
                  critical: true,
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: _RiskMetric(
                  icon: Icons.ac_unit,
                  value: '2',
                  label: '等待接手',
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: _RiskMetric(
                  icon: Icons.schedule,
                  value: '47m',
                  label: '最长超温',
                ),
              ),
            ],
          ),
          SizedBox(height: TS.spacing.smPlus),
          CommonButton(
            label: '仅看严重异常',
            tone: CommonButtonTone.error,
            variant: CommonButtonVariant.tonal,
            size: CommonControlSize.sm,
            onPressed: onShowCritical,
          ),
        ],
      ),
    );
  }
}

class _RiskMetric extends StatelessWidget {
  const _RiskMetric({
    required this.icon,
    required this.value,
    required this.label,
    this.critical = false,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool critical;

  @override
  Widget build(BuildContext context) {
    final color = critical ? TS.colors.error : TS.colors.onSurface;
    return Container(
      height: 72,
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: critical ? TS.colors.errorSoft : TS.colors.surfaceVariant,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: TS.sizing.iconMd),
              SizedBox(width: TS.spacing.xs),
              Text(value, style: TS.textStyle.title.copyWith(color: color)),
            ],
          ),
          Text(label, style: TS.textStyle.caption),
        ],
      ),
    );
  }
}

class _ExceptionList extends StatelessWidget {
  const _ExceptionList({required this.rows, required this.onOpen});

  final List<ColdChainException> rows;
  final ValueChanged<ColdChainException> onOpen;

  @override
  Widget build(BuildContext context) {
    return CommonDataList(
      divided: false,
      surface: CommonDataListSurface.none,
      rounded: CommonDataListRounded.none,
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          _ExceptionRow(
            exception: rows[index],
            onTap: () => onOpen(rows[index]),
          ),
          if (index < rows.length - 1) SizedBox(height: TS.spacing.smPlus),
        ],
      ],
    );
  }
}

class _ExceptionRow extends StatelessWidget {
  const _ExceptionRow({required this.exception, required this.onTap});

  final ColdChainException exception;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final severity = switch (exception.severity) {
      ColdChainSeverity.critical => ('严重', CommonButtonTone.error),
      ColdChainSeverity.warning => ('警告', CommonButtonTone.secondary),
      ColdChainSeverity.watch => ('关注', CommonButtonTone.primary),
    };
    final temperatureColor = exception.severity == ColdChainSeverity.watch
        ? TS.colors.warning
        : exception.severity == ColdChainSeverity.warning
        ? TS.colors.warning
        : TS.colors.error;

    return CommonCard(
      elevated: false,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${exception.id} · ${exception.shipmentId}',
                  style: TS.textStyle.content,
                ),
              ),
              CommonBadge(label: severity.$1, tone: severity.$2),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          Text(
            '${exception.origin} → ${exception.destination}',
            style: TS.textStyle.titleSm,
          ),
          SizedBox(height: TS.spacing.xs),
          Text(exception.cargo, style: TS.textStyle.content),
          SizedBox(height: TS.spacing.sm),
          Divider(height: 1, color: TS.colors.border),
          SizedBox(height: TS.spacing.sm),
          Row(
            children: [
              Icon(
                Icons.thermostat_outlined,
                size: TS.sizing.iconMd,
                color: TS.colors.onSurfaceMuted,
              ),
              SizedBox(width: TS.spacing.xs),
              Text(
                '${exception.temperature.toStringAsFixed(1)}°C',
                style: TS.textStyle.label.copyWith(color: temperatureColor),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: Text(
                  '上限 8°C · 已持续 ${exception.durationMinutes} 分钟',
                  style: TS.textStyle.caption,
                ),
              ),
              Text(exception.updatedAt, style: TS.textStyle.caption),
            ],
          ),
        ],
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CommonSpinner(label: '正在同步运输监控数据', size: CommonControlSize.lg),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: Container(
        margin: EdgeInsets.all(TS.spacing.md),
        padding: EdgeInsets.all(TS.spacing.xl),
        decoration: BoxDecoration(
          color: TS.colors.errorSoft,
          borderRadius: BorderRadius.circular(TS.radius.lg),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.warning_amber_rounded, size: 40, color: TS.colors.error),
            SizedBox(height: TS.spacing.md),
            Text(
              '监控数据暂时不可用',
              style: TS.textStyle.title.copyWith(color: TS.colors.error),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: TS.spacing.md),
            Text(
              '最后一次成功同步为 14:28，请检查连接后重试。',
              style: TS.textStyle.content.copyWith(color: TS.colors.error),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: TS.spacing.md),
            CommonButton(
              label: '重新加载',
              tone: CommonButtonTone.primary,
              onPressed: () {},
            ),
          ],
        ),
      ),
    );
  }
}
