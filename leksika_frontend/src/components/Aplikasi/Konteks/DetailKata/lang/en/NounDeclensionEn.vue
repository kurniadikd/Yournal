<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps({
  word: {
    type: Object,
    required: true,
  },
  forms: {
    type: Array,
    default: () => [],
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  shouldShowBlock: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['generate-morphology']);

const isEditing = ref(false);
const isGenerating = ref(false);

// Helper to find form by type tag
const findForm = (requiredTags) => {
  if (!props.forms || props.forms.length === 0) return null;

  const found = props.forms.find((f) => {
    const type = (f.form_type || '').toLowerCase();

    return requiredTags.every((req) => {
      if (Array.isArray(req)) {
        return req.some((r) => type.includes(r.toLowerCase()));
      }
      return type.includes(req.toLowerCase());
    });
  });
  return found?.form || null;
};

// Get singular form (usually the base word)
const singularForm = computed(() => props.word?.base || props.word?.accented);

// Get plural form
const pluralForm = computed(() => {
  return findForm(['plur']) || findForm(['plural']) || findForm(['pl']) || null;
});

// Check if noun is irregular (plural doesn't follow regular pattern)
const isIrregular = computed(() => {
  if (!singularForm.value || !pluralForm.value) return false;

  const singular = singularForm.value.toLowerCase();
  const plural = pluralForm.value.toLowerCase();

  // Regular plural patterns
  const regularPatterns = [
    singular + 's',
    singular + 'es',
    singular.replace(/y$/, 'ies'),
    singular.replace(/f$/, 'ves'),
    singular.replace(/fe$/, 'ves'),
  ];

  return !regularPatterns.includes(plural);
});

// Check if noun is countable (has plural form) or uncountable
const isUncountable = computed(() => {
  // If no plural form exists and we have grammar attributes indicating uncountable
  if (!pluralForm.value) {
    const attrs = props.word?.grammar_attributes || [];
    return attrs.some(
      (a) =>
        a.feature_value?.value?.toLowerCase() === 'uncountable' ||
        a.feature_value?.value?.toLowerCase() === 'mass',
    );
  }
  return false;
});

// All noun forms for display
const nounForms = computed(() => {
  const forms = [];

  if (singularForm.value) {
    forms.push({
      label: 'Singular',
      form: singularForm.value,
      example: `a ${singularForm.value}`,
    });
  }
  if (pluralForm.value) {
    forms.push({
      label: 'Plural',
      form: pluralForm.value,
      example: `many ${pluralForm.value}`,
    });
  }

  return forms;
});

// Check if we have plural form to show
const hasFormsToShow = computed(() => {
  return pluralForm.value !== null;
});

function startEdit() {
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
}

async function generateMorphology() {
  isGenerating.value = true;
  emit('generate-morphology');
  setTimeout(() => {
    isGenerating.value = false;
    isEditing.value = false;
  }, 500);
}
</script>

<template>
    <div v-if="shouldShowBlock" class="space-y-4">
        <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <h3 class="text-xl font-semibold text-[var(--color-primary)]">Noun Forms</h3>
                <span v-if="isIrregular && hasFormsToShow" class="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]">
                    Irregular
                </span>
                <span v-if="isUncountable" class="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]">
                    Uncountable
                </span>
            </div>
            
            <!-- Admin Edit Controls -->
            <div v-if="isAdmin" class="flex items-center gap-2">
                <template v-if="!isEditing">
                    <button 
                        @click="startEdit"
                        class="p-1.5 rounded-full bg-[var(--color-surface-container-high)] hover:bg-[var(--color-tertiary-container)] text-[var(--color-outline)] hover:text-[var(--color-on-tertiary-container)] transition-colors"
                        title="Edit Morfologi"
                    >
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                </template>
                <template v-else>
                    <button 
                        @click="generateMorphology"
                        :disabled="isGenerating"
                        class="p-1.5 rounded-full bg-[var(--color-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)] text-[var(--color-on-tertiary)] transition-colors disabled:opacity-50"
                        title="Generate Otomatis"
                    >
                        <span v-if="isGenerating" class="material-symbols-outlined text-lg animate-spin">sync</span>
                        <span v-else class="material-symbols-outlined text-lg">auto_awesome</span>
                    </button>
                    <button 
                        @click="cancelEdit"
                        :disabled="isGenerating"
                        class="p-1.5 rounded-full bg-[var(--color-error-container)] hover:bg-[var(--color-error)] text-[var(--color-on-error-container)] hover:text-[var(--color-on-error)] transition-colors disabled:opacity-50"
                        title="Batalkan"
                    >
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </template>
            </div>
        </div>
        
        <div v-if="hasFormsToShow" class="overflow-x-auto rounded-xl border border-[var(--color-outline-variant)]">
            <table class="min-w-full text-left">
                <tbody class="divide-y divide-[var(--color-outline-variant)]">
                    <tr v-for="item in nounForms" :key="item.label" class="hover:bg-[var(--color-surface-container)]/50 transition-colors">
                        <td class="w-1/4 px-4 py-3 font-medium text-[var(--color-on-surface-variant)]">
                            {{ item.label }}
                        </td>
                        <td class="px-4 py-3 text-lg font-semibold text-[var(--color-on-background)]">
                            {{ item.form }}
                        </td>
                        <td class="px-4 py-3 text-sm text-[var(--color-on-surface-variant)] italic">
                            {{ item.example }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Empty state with generate button for admin -->
        <div v-else-if="isAdmin" class="p-4 bg-[var(--color-surface-container)] rounded-xl text-center">
            <p class="text-[var(--color-on-surface-variant)] text-sm mb-3">Belum ada plural form yang tersedia.</p>
            <button 
                @click="generateMorphology"
                :disabled="isGenerating"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-tertiary)] hover:bg-[var(--color-tertiary-fixed-dim)] text-[var(--color-on-tertiary)] transition-colors disabled:opacity-50"
            >
                <span v-if="isGenerating" class="material-symbols-outlined text-lg animate-spin">sync</span>
                <span v-else class="material-symbols-outlined text-lg">auto_awesome</span>
                Generate Morfologi Otomatis
            </button>
        </div>
    </div>
</template>

