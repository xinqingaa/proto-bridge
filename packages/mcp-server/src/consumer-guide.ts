export const CONSUMER_GUIDE_URI =
  'proto-bridge://guides/handoff-consumer';

export const CONSUMER_GUIDE = `# ProtoBridge Agent Handoff Consumer

1. Call \`inspect_evidence_workspace\`, then \`read_agent_handoff\`. Stop on Workspace mismatch.
2. Report every item in \`mandatoryRiskReport\` before editing target code. Producer acknowledgement does not remove a risk.
3. Read the Handoff's fixed Snapshot and Staleness Report. Never replace them with active/latest.
4. Read only the referenced Case revisions and Fragments needed for the implementation intent. Preserve provenance, unknown and unresolved conflicts.
5. Read target repository instructions and existing code. The target repository does not need ProtoBridge configuration.
6. Use \`read_target_conventions\` and \`find_target_examples\` only as independent target queries. Their results are not Source Evidence.
7. Decide files, components, routing, state and tokens in the target repository; do not treat ProtoBridge as a code generator.
8. Implement and run target-native tests, then call \`validate_target_changes\`.
9. Report changed files, validation results, all original Handoff risks and any remaining implementation risk.

Hard failures:

- Workspace, Snapshot, revision or report mismatch: stop; never guess a Store path.
- Missing fixed object: stop; never substitute active/latest.
- Required unknown or unresolved conflict: disclose it and avoid inventing hidden behavior.
- Evidence Level limitation: constrain implementation claims to the available evidence.
`;
