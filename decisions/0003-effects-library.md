# 0003 · A hand-made effects library; the model chooses, it doesn't invent

- **Status:** accepted · **Date:** 2026-10-28

## Context
Asking a model to write animations and complex CSS from scratch produces inconsistent, heavy, sometimes broken output.

## Decision
Ship ~14 polished, pure-CSS `ghost-*` effects and 5 presets (palette, fonts, effects per intensity). The model applies effects by class name and adjusts colours, fonts and spacing; unknown classes are stripped in validation.

## Consequences
- Consistent, good-looking output; smaller responses; easy to test.
- Creativity is bounded by the library, so adding effects is the main way to grow the product.

## Note
The in-memory rate limiter resets on redeploy; acceptable for the challenge.
