-- save_game_with_analytics uses INSERT ... ON CONFLICT (user_id) DO UPDATE on game_saves.
-- Migration 009 replaced the table UNIQUE with a partial unique index (WHERE user_id IS NOT NULL).
-- Postgres often cannot infer that index for ON CONFLICT (user_id), so the save RPC fails at runtime
-- (Edge Function surfaces it as 400).
--
-- A plain UNIQUE (user_id) on a nullable column is correct for anonymized rows: in Postgres, NULL
-- values are distinct for UNIQUE purposes, so many user_id IS NULL rows are allowed; non-null user_id
-- stays one row per account.

DROP INDEX IF EXISTS game_saves_user_id_unique_when_set;

-- Safe if 009 already dropped the original UNIQUE from 001, or if re-running.
ALTER TABLE game_saves DROP CONSTRAINT IF EXISTS game_saves_user_id_key;

ALTER TABLE game_saves
  ADD CONSTRAINT game_saves_user_id_key UNIQUE (user_id);
