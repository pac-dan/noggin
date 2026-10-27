-- Noggin — per-day meal swaps for a plan ({breakfast?, lunch?, dinner?}), written when a day
-- note asks for different food ("bland week after a stomach bug").
-- Applied to project uvvjzhpzoqeuumvxnpcf on 2026-10-27. Do not re-apply.

alter table plan_days add column meals jsonb;
