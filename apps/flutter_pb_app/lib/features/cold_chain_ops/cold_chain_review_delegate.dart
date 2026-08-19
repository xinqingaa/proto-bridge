import '../../review/authoritative_review_harness.dart';
import '../../review/demo_review_delegate.dart';
import '../../router/routes.dart';
import 'cold_chain_fixtures.dart';
import 'cold_chain_models.dart';
import 'cold_chain_providers.dart';

class AppReviewDelegate implements ProtoBridgeReviewDelegate {
  AppReviewDelegate();

  final _demo = DemoReviewDelegate();
  final _coldChain = ColdChainReviewDelegate();

  @override
  Future<ProtoBridgeReviewObservation> prepare(String caseId) {
    if (caseId.startsWith('cold-chain-ops.')) {
      return _coldChain.prepare(caseId);
    }
    return _demo.prepare(caseId);
  }

  @override
  ProtoBridgeReviewObservation observe(String caseId) {
    if (caseId.startsWith('cold-chain-ops.')) {
      return _coldChain.observe(caseId);
    }
    return _demo.observe(caseId);
  }
}

class ColdChainReviewDelegate implements ProtoBridgeReviewDelegate {
  String? _caseId;
  _ParsedCase? _parsed;

  @override
  Future<ProtoBridgeReviewObservation> prepare(String caseId) async {
    final parsed = _ParsedCase.parse(caseId);
    _caseId = caseId;
    _parsed = parsed;
    final navigator = ProtoBridgeReviewHarness.navigatorKey.currentState;
    if (navigator == null) {
      throw StateError('Review navigator is not ready.');
    }
    navigator.pushNamedAndRemoveUntil(
      parsed.route,
      (route) => false,
      arguments: parsed.arguments,
    );
    await Future<void>.delayed(const Duration(milliseconds: 300));
    return observe(caseId);
  }

  @override
  ProtoBridgeReviewObservation observe(String caseId) {
    if (_caseId != caseId || _parsed == null) {
      throw StateError('Review Case is not prepared: $caseId');
    }
    return _observation(_parsed!);
  }

  ProtoBridgeReviewObservation _observation(_ParsedCase parsed) {
    final rootId = '${parsed.screenId}.root';
    final visible = <String>[rootId];
    final keyed = <Map<String, Object?>>[];
    if (parsed.screenId == 'cold-chain-ops.exception-queue' &&
        parsed.variantId != 'loading' &&
        parsed.variantId != 'error') {
      visible.addAll([
        'cold-chain-ops.exception-queue.summary',
        'cold-chain-ops.exception-queue.search',
        'cold-chain-ops.exception-queue.severity-tabs',
        'cold-chain-ops.exception-queue.scroll-list',
      ]);
      final queue = ExceptionQueueState(variantId: parsed.variantId);
      keyed.add({
        'regionId': 'cold-chain-ops.exception-queue.list',
        'keys': [for (final item in queue.visible) item.id],
      });
    }
    if (parsed.screenId == 'cold-chain-ops.shipment-detail') {
      visible.addAll([
        'cold-chain-ops.shipment-detail.scroll-list',
        'cold-chain-ops.shipment-detail.summary',
        'cold-chain-ops.shipment-detail.temperature-section',
        'cold-chain-ops.shipment-detail.timeline',
      ]);
      keyed.add({
        'regionId': 'cold-chain-ops.shipment-detail.timeline',
        'keys': [for (final event in shipmentEvents) event.id],
      });
    }
    if (parsed.screenId == 'cold-chain-ops.resolution-form') {
      visible.addAll([
        'cold-chain-ops.resolution-form.response-form',
        'cold-chain-ops.resolution-form.checklist',
        'cold-chain-ops.resolution-form.follow-up',
        'cold-chain-ops.resolution-form.supervisor-approval',
      ]);
    }
    return ProtoBridgeReviewObservation(
      state: {
        'caseId': parsed.caseId,
        'shell': {'screenId': parsed.screenId, 'variantId': parsed.variantId},
        'visibleRegionIds': visible,
        'keyedCollections': keyed,
        'values': <Object>[],
        'complete': true,
        'unknownKeys': <Object>[],
      },
      structure: {
        'caseId': parsed.caseId,
        'regions': [
          for (var i = 0; i < visible.length; i += 1)
            {
              'regionId': visible[i],
              'role': i == 0 ? 'page' : 'section',
              'ancestorRegionIds': i == 0 ? <Object>[] : [rootId],
              'documentOrder': i,
              'scrollOwner': {
                'kind': i == 0 ? 'viewport' : 'region',
                if (i != 0) 'regionId': visible[i],
              },
              'positioning': 'flow',
              'pinned': i == 0,
              'visible': true,
              'unknownFields': <Object>[],
            },
        ],
        'rootRegionIds': [rootId],
        'siblingGroups': <Object>[],
        'siblingRelations': <Object>[],
        'scrollContainers': [
          {
            'owner': parsed.screenId == 'cold-chain-ops.resolution-form'
                ? {'kind': 'region', 'regionId': rootId}
                : parsed.screenId == 'cold-chain-ops.exception-queue'
                ? {
                    'kind': 'region',
                    'regionId': 'cold-chain-ops.exception-queue.scroll-list',
                  }
                : {
                    'kind': 'region',
                    'regionId': 'cold-chain-ops.shipment-detail.scroll-list',
                  },
            'memberRegionIds': visible.skip(1).toList(),
            'pinnedRegionIds': <Object>[],
          },
        ],
        'complete': true,
        'unknownRegionIds': <Object>[],
      },
    );
  }
}

class _ParsedCase {
  const _ParsedCase({
    required this.caseId,
    required this.screenId,
    required this.variantId,
    required this.route,
    required this.arguments,
  });

  final String caseId;
  final String screenId;
  final String variantId;
  final String route;
  final Object arguments;

  static _ParsedCase parse(String caseId) {
    final base = caseId.split('::scenario=').first;
    final parts = base.split('::');
    final screenId = parts[0];
    final variantId = parts.length > 1 ? parts[1] : 'default';
    return switch (screenId) {
      'cold-chain-ops.exception-queue' => _ParsedCase(
        caseId: caseId,
        screenId: screenId,
        variantId: variantId,
        route: AppRoutes.coldChainExceptions,
        arguments: ExceptionQueueArgs(variantId: variantId),
      ),
      'cold-chain-ops.shipment-detail' => _ParsedCase(
        caseId: caseId,
        screenId: screenId,
        variantId: variantId,
        route: AppRoutes.coldChainShipment,
        arguments: ShipmentDetailArgs(variantId: variantId),
      ),
      'cold-chain-ops.resolution-form' => _ParsedCase(
        caseId: caseId,
        screenId: screenId,
        variantId: variantId,
        route: AppRoutes.coldChainResolution,
        arguments: ResolutionFormArgs(variantId: variantId),
      ),
      _ => throw ArgumentError.value(caseId, 'caseId'),
    };
  }
}
