/**
 * Tour stop data shared between GroveTourDesktop and GroveTourMobile so the
 * two navigation implementations can't drift out of sync on content.
 */

export interface TourImage {
	url: string;
	alt: string;
	/** Shown under the image when rendered inside the multi-image GlassCarousel */
	caption?: string;
	/** CSS aspect-ratio override for single-image stops whose screenshot isn't ~4:3 */
	aspect?: string;
}

export interface TourStop {
	id: string;
	title: string;
	description: string;
	location: string;
	url: string | null;
	images: TourImage[];
}

// Tour stops configuration — `images` is empty for text-only stops (welcome/complete),
// a single entry for a plain screenshot, or multiple entries to render as a GlassCarousel.
export const tourStops: TourStop[] = [
	{
		id: "welcome",
		title: "Welcome to the Tour!",
		description:
			"Let's explore what Grove can do for you. We'll show you around using example blogs so you can see the possibilities.",
		location: "intro",
		url: null,
		images: [],
	},
	{
		id: "homepage",
		title: "Your Blog Homepage",
		description:
			"This is what visitors see when they arrive. Clean, focused, and beautiful by default — here's an example blog.",
		location: "example.grove.place",
		url: "https://example.grove.place?tour=1",
		images: [{ url: "/tour/homepage.webp", alt: "Blog homepage" }],
	},
	{
		id: "blog-listing",
		title: "The Blog Page",
		description:
			"Every post you've published, all in one place — titles, dates, tags, and a short preview of each.",
		location: "example.grove.place/garden",
		url: "https://example.grove.place/garden?tour=1",
		images: [{ url: "/tour/blog-listing.webp", alt: "Blog listing page" }],
	},
	{
		id: "post",
		title: "Blog Posts",
		description:
			"Your posts are the heart of your blog. Write in markdown, add images, and link related thoughts with margin notes.",
		location: "example.grove.place/post/...",
		url: "https://example.grove.place?tour=2",
		images: [
			{
				url: "/tour/post-1.webp",
				alt: "A published blog post with a table of contents",
				caption:
					"The full post — headings, pull quotes, and a table of contents for longer pieces.",
			},
			{
				url: "/tour/post-2.webp",
				alt: "A margin note attached to a paragraph",
				caption: 'Margin notes ("Vines") add an aside without breaking the flow of the writing.',
			},
		],
	},
	{
		id: "admin",
		title: "Your Dashboard",
		description:
			"The admin panel is where you manage everything - write posts, upload media, and customize your blog.",
		location: "your-blog.grove.place/admin",
		url: null,
		images: [
			{
				url: "/tour/admin-1.webp",
				alt: "Opening the account menu to reach the dashboard",
				caption: "Getting there: your account menu → Your Grove.",
			},
			{
				url: "/tour/admin-2.webp",
				alt: "The Arbor dashboard",
				caption: "Your dashboard — posts, tags, and quick actions in one place.",
			},
		],
	},
	{
		id: "editor",
		title: "The Post Editor",
		description:
			"Write in markdown with live preview. Add images by dragging them in. It's simple but powerful.",
		location: "Admin → New Post",
		url: null,
		images: [
			{
				url: "/tour/editor-1.webp",
				alt: "The markdown editor",
				caption: "A clean writing surface — markdown in, formatted post out.",
			},
			{
				url: "/tour/editor-2.webp",
				alt: "Post details panel with description, cover image, and tags",
				caption: "Add a description, cover image, and tags without leaving the editor.",
			},
			{
				url: "/tour/editor-3.webp",
				alt: "Vines panel open in the editor",
				caption: "Vines (margin notes) attach right from the editor too.",
			},
		],
	},
	{
		id: "lantern",
		title: "Stay Connected",
		description: "Add your friends on the blog page and view them from the Lantern.",
		location: "The compass button, bottom-right",
		url: null,
		images: [
			{
				url: "/tour/lantern-1.webp",
				alt: "Opening the Lantern from the compass button",
				caption: "Open the Lantern from the compass button in the corner.",
			},
			{
				url: "/tour/lantern-2.webp",
				alt: "The Lantern friends panel",
				caption: "Add friends and jump straight to their blogs.",
			},
		],
	},
	{
		id: "beta",
		title: "Try Tomorrow's Grove Today",
		description:
			"New features land on the beta channel first — same account, same data, just a preview of what's coming before it reaches everyone else.",
		location: "your-blog-beta.grove.place",
		url: null,
		images: [
			{
				url: "/tour/beta.webp",
				alt: "A browser address bar showing yourname-beta.grove.place, with the Beta chip visible next to the site title",
				// Wide browser-chrome crop (684×212) — way off the other
				// screenshots' near-4:3 shape, so it needs its own ratio
				// or object-cover crops the right edge off.
				aspect: "684/212",
			},
		],
	},
	{
		id: "complete",
		title: "You're Ready!",
		description: "placeholder", // Overridden reactively by consumers with the username
		location: "Your blog",
		url: null,
		images: [],
	},
];
