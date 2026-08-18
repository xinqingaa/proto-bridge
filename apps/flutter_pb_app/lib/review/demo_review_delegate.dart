import '../router/routes.dart';
import 'authoritative_review_harness.dart';

class DemoReviewDelegate implements ProtoBridgeReviewDelegate {
  static const cases = {
    'flutter-pb-app.hub.default': (
      route: AppRoutes.hub,
      screenId: 'flutter-pb-app.hub',
    ),
    'flutter-pb-app.demo.default': (
      route: AppRoutes.demo,
      screenId: 'flutter-pb-app.demo',
    ),
  };

  String? _caseId;

  @override
  Future<ProtoBridgeReviewObservation> prepare(String caseId) async {
    final binding = cases[caseId];
    if (binding == null) throw ArgumentError.value(caseId, 'caseId');
    _caseId = caseId;
    ProtoBridgeReviewHarness.navigatorKey.currentState?.pushNamedAndRemoveUntil(
      binding.route,
      (route) => false,
    );
    return _observation(caseId, binding.screenId);
  }

  @override
  ProtoBridgeReviewObservation observe(String caseId) {
    final binding = cases[caseId];
    if (binding == null || _caseId != caseId) {
      throw StateError('Review Case is not prepared: $caseId');
    }
    return _observation(caseId, binding.screenId);
  }

  ProtoBridgeReviewObservation _observation(String caseId, String screenId) {
    final rootRegionId = '$screenId.root';
    return ProtoBridgeReviewObservation(
      state: {
        'caseId': caseId,
        'shell': {'screenId': screenId, 'variantId': 'default'},
        'visibleRegionIds': [rootRegionId],
        'keyedCollections': <Object>[],
        'values': <Object>[],
        'complete': true,
        'unknownKeys': <Object>[],
      },
      structure: {
        'caseId': caseId,
        'regions': [
          {
            'regionId': rootRegionId,
            'role': 'screen',
            'ancestorRegionIds': <Object>[],
            'documentOrder': 0,
            'scrollOwner': {'kind': 'viewport'},
            'positioning': 'flow',
            'pinned': false,
            'visible': true,
            'unknownFields': <Object>[],
          },
        ],
        'rootRegionIds': [rootRegionId],
        'siblingGroups': <Object>[],
        'siblingRelations': <Object>[],
        'scrollContainers': [
          {
            'owner': {'kind': 'viewport'},
            'memberRegionIds': [rootRegionId],
            'pinnedRegionIds': <Object>[],
          },
        ],
        'complete': true,
        'unknownRegionIds': <Object>[],
      },
    );
  }
}
