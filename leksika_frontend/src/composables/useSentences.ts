// src/composables/useSentences.ts
// Native Vue + VueUse implementation (no TanStack Query)

import { useLanguageStore } from '@/stores/language';
import { computed, isRef, ref, watch, type Ref, type ComputedRef } from 'vue';
import { api } from '@/utils/api';
import { watchDebounced } from '@vueuse/core';

/**
 * Helper untuk mendapatkan path API berdasarkan pasangan bahasa.
 */
function getLanguageApiPath() {
  const languageStore = useLanguageStore();
  const sourceLang = languageStore.selectedAsal?.kodeBahasa;
  const targetLang = languageStore.selectedTarget?.kodeBahasa;

  if (!sourceLang || !targetLang) {
    return '/id-ru';
  }

  return `/${sourceLang}-${targetLang}`;
}

// --- Fungsi API ---

interface FetchParams {
  searchQuery: string[];
  isRandom: boolean;
  targetLangCode: string | undefined;
  sourceLangCode: string | undefined;
  seed?: string;
}

interface PageData {
  results: any[];
  next: string | null;
  count?: number;
}

export const fetchSentencesPage = async (
  params: FetchParams,
  pageParam?: string | null
): Promise<PageData> => {
  const { searchQuery, isRandom, targetLangCode, sourceLangCode } = params;

  const path = `${getLanguageApiPath()}/sentences/`;

  if (!targetLangCode || !sourceLangCode) {
    return { results: [], next: null };
  }

  // Handle pagination
  if (pageParam && typeof pageParam === 'string') {
    let cleanPath = pageParam;
    if (cleanPath.startsWith('/api/')) {
      cleanPath = cleanPath.substring(4);
    }
    const { data } = await api.get(cleanPath);
    return data;
  }

  const queryParams: any = {
    has_narrative: 'true', // Filter sentences with narratives at DB level
  };

  if (Array.isArray(searchQuery) && searchQuery.length > 0) {
    queryParams.q = searchQuery.join(',');
  } else if (isRandom) {
    queryParams.random = 'true';
    if (params.seed) {
      queryParams.seed = params.seed;
    }
  }

  const { data } = await api.get(path, { params: queryParams });
  return data;
};

export const fetchSentenceGroupByIdAPI = async (sentenceId: string | number) => {
  const { data } = await api.get(`/admin/sentences/groups/${sentenceId}/`);
  return data;
};

export const updateSentenceGroupAPI = async (sentenceId: string | number, payload: any) => {
  const { data } = await api.patch(
    `/admin/sentences/groups/${sentenceId}/`,
    payload,
  );
  return data;
};

export const deactivateSentenceGroupAPI = async (sentenceId: string | number) => {
  const { data } = await api.patch(`/admin/sentences/groups/${sentenceId}/`, {
    is_active: false,
  });
  return data;
};

export const activateSentenceGroupAPI = async (sentenceId: string | number) => {
  const { data } = await api.patch(`/admin/sentences/groups/${sentenceId}/`, {
    is_active: true,
  });
  return data;
};

export const fetchAdminSentencesAPI = async (page: number, ordering?: string) => {
  const params: any = { page };
  if (ordering) {
    params.ordering = ordering;
  }
  const { data } = await api.get('/admin/sentences/groups/', { params });
  return data;
};

export const createOrUpdateSentenceGroup = async ({ id, payload }: { id?: string | number | null; payload: any }) => {
  const url = id
    ? `/admin/sentences/groups/${id}/`
    : '/admin/sentences/groups/';
  const method = id ? 'patch' : 'post';
  const { data } = await api[method](url, payload);
  return data;
};

export const deactivateSentenceGroup = async (id: string | number) => {
  const { data } = await api.patch(`/admin/sentences/groups/${id}/`, {
    is_active: false,
  });
  return data;
};

export const activateSentenceGroup = async (id: string | number) => {
  const { data } = await api.patch(`/admin/sentences/groups/${id}/`, {
    is_active: true,
  });
  return data;
};

// --- Simple in-memory cache ---
const sentenceCache = new Map<string, { pages: PageData[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(params: FetchParams): string {
  return JSON.stringify({
    q: params.searchQuery,
    src: params.sourceLangCode,
    tgt: params.targetLangCode,
    rand: params.isRandom,
    seed: params.seed,
  });
}

// --- Composables ---

export interface UseSentencesReturn {
  data: ComputedRef<{ pages: PageData[] } | null>;
  fetchNextPage: () => Promise<void>;
  hasNextPage: ComputedRef<boolean>;
  isFetching: Ref<boolean>;
  isFetchingNextPage: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
}

export function useSentences(searchQuery: Ref<string[]> | string[]): UseSentencesReturn {
  const languageStore = useLanguageStore();

  const searchQueryRef = isRef(searchQuery)
    ? searchQuery
    : ref(searchQuery ?? []);

  const pages = ref<PageData[]>([]);
  const nextPageUrl = ref<string | null>(null);
  const isFetching = ref(false);
  const isFetchingNextPage = ref(false);
  const error = ref<Error | null>(null);

  // Stable seed for the duration of this composable's lifecycle or until explicit refetch
  const randomSeed = ref(Math.random().toString(36).substring(7));

  const sourceLangCodeRef = computed(() => languageStore.selectedAsal?.kodeBahasa);
  const targetLangCodeRef = computed(() => languageStore.selectedTarget?.kodeBahasa);

  const fetchParams = computed<FetchParams>(() => ({
    searchQuery: searchQueryRef.value,
    isRandom: !searchQueryRef.value || searchQueryRef.value.length === 0,
    sourceLangCode: sourceLangCodeRef.value,
    targetLangCode: targetLangCodeRef.value,
    seed: randomSeed.value,
  }));

  const data = computed(() => {
    if (pages.value.length === 0) return null;
    return { pages: pages.value };
  });

  const hasNextPage = computed(() => !!nextPageUrl.value);

  const fetchFirstPage = async () => {
    if (!fetchParams.value.sourceLangCode || !fetchParams.value.targetLangCode) {
      return;
    }

    const cacheKey = getCacheKey(fetchParams.value);
    const cached = sentenceCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      pages.value = cached.pages;
      nextPageUrl.value = cached.pages[cached.pages.length - 1]?.next ?? null;
      return;
    }

    isFetching.value = true;
    error.value = null;

    try {
      const pageData = await fetchSentencesPage(fetchParams.value, null);
      pages.value = [pageData];
      nextPageUrl.value = pageData.next;

      sentenceCache.set(cacheKey, {
        pages: [pageData],
        timestamp: Date.now(),
      });
    } catch (err) {
      error.value = err as Error;
      console.error('Failed to fetch sentences:', err);
    } finally {
      isFetching.value = false;
    }
  };

  const fetchNextPage = async () => {
    if (!nextPageUrl.value || isFetchingNextPage.value) return;

    isFetchingNextPage.value = true;

    try {
      const pageData = await fetchSentencesPage(fetchParams.value, nextPageUrl.value);
      pages.value = [...pages.value, pageData];
      nextPageUrl.value = pageData.next;

      // Update cache
      const cacheKey = getCacheKey(fetchParams.value);
      sentenceCache.set(cacheKey, {
        pages: pages.value,
        timestamp: Date.now(),
      });
    } catch (err) {
      error.value = err as Error;
      console.error('Failed to fetch next page:', err);
    } finally {
      isFetchingNextPage.value = false;
    }
  };

  const refetch = async () => {
    const cacheKey = getCacheKey(fetchParams.value);
    sentenceCache.delete(cacheKey);
    // Refresh seed on explicit refetch
    randomSeed.value = Math.random().toString(36).substring(7);
    pages.value = [];
    nextPageUrl.value = null;
    await fetchFirstPage();
  };

  // Watch for search query or language changes
  watchDebounced(
    [searchQueryRef, sourceLangCodeRef, targetLangCodeRef],
    () => {
      pages.value = [];
      nextPageUrl.value = null;
      fetchFirstPage();
    },
    { debounce: 100, immediate: true }
  );

  return {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    refetch,
  };
}

// --- Admin Sentences Composable ---

export interface UseAdminSentencesReturn {
  data: Ref<any>;
  isFetching: Ref<boolean>;
  isLoading: Ref<boolean>;
  isError: ComputedRef<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
}

export function useAdminSentences(
  currentPage: Ref<number>,
  ordering: Ref<string | undefined>
): UseAdminSentencesReturn {
  const data = ref<any>(null);
  const isFetching = ref(false);
  const error = ref<Error | null>(null);

  const fetchData = async () => {
    isFetching.value = true;
    error.value = null;

    try {
      const result = await fetchAdminSentencesAPI(currentPage.value, ordering.value);
      data.value = result;
    } catch (err) {
      error.value = err as Error;
      console.error('Failed to fetch admin sentences:', err);
    } finally {
      isFetching.value = false;
    }
  };

  watch([currentPage, ordering], fetchData, { immediate: true });

  return {
    data,
    isFetching,
    isLoading: isFetching,
    isError: computed(() => !!error.value),
    error,
    refetch: fetchData,
  };
}

// --- Mutation Composables ---

export interface UseSentenceMutationReturn {
  mutate: (variables: { id?: string | number | null; payload: any }) => Promise<any>;
  mutateAsync: (variables: { id?: string | number | null; payload: any }) => Promise<any>;
  isPending: Ref<boolean>;
  error: Ref<Error | null>;
  onError?: (err: Error) => void;
  onSuccess?: (data: any, variables: any) => void;
}

export function useSentenceMutation(currentPage: Ref<number>): UseSentenceMutationReturn {
  const isPending = ref(false);
  const error = ref<Error | null>(null);
  let onErrorCallback: ((err: Error) => void) | undefined;
  let onSuccessCallback: ((data: any, variables: any) => void) | undefined;

  const mutateAsync = async (variables: { id?: string | number | null; payload: any }) => {
    isPending.value = true;
    error.value = null;

    try {
      const result = await createOrUpdateSentenceGroup(variables);
      if (onSuccessCallback) {
        onSuccessCallback(result, variables);
      }
      return result;
    } catch (err: any) {
      error.value = err;
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isPending,
    error,
    set onError(fn: (err: Error) => void) {
      onErrorCallback = fn;
    },
    set onSuccess(fn: (data: any, variables: any) => void) {
      onSuccessCallback = fn;
    },
  };
}

export interface UseDeactivateMutationReturn {
  mutate: (id: string | number) => Promise<any>;
  mutateAsync: (id: string | number) => Promise<any>;
  isPending: Ref<boolean>;
  error: Ref<Error | null>;
  onError?: (err: Error) => void;
  onSuccess?: (data: any, id: string | number) => void;
}

export function useDeactivateMutation(currentPage: Ref<number>): UseDeactivateMutationReturn {
  const isPending = ref(false);
  const error = ref<Error | null>(null);
  let onErrorCallback: ((err: Error) => void) | undefined;
  let onSuccessCallback: ((data: any, id: string | number) => void) | undefined;

  const mutateAsync = async (id: string | number) => {
    isPending.value = true;
    error.value = null;

    try {
      const result = await deactivateSentenceGroup(id);
      if (onSuccessCallback) {
        onSuccessCallback(result, id);
      }
      return result;
    } catch (err: any) {
      error.value = err;
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isPending,
    error,
    set onError(fn: (err: Error) => void) {
      onErrorCallback = fn;
    },
    set onSuccess(fn: (data: any, id: string | number) => void) {
      onSuccessCallback = fn;
    },
  };
}

export interface UseActivateMutationReturn {
  mutate: (id: string | number) => Promise<any>;
  mutateAsync: (id: string | number) => Promise<any>;
  isPending: Ref<boolean>;
  error: Ref<Error | null>;
  onError?: (err: Error) => void;
  onSuccess?: (data: any, id: string | number) => void;
}

export function useActivateMutation(currentPage: Ref<number>): UseActivateMutationReturn {
  const isPending = ref(false);
  const error = ref<Error | null>(null);
  let onErrorCallback: ((err: Error) => void) | undefined;
  let onSuccessCallback: ((data: any, id: string | number) => void) | undefined;

  const mutateAsync = async (id: string | number) => {
    isPending.value = true;
    error.value = null;

    try {
      const result = await activateSentenceGroup(id);
      if (onSuccessCallback) {
        onSuccessCallback(result, id);
      }
      return result;
    } catch (err: any) {
      error.value = err;
      if (onErrorCallback) {
        onErrorCallback(err);
      }
      throw err;
    } finally {
      isPending.value = false;
    }
  };

  return {
    mutate: mutateAsync,
    mutateAsync,
    isPending,
    error,
    set onError(fn: (err: Error) => void) {
      onErrorCallback = fn;
    },
    set onSuccess(fn: (data: any, id: string | number) => void) {
      onSuccessCallback = fn;
    },
  };
}

// --- Simple mutation helpers (async functions) ---

export async function mutateSentenceGroup(
  id: string | number | null | undefined,
  payload: any
): Promise<any> {
  return createOrUpdateSentenceGroup({ id, payload });
}

export async function mutateDeactivate(id: string | number): Promise<any> {
  return deactivateSentenceGroup(id);
}

export async function mutateActivate(id: string | number): Promise<any> {
  return activateSentenceGroup(id);
}

// --- Cache utilities ---

export function updateSentenceInCache(updatedGroup: any) {
  sentenceCache.forEach((cached, key) => {
    cached.pages = cached.pages.map((page) => ({
      ...page,
      results: page.results.map((group) =>
        group.id === updatedGroup.id ? updatedGroup : group
      ),
    }));
    sentenceCache.set(key, cached);
  });
}

export function removeSentenceFromCache(deletedId: number) {
  sentenceCache.forEach((cached, key) => {
    cached.pages = cached.pages.map((page) => ({
      ...page,
      results: page.results.filter((group) => group.id !== deletedId),
    }));
    sentenceCache.set(key, cached);
  });
}

export function clearSentenceCache() {
  sentenceCache.clear();
}

// Alias for fetchAdminSentences for backwards compatibility
export { fetchAdminSentencesAPI as fetchAdminSentences };
