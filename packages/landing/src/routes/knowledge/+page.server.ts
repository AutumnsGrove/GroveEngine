import {
  specs,
  helpArticles,
  legalDocs,
  marketingDocs,
  patterns,
  philosophyDocs,
  designDocs,
} from "$lib/data/knowledge-base";
import { scanDocsCategory } from "$lib/server/docs-scanner";

export async function load() {
  // exhibitDocs loaded from filesystem scanner (server-only)
  const exhibitDocs = scanDocsCategory("exhibit");

  return {
    specs,
    helpArticles,
    legalDocs,
    marketingDocs,
    patterns,
    philosophyDocs,
    designDocs,
    exhibitDocs,
  };
}
