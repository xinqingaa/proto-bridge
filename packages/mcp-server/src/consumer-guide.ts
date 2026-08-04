export const CONSUMER_GUIDE_URI =
  'proto-bridge://guides/handoff-consumer';

export const CONSUMER_GUIDE = `# ProtoBridge Agent Handoff Consumer

1. Call \`inspect_evidence_workspace\`. Verify Workspace, projection contract version and the required capabilities; stop on mismatch or missing capability.
2. Call \`read_handoff_index\`. Report every item in \`mandatoryRisks\` before editing target code. Producer acknowledgement does not remove a risk.
3. For each selected Screen, call \`read_screen_packet\`. Use \`read_case_delta\` for non-baseline or state-bearing Cases, and \`read_evidence_detail\` only for a concrete structure/component/token/interaction/provenance question.
4. Follow a continuation only for the same normalized query until \`complete=true\`. Never restart a completed query or cycle through selectors/projections merely to exhaust Evidence. If one targeted expansion is still insufficient, disclose the uncertainty.
5. Use each digest group's \`representativeBlobId\` with \`read_evidence_screenshot\`, confirm MCP ImageContent, and record all covered Cases. Do not inject byte-identical images repeatedly. Blob metadata, base64 text and a similar Variant are not visual evidence.
6. Keep every projection bound to the same Handoff/Snapshot. Full Snapshot, Contract, Case and revision readers are compatibility/debug tools, not the default workflow. Never replace fixed refs with active/latest.
7. Read target repository instructions and public code. An applicable Target adapter may discover and normalize that context, but fallback adapter rules cannot override real target docs. Target context is not Source Evidence.
8. Decide files, components, routing, state and tokens in the target repository; do not treat ProtoBridge as a code generator. Do not invent containers, copy, interactions or state that Evidence does not support.
9. Before editing, summarize each Screen's composition, scroll boundary, visual priorities and Case differences. Implement and run target-native checks/tests; call adapter validation only when applicable.
10. Call \`summarize_reconstruction_review\` to disclose addressed Cases, viewed Screenshots, replayed Scenarios, known deviations and unverified details. Do not assign a reconstruction score.

Hard failures:

- Workspace, Snapshot, revision or report mismatch: stop; never guess a Store path.
- Missing \`handoff-index\`, \`screen-packet\`, \`case-delta\`, \`evidence-detail\` or \`image-content-screenshot\` capability: stop as \`incompatible-consumer-capability\`.
- Missing fixed object: stop; never substitute active/latest.
- Required unknown or unresolved conflict: disclose it and avoid inventing hidden behavior.
- Evidence Level limitation: constrain implementation claims to the available evidence.
- Inventing visual structure, copy or interaction unsupported by Screenshot/Fragment: stop and correct, or disclose as unresolved risk before claiming completion.
`;
