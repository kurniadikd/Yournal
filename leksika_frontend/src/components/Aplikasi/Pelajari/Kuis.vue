<template>
  <div class="flashcard-container mx-auto max-w-3xl p-4 sm:p-6">
    
    <header class="relative mb-8 flex items-center justify-between min-h-[40px]">
      <div class="z-10">
        <button 
          @click="backToMenu" 
          class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] transition-colors"
          :title="$t('back')"
        >
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1 class="text-xl font-bold text-[var(--color-on-background)] text-center px-12 pointer-events-auto">
          {{ $t('quiz_mode') }}
        </h1>
      </div>

      <div class="w-10 h-10 z-10"></div>
    </header>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center text-[var(--color-on-surface-variant)] py-10 flex flex-col items-center gap-3">
      <LoadingSpinner size="lg" color="outline" />
      <span>{{ $t('loading_words') }}</span>
    </div>

    <!-- STATE 1: Source Selection -->
    <div v-else-if="flashcardState === 'selecting'" class="space-y-6">
      <div class="bg-[var(--color-surface-container)] p-6 sm:p-8 rounded-2xl">
        <p class="text-center text-[var(--color-on-surface-variant)] mb-6">
          {{ $t('select_list_hint') }}
        </p>
        
        <!-- Empty State -->
        <div v-if="availableLists.length === 0" class="text-center py-8">
          <span class="material-symbols-outlined text-5xl text-[var(--color-outline)] mb-4">folder_off</span>
          <p class="text-[var(--color-on-surface-variant)]">{{ $t('no_words_saved') }}</p>
          <p class="text-sm text-[var(--color-outline)]">{{ $t('save_words_hint') }}</p>
        </div>

        <!-- List Selection -->
        <div v-else class="space-y-3">
          <button
            v-for="list in availableLists"
            :key="list.id"
            @click="selectList(list)"
            class="w-full p-4 rounded-xl border-2 text-left transition-all"
            :class="selectedList?.id === list.id 
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]' 
              : 'border-[var(--color-outline-variant)] hover:border-[var(--color-outline)] bg-[var(--color-surface)]'"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{{ list.icon || '📁' }}</span>
                <div>
                  <p class="font-semibold text-[var(--color-on-surface)]">{{ list.name }}</p>
                  <p class="text-sm text-[var(--color-on-surface-variant)]">{{ list.wordCount }} kata</p>
                </div>
              </div>
              <span v-if="selectedList?.id === list.id" class="material-symbols-outlined text-[var(--color-primary)]">check_circle</span>
            </div>
          </button>
        </div>
      </div>

      <button 
        @click="startPractice" 
        :disabled="!selectedList || selectedList.wordCount === 0"
        class="w-full rounded-xl bg-[var(--color-primary)] px-6 py-4 text-lg font-semibold text-[var(--color-on-primary)] shadow-md hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span class="flex items-center justify-center gap-2">
          <span class="material-symbols-outlined">play_arrow</span>
          {{ $t('start_quiz') }}
        </span>
      </button>
    </div>
    
    <!-- STATE 2: Flashcard Practice -->
    <div v-else-if="flashcardState === 'practicing'" class="space-y-6">
      <!-- Progress Bar -->
      <div>
        <div class="flex justify-between text-sm text-[var(--color-on-surface-variant)] mb-2">
          <span>{{ $t('quiz_card_of', { current: currentIndex + 1, total: cards.length }) }}</span>
          <span>{{ knownCount }} {{ $t('quiz_memorized') }}</span>
        </div>
        <div class="w-full bg-[var(--color-surface-container)] rounded-full h-2">
          <div 
            class="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300" 
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
      </div>

      <!-- Flashcard -->
      <div 
        class="flashcard-wrapper perspective-1000 cursor-pointer"
        @click="flipCard"
      >
        <div 
          class="flashcard relative w-full min-h-[300px] transition-transform duration-500 transform-style-preserve-3d"
          :class="{ 'rotate-y-180': isFlipped }"
        >
          <!-- Front -->
          <div class="flashcard-face flashcard-front absolute inset-0 backface-hidden rounded-2xl bg-[var(--color-primary-container)] p-8 flex flex-col items-center justify-center">
            <p class="text-4xl sm:text-5xl font-bold text-[var(--color-on-primary-container)] mb-4 text-center">
              {{ frontText }}
            </p>
            <p v-if="currentCard?.word?.accented && currentCard?.word?.accented !== frontText" class="text-xl text-[var(--color-on-surface-variant)]">
              {{ currentCard?.word?.accented }}
            </p>
            <p class="text-sm text-[var(--color-outline)] mt-4">
              <span class="material-symbols-outlined text-sm align-middle">touch_app</span>
              {{ $t('quiz_flip_hint') }}
            </p>
          </div>
          
          <!-- Back -->
          <div class="flashcard-face flashcard-back absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-[var(--color-surface-container-high)] p-6 overflow-y-auto">
            <div class="space-y-4">
              <!-- Translations -->
              <div v-if="backTranslations?.length > 0">
                <h4 class="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wide mb-2">{{ $t('translation') }}</h4>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="trans in backTranslations.slice(0, 5)" 
                    :key="trans.id || trans.target_word"
                    class="px-3 py-1.5 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] text-sm font-medium"
                  >
                    {{ trans.target_word }}
                  </span>
                </div>
              </div>
              
              <!-- Definitions -->
              <div v-if="currentCard?.definitions?.length > 0">
                <h4 class="text-sm font-semibold text-[var(--color-primary)] uppercase tracking-wide mb-2">{{ $t('definition') }}</h4>
                <ul class="space-y-2">
                  <li 
                    v-for="(def, idx) in currentCard.definitions.slice(0, 3)" 
                    :key="def.id"
                    class="text-[var(--color-on-surface)] text-sm"
                  >
                    {{ Number(idx) + 1 }}. {{ def.meaning }}
                  </li>
                </ul>
              </div>

              <!-- POS Badge -->
              <div v-if="currentCard?.word?.pos" class="pt-2">
                <span class="px-2.5 py-1 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] text-xs font-semibold capitalize">
                  {{ currentCard.word.pos }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4">
        <button 
          @click="markAsUnknown"
          class="flex-1 rounded-xl py-4 text-lg font-semibold transition-all flex items-center justify-center gap-2 bg-[var(--color-error-container)] text-[var(--color-on-error-container)] hover:opacity-90"
        >
          <span class="material-symbols-outlined">close</span>
          {{ $t('quiz_not_memorized') }}
        </button>
        <button 
          @click="markAsKnown"
          class="flex-1 rounded-xl py-4 text-lg font-semibold transition-all flex items-center justify-center gap-2 bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)] hover:opacity-90"
        >
          <span class="material-symbols-outlined">check</span>
          {{ $t('quiz_memorized') }}
        </button>
      </div>
    </div>

    <!-- STATE 3: Finished -->
    <div v-else-if="flashcardState === 'finished'" class="space-y-6">
      <div class="bg-[var(--color-surface-container)] p-8 rounded-2xl text-center">
        <span class="material-symbols-outlined text-6xl text-[var(--color-primary)] mb-4">celebration</span>
        <h2 class="text-2xl font-bold text-[var(--color-on-surface)] mb-2">{{ $t('quiz_finished') }}</h2>
        
        <div class="grid grid-cols-2 gap-4 mt-6">
          <div class="p-4 rounded-xl bg-[var(--color-tertiary-container)]">
            <p class="text-3xl font-bold text-[var(--color-on-tertiary-container)]">{{ knownCount }}</p>
            <p class="text-sm text-[var(--color-on-tertiary-container)]">{{ $t('quiz_memorized') }}</p>
          </div>
          <div class="p-4 rounded-xl bg-[var(--color-error-container)]">
            <p class="text-3xl font-bold text-[var(--color-on-error-container)]">{{ unknownCount }}</p>
            <p class="text-sm text-[var(--color-on-error-container)]">{{ $t('quiz_not_memorized') }}</p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <button 
          v-if="unknownCount > 0"
          @click="practiceUnknown"
          class="w-full rounded-xl py-4 text-lg font-semibold bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 transition-all"
        >
          <span class="flex items-center justify-center gap-2">
            <span class="material-symbols-outlined">replay</span>
            {{ $t('quiz_repeat_unknown') }} ({{ unknownCount }})
          </span>
        </button>
        
        <button 
          @click="resetPractice"
          class="w-full rounded-xl py-4 text-lg font-semibold bg-[var(--color-surface-container)] text-[var(--color-on-surface)] border border-[var(--color-outline-variant)] hover:bg-[var(--color-surface-container-high)] transition-all"
        >
          {{ $t('quiz_change_list') }}
        </button>
        
        <button 
          @click="backToMenu"
          class="w-full rounded-xl py-3 text-base font-medium text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
        >
          {{ $t('back') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useListsStore } from '@/stores/lists';
import { useUIStore } from '@/stores/ui';
import { useLanguageStore } from '@/stores/language';
import { useTitle } from '@vueuse/core';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import axios from 'axios';

useTitle('Mode Kuis');

const listsStore = useListsStore();
const uiStore = useUIStore();
const languageStore = useLanguageStore();

// STATE
const flashcardState = ref('selecting'); // selecting, practicing, finished
const isLoading = ref(true);
const selectedList = ref(null);
const cards = ref([]);
const currentIndex = ref(0);
const isFlipped = ref(false);
const knownCards = ref([]);
const unknownCards = ref([]);
const cardStatus = ref<Record<number, 'known' | 'unknown' | null>>({});

onMounted(async () => {
  isLoading.value = true;
  try {
    await listsStore.initializeLists();
  } finally {
    isLoading.value = false;
  }
});

// COMPUTED
const availableLists = computed(() => {
  const currentLangPair = `${languageStore.selectedAsal?.kodeBahasa || 'id'}-${languageStore.selectedTarget?.kodeBahasa || 'en'}`;

  return listsStore.userLists
    .filter(
      (list) =>
        !list.hidden &&
        list.name.toLowerCase() !== 'dilaporkan' &&
        list.name.toLowerCase() !== 'riwayat',
    )
    .map((list) => {
      // Filter items matching the current language pair
      const wordItems = (list.items || []).filter(
        (item) => item.type === 'word' && item.lang_pair === currentLangPair,
      );
      return {
        ...list,
        wordCount: wordItems.length,
        wordItems,
      };
    })
    .filter((list) => list.wordCount > 0);
});

const currentCard = computed(() => {
  if (cards.value.length === 0 || currentIndex.value >= cards.value.length)
    return null;
  const item = cards.value[currentIndex.value];
  return {
    word: item.details || item,
    translations: item.translations || item.details?.translations || [],
    definitions: item.definitions || item.details?.definitions || [],
  };
});

const frontText = computed(() => {
  if (!currentCard.value) return '';
  const word = currentCard.value.word;
  const trans = currentCard.value.translations;
  const langPair = word.lang_pair || '';
  const targetLang = langPair.split('-')[1];

  // Logic: Ensure Front is always Target Language (L2)
  if (targetLang) {
    const l2Trans = trans.find((t) => t.language_code === targetLang);
    if (l2Trans) {
      return l2Trans.target_word;
    }
  }

  // Default: Stored word is L2 (Use Title as primary source for the word)
  // Note: 'content' usually contains definitions/HTML, so we avoid it for the front text
  return word.title || word.base || word.accented || word.content;
});

const backTranslations = computed(() => {
  if (!currentCard.value) return [];
  const word = currentCard.value.word;
  const trans = currentCard.value.translations;
  const langPair = word.lang_pair || '';
  const sourceLang =
    langPair.split('-')[0] || languageStore.selectedAsal?.kodeBahasa || 'id';
  const targetLang = langPair.split('-')[1];

  // Logic: If Front used a translation (was L1 word), Back should show the L1 word
  if (targetLang) {
    const l2Trans = trans.find((t) => t.language_code === targetLang);
    if (l2Trans) {
      // Mock a translation object for consistency
      return [
        {
          id: 'original_word',
          target_word: word.title || word.base,
        },
      ];
    }
  }

  // Filter translations to only show source language (e.g., Indonesian only)
  return trans.filter((t) => t.language_code === sourceLang);
});

const progressPercentage = computed(() => {
  if (cards.value.length === 0) return 0;
  return (currentIndex.value / cards.value.length) * 100;
});

const knownCount = computed(() => knownCards.value.length);
const unknownCount = computed(() => unknownCards.value.length);

// METHODS
const backToMenu = () => {
  uiStore.setActiveLearnView('menu');
};

const selectList = (list) => {
  selectedList.value = list;
};

const startPractice = () => {
  if (!selectedList.value) return;

  // Shuffle cards
  cards.value = [...selectedList.value.wordItems].sort(
    () => Math.random() - 0.5,
  );
  currentIndex.value = 0;
  isFlipped.value = false;
  knownCards.value = [];
  unknownCards.value = [];
  cardStatus.value = {};
  flashcardState.value = 'practicing';
};

const flipCard = () => {
  isFlipped.value = !isFlipped.value;
};

const nextCard = () => {
  if (currentIndex.value < cards.value.length - 1) {
    currentIndex.value++;
    isFlipped.value = false;
  } else {
    flashcardState.value = 'finished';
    recordActivity();
  }
};

const recordActivity = async () => {
  try {
    await axios.post('/learn/activity/', {
      activity_type: 'Flashcard Practice',
    });
  } catch (e) {
    console.error('Gagal mencatat aktivitas:', e);
  }
};

const markAsKnown = () => {
  cardStatus.value[currentIndex.value] = 'known';
  knownCards.value.push(cards.value[currentIndex.value]);
  nextCard();
};

const markAsUnknown = () => {
  cardStatus.value[currentIndex.value] = 'unknown';
  unknownCards.value.push(cards.value[currentIndex.value]);
  nextCard();
};

const practiceUnknown = () => {
  cards.value = [...unknownCards.value].sort(() => Math.random() - 0.5);
  currentIndex.value = 0;
  isFlipped.value = false;
  knownCards.value = [];
  unknownCards.value = [];
  cardStatus.value = {};
  flashcardState.value = 'practicing';
};

const resetPractice = () => {
  selectedList.value = null;
  flashcardState.value = 'selecting';
};
</script>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.transform-style-preserve-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.flashcard-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flashcard-back {
  transform: rotateY(180deg);
}
</style>
