/**
 * Type-safe GitHub methods for the Warden client.
 *
 * These are convenience wrappers that provide proper typing
 * for GitHub-specific actions routed through Warden.
 */

import type { WardenClient } from "../client";
import type {
	WardenResponse,
	GitHubRepo,
	GitHubIssue,
	GitHubComment,
	GitHubWorkflowRun,
} from "../types";

export class WardenGitHub {
	constructor(private client: WardenClient) {}

	async listRepos(params: {
		owner?: string;
		per_page?: number;
		page?: number;
	}): Promise<WardenResponse<GitHubRepo[]>> {
		return this.client.request({
			service: "github",
			action: "list_repos",
			params,
		});
	}

	async getRepo(params: { owner: string; repo: string }): Promise<WardenResponse<GitHubRepo>> {
		return this.client.request({
			service: "github",
			action: "get_repo",
			params,
		});
	}

	async getIssue(params: {
		owner: string;
		repo: string;
		issue_number: number;
	}): Promise<WardenResponse<GitHubIssue>> {
		return this.client.request({
			service: "github",
			action: "get_issue",
			params,
		});
	}

	async listIssues(params: {
		owner: string;
		repo: string;
		state?: "open" | "closed" | "all";
		per_page?: number;
		page?: number;
	}): Promise<WardenResponse<GitHubIssue[]>> {
		return this.client.request({
			service: "github",
			action: "list_issues",
			params,
		});
	}

	async createIssue(params: {
		owner: string;
		repo: string;
		title: string;
		body?: string;
		labels?: string[];
		assignees?: string[];
	}): Promise<WardenResponse<GitHubIssue>> {
		return this.client.request({
			service: "github",
			action: "create_issue",
			params,
		});
	}

	async createComment(params: {
		owner: string;
		repo: string;
		issue_number: number;
		body: string;
	}): Promise<WardenResponse<GitHubComment>> {
		return this.client.request({
			service: "github",
			action: "create_comment",
			params,
		});
	}

	async listWorkflowRuns(params: {
		owner: string;
		repo: string;
		workflow_id?: string | number;
		per_page?: number;
	}): Promise<WardenResponse<{ workflow_runs: GitHubWorkflowRun[] }>> {
		return this.client.request({
			service: "github",
			action: "list_workflow_runs",
			params,
		});
	}

	async triggerWorkflow(params: {
		owner: string;
		repo: string;
		workflow_id: string | number;
		ref?: string;
		inputs?: Record<string, string>;
	}): Promise<WardenResponse<void>> {
		return this.client.request({
			service: "github",
			action: "trigger_workflow",
			params,
		});
	}
}
