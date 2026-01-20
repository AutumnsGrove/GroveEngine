/**
 * Tier Icon Mapping
 *
 * Shared mapping of tier icons to Lucide components for Plant.
 * Used by both the home page plan previews and the plans selection page.
 */

import {
  Sprout,
  TreeDeciduous,
  Trees,
  Crown,
} from "@autumnsgrove/groveengine/ui/icons";
import type { TierIcon } from "@autumnsgrove/groveengine/config";

/**
 * Map tier icon identifiers to Lucide icon components.
 */
export const tierIcons: Record<TierIcon, typeof Sprout> = {
  user: Sprout, // fallback for free tier
  sprout: Sprout,
  "tree-deciduous": TreeDeciduous,
  trees: Trees,
  crown: Crown,
};
