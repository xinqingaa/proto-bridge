# Phase 5 Comparison — 2026-08-04-consumer-optimization-01

## Decision

**Promote** the progressive Evidence consumer path (Handoff index → screen packet → case delta → authoritative Target Review) after closing Phase 5 verification.

This is an experiment conclusion for Consumer/Target/Review optimization, not a claim that the Treatment UI is pixel-identical to Source.

## Coverage

| Dimension | Control | Treatment |
| --- | --- | --- |
| Selected cases addressed in UI | 24 (claimed) | 24 (implemented + launcher cases) |
| Distinct source digests viewed | 16 | 16 |
| Target artifacts rendered | 3 primary screens | **16 / 16** |
| Automated comparable pixel diffs | unverified | **16 / 16** |
| Required scenarios replayed | claimed in implementation notes | **7 / 7** |
| Authoritative Review run | none (manual) | `review-2026-08-05-treatment-01` (63 events, status `completed`) |

Treatment closes the Control gap on variant/overlay verification. Both authoritative Review sessions are now human-finalized.

## Efficiency

| Metric | Control | Treatment | Delta |
| --- | --- | --- | --- |
| Tool calls | 77 | 44 | −43% |
| Response characters (approx.) | 56,001,862 | 15,245,111 | −73% |
| Consumer flow | legacy full-read | progressive packet/delta | — |

Efficiency improves clearly without reducing mandatory screenshot/scenario coverage.

## Target reuse / resolution

Treatment progressive resolvers on the same fixed Handoff:

- Components: 17 resolved, 2 candidate
- Tokens: 40 resolved, 2 candidate, **15 unresolved**

Unresolved tokens remain a shared fidelity risk, not a Treatment regression versus Control’s disclosed limitations. Chart stays feature-local (no public chart component).

## Visual differences

All 16 Treatment attempts are dimension-comparable (1170×2532) and produced distinct normalized diff signatures (16 unique). Diffs are expected between independent implementations; they are evidence of reviewability, not an auto-fail. No Agent findings were recorded; Accepted deviations were not claimed.

## Safety / isolation

- Fixed Workspace / Handoff / Snapshot identity unchanged; no Workspace reset.
- Treatment worktree excluded Control and Phase 4 paths; Control code/artifacts were not read for implementation.
- Capture contract unmodified.

## Unverified / remaining

1. Treatment authoritative artifacts were captured by Flutter-test goldens; a dedicated iOS 18.6 iPhone 14 simulator smoke passed at the fixed 390×844 @ DPR 3 viewport (1170×2532), with the operator accepting the unavailable iOS 17 runtime difference.
2. Token resolution remains partial: 40 resolved, 2 candidate, and 15 unresolved out of 57.
3. Phase 6 resource/layout migration not started (correctly deferred).

## Why Promote (not Revise)

- No coverage or safety rollback versus Control.
- Fidelity verification improved (full authoritative render/compare + scenarios).
- Efficiency improved substantially on the progressive path.
- The progressive consumer path is materially improved, and the dedicated Treatment iOS 18.6 simulator smoke closes the remaining runtime gate under the operator-approved iOS 18 equivalence.

## Phase 5 verification revalidation — 2026-08-05

The follow-up verification completed the executable gaps without changing the fixed Evidence identity:

- P5.4 cross-range regression passed for an independent prototype, open component/token IDs, partial Evidence, no machine Contract, cache invalidation, path isolation, and unsupported adapter.
- `pnpm verify` passed all product steps, including Playwright runtime, MCP, Consumer, and Evidence vertical-slice E2E; receipt: `phase-5-verify.json`.
- Main Flutter Target `analyze`, `test`, and the Treatment iOS 18.6 simulator smoke passed. The smoke used the fixed 390×844 @ DPR 3 viewport and produced a 1170×2532 PNG; receipt: `phase-5-treatment-simulator.json`.
- Resolver validation now records 40 verified explicit high-impact token mappings; 17 IDs remain non-resolved (2 candidate, 15 unresolved) rather than being promoted heuristically.
- The current Cursor MCP exposes the full 33-tool surface after a complete client restart; fixed Handoff/Screen projections, all 16 ImageContent screenshots, Target resolvers, and both Review reads passed. Both Review sessions are now `completed` and human-finalized.

Accordingly, the progressive architecture result is positive and the authoritative Phase 5 gate is `passed` with decision `Promote`; the iOS 17-to-iOS 18.6 runtime difference is explicitly accepted and recorded.
