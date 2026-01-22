import { exhibitWings } from "$lib/data/knowledge-base";
import { scanDocsCategory } from "$lib/server/docs-scanner";

export async function load() {
  // exhibitDocs loaded from filesystem scanner (server-only)
  const exhibitDocs = scanDocsCategory("exhibit");

  return {
    exhibits: exhibitDocs,
    exhibitWings,
  };
}
