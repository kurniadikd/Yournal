<script setup lang="ts">
import ManajemenNarasi from '@/components/Aplikasi/Admin/ManajemenNarasi.vue';

const props = defineProps<{
  groupId: string | number;
  highlightTarget?: { p: number; s: number } | null;
  highlightText?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const handleBack = () => {
  emit('close');
};
</script>

<template>
  <ManajemenNarasi
    :group-id="Number(groupId)"
    :highlight-target="highlightTarget"
    :highlight-text="highlightText"
    :is-public-view="true"
    @back="handleBack"
  />
</template>
