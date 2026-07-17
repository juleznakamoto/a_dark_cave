-- One-time data repair for saves whose `game_state.buildings` was wiped to all-zero
-- (see migration 027 for the root cause + the guard that prevents recurrence).
--
-- Buildings record `story.seen.actionBuild*` when first constructed. We rebuild each
-- flagged building to count >= 1 (exact multi-hut counts cannot be recovered from flags).
-- Sticky unlock flags (villageUnlocked, forestUnlocked, …) are also restored from story.
--
-- Safety:
--   * Only rows with ZERO total building counts are candidates.
--   * We only ADD buildings the player provably built (flag = true); nothing is removed.
--   * Village evidence without build flags (hasVillagers / tabUnlockBlinkSeen_village)
--     restores at least woodenHut = 1 so the village tab is playable again.
--   * Rows with no village/build evidence are skipped (new players).
--   * `playTime` is left unchanged.

WITH candidates AS (
  SELECT
    g.user_id,
    g.game_state,
    g.game_state->'story'->'seen' AS s,
    COALESCE(g.game_state->'buildings', '{}'::jsonb) AS cur_buildings,
    COALESCE(g.game_state->'flags', '{}'::jsonb) AS cur_flags
  FROM game_saves g
  WHERE (
    SELECT COALESCE(SUM((e.value)::numeric), 0)
    FROM jsonb_each(COALESCE(g.game_state->'buildings', '{}'::jsonb)) e
  ) = 0
  AND (
    (g.game_state->'story'->'seen'->>'hasVillagers') = 'true'
    OR (g.game_state->'story'->'seen'->>'tabUnlockBlinkSeen_village') = 'true'
    OR (g.game_state->'story'->'seen'->>'actionBuildWoodenHut') = 'true'
    OR (g.game_state->'story'->'seen'->>'actionBuildCabin') = 'true'
    OR (g.game_state->'story'->'seen'->>'actionBuildStoneHut') = 'true'
    OR (g.game_state->'story'->'seen'->>'actionBuildLonghouse') = 'true'
    OR (g.game_state->'story'->'seen'->>'actionBuildFurTents') = 'true'
    OR (g.game_state->'story'->'seen'->>'actionBuildBastion') = 'true'
    OR EXISTS (
      SELECT 1
      FROM jsonb_each(g.game_state->'story'->'seen') e
      WHERE e.key LIKE 'actionBuild%'
        AND e.value::text = 'true'
    )
  )
),
-- Map actionBuild* story flags → building keys (jsonb_object_agg avoids PG's
-- 100-arg limit on jsonb_build_object).
rebuilt AS (
  SELECT
    c.user_id,
    c.game_state,
    c.cur_buildings,
    c.cur_flags,
    c.s,
    COALESCE(
      (
        SELECT jsonb_object_agg(m.building_key, 1)
        FROM (
          VALUES
            ('cabin', 'actionBuildCabin'),
            ('greatCabin', 'actionBuildGreatCabin'),
            ('grandHunterLodge', 'actionBuildGrandHunterLodge'),
            ('timberMill', 'actionBuildTimberMill'),
            ('quarry', 'actionBuildQuarry'),
            ('blacksmith', 'actionBuildBlacksmith'),
            ('advancedBlacksmith', 'actionBuildAdvancedBlacksmith'),
            ('grandBlacksmith', 'actionBuildGrandBlacksmith'),
            ('shallowPit', 'actionBuildShallowPit'),
            ('deepeningPit', 'actionBuildDeepeningPit'),
            ('deepPit', 'actionBuildDeepPit'),
            ('bottomlessPit', 'actionBuildBottomlessPit'),
            ('foundry', 'actionBuildFoundry'),
            ('primeFoundry', 'actionBuildPrimeFoundry'),
            ('masterworkFoundry', 'actionBuildMasterworkFoundry'),
            ('bastion', 'actionBuildBastion'),
            ('fortifiedMoat', 'actionBuildFortifiedMoat'),
            ('wizardTower', 'actionBuildWizardTower'),
            ('traps', 'actionBuildTraps'),
            ('improvedTraps', 'actionBuildImprovedTraps'),
            ('blackMonolith', 'actionBuildBlackMonolith'),
            ('pillarOfClarity', 'actionBuildPillarOfClarity'),
            ('boneyard', 'actionBuildBoneyard'),
            ('boneTemple', 'actionBuildBoneTemple'),
            ('paleCross', 'actionBuildPaleCross'),
            ('consecratedPaleCross', 'actionBuildConsecratedPaleCross'),
            ('darkEstate', 'actionBuildDarkEstate'),
            ('blackEstate', 'actionBuildBlackEstate'),
            ('supplyHut', 'actionBuildSupplyHut'),
            ('storehouse', 'actionBuildStorehouse'),
            ('fortifiedStorehouse', 'actionBuildFortifiedStorehouse'),
            ('villageWarehouse', 'actionBuildVillageWarehouse'),
            ('grandRepository', 'actionBuildGrandRepository'),
            ('greatVault', 'actionBuildGreatVault'),
            ('clerksHut', 'actionBuildClerksHut'),
            ('scriptorium', 'actionBuildScriptorium'),
            ('inkwardenAcademy', 'actionBuildInkwardenAcademy'),
            ('scribesOffice', 'actionBuildScribesOffice'),
            ('recordsHall', 'actionBuildRecordsHall'),
            ('grandArchive', 'actionBuildGrandArchive'),
            ('buildersLodge', 'actionBuildBuildersLodge'),
            ('buildersHall', 'actionBuildBuildersHall'),
            ('buildersGuild', 'actionBuildBuildersGuild'),
            ('tannery', 'actionBuildTannery'),
            ('masterTannery', 'actionBuildMasterTannery'),
            ('highTannery', 'actionBuildHighTannery'),
            ('altar', 'actionBuildAltar'),
            ('shrine', 'actionBuildShrine'),
            ('temple', 'actionBuildTemple'),
            ('sanctum', 'actionBuildSanctum'),
            ('alchemistHall', 'actionBuildAlchemistHall'),
            ('tradePost', 'actionBuildTradePost'),
            ('grandBazaar', 'actionBuildGrandBazaar'),
            ('merchantsGuild', 'actionBuildMerchantsGuild'),
            ('chitinPlating', 'actionBuildChitinPlating'),
            ('coinhouse', 'actionBuildCoinhouse'),
            ('bank', 'actionBuildBank'),
            ('treasury', 'actionBuildTreasury'),
            ('heartfire', 'actionBuildHeartfire'),
            ('woodenHut', 'actionBuildWoodenHut'),
            ('stoneHut', 'actionBuildStoneHut'),
            ('longhouse', 'actionBuildLonghouse'),
            ('furTents', 'actionBuildFurTents'),
            ('watchtower', 'actionBuildWatchtower'),
            ('palisades', 'actionBuildPalisades')
        ) AS m(building_key, flag_key)
        WHERE (c.s->>m.flag_key) = 'true'
      ),
      '{}'::jsonb
    ) AS from_flags
  FROM candidates c
),
with_fallback AS (
  SELECT
    user_id,
    game_state,
    cur_buildings,
    cur_flags,
    s,
    CASE
      WHEN from_flags = '{}'::jsonb
           AND (
             (s->>'hasVillagers') = 'true'
             OR (s->>'tabUnlockBlinkSeen_village') = 'true'
           )
        THEN jsonb_build_object('woodenHut', 1)
      ELSE from_flags
    END AS restored_buildings
  FROM rebuilt
),
with_flags AS (
  SELECT
    user_id,
    game_state,
    cur_buildings,
    restored_buildings,
    cur_flags || jsonb_strip_nulls(jsonb_build_object(
      'gameStarted', CASE
        WHEN (cur_flags->>'gameStarted') = 'true'
          OR COALESCE((game_state->>'playTime')::numeric, 0) > 0
          OR (s->>'fireLit') = 'true'
          OR (s->>'gameStarted') = 'true'
        THEN true END,
      'hasLitFire', CASE
        WHEN (cur_flags->>'hasLitFire') = 'true' OR (s->>'fireLit') = 'true'
        THEN true END,
      'villageUnlocked', CASE
        WHEN (cur_flags->>'villageUnlocked') = 'true'
          OR restored_buildings <> '{}'::jsonb
          OR (s->>'hasVillagers') = 'true'
          OR (s->>'tabUnlockBlinkSeen_village') = 'true'
        THEN true END,
      'forestUnlocked', CASE
        WHEN (cur_flags->>'forestUnlocked') = 'true'
          OR (s->>'tabUnlockBlinkSeen_forest') = 'true'
          OR (s->>'hasHunted') = 'true'
          OR (s->>'actionCraftCrudeBow') = 'true'
          OR (s->>'forestCave') = 'true'
        THEN true END,
      'bastionUnlocked', CASE
        WHEN (cur_flags->>'bastionUnlocked') = 'true'
          OR (s->>'tabUnlockBlinkSeen_bastion') = 'true'
          OR (s->>'actionBuildBastion') = 'true'
        THEN true END,
      'villagerCapsEnabled', CASE
        WHEN (cur_flags->>'villagerCapsEnabled') = 'true'
          OR (cur_flags->>'villageUnlocked') = 'true'
          OR restored_buildings <> '{}'::jsonb
          OR (s->>'hasVillagers') = 'true'
          OR (s->>'tabUnlockBlinkSeen_village') = 'true'
        THEN true END
    )) AS restored_flags
  FROM with_fallback
)
UPDATE game_saves g
SET
  game_state = jsonb_set(
    jsonb_set(
      g.game_state,
      ARRAY['buildings'],
      (w.cur_buildings || w.restored_buildings),
      true
    ),
    ARRAY['flags'],
    w.restored_flags,
    true
  ),
  updated_at = now()
FROM with_flags w
WHERE g.user_id = w.user_id
  AND w.restored_buildings <> '{}'::jsonb;
