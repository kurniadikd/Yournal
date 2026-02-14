<script setup lang="ts">
const props = defineProps({
  forms: {
    type: Array, // Note: NounDeclension usually receives 'forms' directly?
    // Wait, VerbConjugation received 'word'.
    // Let's check DetailKata.vue again.
    // It passes `word` to grammarComponent.
    // Ah, wait. DetailKata.vue:
    // <component :is="grammarComponent" :word="distilledWord" :forms="distilledWord.forms" ... />?
    // Let's re-verify props in DetailKata.vue
    required: false,
  },
  word: {
    type: Object,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

// DetailKata passes :word="distilledWord" mainly.
// But looking at NounDeclensionRu.vue:
// props: { forms: { type: Array, required: true }, ... }
// Let's check DetailKata.vue template usage of grammarComponent.
</script>

<template>
    <div>
        <h3 class="text-xl font-semibold mb-3 text-[var(--color-primary)]">Formes (Inflections)</h3>
        
        <div v-if="word.forms && word.forms.length > 0" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
             <table class="min-w-full text-left text-lg"><tbody class="divide-y divide-[var(--color-outline-variant)]">
                <tr v-for="(form, index) in word.forms" :key="index">
                    <td class="w-1/3 px-4 py-3 font-medium text-[var(--color-on-surface-variant)] capitalize">
                        {{ (form.form_type || '').replace(/Masc/g, 'masculin').replace(/Fem/g, 'féminin').replace(/Sing/g, 'singulier').replace(/Plur/g, 'pluriel').trim() }}
                    </td>
                    <td class="px-4 py-3 text-[var(--color-on-background)]">{{ form.form }}</td>
                </tr>
            </tbody></table>
        </div>
        <div v-else class="text-[var(--color-on-surface-variant)] italic">
            Aucune forme trouvée.
        </div>
    </div>
</template>
