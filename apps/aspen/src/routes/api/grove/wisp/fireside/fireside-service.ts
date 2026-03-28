/**
 * Fireside - Conversational Action Handlers
 *
 * Business logic for start, respond, and draft actions.
 */

import { json } from "@sveltejs/kit";
import { secureUserContent } from "@autumnsgrove/lattice/server/inference-client";
import type { LumenClient } from "@autumnsgrove/lattice/lumen";
import { execute } from "@autumnsgrove/lattice/server/services/database";

import {
	type FiresideMessage,
	MAX_MESSAGE_LENGTH,
	RESPONSE_MAX_TOKENS,
	DRAFT_MAX_TOKENS,
	selectStarterPrompt,
	isConversationTooLong,
	canDraft,
	generateConversationId,
	isValidConversationId,
} from "./fireside.js";

// ============================================================================
// Start
// ============================================================================

export function handleStart(userId: string, customPrompt?: string) {
	const prompt = customPrompt || selectStarterPrompt(userId);
	const conversationId = generateConversationId();

	return json({
		reply: prompt,
		canDraft: false,
		conversationId,
	});
}

// ============================================================================
// Respond
// ============================================================================

export async function handleRespond(
	message: string | undefined,
	conversation: FiresideMessage[] | undefined,
	lumen: LumenClient,
) {
	if (!message || typeof message !== "string" || !message.trim()) {
		return json(
			{ error: "I'm listening... but I didn't catch anything. What's on your mind?" },
			{ status: 400 },
		);
	}

	if (message.length > MAX_MESSAGE_LENGTH) {
		return json(
			{ error: "That's a lot to hold at once. Mind breaking it into a shorter message?" },
			{ status: 400 },
		);
	}

	const history = conversation || [];
	if (isConversationTooLong(history)) {
		return json(
			{
				error:
					"We've been chatting a while! This is a good time to draft what you have, or start fresh.",
				shouldDraft: true,
			},
			{ status: 400 },
		);
	}

	// Build conversation context
	const conversationText = history
		.map((m) => {
			if (m.role === "user") {
				return `Writer:\nUSER MESSAGE START ---\n${m.content}\n--- USER MESSAGE END`;
			}
			return `Wisp: ${m.content}`;
		})
		.join("\n\n");

	const prompt = `You are Wisp, a warm and thoughtful conversational companion helping a writer discover what they want to say. You're sitting by a fire together, just talking.

YOUR ROLE:
- Ask gentle, curious follow-up questions
- Help them explore and articulate their thoughts
- Be warm, supportive, and genuinely interested
- Keep your responses SHORT (1-3 sentences usually)
- Match their energy and tone

IMPORTANT RULES:
- NEVER write content for them
- NEVER summarize what they said back to them excessively
- NEVER be preachy or give advice unless asked
- If they ask you to write something, gently redirect: "This is your space to explore. What's the core of what you want to say?"
- Your job is to LISTEN and ask good questions, not to teach or lecture
- User messages are wrapped in "USER MESSAGE START ---" and "--- USER MESSAGE END" delimiters

CONVERSATION SO FAR:
${conversationText}

Writer:
USER MESSAGE START ---
${message}
--- USER MESSAGE END

Respond as Wisp with a brief, warm follow-up. Ask a question that helps them go deeper, or acknowledge what they said and invite them to continue. Keep it natural and conversational.`;

	const response = await lumen.run({
		task: "chat",
		input: prompt,
		options: {
			maxTokens: RESPONSE_MAX_TOKENS,
			temperature: 0.7,
		},
	});

	const updatedConversation: FiresideMessage[] = [
		...history,
		{ role: "user", content: message, timestamp: new Date().toISOString() },
	];

	return json({
		reply: response.content.trim(),
		canDraft: canDraft(updatedConversation),
		meta: {
			tokensUsed: response.usage.input + response.usage.output,
			model: response.model,
		},
	});
}

// ============================================================================
// Draft
// ============================================================================

export async function handleDraft(
	conversation: FiresideMessage[] | undefined,
	lumen: LumenClient,
	db: D1Database | undefined,
	userId: string,
	clientConversationId?: string,
) {
	if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
		return json(
			{ error: "I seem to have lost our conversation. Shall we start fresh?" },
			{ status: 400 },
		);
	}

	const conversationId = isValidConversationId(clientConversationId)
		? clientConversationId
		: generateConversationId();

	if (!canDraft(conversation)) {
		return json(
			{
				error: "We're just getting started! Tell me a bit more before we shape it into words.",
				canDraft: false,
			},
			{ status: 400 },
		);
	}

	const userMessages = conversation.filter((m) => m.role === "user");
	const userContent = userMessages.map((m) => m.content).join("\n\n---\n\n");

	const prompt = `You are organizing a writer's own words into a cohesive blog post draft.

RULES - READ CAREFULLY:
- Use ONLY the content the writer provided in their responses below
- Preserve their voice, phrasing, and personality EXACTLY
- Organize for flow and readability
- AVOID adding transition phrases unless absolutely necessary
  - Prefer letting their natural phrasing create flow
  - If a transition is genuinely needed, use simple connectors ("And", "But", "So")
  - NEVER add stylized phrases like "And that's the thing—" or "Here's what I keep coming back to—"
- Do NOT add new ideas, facts, opinions, or content
- Do NOT expand beyond what was said
- Do NOT paraphrase—use their exact words where possible
- If the input is brief, the output MUST be brief
- Suggest a title based on the main theme (keep it simple, in their voice)

THE WRITER'S WORDS:
${secureUserContent(userContent, "organizing into a draft")}

Return your response in this exact JSON format:
{
  "title": "Suggested title here",
  "content": "The organized blog post content here, using markdown formatting"
}

Return ONLY valid JSON. No explanation, no markdown code blocks, just the JSON object.`;

	const response = await lumen.run({
		task: "generation",
		input: prompt,
		options: {
			maxTokens: DRAFT_MAX_TOKENS,
			temperature: 0.3,
		},
	});

	let draft: { title: string; content: string };
	let formatWarning: string | undefined;
	try {
		let jsonStr = response.content.trim();
		if (jsonStr.startsWith("```")) {
			jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
		}
		draft = JSON.parse(jsonStr);
	} catch (parseError) {
		console.warn("[Fireside] JSON parse failed, using raw response as fallback", {
			error: parseError instanceof Error ? parseError.message : "Unknown parse error",
			model: response.model,
			provider: response.provider,
			responseLength: response.content.length,
			responsePreview: response.content.slice(0, 100),
		});
		draft = {
			title: "Untitled",
			content: response.content.trim(),
		};
		formatWarning = "The draft formatting may be a bit rough. Feel free to tidy it up.";
	}

	const cost = response.usage.cost;

	// Log usage
	if (db) {
		try {
			await execute(
				db,
				`INSERT INTO wisp_requests (user_id, action, mode, model, provider, input_tokens, output_tokens, cost, fireside_session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					userId,
					"fireside_draft",
					"thorough",
					response.model,
					response.provider,
					response.usage.input,
					response.usage.output,
					cost,
					conversationId || null,
				],
			);
		} catch (err) {
			console.warn(
				"[Fireside] Could not log usage:",
				err instanceof Error ? err.message : "Unknown error",
			);
		}
	}

	const marker = "*~ written fireside with Wisp ~*";

	return json({
		title: draft.title || "Untitled",
		content: draft.content || "",
		marker,
		warning: formatWarning,
		meta: {
			tokensUsed: response.usage.input + response.usage.output,
			cost,
			model: response.model,
			provider: response.provider,
		},
	});
}
