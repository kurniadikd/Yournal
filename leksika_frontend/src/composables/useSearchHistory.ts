// composables/useSearchHistory.js
// Composable untuk mengelola riwayat pencarian dengan localStorage
import { useStorage } from '@vueuse/core';

const MAX_HISTORY_ITEMS = 50;

// Shared state menggunakan useStorage
const searchHistory = useStorage('leksika-search-history', []);

export function useSearchHistory() {
  /**
   * Tambah term ke riwayat pencarian
   * @param {string} term - Term yang akan ditambahkan
   */
  const addToHistory = (term: string) => {
    if (!term || !term.trim()) return;

    const trimmedTerm = term.trim();
    // Hapus duplikat dan pindahkan ke depan
    const newHistory = [
      trimmedTerm,
      ...searchHistory.value.filter((item) => item !== trimmedTerm),
    ].slice(0, MAX_HISTORY_ITEMS);

    searchHistory.value = newHistory;
  };

  /**
   * Hapus term dari riwayat
   * @param {string} term - Term yang akan dihapus
   */
  const removeFromHistory = (term: string) => {
    searchHistory.value = searchHistory.value.filter((item) => item !== term);
  };

  /**
   * Bersihkan semua riwayat
   */
  const clearHistory = () => {
    searchHistory.value = [];
  };

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
