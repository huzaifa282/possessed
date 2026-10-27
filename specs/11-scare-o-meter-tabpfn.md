# 11 · Scare-o-meter with TabPFN (P1 stretch, only if day 3 is ahead of schedule)

## Idea

The ghost generates **3 variants** of a possession. **TabPFN** (open-weight tabular foundation model) predicts which one people will find scariest *and* still readable, from simple design measurements, trained on a small set of human ratings. This is TabPFN's sweet spot: tiny labelled datasets.

## Data

- Collect **40–60 ratings**: friends rate rendered possessions 1–5 for "scary" (simple rating page at `/rate`, or a Google Form with screenshots).
- Features per variant, measured from the rendered preview (posted by the iframe script) and the code:
  `mean_luminance, contrast_min, saturation_mean, hue_dominant, effects_count, animated_effects_count, fonts_changed, preset_id, intensity, text_changed_ratio, dark_ratio`.
- Store as `data/scare-ratings.csv` in the repo (anonymous).

## Model

- `tabpfn` (Python) on a small DigitalOcean worker or via the Prior Labs API (`tabpfn-client`), behind `POST /api/scare` that takes feature rows and returns predicted scores.
- Accept the Prior Labs non-commercial licence; token in env `TABPFN_TOKEN`.
- Report leave-one-out accuracy (or MAE) honestly in the post.

## UI

- "Possess ×3" button → three thumbnails with a Scare-o-meter bar each; the top one is selected; click to switch.

## Cut rule

If ratings aren't collected by **Fri Oct 30 18:00 PKT**, drop this entirely and don't enter the TabPFN category.
