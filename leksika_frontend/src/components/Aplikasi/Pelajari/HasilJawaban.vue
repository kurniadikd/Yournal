<template>
  <div class="space-y-4 text-left max-h-96 overflow-y-auto pr-2">
    <div v-for="(item, index) in hasil" :key="index" class="p-4 rounded-lg border" :class="item.is_correct ? 'bg-green-50 border-green-200 dark:bg-green-900/40 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/40 dark:border-red-800'">
      <p class="font-semibold text-neutral-800 dark:text-neutral-200" v-html="item.question_text"></p>
      <p class="text-sm mt-1" :class="item.is_correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
        Jawaban Anda: <span class="font-medium">{{ item.user_answer_text }}</span>
      </p>
      <div v-if="!item.is_correct" class="text-sm mt-1 text-neutral-600 dark:text-neutral-400">
        Jawaban Benar: <span class="font-medium">{{ item.correct_answer_text }}</span>
      </div>
      <div v-if="item.explanation" class="mt-2 text-sm text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700 pt-2">
        <span class="font-semibold">Penjelasan:</span> {{ item.explanation }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  hasil: {
    type: Array,
    required: true,
  },
});
</script>
