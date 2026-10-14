-- Demo data for the Neon `preview` branch (Vercel preview deployments). Never for prod.
-- Idempotent: re-run it any time; sessions are re-dated to "tonight" and live 48 h again.
-- Run it in the Neon SQL editor on branch `preview`, or as one transaction by an agent with
-- the preview branch id. To refresh prod data first: Neon > branch `preview` > Reset from parent.
--
-- Demo sessions (open /en/s/<slug>):
--   demo-solo   9 drinks at "demo bar": the next tap earns the "Double Digits" badge
--   demo-wild   16 drinks: tilt, shadow and vignette at full strength
--   demo-fox, demo-owl, demo-bee   table DEMO42 (9 drinks): the next tap crosses the 10 milestone
--   demo-empty  "demo empty bar", no menu and no drinks: empty states and the scan nudge

DO $$
BEGIN
  IF current_setting('neon.endpoint_id', true) = 'ep-sparkling-meadow-almb9fqp' THEN
    RAISE EXCEPTION 'preview-seed.sql must never run on the production branch';
  END IF;
END $$;

INSERT INTO bar_menus (bar_name, items) VALUES
  ('demo bar', '[
    {"name": "ipa", "category": "beer"},
    {"name": "25cl lager", "category": "beer"},
    {"name": "red house wine", "category": "wine"},
    {"name": "spritz", "category": "cocktail"},
    {"name": "mojito", "category": "cocktail"},
    {"name": "whisky", "category": "spirit"},
    {"name": "tequila shot", "category": "shot"},
    {"name": "virgin mojito", "category": "mocktail"},
    {"name": "water", "category": "soft"},
    {"name": "coke", "category": "soft"},
    {"name": "fries", "category": "food"}
  ]'::jsonb),
  ('demo empty bar', '[]'::jsonb)
ON CONFLICT (bar_name) DO UPDATE SET items = EXCLUDED.items;

INSERT INTO tables (code) VALUES ('DEMO42') ON CONFLICT (code) DO NOTHING;

INSERT INTO sessions (slug, bar_menu_id, table_id, nickname, created_at, expires_at)
SELECT v.slug, b.id, t.id, v.nickname, now() - interval '5 hours', now() + interval '48 hours'
FROM (VALUES
  ('demo-solo', 'demo bar', NULL::text, NULL::text),
  ('demo-wild', 'demo bar', NULL, NULL),
  ('demo-fox', 'demo bar', 'DEMO42', 'fox'),
  ('demo-owl', 'demo bar', 'DEMO42', 'owl'),
  ('demo-bee', 'demo bar', 'DEMO42', 'bee'),
  ('demo-empty', 'demo empty bar', NULL, NULL)
) AS v (slug, bar, code, nickname)
JOIN bar_menus b ON b.bar_name = v.bar
LEFT JOIN tables t ON t.code = v.code
ON CONFLICT (slug) DO UPDATE SET
  bar_menu_id = EXCLUDED.bar_menu_id,
  table_id = EXCLUDED.table_id,
  nickname = EXCLUDED.nickname,
  created_at = EXCLUDED.created_at,
  expires_at = EXCLUDED.expires_at;

DELETE FROM drinks WHERE session_id IN (SELECT id FROM sessions WHERE slug LIKE 'demo-%');

-- One row per drink; each number is a tap, in minutes before now.
INSERT INTO drinks (session_id, name, count, category, tapped_at, created_at)
SELECT
  s.id,
  d.name,
  cardinality(d.taps),
  d.category,
  (SELECT jsonb_agg(to_char((now() - make_interval(mins => tap)) AT TIME ZONE 'UTC',
                            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') ORDER BY tap DESC)
   FROM unnest(d.taps) AS tap),
  now() - make_interval(mins => (SELECT max(tap) FROM unnest(d.taps) AS tap))
FROM (VALUES
  ('demo-solo', 'ipa', 'beer', ARRAY[170, 140, 100, 40]),
  ('demo-solo', 'spritz', 'cocktail', ARRAY[130, 90, 20]),
  ('demo-solo', 'water', 'soft', ARRAY[110, 30]),
  ('demo-wild', 'ipa', 'beer', ARRAY[240, 220, 200, 170, 150, 120]),
  ('demo-wild', 'tequila shot', 'shot', ARRAY[160, 90, 60, 15]),
  ('demo-wild', 'mojito', 'cocktail', ARRAY[140, 100, 45, 25]),
  ('demo-wild', 'water', 'soft', ARRAY[130, 70]),
  ('demo-fox', 'ipa', 'beer', ARRAY[200, 120]),
  ('demo-fox', 'mojito', 'cocktail', ARRAY[150]),
  ('demo-fox', 'whisky', 'spirit', ARRAY[60]),
  ('demo-fox', 'fries', 'food', ARRAY[15]),
  ('demo-owl', 'virgin mojito', 'mocktail', ARRAY[150, 100]),
  ('demo-owl', 'coke', 'soft', ARRAY[120]),
  ('demo-owl', 'ipa', 'beer', ARRAY[60])
) AS d (slug, name, category, taps)
JOIN sessions s ON s.slug = d.slug;
