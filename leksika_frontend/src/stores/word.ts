import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/utils/api';
import { useLanguageStore } from './language';

// --- FUNGSI API ---

// --- TIPE DATA ---
export interface Word {
  id: number;
  base: string;
  is_detailed?: boolean;
  definitions?: any[];
  translations?: any[];
  [key: string]: any;
}

export interface SearchResult {
  results: Word[];
  count: number;
}

async function fetchWordDataAPI(searchTerm: string, page = 1, pageSize = 15): Promise<SearchResult> {
  const languageStore = useLanguageStore();
  const sourceLang = languageStore.selectedAsal?.kodeBahasa;
  const targetLang = languageStore.selectedTarget?.kodeBahasa;

  if (!sourceLang || !targetLang) {
    // Kembalikan 'results' agar cocok dengan ekspektasi 'fetchWords'
    return { results: [], count: 0 };
  }

  // Endpoint search: /{source}-{target}/words/search/
  const url = `/${sourceLang}-${targetLang}/words/search/`;
  const response = await api.get(url, {
    params: { q: searchTerm, page: page, page_size: pageSize },
  });
  return response.data;
}

async function fetchWordDetailsAPI(wordId: number): Promise<Word | null> {
  const languageStore = useLanguageStore();
  const sourceLang = languageStore.selectedAsal?.kodeBahasa;
  const targetLang = languageStore.selectedTarget?.kodeBahasa;

  if (!sourceLang || !targetLang || !wordId) {
    return null;
  }

  const url = `/${sourceLang}-${targetLang}/words/${wordId}/`;
  const response = await api.get(url);
  return response.data;
}

export async function fetchPopoverData(word: string) {
  const languageStore = useLanguageStore();

  // [PERBAIKAN] Gunakan urutan yang sama dengan endpoint search: Asal -> Target
  const sourceLang = languageStore.selectedAsal?.kodeBahasa;
  const targetLang = languageStore.selectedTarget?.kodeBahasa;

  if (!word || !sourceLang || !targetLang) {
    return null;
  }

  try {
    // URL diperbaiki menjadi: /{source}-{target}/words/popover/
    const url = `/${sourceLang}-${targetLang}/words/popover/`;
    const response = await api.get(url, {
      params: { word },
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      throw new Error('Kata tidak ditemukan.');
    }
    throw new Error('Gagal memuat info kata.');
  }
}

export const useWordStore = defineStore('word', () => {
  // --- CACHE ---
  const searchCache = new Map<string, SearchResult>();

  // --- STATE ---
  const words = ref<Word[]>([]);
  const totalWordsCount = ref<number>(0);
  const expandedWordId = ref<number | null>(null);
  const loading = ref<boolean>(false);
  const enrichingWordIds = ref<Set<number>>(new Set()); // Track IDs being enriched (managed by fetchWordDetails)
  const error = ref<string | null>(null);
  const popoverWord = ref<string | null>(null);
  const popoverTarget = ref<HTMLElement | null>(null);

  // [DEPRECATED] triggerAutoEnrich removed - enrichment handled by backend in retrieve_public_word

  function isWordEnriching(wordId: number) {
    return enrichingWordIds.value.has(wordId);
  }

  // --- ACTIONS ---
  async function fetchWords(query: string, page = 1, pageSize = 15) {
    if (!query) {
      clear();
      return;
    }

    const cacheKey = `${query}-${page}-${pageSize}`;
    // 1. Cek Cache Terlebih Dahulu
    if (searchCache.has(cacheKey)) {
      const cachedData = searchCache.get(cacheKey);
      if (cachedData) {
        words.value = cachedData.results || [];
        totalWordsCount.value = cachedData.count || 0;
      }
      return;
    }

    // 2. Jika tidak ada di cache, lanjutkan dengan fetch API
    loading.value = true;
    error.value = null;

    try {
      const responseData = await fetchWordDataAPI(query, page, pageSize);

      // Inisialisasi is_detailed ke false untuk setiap kata baru
      const newWords = responseData.results.map((word) => ({
        ...word,
        is_detailed: false,
      }));

      if (page === 1) {
        words.value = newWords;
      } else {
        words.value = [...words.value, ...newWords];
      }
      totalWordsCount.value = responseData.count || 0;

      // 3. Simpan hasil ke cache
      searchCache.set(cacheKey, responseData);

      // [REMOVED] Auto AI enrichment now handled by backend in retrieve_public_word
    } catch (e) {
      error.value = 'Gagal memuat data kata.';
    } finally {
      loading.value = false;
    }
  }

  async function fetchWordDetails(wordId: number) {
    if (!wordId) return;

    const existingWordIndex = words.value.findIndex(
      (word) => word.id === wordId,
    );
    if (existingWordIndex === -1) {
      return;
    }

    const existingWord = words.value[existingWordIndex];
    if (existingWord.is_detailed) {
      return;
    }

    try {
      const detailedData = await fetchWordDetailsAPI(wordId);
      // [DEBUG] Log response dari API
      console.log('[WordStore] fetchWordDetails response:', {
        id: detailedData?.id,
        base: detailedData?.base,
        definitions_count: detailedData?.definitions?.length || 0,
        translations_count: detailedData?.translations?.length || 0,
        definitions: detailedData?.definitions,
        translations: detailedData?.translations,
      });
      if (detailedData) {
        // Update the existing word object with detailed data
        words.value[existingWordIndex] = {
          ...existingWord, // Keep existing summary data
          ...detailedData, // Overlay with detailed data
          is_detailed: true, // Mark as detailed
        };
      }
    } catch (e) {
      console.error('[WordStore] fetchWordDetails error:', e);
      // Tangani error jika perlu, mungkin set flag error di objek kata
    }
  }

  function setExpandedWordId(wordId: number | null) {
    expandedWordId.value = expandedWordId.value === wordId ? null : wordId;
  }

  function clear() {
    words.value = [];
    totalWordsCount.value = 0;
    loading.value = false;
    error.value = null;
    expandedWordId.value = null;
    searchCache.clear(); // Hapus cache saat data dibersihkan
  }

  function showPopover(word: string, target: HTMLElement) {
    const cleanedWord = word.replace(/[.,!?—:;]$/, '');
    popoverWord.value = cleanedWord;
    popoverTarget.value = target;
  }

  function hidePopover() {
    popoverWord.value = null;
    popoverTarget.value = null;
  }

  return {
    words,
    totalWordsCount,
    expandedWordId,
    loading,
    isWordEnriching, // Check if specific word is enriching (via fetchWordDetails)
    error,
    popoverWord,
    popoverTarget,
    fetchWords,
    fetchWordDetails,
    setExpandedWordId,
    clear,
    showPopover,
    hidePopover,
  };
});
