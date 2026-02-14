<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLanguageStore } from '@/stores/language';
import EditDefinisiKata from '../EditDefinisiKata.vue';
import { useMemoize } from '@vueuse/core';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  word: any; // Allow complex word object
  isAdmin?: boolean;
}>();

const emit = defineEmits<{
  (e: 'word-updated', updatedWord: any): void;
  (e: 'search-word', word: string): void;
}>();

const languageStore = useLanguageStore();
const showEditModal = ref(false);
const selectedDefinisiLang = ref('');
const expandedDefIds = ref(new Set<number | string>()); // [UPDATED] Track multiple expanded definitions

const toggleExpand = (defId: number | string) => {
  if (expandedDefIds.value.has(defId)) {
    expandedDefIds.value.delete(defId);
  } else {
    expandedDefIds.value.add(defId);
  }
};

const isExpanded = (defId: number | string) => expandedDefIds.value.has(defId);

const getRelatedTranslations = (defId: number | string) => {
  if (!props.word || !props.word.translations) return [];
  // Get translations that include this definition ID in their definition_ids array
  return props.word.translations
    .filter((t: any) => t.definition_ids && t.definition_ids.includes(defId))
    .map((t: any) => ({
      ...t,
      target_word: t.target_word || t.tl,
    }));
};

const availableLangs = computed(() => {
  const asal = languageStore.selectedAsal;
  const target = languageStore.selectedTarget;

  const langs: { code: string; name: string }[] = [];
  if (target) {
    langs.push({ code: target.kodeBahasa, name: target.nama });
  }
  if (asal && asal.kodeBahasa !== target?.kodeBahasa) {
    langs.push({ code: asal.kodeBahasa, name: asal.nama });
  }
  return langs;
});

const filteredDefinitions = computed(() => {
  if (!props.word || !props.word.definitions || !selectedDefinisiLang.value) {
    return [];
  }
  return (props.word.definitions as any[]).filter(
    (def: any) => def.language_code === selectedDefinisiLang.value,
  );
});

watch(
  () => [
    languageStore.selectedAsal,
    languageStore.selectedTarget,
    availableLangs.value,
    props.word,
  ],
  () => {
    const targetCode = languageStore.selectedTarget?.kodeBahasa;
    const asalCode = languageStore.selectedAsal?.kodeBahasa;
    const existingDefLangs =
      props.word?.definitions?.map((d: any) => d.language_code) || [];

    if (
      selectedDefinisiLang.value &&
      existingDefLangs.includes(selectedDefinisiLang.value)
    ) {
      return;
    }

    if (asalCode && existingDefLangs.includes(asalCode)) {
      selectedDefinisiLang.value = asalCode;
    } else if (targetCode && existingDefLangs.includes(targetCode)) {
      selectedDefinisiLang.value = targetCode;
    } else if (existingDefLangs.length > 0) {
      selectedDefinisiLang.value = existingDefLangs[0];
    } else if (asalCode) {
      selectedDefinisiLang.value = asalCode;
    }
  },
  { immediate: true, deep: true },
);

const handleDefinitionsSaved = (updatedWord: any) => {
  showEditModal.value = false;
  emit('word-updated', updatedWord);
};

const segmentizeText = useMemoize((text: string) => {
  if (!text) return [];
  const segmentRegex = /[\p{L}\p{M}'-]+|[^\p{L}\p{M}'-]+/gu;
  const segments: { text: string; isWord: boolean }[] = [];
  let match;
  while ((match = segmentRegex.exec(text)) !== null) {
    segments.push({ text: match[0], isWord: /[\p{L}\p{M}]/u.test(match[0]) });
  }
  return segments;
});

const handleWordClick = (segment: { text: string; isWord: boolean }) => {
  if (segment.isWord) {
    const cleanedWord = segment.text.replace(/[.,!?—:;]$/, '');
    emit('search-word', cleanedWord);
  }
};
</script>

<template>
    <div v-if="(word && word.definitions && word.definitions.length > 0) || isAdmin">
        <div class="flex justify-between items-center mb-3">
            <h3 class="text-xl font-semibold text-[var(--color-primary)]">Definition</h3>
            <div class="flex items-center gap-2">
                 <div v-if="availableLangs.length > 1" class="flex items-center">
                    <div class="inline-flex rounded-full border border-[var(--color-outline-variant)] overflow-hidden">
                        <button 
                            v-for="(lang, index) in availableLangs" 
                            :key="lang.code"
                            @click="selectedDefinisiLang = lang.code"
                            :class="[
                                'w-12 py-1 text-sm font-semibold transition-colors tracking-wider text-center',
                                index < availableLangs.length - 1 ? 'border-r border-[var(--color-outline-variant)]' : '',
                                selectedDefinisiLang === lang.code 
                                    ? 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]'
                                    : 'bg-transparent text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]'
                            ]"
                            :title="`Lihat definisi dalam ${lang.name}`"
                        >
                            {{ lang.code.toUpperCase() }}
                        </button>
                    </div>
                </div>
                <button v-if="isAdmin" @click="showEditModal = true" class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-outline)] hover:text-[var(--color-secondary)] active:bg-[var(--color-secondary)] active:text-[var(--color-on-secondary)] transition-colors" title="Edit Definisi">
                    <span class="material-symbols-outlined text-base">edit</span>
                </button>
            </div>
        </div>
        
        <Transition
            enter-active-class="transition-opacity duration-300 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-200 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
        >
            <div :key="selectedDefinisiLang">
                <div v-if="filteredDefinitions.length > 0" class="space-y-4">
                    <div v-for="(def, index) in filteredDefinitions" :key="def.id || index" 
                        class="relative p-4 bg-[var(--color-surface-variant)] rounded-xl transition-all duration-200"
                        :class="{ 'bg-[var(--color-surface-container-high)]': isExpanded(def.id) }"
                    >
                        <div class="flex items-start gap-3">
                            <span class="font-bold text-[var(--color-primary)] select-none shrink-0">
                                {{ index + 1 }}.
                            </span>

                            <div class="flex-grow min-w-0">
                                <p class="font-semibold text-[var(--color-on-background)] leading-relaxed">
                                    <span v-if="def.domain" class="text-[var(--color-secondary)] font-bold tracking-wide mr-2 select-none">
                                        [{{ $t('domainsFull.' + def.domain, def.domain) }}]
                                    </span>
                                    <template v-for="(seg, idx) in segmentizeText(def.definition_text)" :key="idx">
                                        <span v-if="seg.isWord" @click="handleWordClick(seg)" class="cursor-pointer hover:text-[var(--color-secondary)]">{{ seg.text }}</span>
                                        <span v-else>{{ seg.text }}</span>
                                    </template>
                                </p>
                                
                                <div 
                                    v-if="def.source_example_text || def.target_example_text" 
                                    class="mt-3 pt-1 border-l-2 border-[var(--color-outline-variant)] pl-3 space-y-1"
                                >
                                    <p v-if="def.source_example_text" class="text-sm text-[var(--color-on-surface-variant)] italic leading-relaxed">
                                        <template v-for="(seg, idx) in segmentizeText(def.source_example_text)" :key="idx">
                                            <span v-if="seg.isWord" @click="handleWordClick(seg)" class="cursor-pointer hover:text-[var(--color-secondary)]">{{ seg.text }}</span>
                                            <span v-else>{{ seg.text }}</span>
                                        </template>
                                    </p>
                                    
                                    <p v-if="def.target_example_text && def.language_code !== word.language_code" class="text-sm text-[var(--color-on-surface-variant)] italic leading-relaxed">
                                        <span class="material-symbols-outlined mr-1 opacity-60 select-none text-[1.1em] align-text-bottom">subdirectory_arrow_right</span>
                                        <template v-for="(seg, idx) in segmentizeText(def.target_example_text)" :key="idx">
                                            <span v-if="seg.isWord" @click="handleWordClick(seg)" class="cursor-pointer hover:text-[var(--color-secondary)]">{{ seg.text }}</span>
                                            <span v-else>{{ seg.text }}</span>
                                        </template>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Expand Button - Only show if related translations exist -->
                        <button 
                            v-if="getRelatedTranslations(def.id).length > 0"
                            @click.stop="toggleExpand(def.id)" 
                            class="flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-fixed-dim)] transition-colors py-1 px-3 rounded-full bg-[var(--color-surface-container-high)] shadow-sm mt-3 ml-7"
                        >
                            {{ isExpanded(def.id) ? 'Sembunyikan Terjemahan' : 'Tampilkan Terjemahan' }}
                            <span class="material-symbols-outlined !text-base transition-transform duration-200" :class="{ 'rotate-180': isExpanded(def.id) }">expand_more</span>
                        </button>

                        <!-- Expandable Related Translations Section -->
                        <Transition name="fade-down">
                            <div v-if="isExpanded(def.id)" class="mt-2 ml-7 p-3 rounded-xl bg-[var(--color-surface-container-high)] text-sm text-[var(--color-on-surface-variant)]">
                                <div v-if="getRelatedTranslations(def.id).length > 0" class="flex flex-wrap gap-2">
                                    <span v-for="trans in getRelatedTranslations(def.id)" :key="trans.id" 
                                        class="px-3 py-1 bg-[var(--color-surface-container)] rounded-full text-sm font-medium text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]">
                                        {{ trans.target_word }}
                                    </span>
                                </div>
                                <div v-else class="text-xs italic">
                                    Tidak ada terjemahan yang tertaut langsung dengan definisi ini.
                                </div>
                            </div>
                        </Transition>
                    </div>
                </div>
                
                <div v-else-if="!isAdmin" class="text-center py-4 text-[var(--color-on-surface-variant)] italic">
                    Belum ada definisi untuk bahasa ini.
                </div>
                <div v-else-if="isAdmin && filteredDefinitions.length === 0" class="text-center py-4 text-[var(--color-on-surface-variant)] italic">
                    Belum ada definisi untuk bahasa ini. Klik edit untuk menambahkan.
                </div>
            </div>
        </Transition>

        <EditDefinisiKata 
            :word="word" 
            v-model="showEditModal" 
            @definitions-saved="handleDefinitionsSaved"
            @close="showEditModal = false"
        />
    </div>
</template>

<style scoped>
.fade-down-enter-active, .fade-down-leave-active { 
    transition: all 0.3s ease-out; 
    max-height: 200px; 
}
.fade-down-enter-from, .fade-down-leave-to { 
    opacity: 0; 
    max-height: 0; 
    transform: translateY(-10px); 
}
</style>
