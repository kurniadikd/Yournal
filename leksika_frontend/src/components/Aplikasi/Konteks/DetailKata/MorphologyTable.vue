<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  headers: string[];
  rows: (string | number)[][];
}>();

const formatAccent = (rawText: string | number) => {
  if (!rawText) return '—';
  return String(rawText).replace(/'/g, '́');
};
</script>

<template>
    <div>
        <h3 class="text-lg font-semibold mb-3 text-[var(--color-on-background)]">{{ title }}</h3>
        <div v-if="rows.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
            <table class="min-w-full divide-y divide-[var(--color-outline-variant)] text-left text-lg">
                <thead class="bg-[var(--color-surface-container)]">
                    <tr>
                        <th v-for="header in headers" :key="header" class="px-4 py-3 font-medium text-[var(--color-on-background)] capitalize">{{ header.replace('_', ' ') }}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-outline-variant)]">
                    <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
                        <td v-for="(cell, cellIndex) in row" :key="cellIndex" class="px-4 py-3 text-[var(--color-on-background)]">{{ formatAccent(cell) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
