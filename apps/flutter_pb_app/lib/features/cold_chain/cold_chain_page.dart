import 'package:flutter/material.dart';

import '../../common/widgets/widgets.dart';
import '../../theme/ts.dart';

class ColdChainException {
  const ColdChainException({
    required this.id,
    required this.shipment,
    required this.route,
    required this.cargo,
    required this.cases,
    required this.temperature,
    required this.duration,
    required this.time,
    required this.severity,
  });

  final String id;
  final String shipment;
  final String route;
  final String cargo;
  final int cases;
  final double temperature;
  final int duration;
  final String time;
  final String severity;
}

const _exceptions = [
  ColdChainException(
    id: 'EX-017',
    shipment: 'SH-2048',
    route: '上海虹桥 → 杭州临平',
    cargo: '生物制剂',
    cases: 18,
    temperature: 10.8,
    duration: 47,
    time: '14:32',
    severity: '严重',
  ),
  ColdChainException(
    id: 'EX-031',
    shipment: 'SH-2196',
    route: '苏州园区 → 南京江宁',
    cargo: '细胞样本',
    cases: 6,
    temperature: 9.7,
    duration: 28,
    time: '14:26',
    severity: '严重',
  ),
  ColdChainException(
    id: 'EX-024',
    shipment: 'SH-2113',
    route: '无锡新吴 → 常州武进',
    cargo: '胰岛素',
    cases: 32,
    temperature: 8.4,
    duration: 12,
    time: '14:19',
    severity: '警告',
  ),
  ColdChainException(
    id: 'EX-029',
    shipment: 'SH-2164',
    route: '嘉兴南湖 → 宁波北仑',
    cargo: '检测试剂',
    cases: 24,
    temperature: 7.8,
    duration: 6,
    time: '14:11',
    severity: '关注',
  ),
];

class ColdChainPage extends StatefulWidget {
  const ColdChainPage({super.key});

  @override
  State<ColdChainPage> createState() => _ColdChainPageState();
}

class _ColdChainPageState extends State<ColdChainPage> {
  String _filter = '全部';
  String _query = '';

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    final items = _exceptions.where((item) {
      final matchesFilter = _filter == '全部' || item.severity == _filter;
      final q = _query.trim();
      final matchesQuery =
          q.isEmpty || '${item.id} ${item.shipment} ${item.route}'.contains(q);
      return matchesFilter && matchesQuery;
    }).toList();

    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '冷链异常'),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          CommonCard(
            title: '当前风险',
            subtitle: '华东区域 · 14:35 更新',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _Metric(
                      label: '严重异常',
                      value: '2',
                      tone: CommonChipTone.error,
                      icon: Icons.warning_amber_rounded,
                    ),
                    SizedBox(width: TS.spacing.sm),
                    _Metric(
                      label: '等待接手',
                      value: '2',
                      tone: CommonChipTone.secondary,
                      icon: Icons.ac_unit,
                    ),
                    SizedBox(width: TS.spacing.sm),
                    _Metric(
                      label: '最长超温',
                      value: '47m',
                      tone: CommonChipTone.secondary,
                      icon: Icons.access_time,
                    ),
                  ],
                ),
                SizedBox(height: TS.spacing.sm),
                CommonChip(
                  label: '仅看严重异常',
                  tone: CommonChipTone.error,
                  onTap: () =>
                      setState(() => _filter = _filter == '严重' ? '全部' : '严重'),
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.md),
          CommonSearchBar(
            hint: '搜索异常、运单或线路',
            onChanged: (value) => setState(() => _query = value),
          ),
          SizedBox(height: TS.spacing.sm),
          Wrap(
            spacing: TS.spacing.xs,
            children: [
              for (final value in ['全部', '严重', '警告', '关注'])
                CommonChip(
                  label: value,
                  selected: _filter == value,
                  onTap: () => setState(() => _filter = value),
                ),
            ],
          ),
          SizedBox(height: TS.spacing.sm),
          for (final item in items) ...[
            _ExceptionCard(
              item: item,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ShipmentDetailPage(exception: item),
                ),
              ),
            ),
            SizedBox(height: TS.spacing.sm),
          ],
          if (items.isEmpty) const CommonEmptyState(title: '没有匹配的异常'),
          if (items.isNotEmpty)
            Padding(
              padding: EdgeInsets.all(TS.spacing.md),
              child: Center(child: Text('没有更多了', style: TS.textStyle.caption)),
            ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    required this.tone,
    required this.icon,
  });
  final String label;
  final String value;
  final CommonChipTone tone;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final color = tone == CommonChipTone.error
        ? TS.colors.error
        : TS.colors.onSurface;
    final bg = tone == CommonChipTone.error
        ? TS.colors.errorSoft
        : TS.colors.surfaceVariant;
    return Expanded(
      child: Container(
        padding: EdgeInsets.all(TS.spacing.sm),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(TS.radius.lg),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color),
                SizedBox(width: TS.spacing.xs),
                Text(value, style: TS.textStyle.titleLg.copyWith(color: color)),
              ],
            ),
            SizedBox(height: TS.spacing.xs),
            Text(label, style: TS.textStyle.caption),
          ],
        ),
      ),
    );
  }
}

class _ExceptionCard extends StatelessWidget {
  const _ExceptionCard({required this.item, required this.onTap});
  final ColdChainException item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tone = item.severity == '严重'
        ? CommonChipTone.error
        : item.severity == '警告'
        ? CommonChipTone.warning
        : CommonChipTone.secondary;
    return CommonCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${item.id} · ${item.shipment}',
                  style: TS.textStyle.bodyLg,
                ),
              ),
              CommonChip(label: item.severity, tone: tone),
            ],
          ),
          SizedBox(height: TS.spacing.xs),
          Text(item.route, style: TS.textStyle.titleSm),
          SizedBox(height: TS.spacing.xs),
          Text('${item.cargo} · ${item.cases} 箱', style: TS.textStyle.bodyLg),
          SizedBox(height: TS.spacing.sm),
          const Divider(),
          Row(
            children: [
              Icon(Icons.thermostat, color: TS.colors.onSurfaceMuted),
              SizedBox(width: TS.spacing.xs),
              Text(
                '${item.temperature}°C',
                style: TS.textStyle.label.copyWith(
                  color: item.severity == '严重' ? TS.colors.error : null,
                ),
              ),
              SizedBox(width: TS.spacing.sm),
              Expanded(
                child: Text(
                  '上限 8°C · 已持续 ${item.duration} 分钟',
                  style: TS.textStyle.content,
                ),
              ),
              Text(item.time, style: TS.textStyle.caption),
            ],
          ),
        ],
      ),
    );
  }
}

class ShipmentDetailPage extends StatelessWidget {
  const ShipmentDetailPage({super.key, required this.exception});
  final ColdChainException exception;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '运输详情', showBack: true),
      body: ListView(
        padding: EdgeInsets.all(TS.spacing.md),
        children: [
          _AlertBanner(
            title: '持续超温 ${exception.duration} 分钟',
            subtitle: '当前 ${exception.temperature}°C，已高于运输上限 2.8°C',
          ),
          SizedBox(height: TS.spacing.md),
          CommonCard(
            title: '运输概览',
            subtitle: '${exception.shipment} · 预计 16:20 到达',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.ac_unit),
                    SizedBox(width: 8),
                    Expanded(child: Text('上海虹桥冷库', style: TS.textStyle.bodyLg)),
                    const Icon(Icons.location_on_outlined),
                    SizedBox(width: 8),
                    Expanded(child: Text('杭州临平中心', style: TS.textStyle.bodyLg)),
                  ],
                ),
                SizedBox(height: TS.spacing.md),
                _InfoGrid(
                  items: const [
                    ('货物', '生物制剂 · 18 箱'),
                    ('车辆', '沪A·7K21 · 周其明'),
                    ('设备', '探头 T-07 · 2 分钟/次'),
                    ('温区', '2–8°C'),
                  ],
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.md),
          CommonCard(
            title: '箱温趋势',
            subtitle: '最近 70 分钟 · 上限 8°C',
            child: _TemperatureBars(),
          ),
          SizedBox(height: TS.spacing.md),
          CommonCard(
            title: '运输事件',
            subtitle: '自动记录与人工操作合并展示',
            child: Column(
              children: const [
                _Event(
                  time: '11:48',
                  title: '冷库交接完成',
                  detail: '探头 T-07 校准正常，箱温 4.6°C',
                ),
                _Event(
                  time: '12:16',
                  title: '车辆离开上海虹桥冷库',
                  detail: '司机 周其明 · 沪A·7K21',
                ),
                _Event(
                  time: '13:45',
                  title: '温度接近上限',
                  detail: '连续 5 分钟高于 7.5°C',
                ),
                _Event(
                  time: '14:02',
                  title: '确认持续超温',
                  detail: '超过 8°C 已持续 30 分钟，自动升级为严重',
                ),
              ],
            ),
          ),
          SizedBox(height: TS.spacing.md),
          CommonButton(
            label: '开始处置',
            block: true,
            onPressed: () => _showActionSheet(context),
          ),
        ],
      ),
    );
  }

  void _showActionSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: TS.colors.surface,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: EdgeInsets.all(TS.spacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: Text('选择处置方式', style: TS.textStyle.title)),
                  TextButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    child: const Text('关闭'),
                  ),
                ],
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: '填写处置记录',
                block: true,
                onPressed: () {
                  Navigator.pop(sheetContext);
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ResolutionFormPage(exception: exception),
                    ),
                  );
                },
              ),
              SizedBox(height: TS.spacing.sm),
              CommonButton(
                label: '仅确认接手',
                block: true,
                variant: CommonButtonVariant.outlined,
                onPressed: () => Navigator.pop(sheetContext),
              ),
              SizedBox(height: TS.spacing.sm),
              Text('确认接手不会关闭异常，提交处置记录后才会进入持续监控。', style: TS.textStyle.caption),
            ],
          ),
        ),
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  const _AlertBanner({required this.title, required this.subtitle});
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.all(TS.spacing.md),
    decoration: BoxDecoration(
      color: TS.colors.errorSoft,
      borderRadius: BorderRadius.circular(TS.radius.lg),
    ),
    child: Row(
      children: [
        Icon(Icons.warning_amber_rounded, color: TS.colors.error, size: 34),
        SizedBox(width: TS.spacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TS.textStyle.title.copyWith(color: TS.colors.error),
              ),
              Text(subtitle, style: TS.textStyle.content),
            ],
          ),
        ),
        CommonChip(label: '严重', tone: CommonChipTone.error),
      ],
    ),
  );
}

class _InfoGrid extends StatelessWidget {
  const _InfoGrid({required this.items});
  final List<(String, String)> items;
  @override
  Widget build(BuildContext context) => GridView.count(
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    crossAxisCount: 2,
    childAspectRatio: 2.6,
    children: [
      for (final item in items)
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item.$1, style: TS.textStyle.caption),
            Text(item.$2, style: TS.textStyle.content),
          ],
        ),
    ],
  );
}

class _TemperatureBars extends StatelessWidget {
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 170,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        for (final value in [7.6, 7.8, 8.1, 8.7, 9.3, 10.1, 10.8, 10.8])
          Container(
            width: 24,
            height: value * 10,
            color: value > 8 ? TS.colors.error : TS.colors.primary,
          ),
      ],
    ),
  );
}

class _Event extends StatelessWidget {
  const _Event({required this.time, required this.title, required this.detail});
  final String time;
  final String title;
  final String detail;
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: TS.spacing.sm),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(width: 44, child: Text(time, style: TS.textStyle.caption)),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TS.textStyle.label),
              Text(detail, style: TS.textStyle.caption),
            ],
          ),
        ),
      ],
    ),
  );
}

class ResolutionFormPage extends StatefulWidget {
  const ResolutionFormPage({super.key, required this.exception});
  final ColdChainException exception;
  @override
  State<ResolutionFormPage> createState() => _ResolutionFormPageState();
}

class _ResolutionFormPageState extends State<ResolutionFormPage> {
  String? _cause = '制冷机组异常';
  String? _action = '切换备用制冷';
  String _outcome = '温度开始回落';
  String? _supervisor;
  bool _driver = true;
  bool _cooling = true;
  bool _cargo = true;
  final _notes = TextEditingController();
  bool _error = false;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Scaffold(
      backgroundColor: TS.colors.background,
      appBar: const CommonAppBar(title: '提交处置', showBack: true),
      body: Form(
        child: ListView(
          padding: EdgeInsets.all(TS.spacing.md),
          children: [
            _AlertBanner(
              title: '${widget.exception.shipment} · 严重超温',
              subtitle:
                  '当前 ${widget.exception.temperature}°C · 上限 8°C · 已持续 ${widget.exception.duration} 分钟',
            ),
            if (_error) ...[
              SizedBox(height: TS.spacing.md),
              _AlertBanner(title: '超温已持续 47 分钟，必须指定值班主管后才能提交。', subtitle: ''),
            ],
            SizedBox(height: TS.spacing.md),
            CommonCard(
              title: '处置判断  必填',
              subtitle: '根据司机反馈与设备状态记录本次异常原因。',
              child: Column(
                children: [
                  CommonSelect<String>(
                    label: '异常原因',
                    value: _cause,
                    options: const [
                      CommonSelectOption(value: '制冷机组异常', label: '制冷机组异常'),
                      CommonSelectOption(value: '传感器异常', label: '传感器异常'),
                    ],
                    onChanged: (v) => setState(() => _cause = v),
                  ),
                  SizedBox(height: TS.spacing.sm),
                  CommonSelect<String>(
                    label: '处置动作',
                    value: _action,
                    options: const [
                      CommonSelectOption(value: '切换备用制冷', label: '切换备用制冷'),
                      CommonSelectOption(value: '联系维修', label: '联系维修'),
                    ],
                    onChanged: (v) => setState(() => _action = v),
                  ),
                  SizedBox(height: TS.spacing.sm),
                  CommonRadioGroup<String>(
                    label: '当前结果',
                    value: _outcome,
                    options: const [
                      CommonSelectOption(value: '温度开始回落', label: '温度开始回落'),
                      CommonSelectOption(value: '温度仍在上升', label: '温度仍在上升'),
                      CommonSelectOption(value: '暂时无法确认', label: '暂时无法确认'),
                    ],
                    onChanged: (v) => setState(() => _outcome = v ?? _outcome),
                  ),
                ],
              ),
            ),
            SizedBox(height: TS.spacing.md),
            CommonCard(
              title: '现场确认  必填',
              subtitle: '以下检查项会进入交付记录。',
              child: Column(
                children: [
                  CommonCheckbox(
                    value: _driver,
                    label: '已联系司机并确认车辆安全',
                    onChanged: (v) => setState(() => _driver = v ?? false),
                  ),
                  CommonCheckbox(
                    value: _cooling,
                    label: '已检查主制冷与备用制冷状态',
                    onChanged: (v) => setState(() => _cooling = v ?? false),
                  ),
                  CommonCheckbox(
                    value: _cargo,
                    label: '货箱未开封且无可见损伤',
                    onChanged: (v) => setState(() => _cargo = v ?? false),
                  ),
                ],
              ),
            ),
            SizedBox(height: TS.spacing.md),
            CommonCard(
              title: '后续安排',
              subtitle: '提交后调度中心将按此安排继续跟踪。',
              child: Column(
                children: [
                  CommonCheckbox(
                    value: true,
                    label: '保持每 2 分钟温度监控',
                    enabled: false,
                  ),
                  CommonTextArea(
                    controller: _notes,
                    label: '处置说明',
                    minLines: 4,
                    maxLines: 5,
                  ),
                ],
              ),
            ),
            SizedBox(height: TS.spacing.md),
            CommonCard(
              title: '主管审批  必填',
              subtitle: '持续超温超过 45 分钟时，提交前必须由值班主管复核。',
              child: Column(
                children: [
                  CommonSelect<String>(
                    label: '值班主管',
                    value: _supervisor,
                    hint: '请选择值班主管',
                    options: const [
                      CommonSelectOption(value: '李敏', label: '李敏'),
                      CommonSelectOption(value: '王强', label: '王强'),
                    ],
                    onChanged: (v) => setState(() => _supervisor = v),
                  ),
                  SizedBox(height: TS.spacing.xs),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      '当前异常持续 47 分钟，已触发主管审批阈值。',
                      style: TS.textStyle.caption,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(height: TS.spacing.md),
            CommonButton(label: '审核并提交', block: true, onPressed: _submit),
          ],
        ),
      ),
    );
  }

  void _submit() {
    if (_supervisor == null ||
        !_driver ||
        !_cooling ||
        !_cargo ||
        _cause == null ||
        _action == null) {
      setState(() => _error = true);
      return;
    }
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('确认提交处置记录?'),
        content: const Text('提交后异常将转为持续监控，当前记录不可直接覆盖。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('取消'),
          ),
          CommonButton(
            label: '确认提交',
            onPressed: () {
              Navigator.pop(dialogContext);
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }
}
