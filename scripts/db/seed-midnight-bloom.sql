-- Seed script for Midnight Bloom example tenant
-- Run with: npx wrangler d1 execute grove-engine-db --file scripts/seed-midnight-bloom.sql --remote

-- ============================================
-- UPSERT HOME PAGE (INSERT OR REPLACE to be resilient to missing migration data)
-- ============================================
INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, hero, updated_at, created_at)
VALUES (
  'example-page-home',
  'example-tenant-001',
  'home',
  'The Midnight Bloom',
  'home',
  '# Welcome to The Midnight Bloom

When the rest of the world winds down, we''re just getting started. The Midnight Bloom is a sanctuary for night owls, late-shift workers, insomniacs, and anyone who finds peace in the quiet hours after dark.

## Our Philosophy

We believe tea is more than a beverage—it''s a ritual, a moment of pause, a small act of self-care in a world that rarely stops moving. Every cup we serve is an invitation to slow down, to breathe, to simply *be*.

Our selection spans the globe: delicate white teas from Fujian, robust pu-erhs from Yunnan, rare oolongs from the mountains of Taiwan, and herbal blends we craft in-house under the light of the moon.

## What Makes Us Different

- **Hours built for night people**: We open at 6 PM and don''t close until 4 AM
- **Curated silence**: No background music, just the gentle sounds of tea being prepared
- **Rare finds**: Teas you won''t find anywhere else in the city
- **No rush**: Stay as long as you need—we understand that some nights are longer than others

## Visit Us

We''re tucked away on Twilight Lane, easy to miss if you''re not looking. A small wooden sign, a door with a brass moon handle, and the warm glow of candlelight in the window. You''ll know it when you find it.

*The Midnight Bloom: where every night holds the possibility of something beautiful.*',
  '{"title": "The Midnight Bloom", "subtitle": "Open when the stars come out", "cta": {"text": "View Our Menu", "link": "/menu"}}',
  unixepoch(),
  unixepoch()
)
ON CONFLICT(tenant_id, slug) DO UPDATE SET
  title = excluded.title,
  markdown_content = excluded.markdown_content,
  hero = excluded.hero,
  updated_at = unixepoch();

-- ============================================
-- ADD ABOUT PAGE
-- ============================================
INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, updated_at)
VALUES (
  'example-page-about',
  'example-tenant-001',
  'about',
  'About Us',
  'about',
  '# Our Story

The Midnight Bloom opened its doors on the winter solstice of 2019—the longest night of the year. It felt fitting.

## How It Began

Our founder, Elena Chen, spent a decade working night shifts as a nurse. She understood intimately what it meant to be awake when the world sleeps, to crave connection and comfort in the small hours. The coffee shops were closed. The bars were too loud. There was nowhere to simply sit with a warm drink and quiet thoughts.

So she created that place herself.

## The Name

The midnight bloom refers to night-blooming flowers—jasmine, moonflowers, evening primrose—plants that save their beauty for the darkness. They don''t compete with the sun; they wait for the moon.

We think there''s something poetic in that. Some things are meant to flourish after dark.

## Our Space

The cafe is small by design. Just twelve seats, arranged to offer both community and solitude. Worn wooden tables, mismatched vintage chairs, and candlelight that flickers gently against the exposed brick walls.

We have no Wi-Fi password—by choice. This is a place to disconnect from the digital and reconnect with the present moment. Bring a book, bring a journal, bring a friend. Or bring nothing at all.

## Our Team

Our staff are all night people themselves. We understand the particular loneliness of 2 AM, and we''re here to offer warmth in whatever form you need—a perfectly brewed cup, a knowing smile, or the simple comfort of shared silence.

## A Note on Reservations

We don''t take them. The Midnight Bloom operates on serendipity. Some nights you''ll find an empty seat immediately; other nights you might wait. We find this adds to the magic—you never quite know what any given night will bring.

*Come find us when the stars come out.*',
  unixepoch()
)
ON CONFLICT(tenant_id, slug) DO UPDATE SET
  title = excluded.title,
  markdown_content = excluded.markdown_content,
  updated_at = unixepoch();

-- ============================================
-- DELETE OLD POSTS
-- ============================================
DELETE FROM posts WHERE tenant_id = 'example-tenant-001';

-- ============================================
-- ADD TEA CAFE POSTS
-- ============================================

-- Post 1: The Art of Brewing Patience
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'example-post-brewing',
  'example-tenant-001',
  'the-art-of-brewing-patience',
  'The Art of Brewing Patience',
  'Why we take our time with every cup, and why you should too',
  'In a world of instant everything, we''ve chosen to go slow.

## The Problem with Speed


Modern tea culture has been infected by the same disease as everything else: the need for immediacy. Tea bags, single-serve pods, "instant" matcha powders that taste like sadness dissolved in water. We''ve sacrificed quality for convenience, ritual for routine.

At The Midnight Bloom, we reject this entirely.

## What Proper Brewing Requires

Every tea has its own personality, its own needs. A delicate white tea wants water just off the boil and a brief, gentle steep. A hearty pu-erh can handle boiling water and rewards longer immersion. To rush either is to miss the point entirely.

### Temperature Matters

We keep three kettles at different temperatures throughout the night:

- **175 F (80 C)**: For white and green teas
- **195 F (90 C)**: For oolongs and lighter blacks
- **212 F (100 C)**: For pu-erh and robust black teas


### Timing is Everything

We use hourglasses instead of timers. There''s something meditative about watching sand fall, something that a digital beep can never replicate. Each hourglass is calibrated for different steep times: one minute, three minutes, five minutes.

## The Ritual of Waiting

When you order tea at The Midnight Bloom, you wait. Not because we''re slow—we''re deliberate. Those few minutes while your tea steeps are a gift. Use them.

Watch the steam rise. Feel the warmth of the cup in your hands. Let your thoughts wander. This is the point. This is what you came here for.

## Why We Don''t Offer "Fast" Options

People sometimes ask if we can speed things up. They have somewhere to be. To which we gently suggest: perhaps this isn''t the right place for tonight.


The Midnight Bloom exists specifically for those moments when you have nowhere else to be. We''re not a pit stop; we''re a destination. Stay awhile. The tea will be ready when it''s ready.

## A Practice for Home

You can bring this mindfulness to your own tea practice:

1. **Heat your water intentionally** — Watch the bubbles form and rise
2. **Measure your leaves carefully** — Touch them, smell them before they steep
3. **Set a timer, then ignore it** — Trust yourself to know when it''s ready
4. **Pour slowly** — Let the stream be thin and steady
5. **Sit with your cup before drinking** — Anticipation is part of the experience

## The Reward

Tea brewed with patience tastes different. This isn''t mysticism; it''s chemistry. Proper temperature and timing extract the compounds you want while leaving behind the ones you don''t. But beyond the science, there''s something else—a satisfaction that comes from having given your full attention to something small and beautiful.

*In a world that never stops, we offer you permission to pause.*',
  '["tea", "philosophy", "brewing"]',
  'published',
  unixepoch() - 86400 * 56,
  unixepoch() - 86400 * 56,
  unixepoch()
);

-- Post 2: Our Favorite Midnight Regulars
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'example-post-regulars',
  'example-tenant-001',
  'our-favorite-midnight-regulars',
  'Our Favorite Midnight Regulars',
  'The beautiful humans who make our late nights worthwhile',
  'Every cafe has its regulars. Ours just happen to appear after midnight.

## The Night Shift Nurses


They come in groups of two or three, still in scrubs, exhausted in ways that show in their eyes more than their posture. They rarely speak to each other at first—just sit with their tea and decompress. By the second cup, conversation slowly emerges. Stories from the ward, shared in the way only people who''ve seen the same things can understand.

We always have their orders started before they sit down. Chamomile for Sarah. Lapsang souchong for Marcus. Mint blend for whoever needs it most.

## The Novelist

We don''t know her real name. She introduced herself once as "just someone trying to finish a book," and we never pressed further. She arrives around 10 PM every Thursday with a leather journal and a fountain pen, orders our strongest black tea, and writes until we close.


In three years, she''s filled dozens of notebooks. We''ve never asked what she''s writing. Some mysteries are better left intact.

## The Insomniacs Anonymous

A group that found each other here, not by design but by repeated coincidence. Now they have a standing (unspoken) reservation at the corner table every Saturday night. They don''t talk about why they can''t sleep—they talk about everything else. Books, movies, the philosophical implications of artificial intelligence, the best way to make scrambled eggs.

We''ve watched friendships form in real-time, forged in the shared understanding that 3 AM can be the loneliest hour, but it doesn''t have to be.

## The Stargazer

An astronomy professor from the university who comes in before dawn on clear nights, always with a telescope case and a look of quiet wonder. He orders whatever''s warmest and tells us about what''s visible in the sky that night.


"Did you know," he said once, "that the light from some of these stars started traveling toward us before humans existed?" Then he smiled into his tea like he''d shared a secret.

## The Night Bus Driver

Route 11, the Night Owl. She has a 45-minute break between runs, and she spends most of it here. Always orders a pot of oolong—enough for two or three cups—and reads paperback mysteries from the used bookstore down the street.

"The night shift is lonely," she told us once. "Nice to have somewhere that''s awake when I am."

## Why They Matter


These people—and dozens of others who drift in and out of our orbit—are the reason The Midnight Bloom exists. We didn''t open a cafe to serve tea. We opened it to create a space where night people could find each other.

The best moments here aren''t the quiet ones. They''re when a regular introduces themselves to another regular, when strangers become friends over shared insomnia, when someone walks in lost and leaves a little more found.

## An Open Invitation

If you''re reading this and recognizing yourself—if you''re someone who''s awake when the world sleeps, looking for a place to be—consider this your invitation.

We don''t care why you''re up. We don''t care what you do for a living or what keeps you from rest. We only care that you might need a warm drink and a seat by the window, watching the night go by.

*Come be a regular. We''ll learn your order.*',
  '["community", "stories", "regulars"]',
  'published',
  unixepoch() - 86400 * 43,
  unixepoch() - 86400 * 43,
  unixepoch()
);

-- Post 3: Why We Don't Play Music
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'example-post-music',
  'example-tenant-001',
  'why-we-dont-play-music',
  'Why We Don''t Play Music',
  'The radical act of letting silence speak',
  'Every new visitor asks the same question, usually within the first ten minutes: "Is the music broken?"

No. There is no music. There never has been.

## The Sound of Most Cafes


Walk into any coffee shop and you''ll be greeted by a carefully curated playlist. Indie folk in the morning, lo-fi beats in the afternoon, something vaguely jazzy in the evening. It''s designed to create "ambiance"—to fill the space with something pleasant and forgettable.

We understand the impulse. Silence can feel awkward, especially in public spaces. Music gives people permission to talk without feeling overheard. It smooths the edges of social interaction.

But here''s the thing: we don''t want to smooth edges. We want to create a space where the edges are felt.

## What You Hear Instead

Without music, The Midnight Bloom has its own soundscape:

- The whisper of steam from the kettles
- The gentle clink of ceramic cups on wooden tables
- Rain on the windows when the weather obliges
- The occasional turning of a page
- Quiet conversation that rises and falls like breath
- Sometimes, nothing at all


This isn''t silence—it''s the absence of manufactured sound. There''s a difference.

## The Magic of Quiet Conversation

When there''s no background music, conversations change. People speak more softly, more intentionally. They listen more carefully. The pauses between words become meaningful rather than uncomfortable.

Some of the most profound conversations we''ve witnessed at The Midnight Bloom happened in near-whispers. There''s an intimacy to speaking quietly that a normal-volume conversation in a noisy cafe can never achieve.

## For Those Who Need Sound


We understand that not everyone finds silence comfortable. Some people need noise to focus, or to quiet the noise in their own heads. That''s valid.

We keep a small basket of complimentary earplugs by the door—the soft foam kind—for guests who prefer to create their own silence. And we have no policy against headphones. Your ears, your choice.

What we don''t do is make that choice for everyone.

## The Night Has Its Own Music

At 2 AM, with only a handful of people scattered across our twelve seats, the cafe takes on a quality that''s hard to describe. The city outside is quiet. The usual urban hum has faded. And in that hush, The Midnight Bloom becomes something almost sacred.


This is when the tea tastes best. When the candlelight seems brighter. When strangers glance at each other with the recognition of fellow travelers in strange territory.

Music would ruin it.

## An Experiment for Skeptics

If you''re used to cafes with carefully curated playlists, we invite you to try something: sit with us for an hour without putting in headphones. Let the quietness settle around you. Notice what you hear. Notice what you think.

You might hate it. Some people do.

But you might find something you didn''t know you were looking for: the rare luxury of a public space that doesn''t demand anything from your ears.

*Sometimes the most radical thing you can offer is nothing at all.*',
  '["atmosphere", "philosophy", "design"]',
  'published',
  unixepoch() - 86400 * 40,
  unixepoch() - 86400 * 40,
  unixepoch()
);

-- Post 4: The Night I Finally Sat Still
-- Seeded to demonstrate the Writing Prompts curio (issue #1575) — this
-- post's spark_prompt column is populated, same as a real bloom started
-- from Flow's Spark button would be.
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, spark_prompt, published_at, created_at, updated_at)
VALUES (
  'example-post-sat-still',
  'example-tenant-001',
  'the-night-i-finally-sat-still',
  'The Night I Finally Sat Still',
  'A closing-shift confession about the difference between quiet and stillness',
  'I almost didn''t write this one down. It started as a note to myself, scribbled on the back of a receipt during a slow closing shift, and it stayed folded in my apron pocket for two weeks before I let myself admit it was worth saying out loud.

## The Prompt I Couldn''t Shake


I''d been staring at a blank page for a while — the kind of blank that isn''t really about not having anything to say, it''s about not knowing where to start. So I did the thing I tell our regulars to do when they''re stuck: I let something small choose for me. A prompt, not a plan. *Describe the last time you sat in silence on purpose.*

I laughed a little, sitting there at table six after close, kettle steam curling up past the candlelight. Of all the prompts to land on, in a cafe built entirely around silence. But that was exactly why it stopped me.

## Quiet Isn''t the Same as Still

We talk a lot here about not playing music, about protecting the hush of the room. What I hadn''t admitted, even to myself, was that I''d gotten so good at *offering* quiet to other people that I''d forgotten how to actually sit in it.


Most nights, even in the silence, my mind is doing inventory. Restocking the lapsang souchong. Wondering if table three needs a refill. Running the math on whether we have enough chamomile for the weekend. The room was quiet. I was not.

So that night, after the last regular left and the door was locked, I didn''t start closing checklist. I just sat. No phone, no notebook, not even tea at first — just the chair, the dark windows, and whatever was left of the candle.

## What Ten Minutes Actually Feels Like


Ten minutes doesn''t sound like much. It felt enormous. The first few were restless — my hands wanted a task, my eyes kept drifting to the things that needed wiping down. Somewhere around minute four, I noticed the specific sound the building makes when no one''s talking in it: a settle, a creak, the fridge compressor cycling on and off like slow breathing.

By minute eight, I wasn''t thinking about the shop at all. I was just here. Twelve empty chairs, a hundred cups washed and stacked, and me, finally matching the room instead of managing it.

## Why I''m Telling You This


Because I think a lot of us — night people especially — are experts at *making* space for stillness without ever stepping into it ourselves. We set the table. We dim the lights. We hand someone their tea and disappear so they can have their moment. And somewhere in all that hosting, we forget we''re allowed a moment too.

So this is a small, late invitation, from someone whose job is to protect quiet for a living: sit in it yourself sometimes. Not to serve anyone. Not to accomplish anything. Just to find out what you sound like when nothing''s asking anything of you.

*The kettle can wait ten more minutes. It always has.*

— Elena',
  '["reflection", "closing-shift", "stillness"]',
  'published',
  'Describe the last time you sat in silence on purpose.',
  unixepoch() - 86400 * 12,
  unixepoch() - 86400 * 12,
  unixepoch()
);

-- ============================================
-- VINES (gutter marginalia)
-- ============================================
-- Anchors use "paragraph:N" (1-indexed, counting only direct-child <p>
-- elements — see findAnchorElement()/parseAnchor() in
-- libs/engine/src/lib/utils/gutter.ts). This is the format real posts
-- actually use — an earlier version of this seed used inline
-- <!-- anchor:name --> markdown comments instead, which parseAnchor()
-- doesn't recognize; it silently fell back to treating them as a
-- heading-text lookup that never matched, so every note collapsed to
-- the same "not found" position. No markup in the markdown is needed
-- for paragraph anchors — the index is just this post's Nth <p> tag.

UPDATE posts SET gutter_content = '[
  {"type": "comment", "anchor": "paragraph:2", "content": "We used to have a French press. We don''t anymore — turns out ''fast tea'' was a contradiction we were forcing."},
  {"type": "comment", "anchor": "paragraph:5", "content": "Three kettles means three different whistles. Regulars can tell which tea''s coming just by the pitch."},
  {"type": "comment", "anchor": "paragraph:10", "content": "Elena''s exact words, verbatim, the first time someone asked for ''the quick version.''"}
]' WHERE id = 'example-post-brewing';

UPDATE posts SET gutter_content = '[
  {"type": "comment", "anchor": "paragraph:2", "content": "Sarah''s chamomile is always waiting by the time her shoes hit the doorway sensor."},
  {"type": "comment", "anchor": "paragraph:5", "content": "We did once catch a glimpse of the cover page. All it said was ''Draft 14.''"},
  {"type": "comment", "anchor": "paragraph:9", "content": "He left his card once, ''in case anyone ever wants to borrow the telescope.'' Nobody has yet. We think that''s the point."},
  {"type": "comment", "anchor": "paragraph:12", "content": "This is the paragraph we rewrite every time we update the site — it never quite captures it, but we keep trying."}
]' WHERE id = 'example-post-regulars';

UPDATE posts SET gutter_content = '[
  {"type": "comment", "anchor": "paragraph:3", "content": "The playlist question comes up so often we considered a sign. We didn''t, on principle."},
  {"type": "comment", "anchor": "paragraph:7", "content": "Try it for one visit. You''ll start hearing the kettle differently."},
  {"type": "comment", "anchor": "paragraph:10", "content": "The earplug basket has needed refilling exactly twice in three years."},
  {"type": "comment", "anchor": "paragraph:14", "content": "This is Elena''s favorite hour to work the counter, even though she''ll deny having a favorite."}
]' WHERE id = 'example-post-music';

UPDATE posts SET gutter_content = '[
  {"type": "comment", "anchor": "paragraph:2", "content": "The receipt is still on the corkboard by the register, if you want to see the actual handwriting."},
  {"type": "comment", "anchor": "paragraph:5", "content": "This is the line half the staff has quoted back at each other since."},
  {"type": "comment", "anchor": "paragraph:7", "content": "We''ve started leaving the last candle lit an extra ten minutes at close, just in case anyone else needs them."},
  {"type": "comment", "anchor": "paragraph:9", "content": "If this sounds like you, table six is usually free after midnight."}
]' WHERE id = 'example-post-sat-still';

-- ============================================
-- UPDATE TENANT POST COUNT
-- ============================================
UPDATE tenants SET post_count = 4 WHERE id = 'example-tenant-001';
