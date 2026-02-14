<script setup lang="ts">
import { computed } from 'vue';
import { useMemoize } from '@vueuse/core';

const props = defineProps({
  text: String,
});

const emit = defineEmits(['show-popover']);

// Fungsi untuk memecah teks menjadi kata dan non-kata, di-cache dengan useMemoize
const segmentizeText = useMemoize((text: string) => {
  if (!text || text === 'LOADING_PLACEHOLDER') return [];
  const segmentRegex = /[\p{L}\p{M}'-]+|[^\p{L}\p{M}'-]+/gu;
  let segments = [];
  let match;
  while ((match = segmentRegex.exec(text)) !== null) {
    segments.push({ text: match[0], isWord: /\p{L}/u.test(match[0]) });
  }
  return segments;
});

const displayContent = computed(() => {
  if (!props.text || props.text === 'LOADING_PLACEHOLDER') {
    return { isJson: false, value: props.text };
  }
  try {
    const parsed = JSON.parse(props.text);
    return { isJson: true, value: JSON.stringify(parsed, null, 2) };
  } catch (e) {
    return { isJson: false, value: props.text };
  }
});

const processedText = computed(() =>
  segmentizeText(displayContent.value.value),
);

function handleWordClick(word, event) {
  // Hanya emit jika kata bukan placeholder loading dan bukan JSON
  if (
    displayContent.value.isJson === false &&
    props.text !== 'LOADING_PLACEHOLDER'
  ) {
    emit('show-popover', { word, target: event.target });
  }
}
</script>

<template>
  <div class="p-4 bg-[var(--color-surface-container)] rounded-4xl">
    <h2 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">{{ $t('translation_result') }}</h2>
    <div
      class="w-full h-48 p-2 rounded-md bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] overflow-y-auto text-lg leading-relaxed">
      <template v-if="props.text === 'LOADING_PLACEHOLDER'">
        <span class="text-[var(--color-on-surface-variant)]">{{ $t('translating') }}</span>
      </template>
      <template v-else-if="displayContent.isJson">
        <pre
          class="whitespace-pre-wrap font-mono text-sm p-2 rounded-md bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]">{{ displayContent.value }}</pre>
      </template>
      <template v-else v-for="(seg, idx) in processedText" :key="idx">
        <span v-if="seg.isWord" :data-word="seg.text" @click="handleWordClick(seg.text, $event)"
          class="cursor-pointer hover:text-[var(--color-primary)]">
          {{ seg.text }}
        </span>
        <span v-else>{{ seg.text }}</span>
      </template>
    </div>
  </div>
</template>
