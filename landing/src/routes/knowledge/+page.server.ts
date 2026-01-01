import { specs, helpArticles, legalDocs, marketingDocs, patterns } from "$lib/data/knowledge-base";

export async function load() {
  return {
    specs,
    helpArticles,
    legalDocs,
    marketingDocs,
    patterns,
  };
}
