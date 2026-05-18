#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exampleRoot = path.join(repoRoot, 'examples/vue3-to-flutter');
const sourceRoot = path.join(exampleRoot, 'source-vue3');
const targetRoot = path.join(exampleRoot, 'target-flutter');
const configPath = path.join(exampleRoot, 'proto-bridge.config.json');
const cliPath = path.join(repoRoot, 'packages/cli/dist/index.js');
const protoModuleRoot = path.join(targetRoot, 'lib/app/modules/account/_proto');
const devPort = await findAvailablePort(5173);
const baseUrl = `http://127.0.0.1:${devPort}`;

const pages = [
  {
    label: 'simple',
    url: `${baseUrl}/#/prototype/asset/holding-list`,
    output: path.join(exampleRoot, 'output/simple'),
  },
  {
    label: 'complex',
    url: `${baseUrl}/#/prototype/asset/pnl-analysis?tab=overview`,
    output: path.join(exampleRoot, 'output/complex'),
  },
];

let devServer;

async function main() {
  try {
    step('Installing Vue example dependencies...');
    if (!existsSync(path.join(sourceRoot, 'node_modules'))) {
      await run('pnpm', ['install'], { cwd: repoRoot });
    }

    step('Building ProtoBridge packages...');
    await run('pnpm', ['run', 'build'], { cwd: repoRoot });

    step('Checking Vue source build...');
    await run('pnpm', ['--dir', sourceRoot, 'build'], { cwd: repoRoot });

    step('Starting Vue prototype server...');
    devServer = spawn('pnpm', ['--dir', sourceRoot, 'exec', 'vite', '--host', '127.0.0.1', '--port', String(devPort), '--strictPort'], {
      cwd: repoRoot,
      env: process.env,
      stdio: 'ignore',
    });
    await waitForHttp(baseUrl);

    for (const page of pages) {
      step(`Generating ${page.label} ProtoBridge output...`);
      await run('node', [
        cliPath,
        'generate',
        '--config',
        configPath,
        '--url',
        page.url,
        '--output',
        page.output,
        '--source-brief',
      ], { cwd: repoRoot });
    }

    step('Generating Flutter _proto pages...');
    await writeProtoFlutterFiles();

    step('Example output and Flutter _proto pages are ready.');
    console.log();
    console.log('Generated but git-ignored:');
    console.log(`  ${path.relative(repoRoot, path.join(exampleRoot, 'output'))}`);
    console.log(`  ${path.relative(repoRoot, protoModuleRoot)}`);
    console.log(`  ${path.relative(repoRoot, path.join(targetRoot, 'lib/main_proto.dart'))}`);
    console.log(`  ${path.relative(repoRoot, path.join(targetRoot, 'lib/app/app_proto.dart'))}`);
    console.log(`  ${path.relative(repoRoot, path.join(targetRoot, 'lib/app/routes/app_pages_proto.dart'))}`);
    console.log();
    console.log('Recommended reading order:');
    for (const page of pages) {
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-review.md`);
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/ui-build-plan.json`);
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/page-debug-index.json`);
      console.log(`  ${page.label}: ${path.relative(repoRoot, page.output)}/page-canonical.json`);
    }
    console.log();
    console.log('Run pnpm run example:dev or pnpm run example:android to open the generated pages.');
  } finally {
    if (devServer && !devServer.killed) devServer.kill('SIGTERM');
  }
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 1}`));
    });
  });
}

async function writeProtoFlutterFiles() {
  await mkdir(path.join(targetRoot, 'lib/app/routes'), { recursive: true });
  await mkdir(protoModuleRoot, { recursive: true });
  await writeFile(path.join(targetRoot, 'lib/main_proto.dart'), mainProtoDart);
  await writeFile(path.join(targetRoot, 'lib/app/app_proto.dart'), appProtoDart);
  await writeFile(path.join(targetRoot, 'lib/app/routes/app_pages_proto.dart'), appPagesProtoDart);
  await writeFile(path.join(protoModuleRoot, 'account_proto_models.dart'), accountProtoModelsDart);
  await writeFile(path.join(protoModuleRoot, 'account_proto_repository.dart'), accountProtoRepositoryDart);
  await writeFile(path.join(protoModuleRoot, 'account_proto_widgets.dart'), accountProtoWidgetsDart);
  await writeFile(path.join(protoModuleRoot, 'account_proto_pages.dart'), accountProtoPagesDart);
}

async function waitForHttp(url) {
  const deadline = Date.now() + 30_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${url}${lastError ? `: ${lastError.message}` : ''}`);
}

function step(message) {
  console.log(`● ${message}`);
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`Unable to find an available port near ${startPort}`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, '127.0.0.1');
  });
}

const mainProtoDart = String.raw`import 'package:flutter/material.dart';

import 'app/app_proto.dart';

void main() {
  runApp(const ProtoBridgeGeneratedApp());
}
`;

const appProtoDart = String.raw`import 'package:flutter/material.dart';

import 'routes/app_pages_proto.dart';
import 'routes/app_routes.dart';
import 'theme/app_theme.dart';

class ProtoBridgeGeneratedApp extends StatelessWidget {
  const ProtoBridgeGeneratedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ProtoBridge Generated Target',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      initialRoute: Routes.home,
      onGenerateRoute: AppPagesProto.onGenerateRoute,
    );
  }
}
`;

const appPagesProtoDart = String.raw`import 'package:flutter/material.dart';

import '../example_home_page.dart';
import '../modules/account/_proto/account_proto_pages.dart';
import 'app_routes.dart';

class AppPagesProto {
  const AppPagesProto._();

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case Routes.pnlAnalysis:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ProtoPnlAnalysisPage(),
        );
      case Routes.holdingList:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ProtoHoldingListPage(),
        );
      case Routes.home:
      default:
        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) => const ExampleHomePage(),
        );
    }
  }
}
`;

const accountProtoModelsDart = String.raw`enum ProtoMetricTone { positive, negative, neutral }

class ProtoHoldingSummary {
  const ProtoHoldingSummary({
    required this.marketValue,
    required this.dayPnl,
    required this.dayPnlRate,
    required this.riskLevel,
  });

  final String marketValue;
  final String dayPnl;
  final String dayPnlRate;
  final String riskLevel;
}

class ProtoHolding {
  const ProtoHolding({
    required this.symbol,
    required this.name,
    required this.sector,
    required this.amount,
    required this.shares,
    required this.pnl,
    required this.pnlRate,
    required this.isPositive,
  });

  final String symbol;
  final String name;
  final String sector;
  final String amount;
  final String shares;
  final String pnl;
  final String pnlRate;
  final bool isPositive;
}

class ProtoPnlMetric {
  const ProtoPnlMetric({
    required this.label,
    required this.value,
    required this.delta,
    required this.tone,
  });

  final String label;
  final String value;
  final String delta;
  final ProtoMetricTone tone;
}

class ProtoPnlRecord {
  const ProtoPnlRecord({
    required this.symbol,
    required this.action,
    required this.time,
    required this.amount,
    required this.risk,
  });

  final String symbol;
  final String action;
  final String time;
  final String amount;
  final String risk;

  bool get isPositive => !amount.startsWith('-');
}
`;

const accountProtoRepositoryDart = String.raw`import 'account_proto_models.dart';

class ProtoAccountRepository {
  const ProtoAccountRepository();

  ProtoHoldingSummary loadSummary() {
    return const ProtoHoldingSummary(
      marketValue: r'$128,420.36',
      dayPnl: r'+$2,364.20',
      dayPnlRate: '+1.87%',
      riskLevel: 'Balanced',
    );
  }

  List<ProtoHolding> loadHoldings() {
    return const [
      ProtoHolding(
        symbol: 'NVDA',
        name: 'NVIDIA Corp.',
        sector: 'Semiconductor',
        amount: r'$42,300.00',
        shares: '120',
        pnl: r'+$6,830.20',
        pnlRate: '+19.2%',
        isPositive: true,
      ),
      ProtoHolding(
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Consumer Electronics',
        amount: r'$28,740.80',
        shares: '160',
        pnl: r'+$1,420.10',
        pnlRate: '+5.2%',
        isPositive: true,
      ),
      ProtoHolding(
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        sector: 'EV',
        amount: r'$18,620.60',
        shares: '48',
        pnl: r'-$840.30',
        pnlRate: '-4.3%',
        isPositive: false,
      ),
    ];
  }

  List<ProtoPnlMetric> loadMetrics() {
    return const [
      ProtoPnlMetric(
        label: 'Total P&L',
        value: r'+$18,206',
        delta: '+12.8%',
        tone: ProtoMetricTone.positive,
      ),
      ProtoPnlMetric(
        label: 'Realized',
        value: r'+$7,418',
        delta: '+4.6%',
        tone: ProtoMetricTone.positive,
      ),
      ProtoPnlMetric(
        label: 'Unrealized',
        value: r'+$10,788',
        delta: '+8.2%',
        tone: ProtoMetricTone.positive,
      ),
      ProtoPnlMetric(
        label: 'Risk Budget',
        value: '63%',
        delta: '-5 pts',
        tone: ProtoMetricTone.neutral,
      ),
    ];
  }

  List<ProtoPnlRecord> loadRecords() {
    return const [
      ProtoPnlRecord(
        symbol: 'NVDA',
        action: 'Take Profit',
        time: '09:42',
        amount: r'+$2,180.00',
        risk: 'Medium',
      ),
      ProtoPnlRecord(
        symbol: 'AAPL',
        action: 'Covered Call',
        time: '10:18',
        amount: r'+$620.40',
        risk: 'Low',
      ),
      ProtoPnlRecord(
        symbol: 'TSLA',
        action: 'Stop Loss',
        time: '11:05',
        amount: r'-$430.20',
        risk: 'High',
      ),
      ProtoPnlRecord(
        symbol: 'MSFT',
        action: 'Add Position',
        time: '13:24',
        amount: r'+$780.90',
        risk: 'Medium',
      ),
    ];
  }

  List<double> loadTrendPoints() {
    return const [22, 31, 28, 45, 43, 61, 57, 74];
  }
}
`;

const accountProtoWidgetsDart = String.raw`// ignore_for_file: prefer_interpolation_to_compose_strings

import 'package:flutter/material.dart';

import '../../../common/widgets/section_panel.dart';
import '../../../theme/app_tokens.dart';
import '../../../theme/theme_service.dart';
import 'account_proto_models.dart';

class ProtoSummaryCard extends StatelessWidget {
  const ProtoSummaryCard({required this.summary, super.key});

  final ProtoHoldingSummary summary;

  @override
  Widget build(BuildContext context) {
    return SectionPanel(
      child: Row(
        children: [
          Expanded(child: _Metric(label: 'Market value', value: summary.marketValue)),
          Expanded(
            child: _Metric(
              label: 'Today P&L',
              value: summary.dayPnl,
              caption: summary.dayPnlRate,
              positive: true,
            ),
          ),
          Expanded(child: _Metric(label: 'Risk', value: summary.riskLevel)),
        ],
      ),
    );
  }
}

class ProtoFilterBar extends StatelessWidget {
  const ProtoFilterBar({
    required this.options,
    required this.selected,
    required this.onSelected,
    super.key,
  });

  final List<String> options;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: options.map((option) {
          final active = option == selected;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: ChoiceChip(
              selected: active,
              showCheckmark: false,
              visualDensity: VisualDensity.compact,
              labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
              label: Text(option),
              onSelected: (_) => onSelected(option),
              selectedColor: themeService.colors.primarySoft,
              shape: RoundedRectangleBorder(
                side: BorderSide(
                  color: active ? themeService.colors.primary : themeService.colors.border,
                ),
                borderRadius: BorderRadius.circular(AppRadii.chip),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class ProtoHoldingTile extends StatelessWidget {
  const ProtoHoldingTile({required this.holding, super.key});

  final ProtoHolding holding;

  @override
  Widget build(BuildContext context) {
    final pnlColor = holding.isPositive
        ? themeService.colors.positive
        : themeService.colors.negative;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(flex: 12, child: _TextStack(title: holding.symbol, subtitle: holding.name)),
          Expanded(
            flex: 10,
            child: _TextStack(title: holding.amount, subtitle: holding.shares + ' shares'),
          ),
          Expanded(
            flex: 8,
            child: _TextStack(
              title: holding.pnl,
              subtitle: holding.pnlRate,
              alignEnd: true,
              color: pnlColor,
            ),
          ),
        ],
      ),
    );
  }
}

class ProtoMetricCard extends StatelessWidget {
  const ProtoMetricCard({required this.metric, super.key});

  final ProtoPnlMetric metric;

  @override
  Widget build(BuildContext context) {
    final color = switch (metric.tone) {
      ProtoMetricTone.positive => themeService.colors.positive,
      ProtoMetricTone.negative => themeService.colors.negative,
      ProtoMetricTone.neutral => themeService.colors.text,
    };
    return SectionPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(metric.label, style: TextStyle(color: themeService.colors.muted, fontSize: 12)),
          const SizedBox(height: AppSpacing.xs),
          Text(metric.value, style: themeService.textStyles.metric.copyWith(color: color)),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            metric.delta,
            style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class ProtoRecordTile extends StatelessWidget {
  const ProtoRecordTile({required this.record, required this.onTap, super.key});

  final ProtoPnlRecord record;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final amountColor = record.isPositive
        ? themeService.colors.positive
        : themeService.colors.negative;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          children: [
            Expanded(
              child: _TextStack(
                title: record.symbol,
                subtitle: record.action + ' · ' + record.time,
              ),
            ),
            _TextStack(
              title: record.amount,
              subtitle: record.risk,
              alignEnd: true,
              color: amountColor,
            ),
          ],
        ),
      ),
    );
  }
}

class ProtoTrendChart extends StatelessWidget {
  const ProtoTrendChart({required this.points, super.key});

  final List<double> points;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 132,
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: themeService.colors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: CustomPaint(
        painter: _TrendChartPainter(points),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.label,
    required this.value,
    this.caption,
    this.positive = false,
  });

  final String label;
  final String value;
  final String? caption;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    final color = positive ? themeService.colors.positive : themeService.colors.text;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: themeService.colors.muted, fontSize: 12)),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            value,
            style: themeService.textStyles.bodyStrong.copyWith(color: color),
            overflow: TextOverflow.ellipsis,
          ),
          if (caption != null)
            Text(caption!, style: TextStyle(color: themeService.colors.positive, fontSize: 12)),
        ],
      ),
    );
  }
}

class _TextStack extends StatelessWidget {
  const _TextStack({
    required this.title,
    required this.subtitle,
    this.alignEnd = false,
    this.color,
  });

  final String title;
  final String subtitle;
  final bool alignEnd;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: themeService.textStyles.bodyStrong.copyWith(color: color),
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          subtitle,
          style: TextStyle(color: color ?? themeService.colors.muted, fontSize: 12),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

class _TrendChartPainter extends CustomPainter {
  const _TrendChartPainter(this.points);

  final List<double> points;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [themeService.colors.primary, const Color(0xFF48A6A7)],
      ).createShader(Offset.zero & size);
    const gap = 8.0;
    final width = (size.width - gap * (points.length - 1)) / points.length;
    for (var i = 0; i < points.length; i++) {
      final height = size.height * (points[i].clamp(0, 100) / 100);
      final left = i * (width + gap);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(left, size.height - height, width, height),
        const Radius.circular(6),
      );
      canvas.drawRRect(rect, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _TrendChartPainter oldDelegate) {
    return oldDelegate.points != points;
  }
}
`;

const accountProtoPagesDart = String.raw`// ignore_for_file: prefer_interpolation_to_compose_strings

import 'package:flutter/material.dart';

import '../../../common/widgets/common_app_bar.dart';
import '../../../common/widgets/common_button.dart';
import '../../../common/widgets/common_empty.dart';
import '../../../common/widgets/common_loading.dart';
import '../../../common/widgets/section_panel.dart';
import '../../../routes/app_routes.dart';
import '../../../theme/app_tokens.dart';
import '../../../theme/theme_service.dart';
import 'account_proto_models.dart';
import 'account_proto_repository.dart';
import 'account_proto_widgets.dart';

class ProtoHoldingListPage extends StatefulWidget {
  const ProtoHoldingListPage({super.key});

  @override
  State<ProtoHoldingListPage> createState() => _ProtoHoldingListPageState();
}

class _ProtoHoldingListPageState extends State<ProtoHoldingListPage> {
  static const filters = ['All', 'Semiconductor', 'Consumer Electronics', 'EV'];
  final repository = const ProtoAccountRepository();
  late final summary = repository.loadSummary();
  late final holdings = repository.loadHoldings();
  var selectedFilter = 'All';
  var loading = false;

  List<ProtoHolding> get filteredHoldings {
    if (selectedFilter == 'All') return holdings;
    return holdings.where((item) => item.sector == selectedFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CommonAppBar(
        title: 'Portfolio Holdings',
        eyebrow: 'Generated _proto',
        action: IconButton.filledTonal(
          icon: const Icon(Icons.refresh),
          onPressed: _refresh,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.lg,
        ),
        children: [
          ProtoSummaryCard(summary: summary),
          const SizedBox(height: AppSpacing.md),
          ProtoFilterBar(
            options: filters,
            selected: selectedFilter,
            onSelected: (value) => setState(() => selectedFilter = value),
          ),
          const SizedBox(height: AppSpacing.md),
          SectionPanel(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.xs,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Positions',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                      ),
                    ),
                    Text(filteredHoldings.length.toString() + ' items'),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                if (loading)
                  const CommonLoading(message: 'Refreshing positions...')
                else if (filteredHoldings.isEmpty)
                  const CommonEmpty(message: 'No holdings match current filter')
                else
                  ...filteredHoldings.map((holding) => ProtoHoldingTile(holding: holding)),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: CommonButton(
                  label: 'View analysis',
                  onPressed: () => Navigator.of(context).pushNamed(Routes.pnlAnalysis),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: CommonButton(
                  label: 'Rebalance',
                  primary: true,
                  onPressed: () {},
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _refresh() async {
    setState(() => loading = true);
    await Future<void>.delayed(const Duration(milliseconds: 240));
    if (mounted) setState(() => loading = false);
  }
}

class ProtoPnlAnalysisPage extends StatefulWidget {
  const ProtoPnlAnalysisPage({super.key});

  @override
  State<ProtoPnlAnalysisPage> createState() => _ProtoPnlAnalysisPageState();
}

class _ProtoPnlAnalysisPageState extends State<ProtoPnlAnalysisPage> {
  static const tabs = {
    'overview': 'Overview',
    'realized': 'Realized',
    'risk': 'Risk',
  };
  static const riskOptions = ['All', 'Low', 'Medium', 'High'];
  final repository = const ProtoAccountRepository();
  late final metrics = repository.loadMetrics();
  late final records = repository.loadRecords();
  late final trendPoints = repository.loadTrendPoints();
  var activeTab = 'overview';
  var riskFilter = 'All';
  var loading = false;

  List<ProtoPnlRecord> get filteredRecords {
    if (riskFilter == 'All') return records;
    return records.where((item) => item.risk == riskFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CommonAppBar(
        title: 'P&L Analysis',
        eyebrow: 'Generated _proto',
        action: IconButton.filledTonal(
          icon: const Icon(Icons.tune),
          onPressed: _showRiskFilterSheet,
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.lg,
        ),
        children: [
          _TabBar(
            tabs: tabs,
            selected: activeTab,
            onSelected: (value) {
              setState(() {
                activeTab = value;
                if (value == 'risk') riskFilter = 'High';
              });
            },
          ),
          const SizedBox(height: AppSpacing.md),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppSpacing.sm,
            crossAxisSpacing: AppSpacing.sm,
            childAspectRatio: 1.55,
            children: metrics.map((metric) => ProtoMetricCard(metric: metric)).toList(),
          ),
          const SizedBox(height: AppSpacing.md),
          SectionPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionHeading(
                  title: 'Return Trend',
                  subtitle: '8 sessions, current tab: $activeTab',
                  actionLabel: 'Refresh',
                  onAction: _refresh,
                ),
                const SizedBox(height: AppSpacing.md),
                ProtoTrendChart(points: trendPoints),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          SectionPanel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionHeading(
                  title: 'Trade Records',
                  subtitle: 'Risk filter: $riskFilter',
                  actionLabel: 'Filter',
                  onAction: _showRiskFilterSheet,
                ),
                const SizedBox(height: AppSpacing.xs),
                if (loading)
                  const CommonLoading(message: 'Syncing latest trades...')
                else if (filteredRecords.isEmpty)
                  const CommonEmpty(message: 'No records for this risk level')
                else
                  ...filteredRecords.map(
                    (record) => ProtoRecordTile(
                      record: record,
                      onTap: () => _showRecordSheet(record),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _refresh() async {
    setState(() => loading = true);
    await Future<void>.delayed(const Duration(milliseconds: 240));
    if (mounted) setState(() => loading = false);
  }

  void _showRiskFilterSheet() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Filter by risk', style: themeService.textStyles.sectionTitle),
              const SizedBox(height: AppSpacing.md),
              ProtoFilterBar(
                options: riskOptions,
                selected: riskFilter,
                onSelected: (value) {
                  setState(() => riskFilter = value);
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showRecordSheet(ProtoPnlRecord record) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.lg,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(record.symbol + ' detail', style: themeService.textStyles.sectionTitle),
              const SizedBox(height: AppSpacing.xs),
              Text(
                record.action + ' at ' + record.time,
                style: TextStyle(color: themeService.colors.muted),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(child: _DetailCell(label: 'Amount', value: record.amount)),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(child: _DetailCell(label: 'Risk', value: record.risk)),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({
    required this.tabs,
    required this.selected,
    required this.onSelected,
  });

  final Map<String, String> tabs;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xxs),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        border: Border.all(color: themeService.colors.border),
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Row(
        children: tabs.entries.map((entry) {
          final active = entry.key == selected;
          return Expanded(
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: active ? themeService.colors.primary : Colors.transparent,
                foregroundColor: active ? Colors.white : themeService.colors.muted,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
              ),
              onPressed: () => onSelected(entry.key),
              child: Text(entry.value, overflow: TextOverflow.ellipsis),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: themeService.textStyles.sectionTitle),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                subtitle,
                style: TextStyle(color: themeService.colors.muted, fontSize: 12),
              ),
            ],
          ),
        ),
        TextButton(onPressed: onAction, child: Text(actionLabel)),
      ],
    );
  }
}

class _DetailCell extends StatelessWidget {
  const _DetailCell({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: themeService.colors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadii.panel),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: themeService.colors.muted, fontSize: 12)),
            const SizedBox(height: AppSpacing.xxs),
            Text(value, style: themeService.textStyles.bodyStrong),
          ],
        ),
      ),
    );
  }
}
`;

await main();
