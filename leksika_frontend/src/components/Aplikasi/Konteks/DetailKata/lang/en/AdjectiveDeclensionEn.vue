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

// Get positive/base form
const positiveForm = computed(() => props.word?.base || props.word?.accented);

// Comparative form (bigger, more beautiful)
const comparativeForm = computed(() => {
  return (
    findForm(['comp']) || findForm(['comparative']) || findForm(['er']) || null
  );
});

// Superlative form (biggest, most beautiful)
const superlativeForm = computed(() => {
  return (
    findForm(['sup']) || findForm(['superlative']) || findForm(['est']) || null
  );
});

// Check if uses "more/most" pattern (periphrastic)
const usesMoreMost = computed(() => {
  if (!comparativeForm.value || !superlativeForm.value) return false;
  return (
    comparativeForm.value.toLowerCase().startsWith('more ') ||
    superlativeForm.value.toLowerCase().startsWith('most ')
  );
});

// All adjective forms for display
const adjectiveForms = computed(() => {
  const forms = [];

  if (positiveForm.value) {
    forms.push({
      label: 'Positive',
      form: positiveForm.value,
      example: `It is ${positiveForm.value}.`,
    });
  }
  if (comparativeForm.value) {
    forms.push({
      label: 'Comparative',
      form: comparativeForm.value,
      example: `It is ${comparativeForm.value} than...`,
    });
  }
  if (superlativeForm.value) {
    forms.push({
      label: 'Superlative',
      form: superlativeForm.value,
      example: `It is the ${superlativeForm.value}.`,
    });
  }

  return forms;
});

// Check if we have comparative/superlative forms to show
const hasFormsToShow = computed(() => {
  return comparativeForm.value !== null || superlativeForm.value !== null;
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
                <h3 class="text-xl font-semibold text-[var(--color-primary)]">Adjective Forms</h3>
                <span v-if="usesMoreMost && hasFormsToShow" class="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]">
                    more/most
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
                    <tr v-for="item in adjectiveForms" :key="item.label" class="hover:bg-[var(--color-surface-container)]/50 transition-colors">
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
            <p class="text-[var(--color-on-surface-variant)] text-sm mb-3">Belum ada comparative/superlative forms yang tersedia.</p>
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

