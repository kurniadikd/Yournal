<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useUIStore } from '@/stores/ui';
import { useListsStore } from '@/stores/lists';
import { useAuthStore } from '@/stores/auth';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import { useI18n } from 'vue-i18n';
// @ts-ignore
import CyrillicToTranslit from 'cyrillic-to-translit-js'; // [NEW] Import library

const props = withDefaults(defineProps<{
  word: any; // Allow any for now, refine later if possible
  posOptions?: any[];
  loadingPosOptions?: boolean;
  savingPos?: boolean;
  isSpeaking?: boolean;
}>(), {
  posOptions: () => [],
  loadingPosOptions: false,
  savingPos: false,
  isSpeaking: false,
});

const emit = defineEmits<{
  (e: 'edit-word'): void;
  (e: 'report-word'): void;
  (e: 'save-word'): void;
  (e: 'copy-word'): void;
  (e: 'speak-word'): void;
  (e: 'fetch-pos-options'): void;
  (e: 'update-pos', value: string): void;
}>();

const uiStore = useUIStore();
const listsStore = useListsStore();
const authStore = useAuthStore();
const { t } = useI18n();
const cyrillicToTranslit = new (CyrillicToTranslit as any)();

// --- LOGIKA BARU: FILTER BADGE ---
const grammarAttributes = computed(() => {
  if (!props.word?.grammar_attributes) return [];

  // Daftar atribut yang TIDAK ingin ditampilkan di header
  const hiddenAttributes = [
    'Partner Word', // Internal logic aplikasi
    'Case', // Kasus (Nominative, Genitive, Dative, dll)
    'Number', // Jumlah (Singular, Plural)
    'Person', // Orang (1st, 2nd, 3rd person)
  ];

  return props.word.grammar_attributes
    .filter((attr: any) => {
      const featureName = attr.feature_value?.feature_name;
      // Hanya loloskan jika nama fiturnya TIDAK ada dalam daftar hiddenAttributes
      return featureName && !hiddenAttributes.includes(featureName);
    })
    .map((attr: any) => ({
      name: attr.feature_value.feature_name,
      value: attr.feature_value.value,
    }));
});

// Fungsi untuk menentukan warna badge berdasarkan jenis atributnya
const getBadgeClass = (featureName: string) => {
  const name = featureName.toLowerCase();

  // Kategori Utama (Gender, Animacy, Aspect) -> Primary Color
  if (['gender', 'animacy', 'aspect', 'transitivity'].includes(name)) {
    return 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]';
  }

  // Kategori Sekunder (Motion, Mood, Tense, Voice) -> Secondary Color
  if (['motion', 'mood', 'tense', 'voice'].includes(name)) {
    return 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]';
  }

  // Default -> Surface Variant (Abu-abu/Netral)
  return 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]';
};
// --- END LOGIKA BARU ---

const formatAccent = (rawText?: string) => {
  if (!rawText) return '—';
  return rawText.replace(/'/g, '́');
};

const formattedAccentedWord = computed(() =>
  formatAccent(props.word?.accented),
);
const transliteratedWord = computed(() => {
  const baseWord = props.word?.base;
  if (!baseWord) return '';
  return cyrillicToTranslit.transform(baseWord);
});

const posLabelClass = computed(() => {
  const pos = props.word?.pos;
  const baseClass =
    'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]';
  if (pos) {
    return baseClass;
  }
  return '';
});

const speakWord = () => {
  emit('speak-word');
};

const copyWord = () => {
  emit('copy-word');
};

const isAdminUser = computed(() => authStore.isAdmin);
</script>

<template>
  <div class="border-b pb-4 border-[var(--color-outline-variant)]">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-4xl font-bold text-[var(--color-on-background)] break-words">{{ formattedAccentedWord }}</h2>
        <button @click="speakWord" :disabled="isSpeaking" title="Ucapkan"
          class="text-[var(--color-outline)] hover:text-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed">
          <span class="material-symbols-outlined text-3xl" :class="{ 'animate-spin': isSpeaking }">
            {{ isSpeaking ? 'sync' : 'volume_up' }}
          </span>
        </button>
      </div>


    </div>

    <p class="text-lg text-[var(--color-on-surface-variant)] italic">{{ transliteratedWord }}</p>

    <div class="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <!-- Admin: POS Dropdown -->
      <Menu v-if="isAdminUser && word.pos" as="div" class="relative" @mouseenter="$emit('fetch-pos-options')">
        <MenuButton
          class="px-2.5 py-1 rounded-full font-semibold capitalize flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-[var(--color-primary)] transition-all"
          :class="[posLabelClass, savingPos ? 'opacity-50' : '']">
          {{ word.pos ? $t('pos_' + word.pos.toLowerCase()) : '' }}
          <span class="material-symbols-outlined !text-sm">expand_more</span>
        </MenuButton>
        <Transition enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0">
          <MenuItems
            class="absolute left-0 mt-2 w-40 max-h-64 overflow-y-auto origin-top-left rounded-xl bg-[var(--color-surface-container-high)] shadow-lg ring-1 ring-black/5 focus:outline-none z-30">
            <div class="py-1">
              <MenuItem v-for="pos in posOptions" :key="pos.value" v-slot="{ active }">
              <button @click="$emit('update-pos', pos.value)" :class="[
                active ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]' : 'text-[var(--color-on-surface)]',
                word.pos === pos.value ? 'font-bold bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]' : '',
                'group flex w-full items-center px-3 py-2 text-sm capitalize transition-colors'
              ]">
                {{ pos.display }}
                <span v-if="word.pos === pos.value"
                  class="material-symbols-outlined ml-auto !text-base text-[var(--color-primary)]">check</span>
              </button>
              </MenuItem>
              <div v-if="loadingPosOptions" class="px-3 py-2 text-sm text-[var(--color-on-surface-variant)]">
                Loading...
              </div>
            </div>
          </MenuItems>
        </Transition>
      </Menu>
      <!-- Non-Admin: Static POS Label -->
      <span v-else-if="word.pos" class="px-2.5 py-1 rounded-full font-semibold capitalize" :class="posLabelClass">
        {{ $t('pos_' + word.pos.toLowerCase()) }}
      </span>

      <span v-for="(attr, index) in grammarAttributes" :key="index"
        class="px-2.5 py-1 rounded-full font-semibold capitalize" :class="getBadgeClass(attr.name)" :title="attr.name">
        {{ attr.value }}
      </span>

      <span v-if="word.level"
        class="px-2.5 py-1 bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] rounded-full font-semibold">
        {{ word.level }}
      </span>

      <span v-if="word.rank"
        class="px-2.5 py-1 bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] rounded-full font-semibold">
        #{{ word.rank }}
      </span>
    </div>
  </div>
</template>
