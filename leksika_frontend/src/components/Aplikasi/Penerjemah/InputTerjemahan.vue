<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';

const props = defineProps({
  modelValue: String,
  sourceLang: Object,
  targetLang: Object,
});
const emit = defineEmits(['update:modelValue', 'swap-languages']);

const textarea = ref(null);

function autoResize() {
  if (textarea.value) {
    textarea.value.style.height = 'auto';
    textarea.value.style.height = `${textarea.value.scrollHeight}px`;
  }
}

watch(
  () => props.modelValue,
  () => {
    nextTick(autoResize);
  },
);

onMounted(() => {
  autoResize();
});
</script>
<template>
  <div class="p-4 bg-[var(--color-surface-container)] rounded-4xl flex flex-col">
    <div class="flex items-center justify-center mb-4">
        <div class="flex items-center gap-2 p-2 bg-[var(--color-surface-container-high)] rounded-full text-[var(--color-on-background)]">
            <span>{{ sourceLang?.nama }}</span>
            <button @click="$emit('swap-languages')" class="p-1 rounded-full hover:bg-[var(--color-surface-container-highest)]">
                <span class="material-symbols-outlined">swap_horiz</span>
            </button>
            <span>{{ targetLang?.nama }}</span>
        </div>
    </div>
    <textarea
      ref="textarea"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      class="w-full p-2 rounded-md bg-[var(--color-surface-container)] resize-none overflow-hidden min-h-[50vh] text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] border-none focus:outline-none"
      :placeholder="$t('input_placeholder')"
    ></textarea>
  </div>
</template>
