import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_pb_app/review/authoritative_review_harness.dart';

void main() {
  test('review harness keeps its Driver Bridge identifiers stable', () {
    expect(ProtoBridgeReviewHarness.applicationIdentity, 'flutter-pb-app');
    expect(ProtoBridgeReviewHarness.reviewHarnessVersion, '2');
    expect(ProtoBridgeReviewHarness.identityKey.value, 'pb.review.identity');
    expect(ProtoBridgeReviewHarness.controlKey.value, 'pb.review.control');
    expect(
      ProtoBridgeReviewHarness.observationKey.value,
      'pb.review.observation',
    );
  });

  testWidgets('review control delegates the operator-selected Case', (
    tester,
  ) async {
    final delegate = _FakeDelegate();
    ProtoBridgeReviewHarness.installDelegate(delegate);
    ProtoBridgeReviewHarness.caseController.text = 'case-1';

    await tester.pumpWidget(
      const MaterialApp(home: ProtoBridgeReviewControlPage()),
    );
    await tester.tap(find.byKey(ProtoBridgeReviewHarness.prepareKey));
    await tester.pump();

    expect(delegate.preparedCaseId, 'case-1');
  });
}

class _FakeDelegate implements ProtoBridgeReviewDelegate {
  String? preparedCaseId;

  @override
  Future<ProtoBridgeReviewObservation> prepare(String caseId) async {
    preparedCaseId = caseId;
    return _observation(caseId);
  }

  @override
  ProtoBridgeReviewObservation observe(String caseId) => _observation(caseId);

  ProtoBridgeReviewObservation _observation(String caseId) {
    return ProtoBridgeReviewObservation(
      state: {
        'caseId': caseId,
        'shell': {'screenId': 'screen-1', 'variantId': 'default'},
        'visibleRegionIds': <Object>[],
        'keyedCollections': <Object>[],
        'values': <Object>[],
        'complete': true,
        'unknownKeys': <Object>[],
      },
      structure: {
        'caseId': caseId,
        'regions': <Object>[],
        'rootRegionIds': <Object>[],
        'siblingGroups': <Object>[],
        'siblingRelations': <Object>[],
        'scrollContainers': <Object>[],
        'complete': true,
        'unknownRegionIds': <Object>[],
      },
    );
  }
}
