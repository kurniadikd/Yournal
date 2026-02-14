<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMemoize } from '@vueuse/core';

const props = defineProps<{
  translations: any[];
  isAdmin?: boolean;
  definitions?: any[];
}>();

const emit = defineEmits<{
  (e: 'search-word', word: string): void;
  (e: 'open-edit-modal'): void;
}>();

// State untuk mengontrol mode tampilan: 'detail' atau 'ringkas'
const mode = ref<'detail' | 'ringkas'>('ringkas');

const toggleIcon = computed(() =>
  mode.value === 'detail' ? 'apps' : 'view_list',
);
const toggleTitle = computed(() =>
  mode.value === 'detail' ? 'Ubah ke mode ringkas' : 'Ubah ke mode detail',
);

const toggleMode = () => {
  mode.value = mode.value === 'detail' ? 'ringkas' : 'detail';
};

// [REFAKTOR] Normalisasi data agar nama variabel sesuai backend
// Kecuali 'notes' yang di-map menjadi 'info' sesuai permintaan
const normalizedTranslations = computed(() => {
  return props.translations.map((t) => ({
    ...t,
    // Gunakan key dari backend (target_word), fallback ke 'tl' jika data lama
    target_word: t.target_word || t.tl,
    // Map 'notes' (backend) ke 'info' (frontend) agar tooltip tampil
    info: t.notes || t.info,
    // Gunakan 'source_example' (backend)
    source_example: t.source_example || t.example_ru,
    // Gunakan 'target_example' (backend)
    target_example: t.target_example || t.example_tl,
  }));
});

const segmentizeText = useMemoize((text: string) => {
  if (!text) return [];
  // Regex untuk memisahkan kata dan tanda baca
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
const getDefinitionIndices = (trans: any) => {
  if (
    !trans.definition_ids ||
    !trans.definition_ids.length ||
    !props.definitions?.length
  )
    return '';

  // [UPDATED] Filter definitions by language strictly to match EditTerjemahanKata logic
  const langDefs = props.definitions.filter(
    (d: any) => d.language_code === trans.language_code,
  );

  // Map definition IDs to 1-based indices in the FILTERED definitions array
  const indices = trans.definition_ids
    .map((id: any) => langDefs.findIndex((d: any) => d.id === id) + 1)
    .filter((idx: number) => idx > 0)
    .sort((a: number, b: number) => a - b);

  return indices.length > 0 ? `Def ${indices.join(', ')}` : '';
};
</script>

<template>
    <div v-if="normalizedTranslations.length > 0 || isAdmin">
        <div class="flex justify-between items-center mb-3">
            <h3 class="text-xl font-semibold text-[var(--color-primary)]">Translations</h3>
            <div class="flex items-center gap-1">
                <button @click="toggleMode" class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-outline)] hover:text-[var(--color-primary)] active:bg-[var(--color-primary)] active:text-[var(--color-on-primary)] transition-colors" :title="toggleTitle">
                    <span class="material-symbols-outlined text-base">{{ toggleIcon }}</span>
                </button>
                <button v-if="isAdmin" @click="emit('open-edit-modal')" class="flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-outline)] hover:text-[var(--color-primary)] active:bg-[var(--color-primary)] active:text-[var(--color-on-primary)] transition-colors" title="Edit Terjemahan">
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
            <div :key="mode">
                <div v-if="mode === 'detail'" class="space-y-4">
                    <div v-if="normalizedTranslations.length === 0" class="text-center py-4 text-[var(--color-on-surface-variant)] italic">
                        Belum ada terjemahan untuk bahasa ini. Klik edit untuk menambahkan.
                    </div>
                    <div v-for="(trans, index) in normalizedTranslations" :key="index" class="p-4 bg-[var(--color-surface-variant)] rounded-xl">
                        <p class="font-semibold text-[var(--color-on-background)] leading-relaxed">
                            <template v-for="(seg, idx) in segmentizeText(trans.target_word)" :key="idx">
                                <span v-if="seg.isWord" @click="handleWordClick(seg)" class="cursor-pointer hover:text-[var(--color-primary)]">{{ seg.text }}</span>
                                <span v-else>{{ seg.text }}</span>
                            </template>
                        </p>

                         <!-- [NEW] Definition Source Label -->
                        <div v-if="getDefinitionIndices(trans)" class="mt-1">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]">
                                {{ getDefinitionIndices(trans) }}
                            </span>
                        </div>
                        
                        <div v-if="trans.info" class="mt-2 flex items-start gap-2">
                            <span class="material-symbols-outlined text-[var(--color-on-surface-variant)] !text-base flex-shrink-0" title="Ada info tambahan">info</span>
                            <p class="text-sm text-[var(--color-on-surface-variant)] italic leading-relaxed">
                                <template v-for="(seg, idx) in segmentizeText(trans.info)" :key="idx">
                                    <span v-if="seg.isWord" @click="handleWordClick(seg)" class="cursor-pointer hover:text-[var(--color-primary)]">{{ seg.text }}</span>
                                    <span v-else>{{ seg.text }}</span>
                                </template>
                            </p>
                        </div>
                        
                        <p v-if="trans.source_example" class="text-sm text-[var(--color-on-surface-variant)] mt-2">
                            <strong>Contoh (Ru):</strong>
                            <br>
                            <template v-for="(seg, idx) in segmentizeText(trans.source_example)" :key="idx">
                                <span v-if="seg.isWord" @click="handleWordClick(seg)" class="cursor-pointer hover:text-[var(--color-primary)]">{{ seg.text }}</span>
                                <span v-else>{{ seg.text }}</span>
                            </template>
                        </p>
                        
                        <p v-if="trans.target_example" class="text-sm text-[var(--color-on-surface-variant)] mt-1">
                            <strong>Contoh (En/Id):</strong>
                            <br>
                            {{ trans.target_example }}
                        </p>
                    </div>
                </div>

                <div v-else-if="mode === 'ringkas'" class="flex flex-wrap gap-2">
                     <div v-if="normalizedTranslations.length === 0" class="w-full text-center py-4 text-[var(--color-on-surface-variant)] italic">
                        Belum ada terjemahan untuk bahasa ini. Klik edit untuk menambahkan.
                    </div>
                    <div 
                        v-for="(trans, index) in normalizedTranslations" 
                        :key="index"
                        @click="mode = 'detail'"
                        title="Lihat detail"
                        class="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-surface-variant)] rounded-full text-[var(--color-on-background)] font-semibold cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors">
                        
                        <span class="cursor-pointer">
                            <template v-for="(seg, idx) in segmentizeText(trans.target_word)" :key="idx">
                                <span v-if="seg.isWord" @click.stop="handleWordClick(seg)" class="hover:text-[var(--color-primary)]">{{ seg.text }}</span>
                                <span v-else>{{ seg.text }}</span>
                            </template>
                        </span>
                        
                        <!-- [NEW] Definition Source Label (Ringkas) -->
                        <span v-if="getDefinitionIndices(trans)" class="text-[10px] uppercase font-bold text-[var(--color-secondary)] opacity-70 ml-0.5">
                           {{ getDefinitionIndices(trans).replace('Def ', 'D') }}
                        </span>
                        
                        <span v-if="trans.info" class="material-symbols-outlined !text-base text-[var(--color-outline)]" title="Ada info tambahan">info</span>
                    </div>
                </div>
            </div>
        </Transition>
    </div>
</template>
