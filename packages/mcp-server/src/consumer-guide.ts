export const CONSUMER_GUIDE_URI =
  'proto-bridge://guides/handoff-consumer';

export const CONSUMER_GUIDE = `# ProtoBridge Agent Handoff Consumer

1. Call \`inspect_evidence_workspace\`, then \`read_agent_handoff\`. Stop on Workspace mismatch.
2. Report every item in \`mandatoryRiskReport\` before editing target code. Producer acknowledgement does not remove a risk.
3. Read the Handoff's fixed Snapshot and Staleness Report. Never replace them with active/latest.
4. Read only the referenced Case revisions and Fragments needed for the implementation intent. Preserve provenance, unknown and unresolved conflicts.
5. Call \`read_evidence_screenshot\` for every selected Case and confirm an MCP ImageContent block is returned. Blob metadata, base64 text and a similar Variant are not visual evidence.
6. Read target repository instructions and existing code. The target repository does not need ProtoBridge configuration.
7. When an applicable Target adapter/tool exists, use its convention/example queries only as independent target context. Adapter results are not Source Evidence and must not override Screenshot or Fragment facts.
8. Decide files, components, routing, state and tokens in the target repository; do not treat ProtoBridge as a code generator. Do not invent containers, copy, interactions or state that Evidence does not support.
9. When Evidence omits a layout-sensitive prop, check the Screenshot; if still uncertain, disclose it as remaining risk instead of silently accepting a composition-changing default.
10. Before editing, summarize each selected Screenshot's composition, scroll boundary, visual priorities and state differences. Structure/component/token/state/interaction references are implementation guidance, not a scoring quota.
11. Implement and run target-native checks/tests. Call adapter validation only when an applicable Target adapter/tool exists.
12. Call \`summarize_reconstruction_review\` to disclose addressed Cases, viewed Screenshots, replayed Scenarios, known deviations and unverified details. Do not assign a reconstruction score.

Hard failures:

- Workspace, Snapshot, revision or report mismatch: stop; never guess a Store path.
- Missing fixed object: stop; never substitute active/latest.
- Required unknown or unresolved conflict: disclose it and avoid inventing hidden behavior.
- Evidence Level limitation: constrain implementation claims to the available evidence.
- Inventing visual structure, copy or interaction unsupported by Screenshot/Fragment: stop and correct, or disclose as unresolved risk before claiming completion.
`;
