-- One-time data repair for saves whose `game_state.tools` object was wiped to all-false
-- (see migration 025 for the root cause + the guard that prevents recurrence).
--
-- Tools are permanent, and every craftable tool records an authoritative progression flag in
-- `story.seen` when crafted (`hasX` / `actionCraftX`, verified against
-- client/src/game/rules/caveCraftTools.ts). We rebuild the axe / pickaxe / lantern crafting
-- chain (+ blacksmith_hammer) from those flags and overlay the recovered tools onto the row.
--
-- Safety:
--   * Only rows with ZERO owned tools are candidates, so we never clobber a still-intact save.
--   * We only ADD tools the player provably crafted (flag = true); nothing is removed.
--   * The final `restored <> '{}'` filter skips legitimate new players (no craft flags), so
--     this touches only the genuinely-corrupted saves (~40 at time of writing).
--   * `playTime` is intentionally left unchanged; on next load a play-time tie resolves in
--     favour of the (now-repaired) cloud save, so the fix surfaces without stat distortion.
--
-- Event-only tools (reinforced_rope, giant_trap, occultist_map, hidden_library_map,
-- mastermason_chisel, crow_harness, natharit_pickaxe, bone_saw, skull_lantern, lantern,
-- skeleton_key) have no reliable story-flag mapping and are NOT reconstructed here; they are
-- not needed to restore mining/crafting progression.

WITH candidates AS (
  SELECT
    g.user_id,
    g.game_state->'story'->'seen'                AS s,
    COALESCE(g.game_state->'tools', '{}'::jsonb) AS cur_tools
  FROM game_saves g
  WHERE (
    SELECT count(*)
    FROM jsonb_each(COALESCE(g.game_state->'tools', '{}'::jsonb)) e
    WHERE e.value::text = 'true'
  ) = 0
),
rebuilt AS (
  SELECT
    user_id,
    cur_tools,
    jsonb_build_object(
      'stone_axe',          (s->>'hasStoneAxe'='true'          OR s->>'actionCraftStoneAxe'='true'),
      'stone_pickaxe',      (s->>'hasStonePickaxe'='true'      OR s->>'actionCraftStonePickaxe'='true'),
      'iron_axe',           (s->>'hasIronAxe'='true'           OR s->>'actionCraftIronAxe'='true'),
      'iron_pickaxe',       (s->>'hasIronPickaxe'='true'       OR s->>'actionCraftIronPickaxe'='true'),
      'iron_lantern',       (s->>'hasIronLantern'='true'       OR s->>'actionCraftIronLantern'='true'),
      'steel_axe',          (s->>'hasSteelAxe'='true'          OR s->>'actionCraftSteelAxe'='true'),
      'steel_pickaxe',      (s->>'hasSteelPickaxe'='true'      OR s->>'actionCraftSteelPickaxe'='true'),
      'steel_lantern',      (s->>'hasSteelLantern'='true'      OR s->>'actionCraftSteelLantern'='true'),
      'obsidian_axe',       (s->>'hasObsidianAxe'='true'       OR s->>'actionCraftObsidianAxe'='true'),
      'obsidian_pickaxe',   (s->>'hasObsidianPickaxe'='true'   OR s->>'actionCraftObsidianPickaxe'='true'),
      'obsidian_lantern',   (s->>'hasObsidianLantern'='true'   OR s->>'actionCraftObsidianLantern'='true'),
      'adamant_axe',        (s->>'hasAdamantAxe'='true'        OR s->>'actionCraftAdamantAxe'='true'),
      'adamant_pickaxe',    (s->>'hasAdamantPickaxe'='true'    OR s->>'actionCraftAdamantPickaxe'='true'),
      'adamant_lantern',    (s->>'hasAdamantLantern'='true'    OR s->>'actionCraftAdamantLantern'='true'),
      'blacksteel_axe',     (s->>'hasBlacksteelAxe'='true'     OR s->>'actionCraftBlacksteelAxe'='true'),
      'blacksteel_pickaxe', (s->>'hasBlacksteelPickaxe'='true' OR s->>'actionCraftBlacksteelPickaxe'='true'),
      'blacksteel_lantern', (s->>'hasBlacksteelLantern'='true' OR s->>'actionCraftBlacksteelLantern'='true'),
      'blacksmith_hammer',  (s->>'blacksmithHammerChoice'='true')
    ) AS full_tools
  FROM candidates
),
true_only AS (
  SELECT
    user_id,
    cur_tools,
    COALESCE(
      (SELECT jsonb_object_agg(k, v) FROM jsonb_each(full_tools) x(k, v) WHERE v = 'true'::jsonb),
      '{}'::jsonb
    ) AS restored
  FROM rebuilt
)
UPDATE game_saves g
SET game_state = jsonb_set(g.game_state, ARRAY['tools'], (t.cur_tools || t.restored), true),
    updated_at = now()
FROM true_only t
WHERE g.user_id = t.user_id
  AND t.restored <> '{}'::jsonb;
