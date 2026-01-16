import { legalDocs } from "$lib/data/knowledge-base";

export async function load() {
  return {
    legalDocs,
  };
}
