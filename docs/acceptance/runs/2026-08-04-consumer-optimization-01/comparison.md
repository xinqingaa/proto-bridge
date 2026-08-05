# Phase 5 Comparison — 2026-08-04-consumer-optimization-01

## Decision

**Promote** the progressive Evidence consumer path (Handoff index → screen packet → case delta → authoritative Target Review).

This is an experiment conclusion for Consumer/Target/Review optimization, not a claim that the Treatment UI is pixel-identical to Source, and not a human-finalized Review completion.

## Coverage

| Dimension | Control | Treatment |
| --- | --- | --- |
| Selected cases addressed in UI | 24 (claimed) | 24 (implemented + launcher cases) |
| Distinct source digests viewed | 16 | 16 |
| Target artifacts rendered | 3 primary screens | **16 / 16** |
| Automated comparable pixel diffs | unverified | **16 / 16** |
| Required scenarios replayed | claimed in implementation notes | **7 / 7** |
| Authoritative Review run | none (manual) | `review-2026-08-05-treatment-01` (62 events, status `active`) |

Treatment closes the Control gap on variant/overlay verification. Human finalize remains open (same policy as Phase 4 gate).

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
- Tokens: 7 resolved, 3 candidate, **47 unresolved**

Unresolved tokens remain a shared fidelity risk, not a Treatment regression versus Control’s disclosed limitations. Chart stays feature-local (no public chart component).

## Visual differences

All 16 Treatment attempts are dimension-comparable (1170×2532) and produced distinct normalized diff signatures (16 unique). Diffs are expected between independent implementations; they are evidence of reviewability, not an auto-fail. No Agent findings were recorded; Accepted deviations were not claimed.

## Safety / isolation

- Fixed Workspace / Handoff / Snapshot identity unchanged; no Workspace reset.
- Treatment worktree excluded Control and Phase 4 paths; Control code/artifacts were not read for implementation.
- Capture contract unmodified.

## Unverified / remaining

1. Human finalize of `review-2026-08-05-treatment-01` not performed.
2. Cursor IDE MCP may still be stale; Treatment Review used standalone built MCP + Local Service.
3. Many token IDs remain unresolved (47/57).
4. Treatment screenshots used flutter-test goldens rather than a dedicated Treatment simulator boot; viewport contract matched (390×844 @ DPR 3 → 1170×2532).
5. Phase 6 resource/layout migration not started (correctly deferred).

## Why Promote (not Revise)

- No coverage or safety rollback versus Control.
- Fidelity verification improved (full authoritative render/compare + scenarios).
- Efficiency improved substantially on the progressive path.
- Residual gaps are disclosed and do not reverse the experimental conclusion for promoting the consumer architecture.
