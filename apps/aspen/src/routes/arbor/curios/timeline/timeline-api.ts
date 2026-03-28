import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
import { api } from "@autumnsgrove/lattice/utils/api";

export interface BackfillResult {
	success: boolean;
	message: string;
	stats?: {
		totalCommits: number;
		processedRepos: number;
		datesWithActivity: number;
	};
}

export interface GenerateProgress {
	current: number;
	total: number;
	currentDate: string;
	completed: string[];
	skipped: string[];
	failed: Array<{ date: string; error: string }>;
	totalCost: number;
}

export interface GenerateResult {
	success: boolean;
	message: string;
}

export async function startBackfill(
	backfillStartDate: string,
	backfillEndDate: string,
	backfillRepoLimit: number,
): Promise<BackfillResult> {
	if (!backfillStartDate) {
		toast.error("Start date required", { description: "Pick how far back to go." });
		return { success: false, message: "Start date required" };
	}

	try {
		const result = await api.post<Record<string, unknown>>("/api/curios/timeline/backfill", {
			startDate: backfillStartDate,
			endDate: backfillEndDate || undefined,
			repoLimit: backfillRepoLimit,
		});

		const backfillResult: BackfillResult = {
			success: true,
			message: (result?.message as string) || "Backfill complete",
			stats: result?.stats as BackfillResult["stats"],
		};
		toast.success("Backfill complete!", {
			description: backfillResult.message,
		});
		return backfillResult;
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : "Backfill failed";
		toast.error("Backfill failed", { description: errorMsg });
		return { success: false, message: errorMsg };
	}
}

export async function generateSummaries(
	generateStartDate: string,
	generateEndDate: string,
	csrfToken: string,
	onProgress: (progress: GenerateProgress) => void,
	isCancelled: () => boolean,
): Promise<GenerateResult> {
	if (!generateStartDate) {
		toast.error("Start date required", { description: "Pick the first date to generate." });
		return { success: false, message: "Start date required" };
	}

	const start = new Date(generateStartDate + "T00:00:00");
	const end = generateEndDate
		? new Date(generateEndDate + "T00:00:00")
		: new Date(new Date().toISOString().split("T")[0] + "T00:00:00");

	// Build array of dates
	const dates: string[] = [];
	const current = new Date(start);
	while (current <= end) {
		dates.push(current.toISOString().split("T")[0]);
		current.setDate(current.getDate() + 1);
	}

	const progress: GenerateProgress = {
		current: 0,
		total: dates.length,
		currentDate: "",
		completed: [],
		skipped: [],
		failed: [],
		totalCost: 0,
	};

	onProgress({ ...progress });

	let firstError: string | null = null;

	for (const date of dates) {
		if (isCancelled()) break;

		progress.current++;
		progress.currentDate = date;
		onProgress({ ...progress });

		try {
			const response = await fetch("/api/curios/timeline/generate", {
				// csrf-ok
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": csrfToken ?? "",
				},
				credentials: "include",
				body: JSON.stringify({ date }),
			});

			const result = (await response.json()) as Record<string, unknown>;

			if (response.ok && result.success !== false) {
				if (result.summary) {
					progress.completed = [...progress.completed, date];
					progress.totalCost += ((result.usage as Record<string, unknown>)?.cost as number) ?? 0;
				} else {
					progress.skipped = [...progress.skipped, date];
				}
			} else {
				const errorMsg = (result.message as string) || `HTTP ${response.status}`;
				if (!firstError) firstError = errorMsg;
				progress.failed = [...progress.failed, { date, error: errorMsg }];

				const errorType = result.error as string | undefined;
				if (errorType === "github_token_missing" || errorType === "openrouter_key_missing") {
					toast.error("Configuration issue", { description: errorMsg });
					break;
				}
				if (errorType === "rate_limited") {
					const retryAfter = result.retryAfter as number | undefined;
					const waitMsg = retryAfter
						? `Rate limit reached. Try again in ${Math.ceil(retryAfter / 60)} minutes.`
						: "Rate limit reached. Try again later.";
					toast.error(waitMsg);
					const remaining = dates.slice(dates.indexOf(date) + 1);
					for (const d of remaining) {
						progress.current++;
						progress.failed = [...progress.failed, { date: d, error: "Skipped (rate limited)" }];
					}
					break;
				}
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Network error";
			if (!firstError) firstError = errorMsg;
			progress.failed = [...progress.failed, { date, error: errorMsg }];
		}

		onProgress({ ...progress });
	}

	const completedCount = progress.completed.length;
	const skippedCount = progress.skipped.length;
	const failedCount = progress.failed.length;

	let resultMessage: string;
	if (isCancelled()) {
		resultMessage = `Cancelled. Generated ${completedCount} summaries before stopping.`;
	} else if (failedCount > 0 && completedCount === 0 && firstError) {
		resultMessage = `All ${failedCount} dates failed: ${firstError}`;
	} else {
		resultMessage = `Done! ${completedCount} generated, ${skippedCount} skipped (no commits), ${failedCount} failed.`;
	}

	if (completedCount > 0) {
		toast.success("Summaries generated!", {
			description: `${completedCount} day${completedCount === 1 ? "" : "s"} of timeline entries created. Cost: $${progress.totalCost.toFixed(4)}`,
		});
	}

	return {
		success: failedCount === 0,
		message: resultMessage,
	};
}

export async function saveTokenIndividually(
	type: "github" | "openrouter",
	value: string,
): Promise<{ ok: boolean; message: string }> {
	if (!value?.trim()) {
		toast.error("Enter a token value first");
		return { ok: false, message: "Enter a token value first" };
	}

	try {
		const result = await api.post<{
			success: boolean;
			tokenSource?: string;
			verified?: boolean;
			warning?: string;
			error?: string;
		}>("/api/curios/timeline/save-token", {
			tokenType: type,
			tokenValue: value.trim(),
		});

		if (!result) {
			throw new Error("No response from server");
		}

		if (result.success) {
			const msg = result.warning
				? `Saved (${result.tokenSource}) — ${result.warning}`
				: `Saved and verified (${result.tokenSource})`;
			if (result.warning) {
				toast.warning(`${type === "github" ? "GitHub" : "OpenRouter"} token saved with warning`, {
					description: result.warning,
				});
			} else {
				toast.success(`${type === "github" ? "GitHub" : "OpenRouter"} token saved!`, {
					description: msg,
				});
			}
			return { ok: !result.warning, message: msg };
		} else {
			const errorMsg = result.error || "Save failed";
			toast.error("Token save failed", { description: errorMsg });
			return { ok: false, message: errorMsg };
		}
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : "Network error";
		toast.error("Token save failed", { description: errorMsg });
		return { ok: false, message: errorMsg };
	}
}
