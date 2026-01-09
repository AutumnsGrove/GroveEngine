/**
 * Grove Ecosystem Configuration
 *
 * Defines all repositories in the Grove ecosystem and how to track their progress.
 * Some repos have automated releases (tag-triggered), others use commit-based tracking.
 */

export type TrackingMethod = 'releases' | 'commits' | 'milestones' | 'hybrid';

export interface EcosystemRepo {
  /** Display name for the UI */
  name: string;
  /** GitHub repository path (org/repo) */
  repo: string;
  /** Brief description of what this service does */
  description: string;
  /** How to track progress for this repo */
  trackingMethod: TrackingMethod;
  /** Color for visualizations (Tailwind class) */
  color: string;
  /** Icon identifier (for lucide-svelte) */
  icon: string;
  /** Category for grouping */
  category: 'core' | 'infrastructure' | 'tools' | 'integrations';
  /** Whether this is the primary/main package */
  isPrimary?: boolean;
  /** Optional: specific branch to track (defaults to main/master) */
  branch?: string;
}

/**
 * All Grove ecosystem repositories
 *
 * These are the services mentioned in the spec:
 * - Lattice (GroveEngine): Core framework - tag releases
 * - Heartwood: Authentication service
 * - Amber: ???
 * - Foliage: ???
 * - Ivy: ???
 * - Rings: Analytics system
 * - Meadow: Community feed
 * - Forage: ???
 * - Aria: ???
 * - Scout: ???
 * - Outpost: ???
 */
export const ECOSYSTEM_REPOS: EcosystemRepo[] = [
  {
    name: 'Lattice',
    repo: 'autumnsgrove/GroveEngine',
    description: 'Core framework powering the Grove ecosystem',
    trackingMethod: 'releases',
    color: 'bg-emerald-500',
    icon: 'Grid3X3',
    category: 'core',
    isPrimary: true,
  },
  {
    name: 'Heartwood',
    repo: 'autumnsgrove/heartwood',
    description: 'Authentication and identity service',
    trackingMethod: 'commits',
    color: 'bg-rose-500',
    icon: 'Heart',
    category: 'infrastructure',
  },
  {
    name: 'Amber',
    repo: 'autumnsgrove/amber',
    description: 'Notification and messaging system',
    trackingMethod: 'commits',
    color: 'bg-amber-500',
    icon: 'Bell',
    category: 'infrastructure',
  },
  {
    name: 'Foliage',
    repo: 'autumnsgrove/foliage',
    description: 'UI component library and design system',
    trackingMethod: 'commits',
    color: 'bg-green-500',
    icon: 'Leaf',
    category: 'core',
  },
  {
    name: 'Ivy',
    repo: 'autumnsgrove/ivy',
    description: 'Content delivery and media handling',
    trackingMethod: 'commits',
    color: 'bg-teal-500',
    icon: 'Image',
    category: 'infrastructure',
  },
  {
    name: 'Rings',
    repo: 'autumnsgrove/rings',
    description: 'Privacy-first analytics system',
    trackingMethod: 'commits',
    color: 'bg-purple-500',
    icon: 'BarChart3',
    category: 'tools',
  },
  {
    name: 'Meadow',
    repo: 'autumnsgrove/meadow',
    description: 'Community feed and social features',
    trackingMethod: 'commits',
    color: 'bg-lime-500',
    icon: 'Users',
    category: 'core',
  },
  {
    name: 'Forage',
    repo: 'autumnsgrove/forage',
    description: 'Search and discovery service',
    trackingMethod: 'commits',
    color: 'bg-orange-500',
    icon: 'Search',
    category: 'tools',
  },
  {
    name: 'Aria',
    repo: 'autumnsgrove/aria',
    description: 'Accessibility utilities and testing',
    trackingMethod: 'commits',
    color: 'bg-indigo-500',
    icon: 'Accessibility',
    category: 'tools',
  },
  {
    name: 'Scout',
    repo: 'autumnsgrove/scout',
    description: 'Monitoring and health checks',
    trackingMethod: 'commits',
    color: 'bg-cyan-500',
    icon: 'Activity',
    category: 'infrastructure',
  },
  {
    name: 'Outpost',
    repo: 'autumnsgrove/outpost',
    description: 'Edge deployment and CDN management',
    trackingMethod: 'commits',
    color: 'bg-slate-500',
    icon: 'Globe',
    category: 'infrastructure',
  },
];

/**
 * Get repos by category
 */
export function getReposByCategory(category: EcosystemRepo['category']): EcosystemRepo[] {
  return ECOSYSTEM_REPOS.filter(repo => repo.category === category);
}

/**
 * Get the primary repo (Lattice)
 */
export function getPrimaryRepo(): EcosystemRepo | undefined {
  return ECOSYSTEM_REPOS.find(repo => repo.isPrimary);
}

/**
 * Categories with display info
 */
export const ECOSYSTEM_CATEGORIES = [
  { id: 'core', name: 'Core', description: 'Essential Grove components' },
  { id: 'infrastructure', name: 'Infrastructure', description: 'Backend services and systems' },
  { id: 'tools', name: 'Tools', description: 'Developer and user utilities' },
  { id: 'integrations', name: 'Integrations', description: 'Third-party connections' },
] as const;
