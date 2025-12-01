/**
 * Grove Design System - Design Tokens
 *
 * Export all design tokens for programmatic use.
 */

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './effects';
export * from './animation';

// Re-export main token objects
import { colors } from './colors';
import { typography } from './typography';
import { sizing } from './spacing';
import { effects } from './effects';
import { animation } from './animation';

export const tokens = {
  colors,
  typography,
  sizing,
  effects,
  animation,
} as const;

export type Tokens = typeof tokens;
