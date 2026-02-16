import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/groveengine/services";

export const load: LayoutServerLoad = async ({ platform, locals }) => {
  const messages = platform?.env?.DB
    ? await loadChannelMessages(platform.env.DB, "meadow").catch(() => [])
    : [];

  return {
    messages,
    user: locals.user,
  };
};
