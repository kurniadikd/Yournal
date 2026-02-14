<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSearchStore } from '@/stores/search';
import { useLanguageStore } from '@/stores/language';
import { useWordStore } from '@/stores/word';
import { useSentencesStore } from '@/stores/sentences';
import { useIntersectionObserver } from '@vueuse/core';
import { useSentences, updateSentenceInCache, removeSentenceFromCache } from '@/composables/useSentences';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import KalimatItem from '@/components/Aplikasi/Konteks/KalimatItem.vue';
import { onMounted } from 'vue';

// --- PERUBAHAN 1: Daftarkan 'show-popover' dan 'show-narrative' di sini ---
const emit = defineEmits<{
  (e: 'show-popover', payload: { word: string; target: HTMLElement }): void;
  (e: 'search-word', word: string): void;
  (e: 'show-narrative', payload: { groupId: number; highlight?: { p: number; s: number } | null; highlightText?: string }): void;
  (e: 'open-narasi-editor', payload: { groupId: number; initialData: any; highlightText?: string }): void;
}>();

const searchStore = useSearchStore();
const languageStore = useLanguageStore();
const wordStore = useWordStore();
const sentencesStore = useSentencesStore();
const { t } = useI18n();

const activeSentenceId = ref<number | string | null>(null);
const sentinelRef = ref<HTMLElement | null>(null);

// 1. Kumpulkan SEMUA bentuk kata (dasar, beraksen, dan variasi) ke dalam array
const allWordForms = computed(() => {
  if (!wordStore.expandedWordId) return [];
  const expandedWord = wordStore.words.find(
    (w: any) => w.id === wordStore.expandedWordId,
  );
  if (!expandedWord) return [];

  const forms = new Set([expandedWord.base, expandedWord.accented]);
  if (expandedWord.forms) {
    expandedWord.forms.forEach((form: any) => {
      if (form.form) forms.add(form.form);
      if (form.form_bare) forms.add(form.form_bare);
    });
  }
  return Array.from(forms).filter(Boolean) as string[]; // Hasilkan array
});

// 2. Gunakan array 'allWordForms' langsung untuk composable useSentences
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  error,
} = useSentences(allWordForms);

const shouldShowList = computed(() => {
  return true; // Always show list (handles both random and search results)
});

interface FormattedSentence {
  id: string | number;
  targetText: string;
  sourceText: string;
  hasNarrative: boolean;
  originalId?: number;
  narrativeId?: number;
  pIdx?: number;
  sIdx?: number;
}

// --- SENTENCE SPLITTING LOGIC ---
// Pattern: [P,S] where P=paragraph, S=sentence (supports CJK variants)
const INDEX_REGEX = /[[［【]\s*[\d０-９]+\s*[-.,，、]\s*[\d０-９]+\s*[\]］】]/g;

function splitBySentenceIndex(text: string): string[] {
  if (!text || typeof text !== 'string') return [text || ''];
  // Split by looking for [P,S] patterns
  // Each sentence ends before the next [P,S] marker
  const parts = text.split(/(?=[[［【]\s*[\d０-９]+\s*[-.,，、]\s*[\d０-９]+\s*[\]］】])/);
  return parts.filter(s => s && s.trim().length > 0);
}

function extractIndices(text: string): { p: number, s: number } | null {
  const match = text.match(/[[［【]\s*(\d+)[\s.,，、-]+(\d+)\s*[\]］】]/);
  if (match) {
    return { p: parseInt(match[1]), s: parseInt(match[2]) }; // 0-based implicitly if data is 0-based
  }
  return null;
}

function stripIndexMarkers(text: string): string {
  if (!text) return '';
  return text.replace(INDEX_REGEX, '').trim();
}

// 3. formattedSentences - split by [P,S] markers (API already filters has_narrative)
const formattedSentences = computed<FormattedSentence[]>(() => {
  const sourceLangCode = languageStore.selectedAsal?.kodeBahasa;
  const targetLangCode = languageStore.selectedTarget?.kodeBahasa;

  if (!data.value?.pages || !sourceLangCode || !targetLangCode) {
    return [];
  }

  return data.value.pages
    .flatMap((page: any) => page.results || [])
    .flatMap((group: any) => {
      const targetRaw = group.sentences?.[targetLangCode] || '';
      const sourceRaw = group.sentences?.[sourceLangCode] || '';

      // Split by [P,S] index markers
      const targetSents = splitBySentenceIndex(targetRaw);
      const sourceSents = splitBySentenceIndex(sourceRaw);

      // Map each sentence as separate item
      return targetSents.map((tSent: string, idx: number) => {
        const indices = extractIndices(tSent);
        return {
          id: `${group.id}_${idx}`,
          originalId: group.id,
          narrativeId: group.narrative_id,
          targetText: stripIndexMarkers(tSent),
          sourceText: stripIndexMarkers(sourceSents[idx] || ''),
          hasNarrative: group.has_narrative || false,
          pIdx: indices?.p,
          sIdx: indices?.s
        };
      });
    });
});

// 4. Buat computed property baru untuk highlighting
const searchTermForHighlighting = computed(() => {
  return allWordForms.value.join(',');
});


useIntersectionObserver(sentinelRef, ([{ isIntersecting }]) => {
  if (isIntersecting && hasNextPage.value && !isFetchingNextPage.value) {
    fetchNextPage();
  }
});

const handleActivateSentence = (sentenceId: number | string) => {
  activeSentenceId.value =
    activeSentenceId.value === sentenceId ? null : sentenceId;
};

// Watch for store updates and sync to cache
watch(
  () => sentencesStore.lastUpdatedSentenceGroup,
  (updatedGroup) => {
    if (updatedGroup) {
      updateSentenceInCache(updatedGroup);
      sentencesStore.clearLastUpdatedSentence();
    }
  },
  { deep: true },
);

watch(
  () => sentencesStore.lastDeletedSentenceId,
  (deletedId) => {
    if (deletedId) {
      removeSentenceFromCache(Number(deletedId));
      sentencesStore.clearLastDeletedSentence();
    }
  },
);

const expandedWordTerm = computed(() => {
  if (wordStore.expandedWordId) {
    const expandedWord = wordStore.words.find(
      (w) => w.id === wordStore.expandedWordId,
    );
    return (expandedWord?.accented || '').replace(/'/g, '\u0301');
  }
  return null;
});

const showNoResultsMessage = computed(() => {
  // Don't show "no results" message when viewing word details (expandedWordId is set)
  if (wordStore.expandedWordId) return false;
  return (
    !isFetching.value &&
    allWordForms.value.length > 0 &&
    formattedSentences.value.length === 0
  );
});

const listTitle = computed(() => {
  if (expandedWordTerm.value) {
    return languageStore.selectedTarget?.kodeBahasa === 'ru'
      ? `Примеры предложений для "${expandedWordTerm.value}"` // Special handling for Russian if needed, but we'll use i18n
      : t('sentence_examples_for', { word: expandedWordTerm.value });
  }
  return allWordForms.value.length > 0
    ? t('sentence_search_results')
    : t('random_sentence_examples');
});
</script>

<template>
  <div v-if="shouldShowList" class="h-full flex flex-col mt-6">
    <main v-if="formattedSentences.length > 0"
      class="relative z-10 bg-[var(--color-surface-container-high)] rounded-3xl md:pb-6 sentence-list transition-colors duration-300 flex-grow overflow-hidden">

      <div
        class="py-4 text-center text-lg text-[var(--color-on-surface-variant)] border-b border-[var(--color-outline-variant)] mb-2 px-5 md:px-6">
        <h3 v-html="listTitle"></h3>
      </div>

      <TransitionGroup tag="div" name="list-item" class="flex flex-col divide-y divide-[var(--color-outline-variant)]">
        <KalimatItem v-for="sentence in formattedSentences" :key="sentence.id" :sentence-id="sentence.id"
          :source-text="sentence.sourceText" :target-text="sentence.targetText" :search-term="searchTermForHighlighting"
          :is-active="sentence.id === activeSentenceId" :has-narrative="sentence.hasNarrative"
          @activate="handleActivateSentence(sentence.id)" @click-word="emit('search-word', $event)"
          @show-popover="emit('show-popover', $event)" @show-narrative="emit('show-narrative', {
            groupId: sentence.narrativeId || sentence.originalId || (typeof sentence.id === 'string' ? parseInt(sentence.id.split('_')[0]) : sentence.id),
            highlight: (sentence.pIdx !== undefined && sentence.sIdx !== undefined) ? { p: sentence.pIdx, s: sentence.sIdx } : null,
            highlightText: sentence.targetText
          })" @open-narasi-editor="emit('open-narasi-editor', {
            groupId: sentence.narrativeId || sentence.originalId || (typeof sentence.id === 'string' ? parseInt(sentence.id.split('_')[0]) : sentence.id),
            initialData: null,
            highlightText: sentence.targetText
          })" />
      </TransitionGroup>

      <div ref="sentinelRef" class="h-10"></div>

      <div v-if="isFetchingNextPage" class="py-8 text-center">
        <LoadingSpinner size="lg" color="primary" class="mx-auto" contained />
      </div>

    </main>

    <div v-if="isFetching && formattedSentences.length === 0" class="py-4 flex justify-center">
      <LoadingSpinner size="md" color="primary" />
    </div>


    <div v-if="showNoResultsMessage" class="py-8 text-center text-[var(--color-on-surface-variant)] italic">
      <p>
        <i18n-t keypath="no_sentences_found_for" tag="span">
          <template #word>
            <span class="font-semibold not-italic" v-html="expandedWordTerm || searchTermForHighlighting"></span>
          </template>
        </i18n-t>
      </p>
    </div>
  </div>
</template>

<style scoped>
.list-item-move,
.list-item-enter-active,
.list-item-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.list-item-enter-from,
.list-item-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.list-item-leave-active {
  position: absolute;
  width: calc(100% - 1rem);
}
</style>
