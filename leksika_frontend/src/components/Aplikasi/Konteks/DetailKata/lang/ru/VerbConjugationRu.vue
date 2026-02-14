<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  word: {
    type: Object,
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

// Helper Pencarian Tags yang Lebih Fleksibel
// Fungsi ini sekarang menerima array of string, atau array of arrays (untuk opsi OR)
const findForm = (requiredTags) => {
  if (!props.word?.forms) return '—';

  const found = props.word.forms.find((f) => {
    const type = (f.form_type || '').toLowerCase();

    // Cek setiap requirement
    return requiredTags.every((req) => {
      // Jika requirement adalah array (misal: ['impv', 'impr']), salah satu harus ada
      if (Array.isArray(req)) {
        return req.some((r) => type.includes(r.toLowerCase()));
      }
      // Jika requirement string biasa
      return type.includes(req.toLowerCase());
    });
  });
  return formatAccent(found?.form);
};

const getGrammarAttr = (name) => {
  if (!props.word?.grammar_attributes) return null;
  const attr = props.word.grammar_attributes.find(
    (a) => a.feature_value.feature_name.toLowerCase() === name.toLowerCase(),
  );
  return attr?.feature_value?.value || null;
};

const aspect = computed(() => getGrammarAttr('Aspect'));
const isImperfective = computed(
  () => aspect.value === 'impf' || aspect.value === 'Imperfective',
);

// --- KONJUGASI ---

const presentTenseForms = computed(() => {
  if (!props.word) return [];
  const forms = [
    { person: 'я', form: findForm(['pres', '1per', 'sing']) },
    { person: 'ты', form: findForm(['pres', '2per', 'sing']) },
    { person: 'он/она́/оно́', form: findForm(['pres', '3per', 'sing']) },
    { person: 'мы', form: findForm(['pres', '1per', 'plur']) },
    { person: 'вы', form: findForm(['pres', '2per', 'plur']) },
    { person: 'они́', form: findForm(['pres', '3per', 'plur']) },
  ];
  return forms.some((r) => r.form !== '—') ? forms : [];
});

const futureTenseForms = computed(() => {
  if (!props.word) return [];

  // 1. Imperfective: Analitik (буду + infinitive)
  if (isImperfective.value) {
    const infinitive = formatAccent(props.word?.accented || props.word?.base);
    return [
      { person: 'я', form: `бу́ду ${infinitive}` },
      { person: 'ты', form: `бу́дешь ${infinitive}` },
      { person: 'он/она́/оно́', form: `бу́дет ${infinitive}` },
      { person: 'мы', form: `бу́дем ${infinitive}` },
      { person: 'вы', form: `бу́дете ${infinitive}` },
      { person: 'они́', form: `бу́дут ${infinitive}` },
    ];
  }

  // 2. Perfective: Sintetik
  let forms = [
    { person: 'я', form: findForm(['futr', '1per', 'sing']) },
    { person: 'ты', form: findForm(['futr', '2per', 'sing']) },
    { person: 'он/она́/оно́', form: findForm(['futr', '3per', 'sing']) },
    { person: 'мы', form: findForm(['futr', '1per', 'plur']) },
    { person: 'вы', form: findForm(['futr', '2per', 'plur']) },
    { person: 'они́', form: findForm(['futr', '3per', 'plur']) },
  ];

  if (forms.every((r) => r.form === '—')) {
    forms = [
      { person: 'я', form: findForm(['pres', '1per', 'sing']) },
      { person: 'ты', form: findForm(['pres', '2per', 'sing']) },
      { person: 'он/она́/оно́', form: findForm(['pres', '3per', 'sing']) },
      { person: 'мы', form: findForm(['pres', '1per', 'plur']) },
      { person: 'вы', form: findForm(['pres', '2per', 'plur']) },
      { person: 'они́', form: findForm(['pres', '3per', 'plur']) },
    ];
  }
  return forms;
});

const pastTenseForms = computed(() => {
  if (!props.word) return [];
  return [
    { gender: 'Masculine (он)', form: findForm(['past', 'masc', 'sing']) },
    { gender: 'Feminine (она́)', form: findForm(['past', 'femn', 'sing']) },
    { gender: 'Neuter (оно́)', form: findForm(['past', 'neut', 'sing']) },
    { gender: 'Plural (они́)', form: findForm(['past', 'plur']) },
  ].filter((row) => row.form !== '—');
});

// [PERBAIKAN] Imperative
// Menggunakan ['impv', 'impr'] untuk mencakup tag seed ('impv') DAN tag standar OpenCorpora ('impr')
const imperativeForms = computed(() => {
  if (!props.word) return [];
  return [
    { person: 'ты (you)', form: findForm([['impv', 'impr'], 'sing']) },
    { person: 'вы (you, pl.)', form: findForm([['impv', 'impr'], 'plur']) },
  ].filter((row) => row.form !== '—');
});

// [PERBAIKAN] Participle
// Mencakup 'participle' (seed) DAN 'prtf'/'prts' (standar)
const participleForms = computed(() => {
  if (!props.word) return [];
  return [
    {
      type: 'Active present',
      description: 'working',
      form: findForm([['participle', 'prtf'], 'actv', 'pres']),
    },
    {
      type: 'Active past',
      description: 'someone who was doing',
      form: findForm([['participle', 'prtf'], 'actv', 'past']),
    },
    {
      type: 'Passive present',
      description: 'being done',
      form: findForm([['participle', 'prtf'], 'pssv', 'pres']),
    },
    {
      type: 'Passive past',
      description: 'having been done',
      form: findForm([['participle', 'prtf'], 'pssv', 'past']),
    },
    // Short forms (PRTS)
    {
      type: 'Passive past (short)',
      description: 'done',
      form: findForm([['participle', 'prts'], 'pssv', 'past']),
    },
  ].filter((row) => row.form !== '—');
});

// [PERBAIKAN] Gerund
// Mencakup 'gerund' (seed) DAN 'grnd' (standar)
const gerundForms = computed(() => {
  if (!props.word) return [];
  const tags = ['gerund', 'grnd']; // Opsi tag

  return [
    {
      type: 'Gerund present',
      description: 'while doing (present)',
      form: findForm([tags, 'pres']),
    },
    {
      type: 'Gerund past',
      description: 'while doing (past)',
      form: findForm([tags, 'past']),
    },
    // Fallback tanpa tense
    { type: 'Gerund', description: 'verbal adverb', form: findForm([tags]) },
  ].filter(
    (row, index, self) =>
      row.form !== '—' && index === self.findIndex((t) => t.form === row.form), // Hapus duplikat
  );
});
</script>

<template>
    <div class="space-y-8">
        <div>
            <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Conjugation</h3>
            <div class="space-y-6">
                <div>
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Present Tense</h4>
                    <div v-if="presentTenseForms.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in presentTenseForms" :key="item.person">
                                <td class="w-1/3 px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                    <div v-else-if="isAdmin" class="mt-2">
                        <button class="px-4 py-2 bg-[var(--color-surface-container)] rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-full text-left">
                            + Tambahkan info & contoh kalimat
                        </button>
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Future Tense</h4>
                    <div v-if="futureTenseForms.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in futureTenseForms" :key="item.person">
                                <td class="w-1/3 px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                     <div v-else-if="isAdmin" class="mt-2">
                        <button class="px-4 py-2 bg-[var(--color-surface-container)] rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-full text-left">
                            + Tambahkan info & contoh kalimat
                        </button>
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Past Tense</h4>
                    <div v-if="pastTenseForms.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in pastTenseForms" :key="item.gender">
                                <td class="w-1/3 px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ item.gender }}</td>
                                <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                     <div v-else-if="isAdmin" class="mt-2">
                        <button class="px-4 py-2 bg-[var(--color-surface-container)] rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-full text-left">
                            + Tambahkan info & contoh kalimat
                        </button>
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Imperative</h4>
                    <div v-if="imperativeForms.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in imperativeForms" :key="item.person">
                                <td class="w-1/3 px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                     <div v-else-if="isAdmin" class="mt-2">
                        <button class="px-4 py-2 bg-[var(--color-surface-container)] rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-full text-left">
                            + Tambahkan info & contoh kalimat
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div>
            <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Participles & Gerunds</h3>
             <div v-if="participleForms.length > 0 || gerundForms.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                    <tr v-for="item in participleForms" :key="item.type">
                        <td class="w-1/3 px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">
                            {{ item.type }}
                            <p class="font-normal text-sm text-[var(--color-on-surface-variant)]">{{ item.description }}</p>
                        </td>
                        <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.form }}</td>
                    </tr>
                    <tr v-for="item in gerundForms" :key="item.type">
                        <td class="w-1/3 px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">
                            {{ item.type }}
                             <p class="font-normal text-sm text-[var(--color-on-surface-variant)]">{{ item.description }}</p>
                        </td>
                        <td class="px-4 py-3 text-[var(--color-on-background)]">{{ item.form }}</td>
                    </tr>
                </tbody></table>
            </div>
             <div v-else-if="isAdmin" class="mt-2">
                <button class="px-4 py-2 bg-[var(--color-surface-container)] rounded-lg text-sm text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-full text-left">
                    + Tambahkan info & contoh kalimat
                </button>
            </div>
        </div>
    </div>
</template>
