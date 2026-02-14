<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, nextTick } from 'vue';
import { cloneDeep } from 'lodash-es';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';

interface Translation {
  id?: number | string;
  target_word: string;
  is_verified?: boolean;
  [key: string]: any;
}

interface WordItem {
  id: number;
  base: string;
  accented: string;
  part_of_speech: string;
  type?: string;
  level?: string;
  rank?: number;
  translations: Translation[];
  [key: string]: any;
}

interface Option {
  value: string;
  label: string;
}

const props = defineProps<{
  item: WordItem;
  editingWordId?: number | null;
  expandedWordId?: number | null;
  isAiModeActive?: boolean;
  // Props for translation helpers
  allLanguages: any[];
  groupTranslationsByLang: (translations: Translation[]) => any[];
  groupTranslationsByLangFull: (translations: Translation[]) => Record<string, Translation[]>;
  getLanguageName: (code: string) => string;
  getFlagSvg: (code: string) => string;
  partOfSpeechOptions: Option[];
  getPartOfSpeechLabel: (value: string) => string;
}>();

const emit = defineEmits<{
  (e: 'toggle-expand', id: number): void;
  (e: 'start-edit', item: WordItem): void;
  (e: 'save-edit', item: WordItem, editingWord: Partial<WordItem>, originalWord: WordItem | null): void;
  (e: 'cancel-edit'): void;
  (e: 'remove', id: number): void;
  (e: 'show-translations-modal', editingWord: Partial<WordItem>): void;
  (e: 'update:height', payload: { id: number; height: number }): void;
}>();

const rowRef = ref<HTMLElement | null>(null);
const currentHeight = ref(0);

// Local editing state
const editingWord = reactive<Partial<WordItem>>({});
const originalWord = ref<WordItem | null>(null);

watch(
  () => props.item,
  (newItem) => {
    if (props.editingWordId === newItem.id) {
      originalWord.value = cloneDeep(newItem);
      Object.assign(editingWord, cloneDeep(newItem));
    }
  },
  { immediate: true, deep: true },
);

watch([() => props.expandedWordId, () => props.editingWordId], async () => {
  await nextTick();
  updateHeight();
});

onMounted(() => {
  updateHeight();
});

const updateHeight = () => {
  if (rowRef.value) {
    const newHeight = rowRef.value.offsetHeight;
    if (newHeight !== currentHeight.value) {
      currentHeight.value = newHeight;
      emit('update:height', { id: props.item.id, height: newHeight });
    }
  }
};

const isEditingThisRow = computed(() => props.editingWordId === props.item.id);
const isExpandedThisRow = computed(
  () => props.expandedWordId === props.item.id,
);

const handleSaveEdit = () => {
  emit('save-edit', props.item, editingWord, originalWord.value);
};
</script>

<template>
  <tr
    ref="rowRef"
    @click="emit('toggle-expand', item.id)"
    class="cursor-pointer last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
    :class="{'bg-pink-50 dark:bg-pink-900/20': isEditingThisRow || isExpandedThisRow}"
  >
    <td class="p-4 font-mono text-sm align-top text-neutral-500">{{ item.id }}</td>
    
    <td v-if="isEditingThisRow" class="p-2 text-sm align-top">
      <input type="text" v-model="editingWord.base" placeholder="Base Form..." class="w-full bg-white dark:bg-neutral-700 rounded-lg p-2 text-sm text-neutral-800 dark:text-neutral-200" required>
    </td>
    <td v-else class="p-4 text-sm align-top font-medium">{{ item.base }}</td>

    <td v-if="isEditingThisRow" class="p-2 text-sm align-top">
      <input type="text" v-model="editingWord.accented" placeholder="Accented Form..." class="w-full bg-white dark:bg-neutral-700 rounded-lg p-2 text-sm text-neutral-800 dark:text-neutral-200">
    </td>
    <td v-else class="p-4 text-sm align-top">{{ item.accented }}</td>

    <td v-if="isEditingThisRow" class="p-2 text-sm align-top">
        <Listbox v-model="editingWord.part_of_speech" as="div" class="relative w-full">
          <ListboxButton class="relative w-full cursor-default rounded-lg bg-white dark:bg-neutral-700 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-pink-300 sm:text-sm text-neutral-800 dark:text-neutral-200">
            <span class="block truncate capitalize">
              {{ getPartOfSpeechLabel(editingWord.part_of_speech) }}
            </span>
            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <span class="material-symbols-outlined text-neutral-400 dark:text-neutral-300">expand_more</span>
            </span>
          </ListboxButton>

          <transition
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100"
            leave-to="opacity-0"
          >
            <ListboxOptions class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-neutral-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              <ListboxOption
                v-for="option in props.partOfSpeechOptions"
                v-slot="{ active, selected }"
                :key="option.value"
                :value="option.value"
                as="template"
              >
                <li
                  :class="[
                    active ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100' : 'text-neutral-900 dark:text-neutral-100',
                    'relative cursor-default select-none py-2 pl-10 pr-4',
                  ]"
                >
                  <span
                    :class="[
                      selected ? 'font-medium' : 'font-normal',
                      'block truncate capitalize',
                    ]"
                    >{{ option.label }}</span
                  >
                  <span
                    v-if="selected"
                    class="absolute inset-y-0 left-0 flex items-center pl-3 text-pink-600 dark:text-pink-400"
                  >
                    <span class="material-symbols-outlined text-base">done</span>
                  </span>
                </li>
              </ListboxOption>
            </ListboxOptions>
          </transition>
        </Listbox>
    </td>
    <td v-else class="p-4 text-sm align-top uppercase">{{ item.type || '-' }}</td>

    <td v-if="isEditingThisRow" class="p-2 text-sm align-top">
      <input type="text" v-model="editingWord.level" placeholder="Level..." class="w-full bg-white dark:bg-neutral-700 rounded-lg p-2 text-sm text-neutral-800 dark:text-neutral-200">
    </td>
    <td v-else class="p-4 text-sm align-top">{{ item.level || '-' }}</td>

    <td v-if="isEditingThisRow" class="p-2 text-sm align-top">
      <input type="number" v-model.number="editingWord.rank" placeholder="Rank..." class="w-full bg-white dark:bg-neutral-700 rounded-lg p-2 text-sm text-neutral-800 dark:text-neutral-200">
    </td>
    <td v-else class="p-4 text-sm align-top">{{ item.rank || '-' }}</td>

    <td class="p-4 text-sm align-top">
      <template v-if="isEditingThisRow">
        <button
          @click.stop="emit('show-translations-modal', editingWord)"
          class="flex items-center gap-2 text-sm bg-pink-500 text-white font-medium py-1 px-3 rounded-full hover:bg-pink-600 transition-colors"
        >
          <span class="material-symbols-outlined text-base">translate</span>
          <span>Edit Terjemahan</span>
        </button>
      </template>
      <template v-else>
        <template v-if="!isExpandedThisRow">
          <div v-if="item.translations && item.translations.length > 0" class="flex flex-wrap gap-2">
            <div
              v-for="({ count, code }) in props.groupTranslationsByLang(item.translations)"
              :key="code"
              class="inline-flex items-center px-2 py-1 text-xs font-medium bg-neutral-200 dark:bg-neutral-600 rounded-full text-neutral-800 dark:text-neutral-200 shadow-sm"
            >
              <span class="w-4 h-4 mr-1 flex-shrink-0" v-html="props.getFlagSvg(code)"></span>
              <span class="uppercase">{{ code }}: {{ count }}</span>
            </div>
          </div>
          <span v-else class="text-xs text-neutral-400 italic">(kosong)</span>
        </template>
      </template>
    </td>
    <td class="p-4 text-right align-top">
      <div class="flex items-center justify-end gap-2">
          <template v-if="isEditingThisRow">
              <button @click.stop="handleSaveEdit" class="flex items-center justify-center w-8 h-8 rounded-full text-neutral-700 dark:text-neutral-200 hover:text-pink-500 dark:hover:text-pink-400 transition-colors" title="Simpan">
                  <span class="material-symbols-outlined text-base">save</span>
              </button>
              <button @click.stop="emit('cancel-edit')" class="flex items-center justify-center w-8 h-8 rounded-full text-neutral-700 dark:text-neutral-200 hover:text-pink-500 dark:hover:text-pink-400 transition-colors" title="Batal">
                  <span class="material-symbols-outlined text-base">close</span>
              </button>
          </template>
          <template v-else>
              <button @click.stop="emit('start-edit', item)" :disabled="isAiModeActive" class="flex items-center justify-center w-8 h-8 rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-pink-100 hover:text-pink-600 dark:hover:bg-pink-900/40 dark:hover:text-pink-400 transition-colors disabled:opacity-50" title="Edit">
                  <span class="material-symbols-outlined text-base">edit</span>
              </button>
              <button @click.stop="emit('remove', item.id)" :disabled="isAiModeActive" class="flex items-center justify-center w-8 h-8 rounded-full text-neutral-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400 transition-colors disabled:opacity-50" title="Hapus">
                  <span class="material-symbols-outlined text-base">delete</span>
              </button>
          </template>
      </div>
    </td>
  </tr>
  <tr v-if="isExpandedThisRow && !isEditingThisRow">
    <td colspan="8" class="p-0">
      <div class="p-4" :class="{'bg-pink-50 dark:bg-pink-900/20': isExpandedThisRow}">
        <div v-if="item.translations && item.translations.length > 0" class="flex flex-wrap gap-4">
          <div
            v-for="([code, translations]) in Object.entries(props.groupTranslationsByLangFull(item.translations))"
            :key="code"
            class="inline-flex flex-col p-3 rounded-xl bg-neutral-100 dark:bg-neutral-700 shadow-inner"
          >
            <div class="flex items-center font-semibold text-neutral-700 dark:text-neutral-200 mb-2">
              <span class="w-5 h-5 mr-2 flex-shrink-0" v-html="props.getFlagSvg(code)"></span>
              {{ props.getLanguageName(code) }} ({{ translations.length }})
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="t in translations"
                :key="t.id || t.target_word"
                class="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-pink-200 dark:bg-pink-700 text-pink-800 dark:text-pink-100 shadow-sm"
                :title="t.is_verified ? 'Terverifikasi' : 'Belum Diverifikasi'"
              >
                {{ t.target_word }}
                <span v-if="t.is_verified" class="material-symbols-outlined text-xs align-middle -mt-0.5 ml-0.5 text-green-600 dark:text-green-400">check_circle</span>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-center text-neutral-400 italic py-2">Tidak ada detail terjemahan.</div>
      </div>
    </td>
  </tr>
</template>
