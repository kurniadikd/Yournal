// File: src/stores/translation.js

import { defineStore } from 'pinia';

interface TranslationResult {
  original: string;
  translated: string;
}

export const useTranslationStore = defineStore('translation', {
  state: () => ({
    translatedResult: null as TranslationResult | null,
  }),
  actions: {
    setTranslationResult(originalText: string, translatedText: string) {
      this.translatedResult = {
        original: originalText,
        translated: translatedText,
      };
    },
    clear() {
      this.translatedResult = null;
    },
  },
});
