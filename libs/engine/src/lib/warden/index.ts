/**
 * Warden API Gateway SDK
 *
 * Secure proxy for third-party API access with credential injection.
 */

export { WardenClient } from "./client";
export { createWardenClient } from "./factory";
export { WardenGitHub } from "./services/github";
export { WardenTavily } from "./services/tavily";
export { signNonce } from "./crypto";
export type {
	WardenConfig,
	WardenService,
	WardenErrorCode,
	WardenRequest,
	WardenResponse,
	WardenHealth,
	WardenAgentInfo,
	WardenAgentRegistration,
	GitHubRepo,
	GitHubIssue,
	GitHubComment,
	GitHubWorkflowRun,
	TavilySearchResult,
	TavilySearchResponse,
	TavilyCrawlResult,
	TavilyCrawlResponse,
	TavilyExtractResponse,
} from "./types";
