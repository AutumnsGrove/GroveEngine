import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/groveengine/services";

export const load: LayoutServerLoad = async ({ platform }) => {
  const messages = platform?.env?.DB
    ? await loadChannelMessages(platform.env.DB, "meadow").catch(() => [])
    : [];

  return { messages };
};
