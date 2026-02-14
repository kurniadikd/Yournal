<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { computed, ref, onMounted } from 'vue';

const props = defineProps(nodeViewProps);

const formulas = computed<any[][]>({
  get: () => {
    const raw = props.node.attrs.items;
    // Ensure 2D array
    if (Array.isArray(raw) && raw.length > 0 && !Array.isArray(raw[0])) {
      return [raw];
    }
    return Array.isArray(raw) ? raw : [[]];
  },
  set: (val) => props.updateAttributes({ items: val }),
});

const addFormula = () => {
  const newFormulas = [...formulas.value];
  newFormulas.push([
    { type: 'part', text: 'Subjek' },
    { type: 'op', text: '+' },
    { type: 'part', text: 'Verb' }
  ]);
  formulas.value = newFormulas;
}

const removeFormula = (fIndex: number) => {
  if (formulas.value.length <= 1) return;
  const newFormulas = [...formulas.value];
  newFormulas.splice(fIndex, 1);
  formulas.value = newFormulas;
}

const addItem = (fIndex: number, index: number, type: 'part' | 'op') => {
  const newFormulas = JSON.parse(JSON.stringify(formulas.value));
  const newItem = type === 'part'
    ? { type: 'part', text: 'New' }
    : { type: 'op', text: '+' };
  newFormulas[fIndex].splice(index + 1, 0, newItem);
  formulas.value = newFormulas;
};

const updateItem = (fIndex: number, index: number, key: string, value: any) => {
  const newFormulas = JSON.parse(JSON.stringify(formulas.value));
  newFormulas[fIndex][index] = { ...newFormulas[fIndex][index], [key]: value };
  formulas.value = newFormulas;
};

const removeItem = (fIndex: number, index: number) => {
  if (formulas.value[fIndex].length <= 1) return;
  const newFormulas = JSON.parse(JSON.stringify(formulas.value));
  newFormulas[fIndex].splice(index, 1);
  formulas.value = newFormulas;
};

const handleContentChange = (fIndex: number, index: number, e: Event) => {
  const target = e.target as HTMLElement;
  updateItem(fIndex, index, 'text', target.innerText); // Use innerText to avoid HTML injection issues? or innerHTML
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
  }
};

const ops = [
  { text: '+', icon: 'add' },
  { text: '→', icon: 'arrow_forward' },
  { text: '=', icon: 'equal' },
  { text: '>', icon: 'chevron_right' },
  { text: '&', icon: 'link' },
  { text: '/', icon: 'horizontal_rule' }
];

const getOpIcon = (text: string) => {
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  const found = ops.find(o => o.text === cleanText || o.text === text);
  return found ? found.icon : 'add';
};

const cycleOp = (fIndex: number, index: number) => {
  const currentOp = formulas.value[fIndex][index].text.replace(/<[^>]*>/g, '').trim();
  const currentIndex = ops.findIndex(o => o.text === currentOp);
  const nextOp = ops[(currentIndex + 1) % ops.length];
  updateItem(fIndex, index, 'text', nextOp.text);
};

const toggleResult = (fIndex: number, index: number) => {
  const current = formulas.value[fIndex][index].variant;
  updateItem(fIndex, index, 'variant', current === 'result' ? 'default' : 'result');
};

const isPreview = ref(false);
const isEditable = computed(() => props.editor.isEditable);
const isEditing = computed(() => props.editor.isEditable && !isPreview.value);
</script>

<template>
  <node-view-wrapper
    class="rumus-kalimat-wrapper my-8 not-prose select-none border-none shadow-none bg-transparent relative group">
    <!-- Admin Toolbar -->
    <div v-if="isEditable"
      class="absolute -top-4 right-0 z-50 flex items-center gap-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
      <button @click="isPreview = !isPreview" :title="isPreview ? 'Mode Edit' : 'Mode Preview'"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all border border-[var(--color-outline-variant)]">
        <span class="material-symbols-outlined text-lg">{{ isPreview ? 'edit' : 'visibility' }}</span>
      </button>

      <button v-if="!isPreview" @click="props.deleteNode()"
        class="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white transition-all border border-[var(--color-error)]"
        title="Hapus Rumus">
        <span class="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>

    <div class="flex flex-col items-center gap-6">
      <!-- Main Formula Area (Scrollable Items) -->
      <div class="w-full overflow-x-auto overflow-y-hidden py-4 custom-scrollbar flex flex-col gap-8">

        <div v-for="(formula, fIndex) in formulas" :key="fIndex"
          class="relative group/formula flex items-center gap-y-6 gap-x-2 px-8 w-max mx-auto transition-all p-2 rounded-xl"
          :class="{ 'hover:bg-black/5': isEditing }">

          <!-- Formula Delete Button (Left) -->
          <button v-if="isEditing && formulas.length > 1" @click="removeFormula(fIndex)"
            class="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-outline)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-container)] opacity-0 group-hover/formula:opacity-100 transition-all"
            title="Hapus Baris Rumus">
            <span class="material-symbols-outlined text-xl">remove_circle_outline</span>
          </button>

          <template v-for="(item, index) in formula" :key="index">
            <!-- Part Item (The Box) -->
            <div v-if="item.type === 'part'"
              class="relative flex flex-col items-center group/part animate-in fade-in zoom-in duration-300">
              <div
                class="relative rounded-2xl border-2 transition-all duration-300 flex flex-col items-center overflow-hidden h-fit shrink-0"
                :class="[
                  item.variant === 'result'
                    ? 'bg-[var(--color-tertiary)] text-[var(--color-on-tertiary)] border-[var(--color-tertiary)]'
                    : 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                ]">
                <!-- Content Wrapper -->
                <div class="flex flex-col items-center relative h-full w-full">

                  <!-- Main Text Area -->
                  <div class="grid place-items-center w-full px-5 py-2">
                    <div :contenteditable="isEditing" v-html="item.text"
                      @input="e => handleContentChange(fIndex, index, e)" @keydown="handleKeyDown"
                      class="col-start-1 row-start-1 text-center font-bold text-base leading-snug whitespace-pre-wrap outline-none min-w-[20px] max-w-[250px] text-inherit"
                      style="color: inherit;" :class="{ 'cursor-text': isEditing }"></div>
                  </div>
                </div>

                <!-- Box Controls (Overlay on Hover) -->
                <div v-if="isEditing"
                  class="absolute -top-1 -right-1 flex gap-1 opacity-0 group-part/hover:opacity-100 transition-opacity duration-200 z-20 p-2">
                  <!-- Toggle Result Star -->
                  <button @click="toggleResult(fIndex, index)"
                    class="w-8 h-8 bg-white text-[var(--color-tertiary)] rounded-full flex items-center justify-center hover:scale-110 border border-outline-variant/30"
                    :class="{ 'bg-[var(--color-tertiary)] !text-white !border-white': item.variant === 'result' }"
                    title="Tandai Hasil">
                    <span class="material-symbols-outlined text-lg">{{ item.variant === 'result' ? 'auto_awesome' :
                      'star' }}</span>
                  </button>

                  <!-- Delete -->
                  <button @click="removeItem(fIndex, index)"
                    class="w-8 h-8 bg-white text-[var(--color-error)] rounded-full flex items-center justify-center hover:scale-110 border border-[var(--color-error)]"
                    title="Hapus">
                    <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>

              <!-- Quick Add Button (Right Side) -->
              <button v-if="isEditing" @click="addItem(fIndex, index, 'op')"
                class="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white text-[var(--color-primary)] rounded-full flex items-center justify-center opacity-0 group-part/hover:opacity-100 transition-all duration-200 translate-x-1 hover:scale-110 z-10 border-2 border-[var(--color-primary)]"
                title="Tambah Operator">
                <span class="material-symbols-outlined text-lg">add</span>
              </button>
            </div>

            <!-- Operator Item (Google Icons) -->
            <div v-else
              class="relative flex items-center px-2 group/op animate-in fade-in slide-in-from-left-2 duration-300">
              <button @click="isEditing && cycleOp(fIndex, index)"
                class="flex items-center justify-center rounded-full text-[var(--color-on-surface)] transition-all duration-200"
                :class="{ 'active:scale-90 cursor-pointer': isEditing, 'cursor-default': !isEditing }"
                :title="isEditing ? 'Ganti Operator' : ''">
                <span class="material-symbols-outlined text-3xl leading-none scale-110">{{ getOpIcon(item.text)
                }}</span>
              </button>

              <!-- Quick Actions for Operator -->
              <div v-if="isEditing"
                class="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-op/hover:opacity-100 transition-opacity duration-200 z-20">
                <button @click="removeItem(fIndex, index)"
                  class="w-6 h-6 bg-white text-[var(--color-error)] rounded-full flex items-center justify-center hover:bg-[var(--color-error)] hover:text-white transition-colors border border-[var(--color-error)]">
                  <span class="material-symbols-outlined text-xs">close</span>
                </button>
              </div>

              <!-- Quick Add Button (Right Side of Op) -->
              <button v-if="isEditing" @click="addItem(fIndex, index, 'part')"
                class="absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-white text-[var(--color-secondary)] rounded-full flex items-center justify-center opacity-0 group-op/hover:opacity-100 transition-all duration-200 translate-x-1 hover:scale-110 z-10 border-2 border-[var(--color-secondary)]"
                title="Tambah Bagian">
                <span class="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          </template>

          <!-- Add Item Button (at the end of formula) -->
          <button v-if="isEditing" @click="addItem(fIndex, -1, 'part')"
            class="flex items-center justify-center w-14 h-14 rounded-full bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-[var(--color-primary)]">
            <span class="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>

        <!-- Add New Formula Row Button -->
        <div v-if="isEditing" class="w-full flex justify-center mt-2">
          <button @click="addFormula"
            class="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] transition-all font-medium text-sm border border-[var(--color-outline-variant)]">
            <span class="material-symbols-outlined text-lg">add_circle</span>
            Tambah Baris Rumus
          </button>
        </div>

      </div>

      <!-- Optional Description Field -->
      <div v-if="isEditing || node.attrs.description" class="w-full max-w-md text-center mt-2">
        <div v-if="isEditing" contenteditable="true"
          class="bg-transparent text-center focus:outline-none focus:bg-[var(--color-surface-variant)] rounded px-2 py-1 w-full placeholder-[var(--color-outline)] text-[var(--color-on-surface)] transition-colors inline-block mx-auto outline-none border-b border-transparent focus:border-[var(--color-primary)]"
          v-html="node.attrs.description"
          @blur="(e) => props.updateAttributes({ description: (e.target as HTMLElement).innerHTML })"
          @keydown.enter.prevent placeholder="Deskripsi Rumus (Opsional)..."></div>
        <div v-else class="text-[var(--color-on-surface)] font-medium whitespace-pre-wrap"
          v-html="node.attrs.description">
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.rumus-kalimat-wrapper {
  cursor: default;
}

input {
  display: inline-block;
  min-width: 20px;
}

/* Custom Animation for new items */
@keyframes in {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-in {
  animation: in 0.3s ease-out forwards;
}

[contenteditable]:empty:before {
  content: attr(placeholder);
  display: block;
  /* For Google Chrome */
  color: var(--color-outline);
  opacity: 0.6;
}
</style>
