# 0001 · One component at a time, enforced by a size gate

- **Status:** accepted · **Date:** 2026-10-28

## Context
Open models produce reliable, polished re-themes for small components but degrade on whole pages (truncated output, lost structure, high cost and latency).

## Decision
Accept one component (≤ 200 lines / 8,000 chars, no full documents, no data/routing code). Refuse anything else in character before any model call. No URL rebuilding, no screenshots for this deadline.

## Consequences
- Higher quality and predictable cost; the refusal becomes part of the ghost's personality and a story point in the post.
- Users with big components must split them (documented in the UI copy).
