---
name: proto-bridge-consumer
description: Consume a fixed ProtoBridge Handoff in this Flutter application and implement, navigate, test, and visually verify the selected Evidence scope. Use for ProtoBridge Evidence delivery tasks targeting apps/flutter_pb_app.
---

# ProtoBridge Consumer

Use this workflow when a task supplies a fixed Workspace, Handoff, Bundle, Snapshot, or Evidence scope for this app. Keep source Evidence and target-project decisions separate: Evidence determines observable output, while this app's docs and code determine implementation boundaries.

## Read Before Editing

1. Read `AGENTS.md`, `README.md`, and the relevant files under `docs/`.
2. Call `inspect_evidence_workspace`, verify the Workspace and required consumer capabilities, then call `read_handoff_index`. Report every `mandatoryRisks` item before editing. Never replace fixed references with active/latest data.
3. Read one `read_screen_packet` per selected Screen. Use `read_case_delta` for non-baseline/state Cases and `read_evidence_detail` only to answer a concrete implementation question. Follow continuation only for that same query until complete; never cycle through all projections or restart completed queries.
4. Inspect every distinct Screenshot directly using the digest group's representative blob ID. Record the visible structure, responsive assumptions, covered Cases, and unresolved layout-sensitive values.
5. Inspect similar pages and the actual public component, Theme, and router APIs before deciding file locations or state ownership. Real app docs and public code take priority over adapter fallback rules.

## Build The Selected Scope

1. Separate page variants, local interaction state, navigation, overlays, and submission/refresh state. Model each selected Evidence Case explicitly; do not implement only the default Case.
2. Map Evidence roles and component facts to target symbols using `docs/components.md` and the real Dart constructors. Do not substitute a visually similar widget when the target project has a semantic component with the required responsibility.
3. Preserve the target project's architecture, Theme, routing, and shared overlay boundaries. Put feature code under `lib/features/<feature>/`, routes under `lib/router/`, tokens under `lib/theme/`, and reusable UI under `lib/common/`.
4. Implement only observable behavior supported by the selected Evidence. For missing or conflicting Evidence, record the gap and choose the least disruptive target-local behavior; do not invent product states silently.

## Verify

1. Exercise every selected Scenario as precondition -> action -> observable checkpoint. Verify filter, search, refresh, submit, and navigation state is visible and connected, not an empty callback.
2. Run `flutter analyze` and `flutter test` from the target root, plus narrower tests for changed features when useful.
3. When a simulator or emulator is available, run the app at the Evidence viewport (`390x844` for iPhone 14 Evidence), navigate to each selected Case, and capture a screenshot after the state stabilizes. Use `docs/testing.md` for device commands.
4. Call `validate_target_changes` with restrictive allowed paths and expected changed files when the Target adapter is available.

## Report

Report fixed references and revisions, original mandatory risks, changed files, native checks/tests, visual verification availability, Target validation, known Evidence deviations, and remaining risks.
