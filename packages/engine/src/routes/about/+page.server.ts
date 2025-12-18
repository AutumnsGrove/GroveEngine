import { getAboutPage } from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load: PageServerLoad = () => {
  const page = getAboutPage();

  if (!page) {
    throw error(404, "About page not found");
  }

  return {
    page,
  };
};
