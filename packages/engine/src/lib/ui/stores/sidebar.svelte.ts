/**
 * Sidebar store for coordinating Arbor sidebar toggle across layouts.
 *
 * The Chrome Header (in root layout) and Arbor sidebar (in admin layout)
 * need to communicate. This store bridges them.
 */

let sidebarOpen = $state(false);

export const sidebarStore = {
  get open() {
    return sidebarOpen;
  },

  toggle() {
    sidebarOpen = !sidebarOpen;
  },

  close() {
    sidebarOpen = false;
  },

  set(value: boolean) {
    sidebarOpen = value;
  },
};
