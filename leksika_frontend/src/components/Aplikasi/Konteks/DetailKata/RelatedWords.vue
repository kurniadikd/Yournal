<script setup lang="ts">
import { useMemoize } from '@vueuse/core';

const props = defineProps<{
  groupedRelatedWords: Record<string, any[]>;
}>();

const emit = defineEmits<{
  (e: 'search-word', word: string): void;
}>();

const formatAccent = (rawText: string) => {
  if (!rawText) return '—';
  return rawText.replace(/'/g, '́');
};

const segmentizeText = useMemoize((text: string) => {
  if (!text) return [];
  const segmentRegex = /[\p{L}\p{M}'-]+|[^\p{L}\p{M}'-]+/gu;
  const segments: { text: string; isWord: boolean }[] = [];
  let match;
  while ((match = segmentRegex.exec(text)) !== null) {
    segments.push({
      text: match[0],
      isWord: /[\p{L}\p{M}]/u.test(match[0]),
    });
  }
  return segments;
});

const handleWordClick = (segment: { text: string; isWord: boolean }) => {
  if (segment.isWord) {
    emit('search-word', segment.text);
  }
};
</script>

<template>
    <div v-if="groupedRelatedWords">
        <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Other Words</h3>
        <div v-for="(words, groupName) in groupedRelatedWords" :key="groupName" class="mb-6">
            <h4 class="font-semibold text-[var(--color-on-surface-variant)] mb-2 capitalize">{{ groupName }}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="item in words" :key="item.rel_word.id" class="bg-[var(--color-surface-bright)] p-4 rounded-xl">
                    <p class="font-semibold text-[var(--color-on-background)]">
                        <span @click="emit('search-word', item.rel_word.base)" class="cursor-pointer hover:text-[var(--color-primary)]">
                            <span v-if="item.rel_word.accented">{{ formatAccent(item.rel_word.accented) }}</span>
                            <span v-else>{{ item.rel_word.base }}</span>
                        </span>
                    </p>
                    <p class="text-lg text-[var(--color-on-surface)]">
                        <template v-for="(seg, idx) in segmentizeText(item.display_translation)" :key="idx">
                            <span v-if="seg.isWord" @click="handleWordClick(seg)" class="cursor-pointer hover:text-[var(--color-primary)]">{{ seg.text }}</span>
                            <span v-else>{{ seg.text }}</span>
                        </template>
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
