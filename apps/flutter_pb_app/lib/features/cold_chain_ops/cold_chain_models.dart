import 'package:flutter/foundation.dart';

enum ExceptionSeverity { critical, warning, attention }

enum ExceptionStatus { unassigned, inProgress }

@immutable
class ColdChainException {
  const ColdChainException({
    required this.id,
    required this.shipmentId,
    required this.lane,
    required this.cargo,
    required this.severity,
    required this.status,
    required this.currentTemperature,
    required this.upperLimit,
    required this.durationMinutes,
    required this.updatedAt,
  });

  final String id;
  final String shipmentId;
  final String lane;
  final String cargo;
  final ExceptionSeverity severity;
  final ExceptionStatus status;
  final double currentTemperature;
  final double upperLimit;
  final int durationMinutes;
  final String updatedAt;

  String get identityLabel => '${id.toUpperCase()} · $shipmentId';

  String get severityLabel => switch (severity) {
    ExceptionSeverity.critical => '严重',
    ExceptionSeverity.warning => '警告',
    ExceptionSeverity.attention => '关注',
  };
}

@immutable
class TemperatureReading {
  const TemperatureReading({required this.id, required this.value});

  final String id;
  final double value;
}

enum EventTone { success, primary, warning, error }

@immutable
class ShipmentEvent {
  const ShipmentEvent({
    required this.id,
    required this.time,
    required this.title,
    required this.detail,
    required this.tone,
  });

  final String id;
  final String time;
  final String title;
  final String detail;
  final EventTone tone;
}

@immutable
class ExceptionQueueArgs {
  const ExceptionQueueArgs({this.variantId = 'default'});

  final String variantId;

  static ExceptionQueueArgs fromRouteArgs(Object? raw) {
    if (raw is ExceptionQueueArgs) return raw;
    return const ExceptionQueueArgs();
  }
}

@immutable
class ShipmentDetailArgs {
  const ShipmentDetailArgs({
    this.variantId = 'default',
    this.shipmentId = 'SH-2048',
  });

  final String variantId;
  final String shipmentId;

  static ShipmentDetailArgs fromRouteArgs(Object? raw) {
    if (raw is ShipmentDetailArgs) return raw;
    return const ShipmentDetailArgs();
  }

  bool get hasExcursion => const {
    'active-excursion',
    'action-sheet-open',
    'acknowledge-dialog-open',
  }.contains(variantId);

  @override
  bool operator ==(Object other) =>
      other is ShipmentDetailArgs &&
      other.variantId == variantId &&
      other.shipmentId == shipmentId;

  @override
  int get hashCode => Object.hash(variantId, shipmentId);
}

@immutable
class ResolutionFormArgs {
  const ResolutionFormArgs({
    this.variantId = 'default',
    this.shipmentId = 'SH-2048',
  });

  final String variantId;
  final String shipmentId;

  static ResolutionFormArgs fromRouteArgs(Object? raw) {
    if (raw is ResolutionFormArgs) return raw;
    return const ResolutionFormArgs();
  }

  @override
  bool operator ==(Object other) =>
      other is ResolutionFormArgs &&
      other.variantId == variantId &&
      other.shipmentId == shipmentId;

  @override
  int get hashCode => Object.hash(variantId, shipmentId);
}

abstract final class ColdChainKeys {
  static const showCritical = ValueKey<String>(
    'cold-chain-ops.exception-queue.show-critical',
  );
  static const primaryExceptionRow = ValueKey<String>(
    'cold-chain-ops.exception-queue.list.row.ex-017',
  );
  static const openActions = ValueKey<String>(
    'cold-chain-ops.shipment-detail.open-actions',
  );
  static const openResolution = ValueKey<String>(
    'cold-chain-ops.shipment-detail.open-resolution',
  );
  static const acknowledge = ValueKey<String>(
    'cold-chain-ops.shipment-detail.acknowledge',
  );
  static const submitResolution = ValueKey<String>(
    'cold-chain-ops.resolution-form.submit',
  );
}
