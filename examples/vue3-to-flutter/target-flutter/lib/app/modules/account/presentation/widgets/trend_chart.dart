import 'package:flutter/material.dart';

import '../../../../theme/app_tokens.dart';
import '../../../../theme/theme_service.dart';

class TrendChart extends StatelessWidget {
  const TrendChart({required this.points, super.key});

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
  bool shouldRepaint(covariant _TrendChartPainter oldDelegate) =>
      oldDelegate.points != points;
}
