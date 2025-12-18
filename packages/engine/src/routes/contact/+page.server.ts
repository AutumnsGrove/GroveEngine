import { getContactPage } from "$lib/utils/markdown.js";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load: PageServerLoad = () => {
  const page = getContactPage();

  if (!page) {
    throw error(404, "Contact page not found");
  }

  return {
    title: page.title,
    description: page.description,
    content: page.content,
    headers: page.headers,
    gutterContent: page.gutterContent,
  };
};
