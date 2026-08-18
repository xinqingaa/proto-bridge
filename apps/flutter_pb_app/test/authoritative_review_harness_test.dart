import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_pb_app/review/authoritative_review_harness.dart';

void main() {
  test('review harness keeps its authority identifiers stable', () {
    expect(ProtoBridgeReviewHarness.applicationIdentity, 'flutter-pb-app');
    expect(
      ProtoBridgeReviewHarness.identityExtension,
      'ext.proto_bridge.review.identity',
    );
    expect(
      ProtoBridgeReviewHarness.prepareExtension,
      'ext.proto_bridge.review.prepare',
    );
    expect(
      ProtoBridgeReviewHarness.observeExtension,
      'ext.proto_bridge.review.observe',
    );
  });

  test('prepare requests preserve declared case binding fields', () {
    final request = ProtoBridgeReviewPrepareRequest.fromParameters({
      'caseId': 'case-1',
      'screenId': 'screen-1',
      'route': '/review',
      'fixture': 'fixture-1',
      'variantId': 'default',
      'stateSeed': 'seed-1',
      'scenarioId': 'scenario-1',
    });

    expect(request.caseId, 'case-1');
    expect(request.screenId, 'screen-1');
    expect(request.route, '/review');
    expect(request.fixture, 'fixture-1');
    expect(request.variantId, 'default');
    expect(request.stateSeed, 'seed-1');
    expect(request.scenarioId, 'scenario-1');
  });
}
