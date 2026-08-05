export const CONSUMER_GUIDE_URI =
  'proto-bridge://guides/handoff-consumer';

export const CONSUMER_GUIDE = `# ProtoBridge Agent Handoff Consumer

1. Call \`inspect_evidence_workspace\`. Verify Workspace, projection contract version and the required capabilities; stop on mismatch or missing capability.
2. Call \`read_handoff_index\`. Report every item in \`mandatoryRisks\` before editing target code. Producer acknowledgement does not remove a risk.
3. For each selected Screen, call \`read_screen_packet\`. Treat baseline Region parent, scroll owner/member, positioning/pinning, sibling order, bbox relation and visible state/content as implementation constraints. Use compact \`read_case_delta\` for non-baseline Cases and \`read_evidence_detail\` only for a concrete provenance question.
4. Use \`read_reconstruction_obligations\` by Screen and dimension when implementing or checking the fixed denominator. During authoritative Review, use \`read_review_obligations\` by assessment status; Review summaries intentionally omit full obligations.
5. Follow a continuation only for the same normalized query until \`complete=true\`. Never restart a completed query or cycle through selectors/projections merely to exhaust Evidence. If one targeted expansion is still insufficient, disclose the uncertainty.
6. Use each digest group's \`representativeBlobId\` with \`read_evidence_screenshot\`, confirm MCP ImageContent, and record all covered Cases. Do not inject byte-identical images repeatedly. Blob metadata, base64 text and a similar Variant are not visual evidence.
7. Keep every projection bound to the same Handoff/Snapshot. Full Snapshot, Contract, Case and revision readers are compatibility/debug tools, not the default workflow. Never replace fixed refs with active/latest.
8. Read target repository instructions and public code. An applicable Target adapter may discover and normalize that context, but fallback adapter rules cannot override real target docs. Target context is not Source Evidence.
9. Decide files, components, routing, state and tokens in the target repository; do not treat ProtoBridge as a code generator. Do not invent containers, copy, interactions or state that Evidence does not support.
10. Before editing, summarize each Screen's composition, scroll boundary, visual priorities and Case differences. Implement and run target-native checks/tests; call adapter validation only when applicable.
11. During authoritative Review, submit Structure/component/token occurrence claims through \`verify_target_claims\`. A component claim names the exact Dart constructor occurrence; a token claim names its owner constructor and named-argument slot. \`matched\` assessments must reference the returned verifier receipt digest. Missing inspector/mapping/occurrence authority remains \`unverified\`.
12. Call \`summarize_reconstruction_review\` to disclose addressed Cases, viewed Screenshots, replayed Scenarios, known deviations and unverified details. Do not assign a reconstruction score.

Hard failures:

- Workspace, Snapshot, revision or report mismatch: stop; never guess a Store path.
- Missing \`handoff-index\`, \`screen-implementation-packet\`, \`case-delta\`, \`evidence-detail\`, \`reconstruction-obligations\` or \`image-content-screenshot\` capability: stop as \`incompatible-consumer-capability\`.
- Missing fixed object: stop; never substitute active/latest.
- Required unknown or unresolved conflict: disclose it and avoid inventing hidden behavior.
- Evidence Level limitation: constrain implementation claims to the available evidence.
- Inventing visual structure, copy or interaction unsupported by Screenshot/Fragment: stop and correct, or disclose as unresolved risk before claiming completion.
`;
