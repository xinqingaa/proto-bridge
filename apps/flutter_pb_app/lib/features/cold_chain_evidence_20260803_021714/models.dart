enum EvidenceQueueVariant { defaultView, criticalOnly, loading, empty, error }

enum EvidenceShipmentVariant { defaultView, activeExcursion, sensorOffline }

enum EvidenceResolutionVariant {
  defaultView,
  readyToSubmit,
  validationError,
  approvalRequired,
  approvalValidationError,
  submitted,
}

enum ExceptionSeverity { critical, warning, watch }

class ExceptionItem {
  const ExceptionItem({
    required this.exceptionId,
    required this.shipmentId,
    required this.severity,
    required this.lane,
    required this.cargo,
    required this.temperature,
    required this.duration,
    required this.updatedAt,
  });

  final String exceptionId;
  final String shipmentId;
  final ExceptionSeverity severity;
  final String lane;
  final String cargo;
  final String temperature;
  final String duration;
  final String updatedAt;
}

class TimelineEvent {
  const TimelineEvent({
    required this.time,
    required this.title,
    required this.detail,
    required this.tone,
  });

  final String time;
  final String title;
  final String detail;
  final TimelineTone tone;
}

enum TimelineTone { success, primary, warning, error }

class ResolutionDraft {
  const ResolutionDraft({
    this.cause,
    this.action,
    this.outcome,
    this.driverChecked = false,
    this.coolingChecked = false,
    this.cargoChecked = false,
    this.continueMonitoring = true,
    this.notes = '',
    this.supervisor,
  });

  final String? cause;
  final String? action;
  final String? outcome;
  final bool driverChecked;
  final bool coolingChecked;
  final bool cargoChecked;
  final bool continueMonitoring;
  final String notes;
  final String? supervisor;

  bool get checksComplete => driverChecked && coolingChecked && cargoChecked;

  bool get coreComplete =>
      cause != null && action != null && outcome != null && checksComplete;

  ResolutionDraft copyWith({
    String? cause,
    bool clearCause = false,
    String? action,
    bool clearAction = false,
    String? outcome,
    bool clearOutcome = false,
    bool? driverChecked,
    bool? coolingChecked,
    bool? cargoChecked,
    bool? continueMonitoring,
    String? notes,
    String? supervisor,
    bool clearSupervisor = false,
  }) {
    return ResolutionDraft(
      cause: clearCause ? null : cause ?? this.cause,
      action: clearAction ? null : action ?? this.action,
      outcome: clearOutcome ? null : outcome ?? this.outcome,
      driverChecked: driverChecked ?? this.driverChecked,
      coolingChecked: coolingChecked ?? this.coolingChecked,
      cargoChecked: cargoChecked ?? this.cargoChecked,
      continueMonitoring: continueMonitoring ?? this.continueMonitoring,
      notes: notes ?? this.notes,
      supervisor: clearSupervisor ? null : supervisor ?? this.supervisor,
    );
  }
}

EvidenceQueueVariant queueVariantFrom(Object? value) {
  return switch (value) {
    'critical-only' => EvidenceQueueVariant.criticalOnly,
    'loading' => EvidenceQueueVariant.loading,
    'empty' => EvidenceQueueVariant.empty,
    'error' => EvidenceQueueVariant.error,
    _ => EvidenceQueueVariant.defaultView,
  };
}

EvidenceShipmentVariant shipmentVariantFrom(Object? value) {
  return switch (value) {
    'default' => EvidenceShipmentVariant.defaultView,
    'sensor-offline' => EvidenceShipmentVariant.sensorOffline,
    _ => EvidenceShipmentVariant.activeExcursion,
  };
}

EvidenceResolutionVariant resolutionVariantFrom(Object? value) {
  return switch (value) {
    'ready-to-submit' => EvidenceResolutionVariant.readyToSubmit,
    'validation-error' => EvidenceResolutionVariant.validationError,
    'approval-required' => EvidenceResolutionVariant.approvalRequired,
    'approval-validation-error' =>
      EvidenceResolutionVariant.approvalValidationError,
    'submitted' => EvidenceResolutionVariant.submitted,
    _ => EvidenceResolutionVariant.defaultView,
  };
}
