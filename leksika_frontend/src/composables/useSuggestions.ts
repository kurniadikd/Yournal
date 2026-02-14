// src/composables/useSuggestions.ts
// Native Vue implementation (no TanStack Query)

import { useLanguageStore } from '@/stores/language';
import { api } from '@/utils/api';
import { computed, isRef, ref, watch, type Ref, type ComputedRef } from 'vue';
import { watchDebounced } from '@vueuse/core';

const fetchSuggestionsAPI = async (
  searchQuery: string,
  sourceLangCode: string,
  targetLangCode: string
): Promise<any[]> => {
  if (!searchQuery || !sourceLangCode || !targetLangCode) {
    return [];
  }

  const url = `/${sourceLangCode}-${targetLangCode}/words/suggest/`;
  const { data } = await api.get(url, { params: { q: searchQuery } });
  return data;
};

export interface UseSuggestionsReturn {
  data: Ref<any[]>;
  isFetching: Ref<boolean>;
  error: Ref<Error | null>;
}

export function useSuggestions(searchQuery: Ref<string> | string): UseSuggestionsReturn {
  const languageStore = useLanguageStore();
  const searchQueryRef = isRef(searchQuery)
    ? searchQuery
    : ref(searchQuery ?? '');

  const sourceLangCodeRef = computed(
    () => languageStore.selectedAsal?.kodeBahasa,
  );
  const targetLangCodeRef = computed(
    () => languageStore.selectedTarget?.kodeBahasa,
  );

  const data = ref<any[]>([]);
  const isFetching = ref(false);
  const error = ref<Error | null>(null);

  const fetchData = async () => {
    const query = searchQueryRef.value;
    const src = sourceLangCodeRef.value;
    const tgt = targetLangCodeRef.value;

    if (!query || !src || !tgt) {
      data.value = [];
      return;
    }

    isFetching.value = true;
    error.value = null;

    try {
      data.value = await fetchSuggestionsAPI(query, src, tgt);
    } catch (err) {
      error.value = err as Error;
      data.value = [];
    } finally {
      isFetching.value = false;
    }
  };

  // Debounced watch for search query changes
  watchDebounced(
    [searchQueryRef, sourceLangCodeRef, targetLangCodeRef],
    fetchData,
    { debounce: 150, immediate: true }
  );

  return {
    data,
    isFetching,
    error,
  };
}
