<template>
  <section class="space-y-4 select-auto">
    <p class="text-sm text-[var(--color-on-surface-variant)]">Pilih beberapa topik yang Anda sukai untuk personalisasi konten.</p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="interest in availableInterests"
        :key="interest"
        @click="toggleInterest(interest)"
        :class="['px-4 py-2 rounded-full font-medium transition-colors', {
          'bg-[var(--color-primary)] text-[var(--color-on-primary)]': (formData.interests || []).includes(interest),
          'bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]': !(formData.interests || []).includes(interest)
        }]"
      >
        {{ interest }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  formData: { type: Object, required: true },
});

const emit = defineEmits(['update:formData']);

const availableInterests = [
  'Olahraga',
  'Travel',
  'Bisnis',
  'Teknologi',
  'Seni',
  'Musik',
  'Film',
  'Makanan',
  'Sains',
  'Sejarah',
];

const toggleInterest = (interest) => {
  const newInterests = [...(props.formData.interests || [])];
  const index = newInterests.indexOf(interest);
  if (index > -1) {
    newInterests.splice(index, 1);
  } else {
    newInterests.push(interest);
  }
  emit('update:formData', { ...props.formData, interests: newInterests });
};

const isSectionValid = computed(() => true); // No validation needed for interests
defineExpose({ isSectionValid });
</script>
