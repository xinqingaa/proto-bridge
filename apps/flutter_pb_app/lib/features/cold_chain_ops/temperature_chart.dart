import 'package:flutter/material.dart';

import '../../theme/ts.dart';
import 'cold_chain_fixtures.dart';

class TemperatureTrendChart extends StatelessWidget {
  const TemperatureTrendChart({super.key});

  static const _min = 4.0;
  static const _max = 12.0;
  static const _limit = 8.0;

  @override
  Widget build(BuildContext context) {
    TS.of(context);
    return Container(
      height: TS.layout.chartMinHeight,
      padding: EdgeInsets.all(TS.spacing.sm),
      decoration: BoxDecoration(
        color: TS.colors.surfaceVariant,
        borderRadius: BorderRadius.circular(TS.radius.md),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: TS.sizing.controlSm,
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
            child: Column(
              children: [
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final limitTop =
                          ((_max - _limit) / (_max - _min)) *
                          constraints.maxHeight;
                      return Stack(
                        children: [
                          Positioned(
                            top: limitTop,
                            left: 0,
                            right: 0,
                            child: CustomPaint(
                              painter: _DashedLinePainter(
                                color: TS.colors.error,
                                strokeWidth: TS.border.widthHairline,
                              ),
                              child: const SizedBox(
                                height: 1,
                                width: double.infinity,
                              ),
                            ),
                          ),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (final reading in temperatureReadings)
                                Expanded(
                                  child: Padding(
                                    padding: EdgeInsets.symmetric(
                                      horizontal: TS.spacing.xxs,
                                    ),
                                    child: Align(
                                      alignment: Alignment.bottomCenter,
                                      child: FractionallySizedBox(
                                        heightFactor: _ratio(reading.value),
                                        widthFactor: 1,
                                        alignment: Alignment.bottomCenter,
                                        child: DecoratedBox(
                                          decoration: BoxDecoration(
                                            color: reading.value > _limit
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
                                ),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
                ),
                SizedBox(height: TS.spacing.xs),
                Row(
                  children: [
                    for (final reading in temperatureReadings)
                      Expanded(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            reading.id,
                            style: TS.textStyle.caption,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  double _ratio(double value) {
    final ratio = ((value - _min) / (_max - _min)).clamp(0.0, 1.0);
    final floor = TS.sizing.iconCompact / TS.layout.chartPlotHeight;
    return ratio < floor ? floor : ratio;
  }
}

class _DashedLinePainter extends CustomPainter {
  const _DashedLinePainter({required this.color, required this.strokeWidth});

  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth;
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
      oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
}
