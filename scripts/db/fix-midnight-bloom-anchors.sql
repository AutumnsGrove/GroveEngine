-- Migrate midnight bloom content from HTML comment anchors to Grove directive syntax
-- Old: <!-- anchor:name --> (stripped by markdown-it, never becomes a DOM element)
-- New: ::anchor[name]:: (renders as <span data-anchor="name" class="grove-anchor"></span>)
-- Also updates gutter_content to use anchor:name format (which queries [data-anchor="name"])

-- ============================================
-- UPDATE MARKDOWN CONTENT: Replace HTML comment anchors with ::anchor:: directives
-- ============================================

-- our-favorite-midnight-regulars
UPDATE posts SET markdown_content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(markdown_content,
        '<!-- anchor:nurses -->', '::anchor[nurses]::'),
      '<!-- anchor:novelist -->', '::anchor[novelist]::'),
    '<!-- anchor:stargazer -->', '::anchor[stargazer]::'),
  '<!-- anchor:community -->', '::anchor[community]::'),
  updated_at = unixepoch()
WHERE tenant_id = 'example-tenant-001' AND slug = 'our-favorite-midnight-regulars';

-- the-art-of-brewing-patience
UPDATE posts SET markdown_content = REPLACE(
  REPLACE(
    REPLACE(markdown_content,
      '<!-- anchor:speed-note -->', '::anchor[speed-note]::'),
    '<!-- anchor:kettle-note -->', '::anchor[kettle-note]::'),
  '<!-- anchor:philosophy -->', '::anchor[philosophy]::'),
  updated_at = unixepoch()
WHERE tenant_id = 'example-tenant-001' AND slug = 'the-art-of-brewing-patience';

-- why-we-dont-play-music
UPDATE posts SET markdown_content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(markdown_content,
        '<!-- anchor:sound-note -->', '::anchor[sound-note]::'),
      '<!-- anchor:silence -->', '::anchor[silence]::'),
    '<!-- anchor:headphones -->', '::anchor[headphones]::'),
  '<!-- anchor:sacred -->', '::anchor[sacred]::'),
  updated_at = unixepoch()
WHERE tenant_id = 'example-tenant-001' AND slug = 'why-we-dont-play-music';

-- moonlight-jasmine-blend (content was already reseeded, add anchors)
UPDATE posts SET markdown_content = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(markdown_content,
        '### Step 1: Prepare Your Vessel', '::anchor[vessel-note]::

### Step 1: Prepare Your Vessel'),
      '### Step 3: Heat the Water', '::anchor[water-note]::

### Step 3: Heat the Water'),
    '### Step 6: Observe', '::anchor[pearls-note]::

### Step 6: Observe'),
  '## Tasting Notes', '::anchor[taste-note]::

## Tasting Notes'),
  updated_at = unixepoch()
WHERE tenant_id = 'example-tenant-001' AND slug = 'moonlight-jasmine-blend';

-- ============================================
-- UPDATE GUTTER CONTENT: Switch to anchor:tagname format
-- ============================================

UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"anchor:nurses","content":"We keep a \"nurse discount\" that is not on the menu. 50% off for anyone who has spent the night caring for others. Just show us your badge."},
  {"type":"comment","anchor":"anchor:novelist","content":"We did peek at her notebook once, accidentally. The handwriting was beautiful—impossible to read, but beautiful. Like the letters themselves were having feelings."},
  {"type":"comment","anchor":"anchor:stargazer","content":"Professor Okonkwo once set up his telescope in our back alley and showed the entire cafe Saturn''s rings. It was 3 AM. Everyone cried a little."},
  {"type":"comment","anchor":"anchor:community","content":"We keep a small bulletin board by the door where people can leave notes for each other. \"Looking for someone to practice French with after midnight\" was posted last month. It worked."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'our-favorite-midnight-regulars';

UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"anchor:speed-note","content":"**A confession**: Elena once worked at a coffee chain that shall remain nameless. The memory of those \"tea lattes\" still haunts her dreams."},
  {"type":"comment","anchor":"anchor:kettle-note","content":"Our kettles are vintage copper pieces from Japan, each one over 50 years old. They heat water differently than modern electric kettles—more evenly, more gently."},
  {"type":"comment","anchor":"anchor:philosophy","content":"This is not meant to be gatekeeping. If you need quick caffeine, that''s valid. We just can''t be the place that provides it. There''s a 24-hour diner two blocks over with perfectly serviceable coffee."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'the-art-of-brewing-patience';

UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"anchor:sound-note","content":"Elena spent six months researching \"cafe playlists\" before opening. She found over 50,000 \"coffee shop vibes\" playlists on Spotify alone. It felt less like curation and more like conformity."},
  {"type":"comment","anchor":"anchor:silence","content":"John Cage''s 4''33\" taught us that there''s no such thing as true silence—only sounds we have not noticed yet. We try to create space for noticing."},
  {"type":"comment","anchor":"anchor:headphones","content":"Our most popular headphone choice among regulars? Apparently it''s brown noise. We have been told it sounds like \"being inside a warm sweater.\""},
  {"type":"comment","anchor":"anchor:sacred","content":"A regular once described the 3 AM atmosphere as \"like being in a library, but the books are people''s thoughts.\" We have never forgotten that."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'why-we-dont-play-music';

UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"anchor:vessel-note","content":"At the cafe, we use small clay gaiwans that have absorbed years of tea. They add something to the brew that new vessels can not replicate. At home, any pre-warmed ceramic will do nicely."},
  {"type":"comment","anchor":"anchor:water-note","content":"If your tap water is heavily chlorinated, let it sit uncovered for an hour before boiling, or use spring water. The tea will taste of whatever the water tastes of."},
  {"type":"comment","anchor":"anchor:pearls-note","content":"Traditional jasmine pearls are scented 6-7 times over the course of a month, with fresh jasmine blossoms each night. It takes about 4.4 pounds of blossoms to scent a single pound of tea."},
  {"type":"comment","anchor":"anchor:taste-note","content":"Elena spent three months perfecting the salt ratio. Too much and you taste it directly. The right amount—just a few grains per tablespoon of tea—and you taste *everything else* more vividly."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'moonlight-jasmine-blend';
