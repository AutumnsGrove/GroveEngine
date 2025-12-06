// Get Follow-up Quiz
// GET /api/search/followup?job_id=xxx
//
// When a search hits max batches without enough results,
// this returns a quiz to refine the search.

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface QuizOption {
  value: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  type: "text" | "single_select" | "multi_select";
  prompt: string;
  required: boolean;
  placeholder?: string;
  options?: QuizOption[];
  default?: string | string[];
}

interface FollowupContext {
  batches_completed: number;
  domains_checked: number;
  good_found: number;
  target: number;
}

interface WorkerFollowupResponse {
  job_id: string;
  questions: QuizQuestion[];
  context: FollowupContext;
}

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  // Check authentication
  if (!locals.user?.is_admin) {
    throw error(401, "Unauthorized");
  }

  const jobId = url.searchParams.get("job_id");
  if (!jobId) {
    throw error(400, "job_id is required");
  }

  const workerUrl = platform?.env?.DOMAIN_WORKER_URL;
  if (!workerUrl) {
    throw error(500, "DOMAIN_WORKER_URL not configured");
  }

  try {
    const workerResponse = await fetch(
      `${workerUrl}/api/followup?job_id=${jobId}`,
    );

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      console.error("[Worker Followup Error]", errorText);
      throw error(workerResponse.status, `Worker error: ${errorText}`);
    }

    const followup = (await workerResponse.json()) as WorkerFollowupResponse;

    return json(followup);
  } catch (err) {
    console.error("[Get Followup Error]", err);
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to get follow-up quiz");
  }
};
