# AI Diagram Generator

This is a lightweight local diagram pipeline for turning project Markdown and optional code files into draft diagrams.

It currently uses deterministic extraction instead of a hosted AI model. The goal is to establish the data flow first:

```text
Markdown / code
  -> diagram.json
  -> diagram.svg
  -> diagram.png
```

## Usage

```bash
node scripts/generate-ai-diagram.mjs \
  --input 'README.md,docs/*.md' \
  --type architecture \
  --out docs/assets/generated/proto-bridge-architecture
```

Supported types:

- `architecture`
- `workflow`
- `artifact-loop`
- `auto`

Optional code input:

```bash
node scripts/generate-ai-diagram.mjs \
  --input 'README.md,docs/*.md' \
  --code 'packages/core/src' \
  --type architecture \
  --out docs/assets/generated/proto-bridge-with-code
```

## Outputs

For an output base path such as `docs/assets/generated/proto-bridge-architecture`, the generator writes:

```text
docs/assets/generated/proto-bridge-architecture.json
docs/assets/generated/proto-bridge-architecture.svg
docs/assets/generated/proto-bridge-architecture.png
```

The JSON file contains the normalized diagram and basic layout checks.

## Design Rules

The first style preset is `proto-bridge`:

- Light background.
- Natural-language node titles.
- Technical filenames only as small supporting labels.
- One main reading path per diagram.
- Fixed card, group, note, and arrow components.
- Basic checks for overflow and overlapping nodes.

## Current Limits

- Extraction is heuristic. It does not yet call an LLM.
- Layout supports useful first drafts, not final editorial polish.
- Generated diagrams are intended as 60-70 point starting drafts.
- Drag-and-drop editing is not implemented yet.
