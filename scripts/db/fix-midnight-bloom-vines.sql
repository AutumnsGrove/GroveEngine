-- Fix vine anchors to use paragraph:N format (matching how vines work in production)
-- The old anchor:tagname format relied on HTML comments which get stripped by markdown-it
-- Heading-based anchors place vines above headings which looks wrong with float layout
-- paragraph:N targets the Nth direct-child <p> element, which floats correctly

-- Post: our-favorite-midnight-regulars
-- P2=first para under Night Shift Nurses, P5=after novelist intro, P8=stargazer intro, P12=why they matter
UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"paragraph:2","content":"We keep a \"nurse discount\" that is not on the menu. 50% off for anyone who has spent the night caring for others. Just show us your badge."},
  {"type":"comment","anchor":"paragraph:5","content":"We did peek at her notebook once, accidentally. The handwriting was beautiful—impossible to read, but beautiful. Like the letters themselves were having feelings."},
  {"type":"comment","anchor":"paragraph:8","content":"Professor Okonkwo once set up his telescope in our back alley and showed the entire cafe Saturn''s rings. It was 3 AM. Everyone cried a little."},
  {"type":"comment","anchor":"paragraph:12","content":"We keep a small bulletin board by the door where people can leave notes for each other. \"Looking for someone to practice French with after midnight\" was posted last month. It worked."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'our-favorite-midnight-regulars';

-- Post: the-art-of-brewing-patience
-- P2=problem with speed content, P5=temperature matters content, P10=philosophy content
UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"paragraph:2","content":"**A confession**: Elena once worked at a coffee chain that shall remain nameless. The memory of those \"tea lattes\" still haunts her dreams."},
  {"type":"comment","anchor":"paragraph:5","content":"Our kettles are vintage copper pieces from Japan, each one over 50 years old. They heat water differently than modern electric kettles—more evenly, more gently."},
  {"type":"comment","anchor":"paragraph:10","content":"This is not meant to be gatekeeping. If you need quick caffeine, that''s valid. We just can''t be the place that provides it. There''s a 24-hour diner two blocks over with perfectly serviceable coffee."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'the-art-of-brewing-patience';

-- Post: why-we-dont-play-music
-- P3=sound of cafes content, P7=silence content, P10=headphones content, P14=sacred content
UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"paragraph:3","content":"Elena spent six months researching \"cafe playlists\" before opening. She found over 50,000 \"coffee shop vibes\" playlists on Spotify alone. It felt less like curation and more like conformity."},
  {"type":"comment","anchor":"paragraph:7","content":"John Cage''s 4''33\" taught us that there''s no such thing as true silence—only sounds we have not noticed yet. We try to create space for noticing."},
  {"type":"comment","anchor":"paragraph:10","content":"Our most popular headphone choice among regulars? Apparently it''s brown noise. We have been told it sounds like \"being inside a warm sweater.\""},
  {"type":"comment","anchor":"paragraph:14","content":"A regular once described the 3 AM atmosphere as \"like being in a library, but the books are people''s thoughts.\" We have never forgotten that."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'why-we-dont-play-music';

-- Post: moonlight-jasmine-blend
-- P3=step 1 content, P5=step 3 content, P8=step 6 content, P10=tasting notes content
UPDATE posts SET gutter_content = '[
  {"type":"comment","anchor":"paragraph:3","content":"At the cafe, we use small clay gaiwans that have absorbed years of tea. They add something to the brew that new vessels can not replicate. At home, any pre-warmed ceramic will do nicely."},
  {"type":"comment","anchor":"paragraph:5","content":"If your tap water is heavily chlorinated, let it sit uncovered for an hour before boiling, or use spring water. The tea will taste of whatever the water tastes of."},
  {"type":"comment","anchor":"paragraph:8","content":"Traditional jasmine pearls are scented 6-7 times over the course of a month, with fresh jasmine blossoms each night. It takes about 4.4 pounds of blossoms to scent a single pound of tea."},
  {"type":"comment","anchor":"paragraph:10","content":"Elena spent three months perfecting the salt ratio. Too much and you taste it directly. The right amount—just a few grains per tablespoon of tea—and you taste *everything else* more vividly."}
]' WHERE tenant_id = 'example-tenant-001' AND slug = 'moonlight-jasmine-blend';
