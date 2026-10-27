# 0002 · DigitalOcean App Platform + Gemma 4 via the Gemini API

- **Status:** accepted · **Date:** 2026-10-28

## Context
Target categories: DigitalOcean and Gemma. The dev laptop (8 GB RAM, no GPU) can't serve a good code model. Judges must be able to use a live site during the week of Nov 2.

## Decision
Host the Next.js app on DigitalOcean App Platform. Use Gemma 4 (open weights) through the Gemini API by default (`gemma-4-31b-it`, fallback `gemma-4-26b-a4b-it`). Keep an OpenAI-compatible provider so Gemma can run on a DigitalOcean GPU Droplet instead, and use it if credits allow.

## Consequences
- Cheap and reliable enough for judging; the self-hosting path is real and documented.
- Pasted code passes through the Gemini API in the default setup: stated plainly on the site and in the post (honesty about the trade-off).

## Domain
(fill in after claiming the .tech domain)
