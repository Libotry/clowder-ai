import { create } from 'zustand';

export type IntentionType = 'analyzing' | 'implementing' | 'waiting' | 'blocked';

export interface IntentionEntry {
  catId: string;
  intent: string;
  type: IntentionType;
  taskId?: string;
  blockers?: string;
  urgency: number; // 0-1
  reportedAt: number;
}

interface IntentionState {
  /** All active intentions across all cats, keyed by `${catId}:${taskId ?? '_global_}` */
  intentions: Map<string, IntentionEntry>;
  setIntention: (entry: IntentionEntry) => void;
  clearIntention: (catId: string, taskId?: string) => void;
  clearAllForCat: (catId: string) => void;
}

export const useIntentionStore = create<IntentionState>((set) => ({
  intentions: new Map(),

  setIntention: (entry) =>
    set((state) => {
      const key = `${entry.catId}:${entry.taskId ?? '_global_'}`;
      const next = new Map(state.intentions);
      next.set(key, entry);
      return { intentions: next };
    }),

  clearIntention: (catId, taskId) =>
    set((state) => {
      const key = `${catId}:${taskId ?? '_global_'}`;
      const next = new Map(state.intentions);
      next.delete(key);
      return { intentions: next };
    }),

  clearAllForCat: (catId) =>
    set((state) => {
      const next = new Map(state.intentions);
      for (const [k] of next) {
        if (k.startsWith(`${catId}:`)) next.delete(k);
      }
      return { intentions: next };
    }),
}));
