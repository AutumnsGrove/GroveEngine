import { helpArticles, helpSections } from "$lib/data/knowledge-base";

export async function load() {
  return {
    helpArticles,
    helpSections,
  };
}
