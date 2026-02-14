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

// Helper Pencarian Tags
const findForm = (requiredTags) => {
  if (!props.forms) return null;
  return props.forms.find((f) => {
    const type = (f.form_type || '').toLowerCase();
    return requiredTags.every((tag) => type.includes(tag.toLowerCase()));
  });
};

const longFormDeclensionTable = computed(() => {
  if (!props.forms) return [];

  // Mapping Case UI -> Tag DB
  const cases = {
    nom: { label: 'Nominative', tag: 'nomn' },
    gen: { label: 'Genitive', tag: 'gent' },
    dat: { label: 'Dative', tag: 'datv' },
    acc: { label: 'Accusative', tag: 'accs' },
    inst: { label: 'Instrumental', tag: 'ablt' },
    prep: { label: 'Prepositional', tag: 'loct' },
  };

  const tableData = [];

  for (const key in cases) {
    const c = cases[key];
    // Long form biasanya ADJF (Adjective Full), tapi opsional kita cek gender+case+sing/plur
    const masculine = findForm([c.tag, 'masc', 'sing']);
    const feminine = findForm([c.tag, 'femn', 'sing']);
    const neuter = findForm([c.tag, 'neut', 'sing']);
    const plural = findForm([c.tag, 'plur']); // Plural adjektiva tidak beda gender di case lain selain nom

    if (masculine || feminine || neuter || plural) {
      tableData.push({
        caseName: c.label,
        masculine: masculine ? formatAccent(masculine.form) : '—',
        feminine: feminine ? formatAccent(feminine.form) : '—',
        neuter: neuter ? formatAccent(neuter.form) : '—',
        plural: plural ? formatAccent(plural.form) : '—',
      });
    }
  }
  return tableData;
});

const shortFormTable = computed(() => {
  if (!props.forms) return [];

  // Short form ditandai dengan tag 'ADJS' (Adjective Short) atau 'short' tergantung parser
  // Kita gunakan 'ADJS' yang standar Pymorphy/OpenCorpora
  const masculine = findForm(['ADJS', 'masc', 'sing']);
  const feminine = findForm(['ADJS', 'femn', 'sing']);
  const neuter = findForm(['ADJS', 'neut', 'sing']);
  const plural = findForm(['ADJS', 'plur']);

  // Jika tidak ketemu dengan ADJS, coba fallback tanpa tag ADJS tapi dengan gender (kasus jarang)

  if (masculine || feminine || neuter || plural) {
    return [
      {
        gender: 'Masculine',
        form: masculine ? formatAccent(masculine.form) : '—',
      },
      {
        gender: 'Feminine',
        form: feminine ? formatAccent(feminine.form) : '—',
      },
      { gender: 'Neuter', form: neuter ? formatAccent(neuter.form) : '—' },
      { gender: 'Plural', form: plural ? formatAccent(plural.form) : '—' },
    ];
  }
  return [];
});
</script>

<template>
    <div class="space-y-8">
        <div>
            <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Declension (Long Form)</h3>
            <div v-if="longFormDeclensionTable.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                <table class="min-w-full divide-y divide-[var(--color-outline-variant)] text-left text-lg">
                    <thead class="bg-[var(--color-surface-container)]">
                        <tr>
                            <th scope="col" class="px-4 py-3 font-medium text-[var(--color-on-background)]">Case</th>
                            <th scope="col" class="px-4 py-3 font-medium text-[var(--color-on-background)]">Masculine</th>
                            <th scope="col" class="px-4 py-3 font-medium text-[var(--color-on-background)]">Feminine</th>
                            <th scope="col" class="px-4 py-3 font-medium text-[var(--color-on-background)]">Neuter</th>
                            <th scope="col" class="px-4 py-3 font-medium text-[var(--color-on-background)]">Plural</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--color-outline-variant)]">
                        <tr v-for="item in longFormDeclensionTable" :key="item.caseName">
                            <td class="px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ item.caseName }}</td>
                            <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.masculine }}</td>
                            <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.feminine }}</td>
                            <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.neuter }}</td>
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
        <div>
            <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Short Form</h3>
            <div v-if="shortFormTable.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                <table class="min-w-full divide-y divide-[var(--color-outline-variant)] text-left text-lg">
                    <thead class="bg-[var(--color-surface-container)]">
                        <tr>
                            <th scope="col" class="px-4 py-3 font-medium text-[var(--color-on-background)]">Gender</th>
                            <th scope="col" class="px-4 py-3 font-medium text-[var(--color-on-background)]">Form</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[var(--color-outline-variant)]">
                        <tr v-for="item in shortFormTable" :key="item.gender">
                            <td class="px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ item.gender }}</td>
                            <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.form }}</td>
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
    </div>
</template>
