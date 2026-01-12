-- Fix script for Midnight Bloom example tenant content
-- This restores the FULL original content from the archive
-- Run with: npx wrangler d1 execute grove-engine-db --file scripts/fix-midnight-bloom-content.sql --remote

-- ============================================
-- DELETE EXISTING POSTS
-- ============================================
DELETE FROM posts WHERE tenant_id = 'example-tenant-001';

-- ============================================
-- POST 1: Our Favorite Midnight Regulars (FULL CONTENT)
-- ============================================
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, gutter_content, published_at, created_at, updated_at)
VALUES (
  'example-post-regulars',
  'example-tenant-001',
  'our-favorite-midnight-regulars',
  'Our Favorite Midnight Regulars',
  'The beautiful humans who make our late nights worthwhile',
  'Every café has its regulars. Ours just happen to appear after midnight.

## The Night Shift Nurses

<!-- anchor:nurses -->

They come in groups of two or three, still in scrubs, exhausted in ways that show in their eyes more than their posture. They rarely speak to each other at first—just sit with their tea and decompress. By the second cup, conversation slowly emerges. Stories from the ward, shared in the way only people who''ve seen the same things can understand.

We always have their orders started before they sit down. Chamomile for Sarah. Lapsang souchong for Marcus. Mint blend for whoever needs it most.

## The Novelist

We don''t know her real name. She introduced herself once as "just someone trying to finish a book," and we never pressed further. She arrives around 10 PM every Thursday with a leather journal and a fountain pen, orders our strongest black tea, and writes until we close.

<!-- anchor:novelist -->

In three years, she''s filled dozens of notebooks. We''ve never asked what she''s writing. Some mysteries are better left intact.

## The Insomniacs Anonymous

A group that found each other here, not by design but by repeated coincidence. Now they have a standing (unspoken) reservation at the corner table every Saturday night. They don''t talk about why they can''t sleep—they talk about everything else. Books, movies, the philosophical implications of artificial intelligence, the best way to make scrambled eggs.

We''ve watched friendships form in real-time, forged in the shared understanding that 3 AM can be the loneliest hour, but it doesn''t have to be.

## The Stargazer

An astronomy professor from the university who comes in before dawn on clear nights, always with a telescope case and a look of quiet wonder. He orders whatever''s warmest and tells us about what''s visible in the sky that night.

<!-- anchor:stargazer -->

"Did you know," he said once, "that the light from some of these stars started traveling toward us before humans existed?" Then he smiled into his tea like he''d shared a secret.

## The Night Bus Driver

Route 11, the Night Owl. She has a 45-minute break between runs, and she spends most of it here. Always orders a pot of oolong—enough for two or three cups—and reads paperback mysteries from the used bookstore down the street.

"The night shift is lonely," she told us once. "Nice to have somewhere that''s awake when I am."

## Why They Matter

<!-- anchor:community -->

These people—and dozens of others who drift in and out of our orbit—are the reason The Midnight Bloom exists. We didn''t open a café to serve tea. We opened it to create a space where night people could find each other.

The best moments here aren''t the quiet ones. They''re when a regular introduces themselves to another regular, when strangers become friends over shared insomnia, when someone walks in lost and leaves a little more found.

## An Open Invitation

If you''re reading this and recognizing yourself—if you''re someone who''s awake when the world sleeps, looking for a place to be—consider this your invitation.

We don''t care why you''re up. We don''t care what you do for a living or what keeps you from rest. We only care that you might need a warm drink and a seat by the window, watching the night go by.

*Come be a regular. We''ll learn your order.*',
  '["community", "stories", "regulars"]',
  'published',
  '[{"type":"comment","anchor":"anchor:nurses","content":"<p>We keep a \"nurse discount\" that isn''t on the menu. 50% off for anyone who''s spent the night caring for others. Just show us your badge.</p>"},{"type":"comment","anchor":"anchor:novelist","content":"<p>We did peek at her notebook once, accidentally. The handwriting was beautiful—impossible to read, but beautiful. Like the letters themselves were having feelings.</p>"},{"type":"comment","anchor":"anchor:stargazer","content":"<p>Professor Okonkwo once set up his telescope in our back alley and showed the entire café Saturn''s rings. It was 3 AM. Everyone cried a little.</p>"},{"type":"comment","anchor":"anchor:community","content":"<p>We keep a small bulletin board by the door where people can leave notes for each other. \"Looking for someone to practice French with after midnight\" was posted last month. It worked.</p>"}]',
  unixepoch() - 86400 * 43,
  unixepoch() - 86400 * 43,
  unixepoch()
);

-- ============================================
-- POST 2: The Art of Brewing Patience (FULL CONTENT)
-- ============================================
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, gutter_content, published_at, created_at, updated_at)
VALUES (
  'example-post-brewing',
  'example-tenant-001',
  'the-art-of-brewing-patience',
  'The Art of Brewing Patience',
  'Why we take our time with every cup, and why you should too',
  'In a world of instant everything, we''ve chosen to go slow.

## The Problem with Speed

<!-- anchor:speed-note -->

Modern tea culture has been infected by the same disease as everything else: the need for immediacy. Tea bags, single-serve pods, "instant" matcha powders that taste like sadness dissolved in water. We''ve sacrificed quality for convenience, ritual for routine.

At The Midnight Bloom, we reject this entirely.

## What Proper Brewing Requires

Every tea has its own personality, its own needs. A delicate white tea wants water just off the boil and a brief, gentle steep. A hearty pu-erh can handle boiling water and rewards longer immersion. To rush either is to miss the point entirely.

### Temperature Matters

We keep three kettles at different temperatures throughout the night:

- **175°F (80°C)**: For white and green teas
- **195°F (90°C)**: For oolongs and lighter blacks
- **212°F (100°C)**: For pu-erh and robust black teas

<!-- anchor:kettle-note -->

### Timing is Everything

We use hourglasses instead of timers. There''s something meditative about watching sand fall, something that a digital beep can never replicate. Each hourglass is calibrated for different steep times: one minute, three minutes, five minutes.

## The Ritual of Waiting

When you order tea at The Midnight Bloom, you wait. Not because we''re slow—we''re deliberate. Those few minutes while your tea steeps are a gift. Use them.

Watch the steam rise. Feel the warmth of the cup in your hands. Let your thoughts wander. This is the point. This is what you came here for.

## Why We Don''t Offer "Fast" Options

People sometimes ask if we can speed things up. They have somewhere to be. To which we gently suggest: perhaps this isn''t the right place for tonight.

<!-- anchor:philosophy -->

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
  '[{"type":"comment","anchor":"anchor:speed-note","content":"<p><strong>A confession</strong>: Elena once worked at a coffee chain that shall remain nameless. The memory of those \"tea lattes\" still haunts her dreams.</p>"},{"type":"comment","anchor":"anchor:kettle-note","content":"<p>Our kettles are vintage copper pieces from Japan, each one over 50 years old. They heat water differently than modern electric kettles—more evenly, more gently.</p>"},{"type":"comment","anchor":"anchor:philosophy","content":"<p>This isn''t meant to be gatekeeping. If you need quick caffeine, that''s valid. We just can''t be the place that provides it. There''s a 24-hour diner two blocks over with perfectly serviceable coffee.</p>"}]',
  unixepoch() - 86400 * 56,
  unixepoch() - 86400 * 56,
  unixepoch()
);

-- ============================================
-- POST 3: Why We Don't Play Music (FULL CONTENT)
-- ============================================
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, gutter_content, published_at, created_at, updated_at)
VALUES (
  'example-post-music',
  'example-tenant-001',
  'why-we-dont-play-music',
  'Why We Don''t Play Music',
  'The radical act of letting silence speak',
  'Every new visitor asks the same question, usually within the first ten minutes: "Is the music broken?"

No. There is no music. There never has been.

## The Sound of Most Cafés

<!-- anchor:sound-note -->

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

<!-- anchor:silence -->

This isn''t silence—it''s the absence of manufactured sound. There''s a difference.

## The Magic of Quiet Conversation

When there''s no background music, conversations change. People speak more softly, more intentionally. They listen more carefully. The pauses between words become meaningful rather than uncomfortable.

Some of the most profound conversations we''ve witnessed at The Midnight Bloom happened in near-whispers. There''s an intimacy to speaking quietly that a normal-volume conversation in a noisy café can never achieve.

## For Those Who Need Sound

<!-- anchor:headphones -->

We understand that not everyone finds silence comfortable. Some people need noise to focus, or to quiet the noise in their own heads. That''s valid.

We keep a small basket of complimentary earplugs by the door—the soft foam kind—for guests who prefer to create their own silence. And we have no policy against headphones. Your ears, your choice.

What we don''t do is make that choice for everyone.

## The Night Has Its Own Music

At 2 AM, with only a handful of people scattered across our twelve seats, the café takes on a quality that''s hard to describe. The city outside is quiet. The usual urban hum has faded. And in that hush, The Midnight Bloom becomes something almost sacred.

<!-- anchor:sacred -->

This is when the tea tastes best. When the candlelight seems brighter. When strangers glance at each other with the recognition of fellow travelers in strange territory.

Music would ruin it.

## An Experiment for Skeptics

If you''re used to cafés with carefully curated playlists, we invite you to try something: sit with us for an hour without putting in headphones. Let the quietness settle around you. Notice what you hear. Notice what you think.

You might hate it. Some people do.

But you might find something you didn''t know you were looking for: the rare luxury of a public space that doesn''t demand anything from your ears.

*Sometimes the most radical thing you can offer is nothing at all.*',
  '["atmosphere", "philosophy", "design"]',
  'published',
  '[{"type":"comment","anchor":"anchor:sound-note","content":"<p>Elena spent six months researching \"café playlists\" before opening. She found over 50,000 \"coffee shop vibes\" playlists on Spotify alone. It felt less like curation and more like conformity.</p>"},{"type":"comment","anchor":"anchor:silence","content":"<p>John Cage''s 4''33\" taught us that there''s no such thing as true silence—only sounds we haven''t noticed yet. We try to create space for noticing.</p>"},{"type":"comment","anchor":"anchor:headphones","content":"<p>Our most popular headphone choice among regulars? Apparently it''s brown noise. We''ve been told it sounds like \"being inside a warm sweater.\"</p>"},{"type":"comment","anchor":"anchor:sacred","content":"<p>A regular once described the 3 AM atmosphere as \"like being in a library, but the books are people''s thoughts.\" We''ve never forgotten that.</p>"}]',
  unixepoch() - 86400 * 40,
  unixepoch() - 86400 * 40,
  unixepoch()
);

-- ============================================
-- UPDATE TENANT POST COUNT
-- ============================================
UPDATE tenants SET post_count = 3 WHERE id = 'example-tenant-001';
