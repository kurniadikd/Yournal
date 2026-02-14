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

const getForms = (mode, tense) => {
  if (!props.word?.forms) return [];

  // Construct target prefix matching what seeder saved (e.g., "Indicatif Présent")
  const targetPrefix = `${mode} ${tense}`.trim().toLowerCase();

  // Filter forms that start with this prefix
  return props.word.forms.filter((f) =>
    (f.form_type || '').toLowerCase().startsWith(targetPrefix),
  );
};

const pronouns = {
  '1s': "Je / J'",
  '2s': 'Tu',
  '3s': 'Il / Elle / On',
  '1p': 'Nous',
  '2p': 'Vous',
  '3p': 'Ils / Elles',
};

const mapToTable = (mode, tense) => {
  const forms = getForms(mode, tense);
  if (forms.length === 0) return [];

  // Extract person code from form_type (the part after mode/tense)
  // and map to pronoun.
  const result = [];
  const codes = [
    { key: '1s', regex: /1.*s$/ },
    { key: '2s', regex: /2.*s$/ },
    { key: '3s', regex: /3.*s$/ },
    { key: '1p', regex: /1.*p$/ },
    { key: '2p', regex: /2.*p$/ },
    { key: '3p', regex: /3.*p$/ },
  ];

  for (const { key, regex } of codes) {
    // Find form where code part matches regex (e.g. "13s" matches /1.*s$/)
    const match = forms.find((f) =>
      regex.test((f.form_type || '').toLowerCase()),
    );

    if (match) {
      result.push({
        person: pronouns[key],
        form: match.form,
      });
    }
  }

  // If no specific person codes found, fallback to original list
  if (result.length === 0) {
    return forms.map((f, index) => ({
      person: Object.values(pronouns)[index] || `Person ${index + 1}`,
      form: f.form,
    }));
  }

  return result;
};

// Groups
const indicatifPresent = computed(() => mapToTable('Indicatif', 'Présent'));
const indicatifImparfait = computed(() => mapToTable('Indicatif', 'Imparfait'));
const indicatifFutur = computed(() => mapToTable('Indicatif', 'Futur')); // Aligned with seeder
const indicatifPasseSimple = computed(() =>
  mapToTable('Indicatif', 'Passé simple'),
);

const subjonctifPresent = computed(() => mapToTable('Subjonctif', 'Présent'));
const conditionnelPresent = computed(() =>
  mapToTable('Conditionnel', 'Présent'),
);
const imperatifPresent = computed(() => {
  const forms = getForms('Impératif', 'Présent');
  if (forms.length === 0) return [];

  const impCodes = { '2s': 'Tu', '1p': 'Nous', '2p': 'Vous' };
  const result = [];
  for (const [code, label] of Object.entries(impCodes)) {
    const match = forms.find((f) =>
      (f.form_type || '').toLowerCase().endsWith(code),
    );
    if (match) {
      result.push({ person: label, form: match.form });
    }
  }
  return result.length > 0
    ? result
    : forms.map((f, i) => ({
        person: ['Tu', 'Nous', 'Vous'][i] || '',
        form: f.form,
      }));
});

const participes = computed(() => {
  const forms = props.word.forms || [];
  const list = [];

  // Non-conjugated forms from seeder: "Participe Présent", "Participe Passé Masc Sing" etc.
  const presMatch = forms.find((f) =>
    (f.form_type || '').toLowerCase().includes('participe présent'),
  );
  if (presMatch) list.push({ type: 'Présent', form: presMatch.form });

  // For Passé, prioritize Masc Sing if multiple exist
  const pastMascSing = forms.find((f) =>
    (f.form_type || '').toLowerCase().includes('participe passé masc sing'),
  );
  const pastAny = forms.find((f) =>
    (f.form_type || '').toLowerCase().includes('participe passé'),
  );

  if (pastMascSing)
    list.push({ type: 'Passé (Masc Sing)', form: pastMascSing.form });
  else if (pastAny) list.push({ type: 'Passé', form: pastAny.form });

  return list;
});
</script>

<template>
    <div class="space-y-8">
        <!-- INDICATIF -->
        <div>
            <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Indicatif</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <!-- Présent -->
                <div v-if="indicatifPresent.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Présent</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in indicatifPresent" :key="item.person">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>

                <!-- Imparfait -->
                <div v-if="indicatifImparfait.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Imparfait</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in indicatifImparfait" :key="item.person">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>

                <!-- Futur Simple -->
                <div v-if="indicatifFutur.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Futur Simple</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in indicatifFutur" :key="item.person">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>

                <!-- Passé Simple -->
                <div v-if="indicatifPasseSimple.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Passé Simple</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in indicatifPasseSimple" :key="item.person">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>

            </div>
        </div>

        <!-- SUBJONCTIF & CONDITIONNEL -->
        <div>
            <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Subjonctif & Conditionnel</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <!-- Subjonctif Présent -->
                <div v-if="subjonctifPresent.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Subjonctif Présent</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in subjonctifPresent" :key="item.person">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>

                <!-- Conditionnel Présent -->
                <div v-if="conditionnelPresent.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Conditionnel Présent</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in conditionnelPresent" :key="item.person">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>
            </div>
        </div>

        <!-- IMPERATIF & PARTICIPE -->
        <div v-if="imperatifPresent.length || participes.length">
            <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Autres Modes</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                <!-- Impératif -->
                 <div v-if="imperatifPresent.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Impératif Présent</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in imperatifPresent" :key="item.person">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.person }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>

                 <!-- Participe -->
                 <div v-if="participes.length">
                    <h4 class="text-lg font-semibold mb-2 text-[var(--color-on-background)]">Participe</h4>
                    <div class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
                        <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                            <tr v-for="item in participes" :key="item.type">
                                <td class="w-1/3 px-4 py-2 text-sm font-medium text-[var(--color-on-surface-variant)]">{{ item.type }}</td>
                                <td class="px-4 py-2 text-[var(--color-on-background)]">{{ item.form }}</td>
                            </tr>
                        </tbody></table>
                    </div>
                </div>

            </div>
        </div>

    </div>
</template>
