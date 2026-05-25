import { create } from 'zustand';

export type AppLanguage = 'zh-CN' | 'en-US';

const STORAGE_KEY = 'smp.ui.language.v1';

type LocaleState = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

function readLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en-US' ? 'en-US' : 'zh-CN';
  } catch {
    return 'zh-CN';
  }
}

export const useLocaleStore = create<LocaleState>((set) => ({
  language: readLanguage(),
  setLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore storage failures and keep in-memory preference
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
    set({ language });
  },
}));
