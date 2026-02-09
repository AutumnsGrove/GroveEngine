import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

export const load: PageServerLoad = async ({ parent }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  // Data is fetched client-side via the API endpoint
  return {};
};
