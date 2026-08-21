/**
 * Writing Prompts — the curated bank behind Flow's Spark button.
 *
 * Hand-curated on purpose (see issue #1575): a good prompt doesn't need
 * inference, and skipping the LLM here avoids Lumen cost/latency/worker
 * upkeep entirely for something that's fundamentally static content.
 *
 * Starting at ~100; the plan is to grow this toward ~500 over time. Add
 * entries directly to WRITING_PROMPTS below — no build step, no migration.
 */

export interface WritingPrompt {
	text: string;
	mood: string;
	length: "short" | "medium" | "long";
}

export const WRITING_PROMPTS: WritingPrompt[] = [
	// curious
	{ text: "Write about a door you've never opened.", mood: "curious", length: "short" },
	{ text: "What's a question you've stopped asking out loud?", mood: "curious", length: "short" },
	{
		text: "Describe a stranger you've thought about since — someone you saw once and never forgot.",
		mood: "curious",
		length: "medium",
	},
	{
		text: "Follow a curiosity you never let yourself finish chasing. Where does it lead now?",
		mood: "curious",
		length: "long",
	},
	{ text: "What would you ask your house if it could answer?", mood: "curious", length: "short" },
	{
		text: "Write about the last thing that made you say 'wait, really?'",
		mood: "curious",
		length: "medium",
	},

	// reflective
	{
		text: "What does your morning routine say about who you're becoming?",
		mood: "reflective",
		length: "medium",
	},
	{
		text: "Write the letter you'd send to yourself a year from now.",
		mood: "reflective",
		length: "long",
	},
	{ text: "What have you outgrown without noticing?", mood: "reflective", length: "short" },
	{
		text: "Trace a decision back to the moment you actually made it — not the moment everyone thinks you did.",
		mood: "reflective",
		length: "long",
	},
	{
		text: "Write about a version of yourself from five years ago. Would they recognize you?",
		mood: "reflective",
		length: "medium",
	},
	{
		text: "What's a habit you inherited without asking for it?",
		mood: "reflective",
		length: "short",
	},
	{
		text: "Describe the difference between who you are alone and who you are in a room full of people.",
		mood: "reflective",
		length: "medium",
	},

	// nostalgic
	{
		text: "Describe the last place that felt like home, even briefly.",
		mood: "nostalgic",
		length: "medium",
	},
	{
		text: "Write about a smell that takes you somewhere instantly.",
		mood: "nostalgic",
		length: "short",
	},
	{
		text: "What's a place that doesn't exist anymore, at least not the way you remember it?",
		mood: "nostalgic",
		length: "medium",
	},
	{
		text: "Write about the last summer that felt endless.",
		mood: "nostalgic",
		length: "medium",
	},
	{ text: "Describe a meal that means more than food.", mood: "nostalgic", length: "short" },
	{
		text: "What's something you used to believe as a kid that you kind of miss believing?",
		mood: "nostalgic",
		length: "long",
	},

	// bold
	{ text: "A list of things you're done apologizing for.", mood: "bold", length: "short" },
	{
		text: "Write about starting over — literally or otherwise.",
		mood: "bold",
		length: "medium",
	},
	{ text: "What's a rule you're ready to break?", mood: "bold", length: "short" },
	{
		text: "Write the version of the story where you didn't back down.",
		mood: "bold",
		length: "medium",
	},
	{
		text: "Say the thing you've been rehearsing but haven't said yet — write it here first.",
		mood: "bold",
		length: "long",
	},
	{
		text: "Describe yourself the way you want to be seen, not the way you're used to being seen.",
		mood: "bold",
		length: "medium",
	},

	// warm
	{
		text: "What's a small thing that saved a bad day recently?",
		mood: "warm",
		length: "short",
	},
	{
		text: "Write about someone who believed in you before you believed in yourself.",
		mood: "warm",
		length: "medium",
	},
	{
		text: "Describe the kindest thing a stranger has done for you.",
		mood: "warm",
		length: "short",
	},
	{
		text: "Write a thank-you note to someone you never actually thanked.",
		mood: "warm",
		length: "medium",
	},
	{ text: "What does comfort look like to you right now, today?", mood: "warm", length: "short" },
	{
		text: "Write about the friend who feels like home no matter how long it's been.",
		mood: "warm",
		length: "medium",
	},

	// quiet
	{
		text: "Describe a skill you're proud of that no one ever asks about.",
		mood: "quiet",
		length: "medium",
	},
	{
		text: "Write about the last time you sat in silence on purpose.",
		mood: "quiet",
		length: "short",
	},
	{
		text: "What's something true about you that you rarely say out loud?",
		mood: "quiet",
		length: "medium",
	},
	{ text: "Describe your favorite kind of stillness.", mood: "quiet", length: "short" },
	{
		text: "Write about the parts of your day that no one else witnesses.",
		mood: "quiet",
		length: "medium",
	},

	// playful
	{ text: "Invent a holiday and explain how it's celebrated.", mood: "playful", length: "medium" },
	{
		text: "Write the origin story of your worst habit, told like a legend.",
		mood: "playful",
		length: "medium",
	},
	{
		text: "What would your autobiography be titled if you were being dramatic about it?",
		mood: "playful",
		length: "short",
	},
	{
		text: "Describe your perfect, deeply unserious Saturday.",
		mood: "playful",
		length: "short",
	},
	{ text: "Write a rivalry between two objects on your desk.", mood: "playful", length: "medium" },
	{
		text: "If your inner monologue had a theme song, what would it be and why?",
		mood: "playful",
		length: "short",
	},

	// wistful
	{
		text: "Write about a road not taken, without regretting it.",
		mood: "wistful",
		length: "medium",
	},
	{
		text: "Describe the last goodbye you didn't get to say properly.",
		mood: "wistful",
		length: "medium",
	},
	{
		text: "What's a version of your life you sometimes wonder about?",
		mood: "wistful",
		length: "long",
	},
	{
		text: "Write about the space between who you were and who you are.",
		mood: "wistful",
		length: "medium",
	},
	{
		text: "What did you leave behind that you still think about?",
		mood: "wistful",
		length: "short",
	},

	// hopeful
	{
		text: "Write about something you're looking forward to, even a small thing.",
		mood: "hopeful",
		length: "short",
	},
	{
		text: "Describe the life you're quietly building, one ordinary day at a time.",
		mood: "hopeful",
		length: "long",
	},
	{
		text: "What would you tell someone who's exactly where you used to be?",
		mood: "hopeful",
		length: "medium",
	},
	{
		text: "Write about a seed you planted — literal or otherwise — that's finally growing.",
		mood: "hopeful",
		length: "medium",
	},
	{ text: "What does 'better' look like for you this year?", mood: "hopeful", length: "short" },

	// restless
	{
		text: "Write about the itch to leave, even when everything's fine.",
		mood: "restless",
		length: "medium",
	},
	{
		text: "What's a question you keep circling back to without an answer?",
		mood: "restless",
		length: "short",
	},
	{
		text: "Describe the feeling of almost — almost saying it, almost going, almost changing everything.",
		mood: "restless",
		length: "medium",
	},
	{
		text: "Write about wanting more without knowing what 'more' means yet.",
		mood: "restless",
		length: "long",
	},

	// tender
	{
		text: "Write a love letter to a part of yourself you used to hide.",
		mood: "tender",
		length: "medium",
	},
	{
		text: "Describe the moment you knew you were safe with someone.",
		mood: "tender",
		length: "medium",
	},
	{
		text: "What does gentleness look like when you're the one giving it to yourself?",
		mood: "tender",
		length: "long",
	},
	{
		text: "Write about holding something fragile — a feeling, a person, a plan.",
		mood: "tender",
		length: "medium",
	},
	{
		text: "What's something you needed to hear that you're ready to say to someone else now?",
		mood: "tender",
		length: "medium",
	},

	// grounded
	{
		text: "Describe the one routine that actually keeps you steady.",
		mood: "grounded",
		length: "short",
	},
	{ text: "Write about the place your feet feel most planted.", mood: "grounded", length: "short" },
	{
		text: "What's a truth about yourself you've stopped negotiating with?",
		mood: "grounded",
		length: "medium",
	},
	{
		text: "Describe what enough feels like, physically, in your body.",
		mood: "grounded",
		length: "medium",
	},

	// dreamy
	{ text: "Write about a recurring dream, real or invented.", mood: "dreamy", length: "medium" },
	{
		text: "Describe a place you've never been but can picture perfectly.",
		mood: "dreamy",
		length: "medium",
	},
	{ text: "What does your imagined future home smell like?", mood: "dreamy", length: "short" },
	{
		text: "Write about the version of tonight where anything could happen.",
		mood: "dreamy",
		length: "medium",
	},

	// grateful
	{
		text: "Write a list of small, unglamorous things you're grateful for today.",
		mood: "grateful",
		length: "short",
	},
	{
		text: "Describe the ordinary Tuesday that turned out to matter.",
		mood: "grateful",
		length: "medium",
	},
	{ text: "What's something you almost missed noticing?", mood: "grateful", length: "short" },
	{
		text: "Write a thank-you to your body for something it did without being asked.",
		mood: "grateful",
		length: "medium",
	},

	// uncertain
	{
		text: "Write about not knowing, and letting that be the whole entry.",
		mood: "uncertain",
		length: "medium",
	},
	{
		text: "What's a question you're not ready to answer yet? Sit with it here.",
		mood: "uncertain",
		length: "long",
	},
	{
		text: "Describe the fork in the road you're standing at right now.",
		mood: "uncertain",
		length: "medium",
	},
	{
		text: "Write about the difference between lost and still looking.",
		mood: "uncertain",
		length: "short",
	},

	// defiant
	{
		text: "Write about the expectation you're quietly walking away from.",
		mood: "defiant",
		length: "medium",
	},
	{ text: "What's a story about you that you're rewriting?", mood: "defiant", length: "medium" },
	{
		text: "Describe the moment you stopped shrinking to fit somewhere.",
		mood: "defiant",
		length: "long",
	},
	{ text: "Write the thing you were told not to say.", mood: "defiant", length: "medium" },

	// connection
	{
		text: "Write about a conversation that changed how you see something.",
		mood: "reflective",
		length: "medium",
	},
	{
		text: "Describe the people who show up for you without being asked.",
		mood: "warm",
		length: "medium",
	},
	{ text: "What does it feel like to be truly listened to?", mood: "tender", length: "short" },
	{
		text: "Write about a community you found later than you expected to.",
		mood: "warm",
		length: "long",
	},
	{
		text: "Describe the friendship that surprised you the most.",
		mood: "curious",
		length: "medium",
	},

	// craft & voice
	{
		text: "Write the first paragraph of a story you'll never finish, just for the joy of the sentence.",
		mood: "playful",
		length: "medium",
	},
	{
		text: "Describe your voice — not your literal voice, your writing voice.",
		mood: "reflective",
		length: "medium",
	},
	{
		text: "Write one true sentence, then write five more that circle back to it.",
		mood: "quiet",
		length: "long",
	},
	{
		text: "What's a word you love the shape of? Build a paragraph around it.",
		mood: "playful",
		length: "short",
	},

	// change & growth
	{
		text: "Write about the last time you changed your mind about something big.",
		mood: "reflective",
		length: "medium",
	},
	{
		text: "Describe the person you're slowly becoming, based on the evidence so far.",
		mood: "hopeful",
		length: "long",
	},
	{
		text: "What's something you used to be afraid of that doesn't scare you anymore?",
		mood: "bold",
		length: "medium",
	},
	{
		text: "Write about outgrowing a place, a job, or a version of yourself.",
		mood: "wistful",
		length: "medium",
	},

	// seasons & nature
	{ text: "Write about the season that feels most like you.", mood: "reflective", length: "short" },
	{
		text: "Describe the first sign of a season changing that you always notice.",
		mood: "quiet",
		length: "short",
	},
	{
		text: "What does your favorite kind of weather make you want to do?",
		mood: "playful",
		length: "short",
	},
	{
		text: "Write about something small and green that's still growing despite everything.",
		mood: "hopeful",
		length: "medium",
	},

	// closing the loop
	{
		text: "Write the last line first, then work backward to how you got there.",
		mood: "curious",
		length: "long",
	},
	{
		text: "What would you write if you knew absolutely no one would read it?",
		mood: "bold",
		length: "long",
	},
	{ text: "Describe today in exactly three sentences.", mood: "grounded", length: "short" },
	{
		text: "Write the entry you keep meaning to write but haven't yet. Start now.",
		mood: "restless",
		length: "medium",
	},

	// cozy
	{
		text: "Describe your ideal do-nothing afternoon, minute by minute.",
		mood: "cozy",
		length: "medium",
	},
	{
		text: "Write about the blanket, chair, or corner that's unmistakably yours.",
		mood: "cozy",
		length: "short",
	},
	{
		text: "What's the soundtrack to a slow morning, for you specifically?",
		mood: "cozy",
		length: "short",
	},
	{
		text: "Describe the last time doing nothing felt like doing exactly enough.",
		mood: "cozy",
		length: "medium",
	},
	{ text: "Write about a rainy day that turned out to be a gift.", mood: "cozy", length: "medium" },

	// fierce
	{
		text: "Write about the moment you stopped asking permission.",
		mood: "fierce",
		length: "medium",
	},
	{
		text: "Describe what you'd fight for without a second thought.",
		mood: "fierce",
		length: "short",
	},
	{ text: "What's a boundary you finally learned to hold?", mood: "fierce", length: "medium" },
	{
		text: "Write the speech you'd give if you weren't worried about being too much.",
		mood: "fierce",
		length: "long",
	},

	// wondering
	{
		text: "What do you think happens to the things people forget on purpose?",
		mood: "wondering",
		length: "short",
	},
	{
		text: "Write about a question with no good answer, and sit in it anyway.",
		mood: "wondering",
		length: "medium",
	},
	{
		text: "What's something ordinary that still feels a little bit like magic to you?",
		mood: "wondering",
		length: "short",
	},
	{
		text: "Describe what you imagine happens in a house after everyone's asleep.",
		mood: "wondering",
		length: "medium",
	},

	// brave
	{ text: "Write about a fear you did the thing anyway.", mood: "brave", length: "medium" },
	{
		text: "Describe the version of you that shows up when it actually matters.",
		mood: "brave",
		length: "medium",
	},
	{
		text: "What's something you're scared to want out loud? Want it here.",
		mood: "brave",
		length: "long",
	},
	{ text: "Write about asking for help — the time it worked out.", mood: "brave", length: "short" },

	// melancholy
	{
		text: "Write about a sadness that doesn't need fixing, just noticing.",
		mood: "melancholy",
		length: "medium",
	},
	{
		text: "Describe the quiet kind of missing someone who's still around.",
		mood: "melancholy",
		length: "medium",
	},
	{
		text: "What's something beautiful that's also a little bit sad?",
		mood: "melancholy",
		length: "short",
	},
	{ text: "Write the ending you never got to give something.", mood: "melancholy", length: "long" },

	// identity
	{
		text: "Write about a name — given, chosen, or in-between — and what it holds.",
		mood: "reflective",
		length: "medium",
	},
	{
		text: "Describe the moment a label stopped fitting and you found a better one.",
		mood: "bold",
		length: "medium",
	},
	{ text: "What does it mean to feel at home in yourself?", mood: "tender", length: "long" },
	{
		text: "Write about the people who saw the real you before you were sure of it yourself.",
		mood: "warm",
		length: "medium",
	},

	// beginnings
	{
		text: "Write about the first day of something that changed everything, without knowing it would yet.",
		mood: "curious",
		length: "medium",
	},
	{
		text: "Describe what 'starting' feels like in your body, right before you do it.",
		mood: "restless",
		length: "short",
	},
	{
		text: "What's a beginning you're in the middle of right now?",
		mood: "hopeful",
		length: "medium",
	},
	{
		text: "Write the first sentence of a chapter you haven't titled yet.",
		mood: "dreamy",
		length: "short",
	},
];
