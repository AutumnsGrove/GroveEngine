/**
 * Shared sanitization utilities for curios.
 *
 * All curios that accept user text input should use these functions
 * to strip HTML before storing or displaying values.
 */

/**
 * Strips all HTML tags from a string, looping until stable.
 *
 * A single-pass `.replace(/<[^>]*>/g, "")` can miss nested constructions
 * like `<<script>script>` which becomes `<script>` after one pass.
 * This function repeats until no more tags are found.
 */
export function stripHtml(input: string): string {
  const MAX_INPUT_LENGTH = 50_000;
  const MAX_PASSES = 10;
  let result = input.length > MAX_INPUT_LENGTH ? input.slice(0, MAX_INPUT_LENGTH) : input;
  let previous = "";
  for (let i = 0; i < MAX_PASSES && previous !== result; i++) {
    previous = result;
    result = result.replace(/<[^>]*>/g, "");
  }
  return result;
}
