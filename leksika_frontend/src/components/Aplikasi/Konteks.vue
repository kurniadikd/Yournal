<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import { useUIStore } from '@/stores/ui';
import { useSearchHistory } from '@/composables/useSearchHistory';
import { useSearchStore } from '@/stores/search';
import { useWordStore } from '@/stores/word';
import { useSentences } from '@/composables/useSentences'; // Import useSentences
import { useNarrative } from '@/composables/useNarrative'; // Import useNarrative
import { useElementBounding, useEventListener } from '@vueuse/core';

import SaranKata from './Konteks/SaranKata.vue';
import SearchBar from '../Searchbar.vue';
import DaftarRiwayat from './Konteks/DaftarRiwayat.vue';
import DaftarKalimat from './Konteks/DaftarKalimat.vue';
import HasilPencarian from './Konteks/HasilPencarian.vue';
import Narasi from './Konteks/Narasi.vue';
import ManajemenNarasi from '@/components/Aplikasi/Admin/ManajemenNarasi.vue';
import { useLanguageStore } from '@/stores/language'; // Needed for correct sentence mapping

// State for showing narrative instead of sentence list
const activeNarrativeGroupId = ref<number | null>(null);
const activeNarrativeHighlight = ref<{ p: number; s: number } | null>(null);
const activeHighlightText = ref<string | null>(null);
const activeEditorNarrativeGroupId = ref<number | null>(null);

const { t } = useI18n();

const showNarrative = (payload: string | number | { groupId: string | number; highlight?: { p: number; s: number } | null; highlightText?: string }) => {
  if (typeof payload === 'number') {
    activeNarrativeGroupId.value = payload;
    activeNarrativeHighlight.value = null;
    activeHighlightText.value = null;
  } else if (typeof payload === 'string') {
    activeNarrativeGroupId.value = parseInt(payload);
    activeNarrativeHighlight.value = null;
    activeHighlightText.value = null;
  } else {
    activeNarrativeGroupId.value = Number(payload.groupId);
    activeNarrativeHighlight.value = payload.highlight || null;
    activeHighlightText.value = payload.highlightText || null;
  }
  activeEditorNarrativeGroupId.value = null;
};

const openNarasiEditor = (payload: string | number | { groupId: string | number; initialData?: any; highlightText?: string }) => {
  const groupId = (typeof payload === 'number' || typeof payload === 'string') ? payload : payload.groupId;
  activeEditorNarrativeGroupId.value = Number(groupId);
  activeNarrativeGroupId.value = null;
  activeHighlightText.value = (typeof payload === 'object' && 'highlightText' in payload) ? payload.highlightText : null;
};

const closeNarrative = () => {
  activeNarrativeGroupId.value = null;
  activeEditorNarrativeGroupId.value = null;
  activeHighlightText.value = null;
};

const uiStore = useUIStore();
const searchStore = useSearchStore();
const { searchHistory, addToHistory } = useSearchHistory();
const wordStore = useWordStore();
const settingsStore = useSettingsStore();
const languageStore = useLanguageStore();
const { searchNarratives } = useNarrative();

// --- Unified Search Logic ---

// 1. Sentences Search (independent of word expansion)
const searchSentenceQuery = computed(() => [searchStore.currentSearchQuery]);
const {
  data: sentenceData,
  isFetching: isFetchingSentences,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useSentences(searchSentenceQuery);

const searchedSentences = computed(() => {
  if (!sentenceData.value?.pages) return [];

  // Flatten pages and simple mapping
  const sourceLangCode = languageStore.selectedAsal?.kodeBahasa || 'en';
  const targetLangCode = languageStore.selectedTarget?.kodeBahasa || 'id';

  return sentenceData.value.pages
    .flatMap((page: any) => page.results || [])
    // Filter out narrative sentences as requested ("hanya contoh kalimat saja")
    .filter((group: any) => !group.has_narrative)
    .map((group: any) => ({
      id: group.id,
      targetText: group.sentences?.[targetLangCode] || t('text_not_available'),
      sourceText: group.sentences?.[sourceLangCode] || t('translation_not_available'),
      hasNarrative: group.has_narrative || false,
      narrativeId: group.narrative_id,
    }));
});

// 2. Narratives Search
const searchedNarratives = ref<any[]>([]);
const isFetchingNarratives = ref(false);

const executeNarrativeSearch = async (query: string) => {
  if (!query) {
    searchedNarratives.value = [];
    return;
  }
  isFetchingNarratives.value = true;
  try {
    const res = await searchNarratives(query, 1);
    // Map to simpler structure if needed, or pass as is (HasilPencarian expects id, title, image_url, lang_code)
    searchedNarratives.value = res?.results || [];
  } finally {
    isFetchingNarratives.value = false;
  }
};


const searchBarRef = ref<any>(null);
const searchBarContainerRef = ref<HTMLElement | null>(null);
const searchBarWrapperRef = ref<HTMLElement | null>(null);
const searchBarInnerContainerRef = ref<HTMLElement | null>(null);
const searchBarRect = useElementBounding(searchBarInnerContainerRef);

// --- LOGIKA POPOVER DIHAPUS DARI SINI DAN PINDAH KE App.vue ---

const handleSuggestionSelected = (suggestion: string) => {
  // Update the real-time input to fill the search bar (v-model will update SearchBar)
  searchStore.setRealtimeInput(suggestion);

  // Force a change in currentSearchQuery to ensure the watch always fires
  searchStore.setSearchQuery(''); // Temporarily clear
  nextTick(() => {
    handleSearchExecuted(suggestion); // Then execute search
  });

  // Hide suggestions/keyboard if focused
  uiStore.setSearchFocus(false); // Assuming this should happen after selection
};

const handleSearchExecuted = (term: string) => {
  wordStore.hidePopover();
  wordStore.clear();
  searchStore.setSearchQuery(term);
  if (term) addToHistory(term);
};

// Fungsi ini tetap ada untuk memanggil store
const handleShowPopover = ({ word, target }: { word: string; target: HTMLElement }) => {
  if (wordStore.popoverTarget) {
    wordStore.hidePopover();
  }
  nextTick(() => {
    wordStore.showPopover(word, target);
  });
};

const handleSearchFromPopover = (word: string) => {
  if (!word || !searchBarRef.value) return;
  wordStore.hidePopover();
  searchStore.setRealtimeInput(word);
  searchBarRef.value.setSearchTerm(word);
  searchBarRef.value.executeSearch();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleBlur = () => {
  uiStore.setSearchFocus(false);
};

watch(
  () => searchStore.currentSearchQuery,
  (newQuery) => {
    // Parallel Fetching
    if (newQuery) {
      wordStore.fetchWords(newQuery);
      // useSentences reacts automatically to computed searchSentenceQuery
      executeNarrativeSearch(newQuery);
    } else {
      wordStore.clear();
      searchedNarratives.value = [];
    }
  },
  { immediate: true },
);

// Watch for pendingNarrativeGroupId from uiStore (navigation from Disimpan)
watch(
  () => uiStore.pendingNarrativeGroupId,
  (newGroupId) => {
    if (newGroupId) {
      showNarrative(Number(newGroupId));
      // Clear the pending state
      uiStore.setActiveNarrativeGroupId(null);
    }
  },
  { immediate: true },
);

watch(
  () => uiStore.isSearchFocused,
  () => {
    if (searchBarWrapperRef.value) {
      uiStore.adjustContainerHeight(searchBarWrapperRef.value);
    }
  },
);

onMounted(() => {
  if (searchBarContainerRef.value && searchBarWrapperRef.value) {
    uiStore.initializeFloatingSearch(searchBarContainerRef.value, searchBarWrapperRef.value);
  }
  const scrollHandler = () => {
    uiStore.handleScroll();
    wordStore.hidePopover();
  };
  useEventListener(window, 'scroll', scrollHandler, { passive: true });
});
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Preview Banner -->
    <div class="mb-4 p-3 rounded-xl bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] flex items-center gap-3">
      <span class="material-symbols-outlined text-xl">science</span>
      <p class="text-sm">
        <strong>{{ $t('beta_preview_title') }}</strong> {{ $t('beta_preview_desc') }}
      </p>
    </div>

    <!-- 1. EDITOR MODE -->
    <ManajemenNarasi v-if="activeEditorNarrativeGroupId" :group-id="activeEditorNarrativeGroupId"
      :highlight-text="activeHighlightText" :is-open="true" @close="closeNarrative" @back="closeNarrative"
      @saved="closeNarrative" />

    <!-- 2. VIEW MODE -->
    <Narasi v-else-if="activeNarrativeGroupId" :group-id="activeNarrativeGroupId"
      :highlight-target="activeNarrativeHighlight" :highlight-text="activeHighlightText" @close="closeNarrative"
      @back="closeNarrative" />

    <!-- 3. NORMAL CONTEXT MODE -->
    <div v-else>
      <div ref="searchBarContainerRef" class="search-bar-placeholder mb-6"
        :style="{ height: uiStore.containerHeight > 0 ? `${uiStore.containerHeight}px` : 'auto' }">
        <div ref="searchBarWrapperRef" class="search-bar-wrapper transition-all duration-300"
          :class="[`state-${uiStore.floatingState}`]">
          <div ref="searchBarInnerContainerRef" class="search-bar-inner-container">
            <SearchBar ref="searchBarRef" v-model="searchStore.realtimeSearchInput" @search="handleSearchExecuted"
              @focus="uiStore.setSearchFocus(true)" @blur="handleBlur"
              :isFloating="uiStore.floatingState === 'floating'" />

            <Transition name="dropdown-fade">
              <SaranKata v-if="searchStore.realtimeSearchInput && uiStore.isSearchFocused"
                :search-bar-rect="searchBarRect" @select="handleSuggestionSelected" />
            </Transition>

            <Transition name="dropdown-fade">
              <DaftarRiwayat
                v-if="uiStore.isSearchFocused && !searchStore.realtimeSearchInput && searchHistory.length > 0"
                class="history-dropdown" @select-item="handleSuggestionSelected" />
            </Transition>
          </div>
        </div>
      </div>

      <div>
        <HasilPencarian v-if="searchStore.currentSearchQuery" :words="wordStore.words" :sentences="searchedSentences"
          :narratives="searchedNarratives" :total="wordStore.totalWordsCount"
          :loading="wordStore.loading || isFetchingSentences || isFetchingNarratives" :error="wordStore.error"
          :search-query="searchStore.currentSearchQuery" :expanded-word-id="wordStore.expandedWordId"
          :has-next-page="hasNextPage" :is-fetching-next-page="isFetchingNextPage" @load-more-sentences="fetchNextPage"
          @search-word="handleSearchFromPopover" @toggle-expand="wordStore.setExpandedWordId(Number($event))"
          @show-narrative="showNarrative" @show-popover="handleShowPopover" @open-narasi-editor="openNarasiEditor" />

        <!-- Show DaftarKalimat if:
               1. WE ARE SEARCHING and a word is expanded (Contextual Mode)
               OR
               2. WE ARE NOT SEARCHING (Random Sentences Mode)
           -->
        <DaftarKalimat v-if="!searchStore.currentSearchQuery" @show-popover="handleShowPopover"
          @show-narrative="showNarrative" @open-narasi-editor="openNarasiEditor" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-bar-placeholder {
  position: relative;
  transition: height 0.2s ease-out;
}

.search-bar-wrapper {
  transition: transform 0.35s ease-in-out;
}

:global(.search-bar-wrapper.state-docked) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  transform: translateY(0);
  z-index: 30;
}

:global(.search-bar-wrapper.state-floating),
:global(.search-bar-wrapper.state-hiding) {
  position: fixed;
  top: 0;
  z-index: 30;
  padding-top: 1rem;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  /* PERUBAHAN: Diubah dari 48rem ke 56rem agar sesuai dengan max-w-4xl saat floating */
  max-width: 56rem;
  padding-left: 1rem;
  padding-right: 1rem;
  box-sizing: border-box;
}

:global(.search-bar-wrapper.state-hiding) {
  transform: translateY(-150%);
}

.search-bar-inner-container {
  position: relative;
  width: 100%;
  border-radius: 1.5rem;
}

.history-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  z-index: 20;
  padding-top: 0.5rem;
}
</style>

<style>
/* PERBAIKAN: Membalikkan arah putaran animasi 'spin' secara global */
@keyframes spin {
  to {
    transform: rotate(-360deg);
  }
}
</style>
