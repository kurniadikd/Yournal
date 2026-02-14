<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, useTemplateRef } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { useSearchStore } from '@/stores/search';
import { useUIStore } from '@/stores/ui';
import { useSearchHistory } from '@/composables/useSearchHistory';
import { useI18n } from 'vue-i18n';

// --- Props & Emits ---
const props = defineProps({
  isFloating: { type: Boolean, default: false },
});

const emit = defineEmits(['search', 'focus', 'blur']);

// --- State ---
const searchStore = useSearchStore();
const uiStore = useUIStore();
const { addToHistory } = useSearchHistory();
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaRef');
const isFocused = ref(false);
const isClearing = ref(false);
const xButtonActive = ref(false);
const { t } = useI18n();

// --- State untuk Logika Placeholder ---
const placeholderWrapperRef = useTemplateRef<HTMLElement>('placeholderWrapperRef');
const textMeasurementRef = useTemplateRef<HTMLElement>('textMeasurementRef');
const isOverflowing = ref(false);

// --- Textarea Height Adjustment ---
const MAX_ROWS = 10;
const LINE_HEIGHT_REM = 1.5;

const adjustTextareaHeightSmooth = () => {
  if (!textareaRef.value || isClearing.value) return;

  const el = textareaRef.value;
  const prevHeight = el.offsetHeight;

  el.style.height = 'auto';

  const scrollHeight = el.scrollHeight;
  const fontSizePx = parseFloat(getComputedStyle(el).fontSize);
  const lineHeightPx = fontSizePx * LINE_HEIGHT_REM;
  const paddingYPx =
    parseFloat(getComputedStyle(el).paddingTop) +
    parseFloat(getComputedStyle(el).paddingBottom);
  const maxHeightPx = MAX_ROWS * lineHeightPx + paddingYPx;
  const minHeightPx = parseFloat(getComputedStyle(el).minHeight);

  el.style.height = `${prevHeight}px`;

  requestAnimationFrame(() => {
    el.style.height = `${Math.min(Math.max(scrollHeight, minHeightPx), maxHeightPx)}px`;
    el.style.overflowY = scrollHeight > maxHeightPx ? 'auto' : 'hidden';
  });
};

watch(
  () => searchStore.realtimeSearchInput,
  () => nextTick(adjustTextareaHeightSmooth),
  { immediate: true },
);

onMounted(() => nextTick(adjustTextareaHeightSmooth));

// --- Handlers ---
const executeSearch = () => {
  const trimmed = searchStore.realtimeSearchInput.trim();
  if (trimmed) {
    emit('search', trimmed);
    addToHistory(trimmed);
  }
  textareaRef.value?.blur();
};

const handleInput = () => {
  adjustTextareaHeightSmooth();
};

const clearSearch = () => {
  isClearing.value = true;
  xButtonActive.value = true;

  searchStore.setRealtimeInput('');

  if (textareaRef.value) {
    const el = textareaRef.value;
    el.style.height = `${el.offsetHeight}px`;
    requestAnimationFrame(() => {
      const minHeightPx = parseFloat(getComputedStyle(el).minHeight) || 44;
      const elStyleComp = getComputedStyle(el); // re-read if needed, but minHeightPx should be enough
      el.style.height = `${minHeightPx}px`;
      el.style.overflowY = 'hidden';
    });
  }

  setTimeout(() => {
    xButtonActive.value = false;
    isClearing.value = false;
    textareaRef.value?.focus();
  }, 100);
};

const handleFocus = () => {
  isFocused.value = true;
  emit('focus');
  uiStore.setSearchFocus(true);
};

// Watch for global search focus request
watch(
  () => uiStore.isSearchFocused,
  (focused) => {
    if (focused && !isFocused.value) {
      nextTick(() => {
        textareaRef.value?.focus();
      });
    }
  },
);

const handleBlur = () => {
  isFocused.value = false;
  emit('blur');
};

defineExpose({
  element: textareaRef,
  setSearchTerm: (newTerm: string) => {
    searchStore.setRealtimeInput(newTerm);
    nextTick(adjustTextareaHeightSmooth);
  },
  executeSearch,
  insertCharacter: (char: string) => {
    if (!textareaRef.value) return;
    const el = textareaRef.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = el.value;
    const newVal =
      currentVal.substring(0, start) + char + currentVal.substring(end);
    searchStore.setRealtimeInput(newVal);
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + char.length;
      el.focus();
      adjustTextareaHeightSmooth();
    });
  },
  deleteCharacter: () => {
    if (!textareaRef.value) return;
    const el = textareaRef.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = el.value;
    let newVal;
    let newCursorPos;
    if (start === end && start > 0) {
      newVal = currentVal.substring(0, start - 1) + currentVal.substring(end);
      newCursorPos = start - 1;
    } else {
      newVal = currentVal.substring(0, start) + currentVal.substring(end);
      newCursorPos = start;
    }
    searchStore.setRealtimeInput(newVal);
    nextTick(() => {
      el.selectionStart = el.selectionEnd = newCursorPos;
      el.focus();
      adjustTextareaHeightSmooth();
    });
  },
});

// --- Computed Styles ---
const hasContent = computed(() => searchStore.realtimeSearchInput.length > 0);

const magnifierWrapperClass = computed(() => ({
  'opacity-25': hasContent.value && !isFocused.value,
  'opacity-100': !hasContent.value || isFocused.value,
}));

const magnifierCircleClass = computed(() => ({
  'bg-[var(--color-primary)]': hasContent.value && isFocused.value,
  'bg-[var(--color-surface-container-high)]':
    !hasContent.value || !isFocused.value,
}));

const magnifierIconClass = computed(() => ({
  'text-[var(--color-on-primary)]': hasContent.value && isFocused.value,
  'text-[var(--color-outline)]': !hasContent.value || !isFocused.value,
}));

const xButtonWrapperClass = computed(() => ({
  'opacity-100 pointer-events-auto': hasContent.value,
  'opacity-0 pointer-events-none': !hasContent.value,
}));

const xButtonCircleColorClass = computed(() => ({
  'bg-[var(--color-primary)]': xButtonActive.value,
  'bg-transparent': !xButtonActive.value,
}));

const xButtonIconColorClass = computed(() => ({
  'text-[var(--color-on-primary)]': xButtonActive.value,
  'text-[var(--color-outline)]': !xButtonActive.value,
}));

// --- LOGIKA PLACEHOLDER DINAMIS ---
const rawPlaceholderText = computed(() => {
  return t('search_placeholder') || 'Ketik kata atau kalimat di sini...';
});

const marqueeText = computed(() => {
  const text = rawPlaceholderText.value;
  return `${text} \u00A0\u00A0\u00A0\u00A0 ${text} \u00A0\u00A0\u00A0\u00A0 ${text}`;
});

const checkOverflow = () => {
  if (placeholderWrapperRef.value && textMeasurementRef.value) {
    const containerWidth = placeholderWrapperRef.value.clientWidth;
    const textWidth = textMeasurementRef.value.clientWidth;
    isOverflowing.value = textWidth > containerWidth;
  }
};

useResizeObserver(placeholderWrapperRef, checkOverflow);
watch(rawPlaceholderText, () => nextTick(checkOverflow));
onMounted(() => nextTick(checkOverflow));
</script>

<template>
  <!-- Container - pill shape dengan rounded-3xl -->
  <div class="relative rounded-3xl overflow-visible p-[2px]">
    
    <!-- Placeholder Layer - sejajar dengan textarea -->
    <div 
      v-show="!hasContent"
      ref="placeholderWrapperRef"
      class="absolute inset-0 px-14 flex items-center pointer-events-none overflow-hidden z-10"
    >
      <!-- Hidden text untuk mengukur lebar -->
      <span 
        ref="textMeasurementRef" 
        class="absolute opacity-0 pointer-events-none whitespace-nowrap text-lg font-normal"
        aria-hidden="true"
      >{{ rawPlaceholderText }}</span>

      <!-- Marquee mode -->
      <div v-if="isOverflowing" class="w-full overflow-hidden whitespace-nowrap">
        <div class="inline-block text-lg text-[var(--color-outline)] animate-marquee">
          {{ marqueeText }}
        </div>
      </div>

      <!-- Static mode -->
      <div v-else class="w-full text-lg text-[var(--color-outline)] whitespace-nowrap truncate">
        {{ rawPlaceholderText }}
      </div>
    </div>

    <!-- Textarea Input -->
    <textarea
      ref="textareaRef"
      v-model="searchStore.realtimeSearchInput"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown.enter.prevent="executeSearch"
      rows="1"
      placeholder=""
      class="w-full px-14 py-2 text-lg rounded-3xl border border-transparent
             scrollbar-thin scrollbar-thumb-neutral-400 scrollbar-track-transparent
             focus:outline-none text-left resize-none
             transition-all duration-300 box-border leading-[1.5]
             bg-[var(--color-surface-container-high)]
             text-[var(--color-on-surface)]
             focus:ring-2 focus:ring-[var(--color-primary)]
             focus:border-[var(--color-primary)]
             relative z-0"
      :class="{'shadow-lg dark:shadow-neutral-900/60': props.isFloating}"
      style="min-height: 2.75rem; overflow-y: hidden;"
    ></textarea>

    <!-- Search Icon - Kiri, sejajar baris pertama -->
    <div
      @click="executeSearch"
      class="absolute left-2.5 top-2 flex items-center justify-center cursor-pointer transition-opacity duration-300 z-20"
      :class="magnifierWrapperClass"
    >
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300"
        :class="magnifierCircleClass"
      >
        <svg 
          class="w-5 h-5 transition-colors duration-300" 
          :class="magnifierIconClass" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none"
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>

    <!-- Clear Icon - Kanan, sejajar baris pertama -->
    <button
      @mousedown.prevent 
      @click="clearSearch"
      class="absolute right-2.5 top-2 flex items-center justify-center w-8 h-8 rounded-full transition-opacity duration-300 z-20"
      :class="xButtonWrapperClass"
    >
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
        :class="xButtonCircleColorClass"
      >
        <svg 
          class="w-6 h-6 transition-colors duration-200" 
          :class="xButtonIconColorClass" 
          xmlns="http://www.w3.org/2000/svg"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
    </button>

  </div>
</template>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--color-outline) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--color-outline);
  border-radius: 9999px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background-color: transparent;
}

/* Animasi Running Text (Marquee) */
.animate-marquee {
  animation: marquee 20s linear infinite;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-33.33%);
  }
}
</style>
