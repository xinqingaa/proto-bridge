import 'dart:convert';
import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_driver/driver_extension.dart';

/// Debug-only bridge used by ProtoBridge's official Flutter MCP provider.
///
/// It intentionally exposes no fallback launcher, device selection, or
/// agent-supplied runtime result. Product features install a delegate only
/// after they own the fixed Handoff's route and Riverpod state bindings.
abstract interface class ProtoBridgeReviewDelegate {
  Future<ProtoBridgeReviewObservation> prepare(
    ProtoBridgeReviewPrepareRequest request,
  );

  ProtoBridgeReviewObservation observe(String caseId);
}

class ProtoBridgeReviewPrepareRequest {
  const ProtoBridgeReviewPrepareRequest({
    required this.caseId,
    required this.screenId,
    this.route,
    this.fixture,
    this.variantId,
    this.stateSeed,
    this.scenarioId,
  });

  final String caseId;
  final String screenId;
  final String? route;
  final String? fixture;
  final String? variantId;
  final String? stateSeed;
  final String? scenarioId;

  factory ProtoBridgeReviewPrepareRequest.fromParameters(
    Map<String, String> parameters,
  ) {
    String required(String name) {
      final value = parameters[name];
      if (value == null || value.isEmpty) {
        throw ArgumentError.value(value, name, 'must be provided');
      }
      return value;
    }

    return ProtoBridgeReviewPrepareRequest(
      caseId: required('caseId'),
      screenId: required('screenId'),
      route: parameters['route'],
      fixture: parameters['fixture'],
      variantId: parameters['variantId'],
      stateSeed: parameters['stateSeed'],
      scenarioId: parameters['scenarioId'],
    );
  }
}

/// The exact JSON shapes consumed by Local Service's typed runtime parser.
class ProtoBridgeReviewObservation {
  const ProtoBridgeReviewObservation({
    required this.state,
    required this.structure,
  });

  final Map<String, Object?> state;
  final Map<String, Object?> structure;

  Map<String, Object?> toJson() => {'state': state, 'structure': structure};
}

abstract final class ProtoBridgeReviewHarness {
  static const applicationIdentity = 'flutter-pb-app';
  static const reviewHarnessVersion = '1';
  static const identityExtension = 'ext.proto_bridge.review.identity';
  static const prepareExtension = 'ext.proto_bridge.review.prepare';
  static const observeExtension = 'ext.proto_bridge.review.observe';

  static final navigatorKey = GlobalKey<NavigatorState>();
  static ProtoBridgeReviewDelegate? _delegate;
  static bool _enabled = false;

  /// Called by the cold-chain feature once its routes and state bindings are
  /// real. Replacing a delegate is intentional for hot restart/test setup.
  static void installDelegate(ProtoBridgeReviewDelegate delegate) {
    _delegate = delegate;
  }

  /// Registers Dart VM extensions and Flutter Driver only in a debug build.
  /// It is safe to call repeatedly during debug hot reload.
  static void enable() {
    if (_enabled) return;
    _enabled = true;
    enableFlutterDriverExtension(enableTextEntryEmulation: true);
    developer.registerExtension(identityExtension, _identity);
    developer.registerExtension(prepareExtension, _prepare);
    developer.registerExtension(observeExtension, _observe);
  }

  static Future<developer.ServiceExtensionResponse> _identity(
    String method,
    Map<String, String> parameters,
  ) async {
    return _result({
      'applicationIdentity': applicationIdentity,
      'targetCommit': const String.fromEnvironment(
        'PB_TARGET_COMMIT',
        defaultValue: 'unbound',
      ),
      'targetContentDigest': const String.fromEnvironment(
        'PB_TARGET_CONTENT_DIGEST',
        defaultValue: 'unbound',
      ),
      'appBuildDigest': const String.fromEnvironment(
        'PB_APP_BUILD_DIGEST',
        defaultValue: 'unbound',
      ),
      'reviewHarnessVersion': reviewHarnessVersion,
      'platform': defaultTargetPlatform.name,
      'textEntryEmulation': true,
    });
  }

  static Future<developer.ServiceExtensionResponse> _prepare(
    String _,
    Map<String, String> parameters,
  ) async {
    final delegate = _delegate;
    if (delegate == null) {
      return _error(
        'review-delegate-unavailable',
        'The fixed Handoff has not been bound to product routes and state.',
      );
    }
    try {
      final observation = await delegate.prepare(
        ProtoBridgeReviewPrepareRequest.fromParameters(parameters),
      );
      return _result(observation.toJson());
    } on ArgumentError catch (error) {
      return _error('invalid-prepare-request', error.message.toString());
    } catch (error) {
      return _error('prepare-failed', error.toString());
    }
  }

  static Future<developer.ServiceExtensionResponse> _observe(
    String _,
    Map<String, String> parameters,
  ) async {
    final delegate = _delegate;
    final caseId = parameters['caseId'];
    if (caseId == null || caseId.isEmpty) {
      return _error('invalid-observe-request', 'caseId must be provided.');
    }
    if (delegate == null) {
      return _error(
        'review-delegate-unavailable',
        'The fixed Handoff has not been bound to product routes and state.',
      );
    }
    try {
      return _result(delegate.observe(caseId).toJson());
    } catch (error) {
      return _error('observe-failed', error.toString());
    }
  }

  static developer.ServiceExtensionResponse _result(Object value) {
    return developer.ServiceExtensionResponse.result(
      jsonEncode({'result': value}),
    );
  }

  static developer.ServiceExtensionResponse _error(String code, String detail) {
    return developer.ServiceExtensionResponse.error(
      developer.ServiceExtensionResponse.extensionError,
      jsonEncode({'code': code, 'detail': detail}),
    );
  }
}
