/**
 * Draft Manager Composable
 * Handles auto-saving drafts to localStorage
 */

const AUTO_SAVE_DELAY = 2000; // 2 seconds

export interface StoredDraft {
  content: string;
  savedAt: string;
}

export interface DraftManagerOptions {
  /** Unique key for localStorage */
  draftKey?: string | null;
  /** Function to get current content */
  getContent?: () => string;
  /** Function to set content */
  setContent?: (content: string) => void;
  /** Callback when draft is restored */
  onDraftRestored?: (draft: StoredDraft) => void;
  /** Whether editor is readonly */
  readonly?: boolean;
}

export type SaveStatus = "idle" | "saving" | "saved";

export interface DraftManager {
  readonly hasDraft: boolean;
  readonly draftRestorePrompt: boolean;
  readonly storedDraft: StoredDraft | null;
  readonly lastSavedContent: string;
  readonly saveStatus: SaveStatus;
  init: (initialContent: string) => void;
  scheduleSave: (content: string) => void;
  saveDraft: () => void;
  clearDraft: () => void;
  restoreDraft: () => void;
  discardDraft: () => void;
  getStatus: () => { hasDraft: boolean; storedDraft: StoredDraft | null };
  hasUnsavedChanges: (content: string) => boolean;
  flushSave: () => void;
  cleanup: () => void;
}

/**
 * Creates a draft manager with Svelte 5 runes
 */
export function useDraftManager(
  options: DraftManagerOptions = {},
): DraftManager {
  const { draftKey, getContent, setContent, onDraftRestored, readonly } =
    options;

  let lastSavedContent = $state("");
  let draftSaveTimer = $state<ReturnType<typeof setTimeout> | null>(null);
  let hasDraft = $state(false);
  let draftRestorePrompt = $state(false);
  let storedDraft = $state<StoredDraft | null>(null);
  let saveStatus = $state<SaveStatus>("idle");
  let savedConfirmTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  function saveDraft(): void {
    if (!draftKey || readonly || !getContent) return;

    const content = getContent();
    saveStatus = "saving";
    try {
      const draft: StoredDraft = {
        content,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(`draft:${draftKey}`, JSON.stringify(draft));
      lastSavedContent = content;
      hasDraft = true;
      saveStatus = "saved";

      // Clear "saved" status after 2 seconds
      if (savedConfirmTimer) clearTimeout(savedConfirmTimer);
      savedConfirmTimer = setTimeout(() => {
        saveStatus = "idle";
      }, 2000);
    } catch (e) {
      console.warn("Failed to save draft:", e);
      saveStatus = "idle";
    }
  }

  function loadDraft(): StoredDraft | null {
    if (!draftKey) return null;

    try {
      const stored = localStorage.getItem(`draft:${draftKey}`);
      if (stored) {
        return JSON.parse(stored) as StoredDraft;
      }
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
    return null;
  }

  function clearDraft(): void {
    if (!draftKey) return;

    try {
      localStorage.removeItem(`draft:${draftKey}`);
      hasDraft = false;
      storedDraft = null;
      draftRestorePrompt = false;
    } catch (e) {
      console.warn("Failed to clear draft:", e);
    }
  }

  function restoreDraft(): void {
    if (storedDraft && setContent) {
      setContent(storedDraft.content);
      lastSavedContent = storedDraft.content;
      if (onDraftRestored) {
        onDraftRestored(storedDraft);
      }
    }
    draftRestorePrompt = false;
  }

  function discardDraft(): void {
    clearDraft();
    if (getContent) {
      lastSavedContent = getContent();
    }
  }

  function scheduleSave(content: string): void {
    if (!draftKey || readonly) return;

    // Clear previous timer
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
    }

    // Don't save if content hasn't changed from last saved version
    if (content === lastSavedContent) return;

    // Schedule a draft save
    draftSaveTimer = setTimeout(() => {
      saveDraft();
    }, AUTO_SAVE_DELAY);
  }

  function init(initialContent: string): void {
    // Check for existing draft on mount
    if (draftKey) {
      const draft = loadDraft();
      if (draft && draft.content !== initialContent) {
        storedDraft = draft;
        draftRestorePrompt = true;
      } else {
        lastSavedContent = initialContent;
      }
    }
  }

  /**
   * Immediately persist any pending draft save.
   * Called on component unmount, beforeunload, and visibilitychange
   * to prevent data loss during session expiry or navigation.
   */
  function flushSave(): void {
    if (!draftKey || readonly || !getContent) return;

    // If there's a pending debounce timer, cancel it and save now
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }

    // Save if content has changed since last save
    const current = getContent();
    if (current !== lastSavedContent) {
      saveDraft();
    }
  }

  function cleanup(): void {
    // Flush any pending draft save before clearing timers
    flushSave();

    if (savedConfirmTimer) {
      clearTimeout(savedConfirmTimer);
    }
  }

  function getStatus(): { hasDraft: boolean; storedDraft: StoredDraft | null } {
    return { hasDraft, storedDraft };
  }

  function hasUnsavedChanges(content: string): boolean {
    return content !== lastSavedContent;
  }

  return {
    get hasDraft() {
      return hasDraft;
    },
    get draftRestorePrompt() {
      return draftRestorePrompt;
    },
    get storedDraft() {
      return storedDraft;
    },
    get lastSavedContent() {
      return lastSavedContent;
    },
    get saveStatus() {
      return saveStatus;
    },
    init,
    scheduleSave,
    saveDraft,
    clearDraft,
    restoreDraft,
    discardDraft,
    getStatus,
    hasUnsavedChanges,
    flushSave,
    cleanup,
  };
}
