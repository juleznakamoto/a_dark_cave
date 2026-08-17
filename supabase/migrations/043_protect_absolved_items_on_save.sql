-- Book of Absolution rites are permanent for a playthrough. Full-document
-- replace can store spent Insight while dropping `absolvedItems`, so the
-- player must pay again. OR-merge true keys like tools/weapons/books
-- (skipped on restart overwrite).

DO $$
DECLARE
  def text;
  patched text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'save_game_with_analytics'
  LIMIT 1;

  IF def IS NULL THEN
    RAISE EXCEPTION 'save_game_with_analytics not found';
  END IF;

  IF def LIKE '%absolvedItems%' THEN
    RAISE NOTICE 'save_game_with_analytics already protects absolvedItems';
    RETURN;
  END IF;

  IF def NOT LIKE $pat$%ARRAY['tools', 'weapons', 'books']%$pat$ THEN
    RAISE EXCEPTION
      'Unexpected save_game_with_analytics body; permanent-item array not found';
  END IF;

  patched := replace(
    def,
    $old$ARRAY['tools', 'weapons', 'books']$old$,
    $new$ARRAY['tools', 'weapons', 'books', 'absolvedItems']$new$
  );

  IF patched NOT LIKE '%absolvedItems%' THEN
    RAISE EXCEPTION 'Failed to patch save_game_with_analytics absolvedItems protection';
  END IF;

  EXECUTE patched;
END $$;
