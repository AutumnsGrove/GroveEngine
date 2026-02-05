import type { Season } from "@autumnsgrove/groveengine/ui/nature";

export type BgVariant = "forest" | "twilight" | "dawn" | "warm" | "mist";

export interface HeroSlideContentProps {
  season: Season;
  active: boolean;
  index: number;
}

/**
 * Maps a bgVariant to its Tailwind gradient classes.
 * Extracted as a pure function for testability.
 */
export function getGradientClasses(variant: BgVariant): string {
  const variants: Record<BgVariant, string> = {
    forest:
      "from-emerald-50/80 via-green-50/60 to-emerald-100/40 dark:from-emerald-950/60 dark:via-green-950/40 dark:to-emerald-900/30",
    twilight:
      "from-indigo-50/80 via-slate-50/60 to-violet-100/40 dark:from-indigo-950/60 dark:via-slate-950/40 dark:to-violet-900/30",
    dawn: "from-amber-50/80 via-orange-50/60 to-rose-100/40 dark:from-amber-950/60 dark:via-orange-950/40 dark:to-rose-900/30",
    warm: "from-amber-50/80 via-yellow-50/60 to-orange-100/40 dark:from-amber-950/60 dark:via-yellow-950/40 dark:to-orange-900/30",
    mist: "from-slate-50/80 via-blue-50/60 to-cyan-100/40 dark:from-slate-950/60 dark:via-blue-950/40 dark:to-cyan-900/30",
  };
  return variants[variant];
}
