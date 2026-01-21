import type { PageServerLoad } from "./$types";

// List of Wayfinder (platform owner) emails
// The Wayfinder has access to system health and other platform-wide features
const WAYFINDER_EMAILS = ["autumn@grove.place"];

function isWayfinder(email: string | undefined): boolean {
  if (!email) return false;
  return WAYFINDER_EMAILS.includes(email.toLowerCase());
}

export const load: PageServerLoad = async ({ locals }) => {
  return {
    isWayfinder: isWayfinder(locals.user?.email),
  };
};
