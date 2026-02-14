<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  forms: {
    type: Array,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const formatAccent = (rawText) => {
  if (!rawText) return '—';
  return rawText.replace(/'/g, '́');
};

// Helper untuk mencari form berdasarkan TAGS (karena DB menyimpan "NOUN,inan,masc,nomn,sing")
const findForm = (requiredTags) => {
  if (!props.forms) return null;
  return props.forms.find((f) => {
    const type = (f.form_type || '').toLowerCase();
    // Cek apakah SEMUA tag yang diminta ada di dalam string form_type
    return requiredTags.every((tag) => type.includes(tag.toLowerCase()));
  });
};

const declensionTable = computed(() => {
  // Mapping nama case UI ke Tag Database (Pymorphy/OpenCorpora tags)
  const cases = {
    nom: { label: 'Nominative', tag: 'nomn' },
    gen: { label: 'Genitive', tag: 'gent' },
    dat: { label: 'Dative', tag: 'datv' },
    acc: { label: 'Accusative', tag: 'accs' },
    inst: { label: 'Instrumental', tag: 'ablt' }, // Note: 'ablt' untuk Instrumental
    prep: { label: 'Prepositional', tag: 'loct' }, // Note: 'loct' untuk Prepositional
  };

  let tableData = [];
  if (!props.forms) return [];

  for (const key in cases) {
    const c = cases[key];
    // Cari Sing + Case
    const singular = findForm(['sing', c.tag]);
    // Cari Plur + Case
    const plural = findForm(['plur', c.tag]);

    if (singular || plural) {
      tableData.push({
        caseName: c.label,
        singular: singular ? formatAccent(singular.form) : '—',
        plural: plural ? formatAccent(plural.form) : '—',
      });
    }
  }
  return tableData;
});
</script>

<template>
    <div>
        <h3 class="text-lg font-semibold mb-3 text-[var(--color-primary)]">Declension</h3>
        <div v-if="declensionTable.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
            <table class="min-w-full divide-y divide-[var(--color-outline-variant)] text-left text-lg">
                <thead class="bg-[var(--color-surface-bright)]">
                    <tr>
                        <th class="px-4 py-3 font-medium text-[var(--color-on-background)]">Case</th>
                        <th class="px-4 py-3 font-medium text-[var(--color-on-background)]">Singular</th>
                        <th class="px-4 py-3 font-medium text-[var(--color-on-background)]">Plural</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-outline-variant)]">
                    <tr v-for="item in declensionTable" :key="item.caseName">
                        <td class="px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ item.caseName }}</td>
                        <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.singular }}</td>
                        <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.plural }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div v-else-if="isAdmin" class="mt-2">
            <button class="px-4 py-2 bg-[var(--color-surface-container)] rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-full text-left">
                + Tambahkan info & contoh kalimat
            </button>
        </div>
    </div>
</template>
