/**
 * SubscriptionDigestEmail - Digest of new posts from a grove you follow
 *
 * Sent by the subscription-digest cron worker when a grove you're
 * subscribed to has published new posts. Groups posts by grove so a
 * Wanderer gets one email per grove per delivery window, not one per post.
 *
 * Shape matches what `workers/subscription-digest/src/worker.ts` sends
 * via Zephyr to the email-render worker.
 */
import * as React from "react";
import { Section, Text, Link } from "@react-email/components";
import { GroveEmail } from "../components/GroveEmail";
import { GroveButton } from "../components/GroveButton";
import { GroveParagraph } from "../components/GroveText";
import { GROVE_EMAIL_COLORS } from "../components/styles";

export interface SubscriptionDigestPost {
	title: string;
	excerpt: string | null;
	slug: string;
	image: string | null;
	url: string;
}

export interface SubscriptionDigestEmailProps {
	/** Optional reader name — personalizes the greeting when present */
	name?: string;
	/** Display name of the grove that published these posts */
	groveName?: string;
	/** Grove subdomain, used for the "visit the grove" link */
	groveSubdomain?: string;
	/** Posts to include in this digest (already filtered by target grove) */
	posts?: SubscriptionDigestPost[];
	/** One-click unsubscribe URL for this specific subscription */
	unsubscribeUrl?: string;
}

// Props are marked optional because the email-render worker casts this
// to a generic `(props: Record<string, unknown>) => Element` signature
// before calling it (matching the BetaInviteEmail pattern). At runtime,
// the subscription-digest worker always supplies every field.
export function SubscriptionDigestEmail({
	name,
	groveName = "this grove",
	groveSubdomain = "",
	posts = [],
	unsubscribeUrl = "#",
}: SubscriptionDigestEmailProps) {
	const greeting = name ? `Hey ${name},` : "Hey,";
	const isSinglePost = posts.length === 1;
	const groveUrl = groveSubdomain ? `https://${groveSubdomain}.grove.place` : "https://grove.place";

	const preview = isSinglePost
		? `New from ${groveName}: ${posts[0]?.title ?? ""}`
		: `${posts.length} new posts from ${groveName}`;

	const intro = isSinglePost
		? `${groveName} just published something new.`
		: `${groveName} has ${posts.length} new posts since you last visited.`;

	return (
		<GroveEmail previewText={preview}>
			<GroveParagraph>{greeting}</GroveParagraph>
			<GroveParagraph>{intro}</GroveParagraph>

			<Section style={styles.postsSection}>
				{posts.map((post, i) => (
					<Section key={post.slug ?? i} style={styles.postCard}>
						<Link href={post.url} style={styles.postTitle}>
							{post.title}
						</Link>
						{post.excerpt && <Text style={styles.postExcerpt}>{post.excerpt}</Text>}
						<Link href={post.url} style={styles.postReadLink}>
							Read it →
						</Link>
					</Section>
				))}
			</Section>

			<GroveButton href={groveUrl}>Visit {groveName}</GroveButton>

			<GroveParagraph muted>
				You're getting this because you subscribed to{" "}
				<Link href={groveUrl} style={styles.inlineLink}>
					{groveName}
				</Link>
				. You can change how often these arrive, or{" "}
				<Link href={unsubscribeUrl} style={styles.inlineLink}>
					unsubscribe from this grove
				</Link>
				, whenever you'd like.
			</GroveParagraph>
		</GroveEmail>
	);
}

const styles = {
	postsSection: {
		margin: "8px 0 24px 0",
	},
	postCard: {
		margin: "0 0 16px 0",
		padding: "16px 20px",
		borderLeft: `3px solid ${GROVE_EMAIL_COLORS.groveGreen}`,
		backgroundColor: "rgba(22, 163, 74, 0.05)",
		borderRadius: "0 8px 8px 0",
	},
	postTitle: {
		display: "block",
		fontSize: "18px",
		lineHeight: 1.4,
		color: GROVE_EMAIL_COLORS.barkBrown,
		fontWeight: 500 as const,
		textDecoration: "none",
		marginBottom: "6px",
	},
	postExcerpt: {
		margin: "6px 0 10px 0",
		fontSize: "15px",
		lineHeight: 1.6,
		color: GROVE_EMAIL_COLORS.barkBrown,
		opacity: 0.8,
	},
	postReadLink: {
		fontSize: "14px",
		color: GROVE_EMAIL_COLORS.groveGreen,
		textDecoration: "none",
	},
	inlineLink: {
		color: GROVE_EMAIL_COLORS.groveGreen,
		textDecoration: "underline",
	},
};

export default SubscriptionDigestEmail;
