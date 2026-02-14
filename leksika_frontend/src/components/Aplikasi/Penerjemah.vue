<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLanguageStore } from '@/stores/language';
import { useWordStore } from '@/stores/word';
import InputTerjemahan from './Penerjemah/InputTerjemahan.vue';
import OutputTerjemahan from './Penerjemah/OutputTerjemahan.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { api } from '@/utils/api';

// --- State Lokal & Stores ---
const sourceLang = ref<any>(null);
const targetLang = ref<any>(null);
const inputText = ref('');
const translatedText = ref('');
const isLoading = ref(false);
const showOutput = ref(false);

const globalLanguageStore = useLanguageStore();
const wordStore = useWordStore();
const { t } = useI18n();

onMounted(() => {
  sourceLang.value = globalLanguageStore.selectedAsal;
  targetLang.value = globalLanguageStore.selectedTarget;
});

function swapLanguages() {
  const temp = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = temp;
}

async function handleTranslate() {
  if (!inputText.value.trim()) return;
  isLoading.value = true;
  showOutput.value = true;
  translatedText.value = 'LOADING_PLACEHOLDER'; // Use a constant instead of a localized string for internal state

  try {
    const textToTranslate = inputText.value.trim();
    const sourceLanguage = sourceLang.value;
    const targetLanguage = targetLang.value;

    if (!textToTranslate || !sourceLanguage || !targetLanguage) {
      translatedText.value = t('error_empty_text');
      isLoading.value = false;
      return;
    }

    const requestBody = {
      action: 'translate',
      payload: {
        text: textToTranslate,
        source_lang: sourceLanguage.nama,
        target_lang: targetLanguage.nama,
      },
    };

    const response = await api.post('/translator/', requestBody);

    if (
      response.data &&
      response.data.result &&
      response.data.result.translation
    ) {
      translatedText.value = response.data.result.translation;
    } else if (response.data && response.data.translation) {
      translatedText.value = response.data.translation;
    } else {
      console.warn('Struktur respon tidak dikenali:', response.data);
      translatedText.value = t('error_translation_failed');
    }
  } catch (error) {
    console.error('Terjadi kesalahan saat menerjemahkan:', error);
    translatedText.value = t('error_generic');
  } finally {
    isLoading.value = false;
  }
}

const handleShowPopover = ({ word, target }: { word: string; target: HTMLElement }) => {
  if (wordStore.popoverTarget) {
    wordStore.hidePopover();
  }
  nextTick(() => {
    wordStore.showPopover(word, target);
  });
};
</script>

<template>
  <div class="space-y-4 flex flex-col h-full max-w-4xl mx-auto">
    <InputTerjemahan v-model="inputText" :source-lang="sourceLang" :target-lang="targetLang"
      @swap-languages="swapLanguages" />

    <OutputTerjemahan v-if="showOutput" :text="translatedText" @show-popover="handleShowPopover" />

    <div class="mt-auto flex justify-center py-4">
      <button @click="handleTranslate" :disabled="isLoading"
        class="px-6 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary-fixed-dim)] disabled:bg-[var(--color-primary-fixed)] font-semibold text-lg">
        <span v-if="isLoading" class="flex items-center">
          <LoadingSpinner size="sm" color="on-primary" class="mr-2" />
          {{ $t('translating') }}
        </span>
        <span v-else>{{ $t('translate_button') }}</span>
      </button>
    </div>
  </div>
</template>
