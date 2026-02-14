// src/stores/search.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSearchStore = defineStore('search', () => {
  // --- STATE ---
  const currentSearchQuery = ref<string>('');
  const realtimeSearchInput = ref<string>('');
  const selectedWord = ref<any>(null); // ✅ tambahkan ini
  const suggestions = ref<any[]>([]); // New state for search suggestions

  // --- ACTIONS ---
  function setSearchQuery(term: string) {
    currentSearchQuery.value = term.trim();
  }

  function setRealtimeInput(term: string) {
    realtimeSearchInput.value = term;
  }

  function setSelectedWord(word: any) {
    // ✅ tambahkan setter untuk konsistensi
    selectedWord.value = word;
  }

  function setSuggestions(newSuggestions: any[]) {
    // New action to update suggestions
    suggestions.value = newSuggestions;
  }

  return {
    currentSearchQuery,
    realtimeSearchInput,
    selectedWord,
    suggestions, // Expose suggestions
    setSearchQuery,
    setRealtimeInput,
    setSelectedWord,
    setSuggestions, // Expose setSuggestions
  };
});
