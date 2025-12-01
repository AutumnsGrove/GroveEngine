import grovePreset from './src/lib/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [grovePreset],
  content: ['./src/**/*.{html,js,svelte,ts}'],
};
