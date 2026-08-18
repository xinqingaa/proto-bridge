import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_driver/driver_extension.dart';

abstract interface class ProtoBridgeReviewDelegate {
  Future<ProtoBridgeReviewObservation> prepare(String caseId);

  ProtoBridgeReviewObservation observe(String caseId);
}

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
  static const reviewHarnessVersion = '2';
  static const reviewRoute = '/_proto_bridge/review';
  static const reviewMode = bool.fromEnvironment('PB_REVIEW_MODE');

  static const identityKey = ValueKey<String>('pb.review.identity');
  static const controlKey = ValueKey<String>('pb.review.control');
  static const caseInputKey = ValueKey<String>('pb.review.case-input');
  static const prepareKey = ValueKey<String>('pb.review.prepare');
  static const readyKey = ValueKey<String>('pb.review.ready');
  static const observationKey = ValueKey<String>('pb.review.observation');

  static final navigatorKey = GlobalKey<NavigatorState>();
  static final caseController = TextEditingController();
  static final ValueNotifier<String?> _readyCaseId = ValueNotifier(null);
  static final ValueNotifier<ProtoBridgeReviewObservation?> _observation =
      ValueNotifier(null);
  static ProtoBridgeReviewDelegate? _delegate;
  static bool _enabled = false;

  static void installDelegate(ProtoBridgeReviewDelegate delegate) {
    _delegate = delegate;
  }

  static void enable() {
    if (_enabled || !reviewMode) return;
    _enabled = true;
    enableFlutterDriverExtension(enableTextEntryEmulation: true);
  }

  static Future<void> prepareCurrentCase() async {
    final caseId = caseController.text.trim();
    final delegate = _delegate;
    _readyCaseId.value = null;
    if (caseId.isEmpty || delegate == null) return;
    final observation = await delegate.prepare(caseId);
    _observation.value = observation;
    _readyCaseId.value = caseId;
  }

  static void publishObservation(ProtoBridgeReviewObservation observation) {
    _observation.value = observation;
  }

  static void refreshObservation() {
    final caseId = _readyCaseId.value;
    final delegate = _delegate;
    if (caseId != null && delegate != null) {
      _observation.value = delegate.observe(caseId);
    }
  }

  static void showControl() {
    navigatorKey.currentState?.pushNamedAndRemoveUntil(
      reviewRoute,
      (route) => false,
    );
  }

  static String identityJson(BuildContext context) {
    final media = MediaQuery.maybeOf(context);
    final logicalSize = media?.size;
    final dpr = media?.devicePixelRatio;
    return jsonEncode({
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
      'logicalSize': logicalSize == null
          ? null
          : {'width': logicalSize.width, 'height': logicalSize.height},
      'pixelSize': logicalSize == null || dpr == null
          ? null
          : {
              'width': logicalSize.width * dpr,
              'height': logicalSize.height * dpr,
            },
      'dpr': dpr,
      'orientation': media?.orientation.name,
      'locale': Localizations.maybeLocaleOf(context)?.toLanguageTag(),
      'theme': Theme.of(context).brightness.name,
      'textScale': media?.textScaler.scale(1),
      'textEntryEmulation': true,
    });
  }
}

class ProtoBridgeReviewBridge extends StatelessWidget {
  const ProtoBridgeReviewBridge({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!ProtoBridgeReviewHarness.reviewMode) return child;
    return Stack(
      children: [
        child,
        Positioned.fill(
          child: IgnorePointer(
            child: Opacity(
              opacity: 0,
              child: Align(
                alignment: Alignment.topLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      ProtoBridgeReviewHarness.identityJson(context),
                      key: ProtoBridgeReviewHarness.identityKey,
                    ),
                    ValueListenableBuilder<String?>(
                      valueListenable: ProtoBridgeReviewHarness._readyCaseId,
                      builder: (context, caseId, child) => caseId == null
                          ? const SizedBox.shrink()
                          : Text(
                              caseId,
                              key: ProtoBridgeReviewHarness.readyKey,
                            ),
                    ),
                    ValueListenableBuilder<ProtoBridgeReviewObservation?>(
                      valueListenable: ProtoBridgeReviewHarness._observation,
                      builder: (context, observation, child) =>
                          observation == null
                          ? const SizedBox.shrink()
                          : Text(
                              jsonEncode(observation.toJson()),
                              key: ProtoBridgeReviewHarness.observationKey,
                            ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        Positioned(
          right: 0,
          bottom: 0,
          width: 48,
          height: 48,
          child: Opacity(
            opacity: 0,
            child: IconButton(
              key: ProtoBridgeReviewHarness.controlKey,
              onPressed: ProtoBridgeReviewHarness.showControl,
              icon: const Icon(Icons.settings),
            ),
          ),
        ),
      ],
    );
  }
}

class ProtoBridgeReviewControlPage extends StatelessWidget {
  const ProtoBridgeReviewControlPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ProtoBridge Review')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              key: ProtoBridgeReviewHarness.caseInputKey,
              controller: ProtoBridgeReviewHarness.caseController,
            ),
            const SizedBox(height: 12),
            FilledButton(
              key: ProtoBridgeReviewHarness.prepareKey,
              onPressed: ProtoBridgeReviewHarness.prepareCurrentCase,
              child: const Text('Prepare'),
            ),
          ],
        ),
      ),
    );
  }
}
