// Evidence-backed models for cold-chain-ops (Handoff 2026-08-03).

enum ExceptionSeverity { critical, warning, watch }

enum QueueVariant { loading, error, empty, defaultQueue, criticalOnly }

enum ShipmentVariant {
  defaultShipment,
  activeExcursion,
  sensorOffline,
  actionSheetOpen,
  acknowledgeDialogOpen,
}

enum ResolutionVariant {
  defaultForm,
  approvalRequired,
  approvalValidationError,
  validationError,
  readyToSubmit,
  confirmDialogOpen,
  submitted,
}

class ExceptionItem {
  const ExceptionItem({
    required this.id,
    required this.shipmentId,
    required this.severity,
    required this.lane,
    required this.cargo,
    required this.temperatureC,
    required this.limitC,
    required this.durationMinutes,
    required this.timeLabel,
  });

  final String id;
  final String shipmentId;
  final ExceptionSeverity severity;
  final String lane;
  final String cargo;
  final double temperatureC;
  final double limitC;
  final int durationMinutes;
  final String timeLabel;

  String get identity => '$id · $shipmentId';

  String get severityLabel => switch (severity) {
        ExceptionSeverity.critical => '严重',
        ExceptionSeverity.warning => '警告',
        ExceptionSeverity.watch => '关注',
      };
}

class TimelineEvent {
  const TimelineEvent({
    required this.id,
    required this.time,
    required this.title,
    required this.detail,
  });

  final String id;
  final String time;
  final String title;
  final String detail;
}

class TempSample {
  const TempSample({required this.label, required this.valueC});

  final String label;
  final double valueC;
}

class ShipmentDetail {
  const ShipmentDetail({
    required this.shipmentId,
    required this.eta,
    required this.origin,
    required this.destination,
    required this.cargo,
    required this.vehicle,
    required this.driver,
    required this.probe,
    required this.sampleInterval,
    required this.zoneLabel,
    required this.limitC,
    required this.currentC,
    required this.maxC,
    required this.overTempMinutes,
    required this.chartWindowLabel,
    required this.samples,
    required this.events,
    this.alertTitle,
    this.alertDetail,
    this.alertSeverity,
    this.sensorOffline = false,
    this.sensorOfflineTitle,
    this.sensorOfflineDetail,
  });

  final String shipmentId;
  final String eta;
  final String origin;
  final String destination;
  final String cargo;
  final String vehicle;
  final String driver;
  final String probe;
  final String sampleInterval;
  final String zoneLabel;
  final double limitC;
  final double currentC;
  final double maxC;
  final int overTempMinutes;
  final String chartWindowLabel;
  final List<TempSample> samples;
  final List<TimelineEvent> events;
  final String? alertTitle;
  final String? alertDetail;
  final ExceptionSeverity? alertSeverity;
  final bool sensorOffline;
  final String? sensorOfflineTitle;
  final String? sensorOfflineDetail;
}
