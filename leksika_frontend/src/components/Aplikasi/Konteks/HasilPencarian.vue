<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue';
import { useIntersectionObserver } from '@vueuse/core';
import DetailKata from './DetailKata.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import KalimatItem from './KalimatItem.vue';

const props = withDefaults(defineProps<{
    words: any[];
    sentences?: any[];
    narratives?: any[];
    loading?: boolean;
    error?: string | null;
    searchQuery?: string;
    expandedWordId?: number | string | null;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
}>(), {
    sentences: () => [],
    narratives: () => [],
    loading: false,
    error: null,
    searchQuery: '',
    expandedWordId: null,
    hasNextPage: false,
    isFetchingNextPage: false,
});

const emit = defineEmits<{
    (e: 'search-word', word: string): void;
    (e: 'toggle-expand', wordId: number | string): void;
    (e: 'show-narrative', payload: { groupId: number | string; highlight?: { p: number; s: number } | null; highlightText?: string }): void;
    (e: 'load-more-sentences'): void;
    (e: 'show-popover', payload: any): void;
    (e: 'open-narasi-editor', payload: { groupId: number | string; initialData: any; highlightText?: string }): void;
}>();

const activeTab = ref(0);
const activeSentenceId = ref<number | string | null>(null);

const handleShowNarrative = (sentence: any) => {
    emit('show-narrative', {
        groupId: sentence.narrativeId || sentence.id,
        highlightText: sentence.targetText
    });
};

const handleOpenNarasiEditor = (sentence: any) => {
    emit('open-narasi-editor', {
        groupId: sentence.narrativeId || sentence.id,
        initialData: null,
        highlightText: sentence.targetText
    });
};
const loadMoreTrigger = ref<HTMLElement | null>(null);

useIntersectionObserver(
    loadMoreTrigger,
    ([{ isIntersecting }]) => {
        if (isIntersecting && props.hasNextPage && !props.isFetchingNextPage) {
            emit('load-more-sentences');
        }
    },
);

const handleActivateSentence = (id: number | string) => {
    activeSentenceId.value = activeSentenceId.value === id ? null : id;
};

// Auto-switch tab if only one category has results (optional UX enhancement)
/*
watch(() => [props.words.length, props.sentences.length, props.narratives.length], ([w, s, n]) => {
  if (w > 0 && s === 0 && n === 0) activeTab.value = 0;
  else if (w === 0 && s > 0 && n === 0) activeTab.value = 1;
  else if (w === 0 && s === 0 && n > 0) activeTab.value = 2;
});
*/

const showNoResultsMessage = computed(() => {
    if (props.loading || props.error) return false;
    // Check active tab content
    if (activeTab.value === 0) return props.words.length === 0;
    if (activeTab.value === 1) return (props.sentences?.length || 0) === 0;
    if (activeTab.value === 2) return (props.narratives?.length || 0) === 0;
    return false;
});

const handleWordClick = (word: string) => emit('search-word', word);
const handleToggleExpand = (wordId: number | string) => emit('toggle-expand', wordId);
const handleNarrativeClick = (narrative: any) => emit('show-narrative', narrative.id);

// --- Style Helpers for Tabs (Matching ManajemenNarasi) ---
const tabClasses = (selected: boolean) => {
    return [
        'w-full py-2.5 text-sm font-medium leading-5 rounded-lg',
        'focus:outline-none focus:ring-0 transition-colors duration-200', // Removed ring
        selected
            ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] shadow'
            : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]'
    ].join(' ');
};
</script>

<template>
    <div class="hasil-pencarian-container mb-8 min-h-[20rem]">
        <div v-if="loading" class="py-4 flex justify-center">
            <LoadingSpinner size="md" color="primary" />
        </div>


        <div v-if="error"
            class="py-12 text-center text-[var(--color-error)] bg-[var(--color-error-container)] rounded-2xl">
            <p class="font-semibold">{{ $t('error_occurred') }}</p>
            <p class="text-sm mt-1">{{ error }}</p>
        </div>

        <div v-else>
            <TabGroup :selectedIndex="activeTab" @change="activeTab = $event">
                <TabList class="flex space-x-2 rounded-xl bg-[var(--color-surface-container)] p-1 mb-6">
                    <Tab as="template" v-slot="{ selected }">
                        <button :class="tabClasses(selected)">
                            {{ $t('type_word') }} ({{ words.length }})
                        </button>
                    </Tab>
                    <Tab as="template" v-slot="{ selected }">
                        <button :class="tabClasses(selected)">
                            {{ $t('type_sentence') }} ({{ sentences.length }})
                        </button>
                    </Tab>
                    <Tab as="template" v-slot="{ selected }">
                        <button :class="tabClasses(selected)">
                            {{ $t('type_narasi') }} ({{ narratives.length }})
                        </button>
                    </Tab>
                </TabList>

                <TabPanels>
                    <!-- TAB 1: KATA -->
                    <TabPanel class="focus:outline-none ring-0">
                        <div v-if="words.length > 0" class="space-y-4">
                            <div v-for="word in words" :key="word.id"
                                class="bg-[var(--color-surface-container-high)] rounded-3xl transition-all duration-300 relative overflow-hidden">
                                <DetailKata :word-id="word.id" :compact="expandedWordId !== word.id"
                                    @search-word="handleWordClick" @toggle-expand="handleToggleExpand(word.id)" />
                            </div>
                        </div>
                        <div v-else
                            class="py-12 text-center text-[var(--color-on-surface-variant)] italic bg-[var(--color-surface-container-high)] rounded-2xl">
                            <p>
                                <i18n-t keypath="no_data_found" tag="span" />
                                <span v-if="searchQuery" class="font-semibold not-italic"> "{{ searchQuery }}"</span>
                            </p>
                        </div>
                    </TabPanel>

                    <!-- TAB 2: KALIMAT -->
                    <TabPanel class="focus:outline-none ring-0">
                        <div v-if="sentences.length > 0"
                            class="flex flex-col divide-y divide-[var(--color-outline-variant)] bg-[var(--color-surface-container-high)] rounded-3xl">
                            <KalimatItem v-for="sentence in sentences" :key="sentence.id" :sentence-id="sentence.id"
                                :source-text="sentence.sourceText" :target-text="sentence.targetText"
                                :search-term="searchQuery" :is-active="activeSentenceId === sentence.id"
                                :has-narrative="sentence.hasNarrative" @click-word="handleWordClick"
                                @activate="handleActivateSentence" @show-popover="$emit('show-popover', $event)"
                                @open-narasi-editor="handleOpenNarasiEditor(sentence)"
                                @show-narrative="handleShowNarrative(sentence)" />

                            <!-- Trigger for Infinite Scroll -->
                            <div ref="loadMoreTrigger" class="py-4 flex justify-center w-full" v-if="hasNextPage">
                                <LoadingSpinner v-if="isFetchingNextPage" size="sm" color="primary" />
                                <div v-else class="h-4 w-full"></div>
                            </div>
                        </div>
                        <div v-else
                            class="py-12 text-center text-[var(--color-on-surface-variant)] italic bg-[var(--color-surface-container-high)] rounded-2xl">
                            <p>
                                <i18n-t keypath="no_data_found" tag="span" />
                                <span v-if="searchQuery" class="font-semibold not-italic"> "{{ searchQuery }}"</span>
                            </p>
                        </div>
                    </TabPanel>

                    <!-- TAB 3: NARASI -->
                    <TabPanel class="focus:outline-none ring-0">
                        <div v-if="narratives.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div v-for="narrative in narratives" :key="narrative.id"
                                @click="handleNarrativeClick(narrative)"
                                class="bg-[var(--color-surface-container-high)] rounded-2xl p-4 cursor-pointer hover:bg-[var(--color-surface-container-highest)] transition-colors flex gap-4 items-start">
                                <div
                                    class="w-16 h-16 rounded-lg bg-[var(--color-surface-container)] flex-shrink-0 overflow-hidden">
                                    <img v-if="narrative.image_url" :src="narrative.image_url"
                                        class="w-full h-full object-cover">
                                    <div v-else
                                        class="w-full h-full flex items-center justify-center text-[var(--color-on-surface-variant)]">
                                        <span class="material-symbols-outlined">image</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-[var(--color-on-surface)] line-clamp-2">{{
                                        narrative.title }}</h4>
                                    <!-- <p class="text-sm text-[var(--color-on-surface-variant)] mt-1 line-clamp-2">{{ narrative.snippet }}</p> -->
                                    <span
                                        class="inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-0.5 rounded bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
                                        {{ narrative.lang_code.toUpperCase() }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div v-else
                            class="py-12 text-center text-[var(--color-on-surface-variant)] italic bg-[var(--color-surface-container-high)] rounded-2xl">
                            <p>
                                <i18n-t keypath="no_data_found" tag="span" />
                                <span v-if="searchQuery" class="font-semibold not-italic"> "{{ searchQuery }}"</span>
                            </p>
                        </div>
                    </TabPanel>
                </TabPanels>
            </TabGroup>
        </div>
    </div>
</template>
