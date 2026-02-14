<template>
  <node-view-wrapper ref="nodeRef" class="bar-chart-node my-6 select-none relative group">
    <!-- Chart Container -->
    <div class="bg-[var(--color-surface-container)] rounded-2xl p-6">
      <div v-if="!items.length" class="text-center py-8 text-[var(--color-outline)]">
        <span class="material-symbols-outlined text-4xl mb-2">bar_chart</span>
        <p>Klik tombol edit untuk menambahkan data grafik.</p>
      </div>

      <div v-else class="space-y-4">
        <!-- Title -->
        <h3 v-if="title" class="text-xl font-bold text-[var(--color-on-surface)] text-center mb-6">{{ title }}</h3>

        <!-- Bars Container with Unified Grid Layout -->
        <!-- Use auto 1fr to shrink-wrap labels and center the chart content naturally -->
        <!-- Bars Container with Unified Grid Layout -->
        <!-- Native RTL support via standard Grid: Col 1 is Start (Label), Col 2 is End (Bar) -->
        <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-4 items-center"> 
          
          <template v-for="(item, index) in sortedItems" :key="index">
              <!-- 1. Row Label -->
              <div class="text-xs sm:text-sm font-semibold text-[var(--color-on-surface)] text-end leading-tight break-words">
                  {{ item.label }}
              </div>
              
              <!-- 2. Bar Track + Floating Value -->
              <div class="h-6 sm:h-8 flex items-center pe-10"> <!-- padding-end reserves space for value label -->
                <div class="relative w-full h-full flex items-center"> <!-- Inner Wrapper -->
                    <!-- The Bar -->
                    <div 
                      class="h-full rounded-e-md transition-all duration-1000 ease-out shadow-sm relative z-10"
                      :style="{ 
                        width: showBars ? `${(item.value / axisMax) * 100}%` : '0%',
                        backgroundColor: item.color || 'var(--color-primary)'
                      }"
                    ></div>
                    
                    <!-- Floating Value Label -->
                    <!-- Use logical property via style for positioning -->
                    <div 
                        class="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-on-surface-variant)] whitespace-nowrap z-20 transition-all duration-1000 ease-out ms-1"
                        :style="{ 
                            insetInlineStart: showBars ? `${(item.value / axisMax) * 100}%` : '0%',
                            opacity: showBars ? 1 : 0
                        }"
                    >
                        {{ formatNumber(item.value) }}
                    </div>
                </div>
              </div>
          </template>
          
          <!-- X-Axis Scale -->
           <div></div> <!-- Empty Label Col -->
           <div class="relative h-6 border-t border-[var(--color-outline)] mt-1 pe-10">
               <div class="relative w-full"> <!-- Inner Wrapper -->
                   <!-- Ticks -->
                   <div 
                        v-for="tick in axisTicks" 
                        :key="tick"
                        class="absolute top-0 flex flex-col items-center transform -translate-x-1/2 rtl:translate-x-1/2"
                        :style="{ 
                            insetInlineStart: `${(tick / axisMax) * 100}%` 
                        }"
                   >
                       <div class="w-px h-1.5 bg-[var(--color-outline)]"></div>
                       <span class="text-[10px] text-[var(--color-outline)] mt-0.5 whitespace-nowrap">{{ formatAxisTick(tick) }}</span>
                   </div>
               </div>
           </div>
        </div>

        <!-- X Axis Label -->
        <div v-if="axisLabel" class="text-center mt-0">
            <span class="text-xs font-bold text-[var(--color-outline)]">{{ axisLabel }}</span>
        </div>

      </div>

      <!-- Edit Overlay/Button -->
      <div v-if="editor.isEditable" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
         <button 
           @click="openEditModal" 
           class="bg-[var(--color-surface)] text-[var(--color-on-surface)] border border-[var(--color-outline)] p-2 rounded-lg shadow-md hover:bg-[var(--color-surface-container-high)] transition-colors flex items-center gap-2 text-xs font-bold"
         >
            <span class="material-symbols-outlined text-sm">edit</span> Edit Data
         </button>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="isEditing" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click.self="isEditing = false">
        <div class="bg-[var(--color-surface)] w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-[var(--color-outline-variant)] flex flex-col max-h-[90vh]">
            <h3 class="text-xl font-bold mb-4 text-[var(--color-on-surface)]">Edit Data Grafik</h3>
            
            <div class="space-y-3 overflow-y-auto pr-2 flex-grow">
                <div>
                   <label class="text-xs font-bold text-[var(--color-outline)]">Judul Grafik</label>
                   <input v-model="editTitle" class="w-full bg-[var(--color-surface-container)] rounded-lg px-3 py-2 text-sm border border-[var(--color-outline-variant)] focus:outline-none focus:border-[var(--color-primary)]" placeholder="Contoh: Bahasa Paling Populer" />
                </div>
                
                <div>
                   <label class="text-xs font-bold text-[var(--color-outline)]">Label Sumbu X (Bawah)</label>
                   <input v-model="editAxisLabel" class="w-full bg-[var(--color-surface-container)] rounded-lg px-3 py-2 text-sm border border-[var(--color-outline-variant)] focus:outline-none focus:border-[var(--color-primary)]" placeholder="Contoh: Total Penutur (Juta)" />
                </div>

                <div>
                   <label class="text-xs font-bold text-[var(--color-outline)]">Data (Format: Label | Value)</label>
                   <p class="text-[10px] text-[var(--color-outline-variant)] mb-2">Satu baris per item. Misal: English | 1500</p>
                   <textarea 
                      v-model="editText" 
                      rows="8" 
                      class="w-full bg-[var(--color-surface-container)] rounded-lg px-3 py-2 text-sm border border-[var(--color-outline-variant)] focus:outline-none focus:border-[var(--color-primary)] font-mono whitespace-pre"
                      placeholder="English | 1528&#10;Mandarin | 1184"
                   ></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-outline-variant)]">
                <button @click="isEditing = false" class="px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] transition-colors">Batal</button>
                <button @click="saveChanges" class="px-4 py-2 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:brightness-110 transition-all">Simpan</button>
            </div>
        </div>
    </div>

  </node-view-wrapper>
</template>

<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { ref, computed, onMounted } from 'vue';

interface DataItem {
    label: string;
    value: number;
    color?: string;
}

const props = defineProps(nodeViewProps);
const nodeRef = ref<any>(null);

// NOTE: We rely on native RTL support now (logical properties)
// but kept ref for future manual tweaks if needed.
const isRtl = ref(false); 
const showBars = ref(false);

onMounted(() => {
    // Optional: detect context for other non-css logic if needed
    if (nodeRef.value && nodeRef.value.$el) {
        isRtl.value = !!nodeRef.value.$el.closest('[dir="rtl"]');
    }

    // Trigger animation after a short delay
    setTimeout(() => {
        showBars.value = true;
    }, 150);
});

const items = computed<DataItem[]>(() => props.node.attrs.items || []);
const title = computed<string>(() => props.node.attrs.title || '');
const axisLabel = computed<string>(() => props.node.attrs.axisLabel || '');

const sortedItems = computed<DataItem[]>(() => {
    return [...items.value].sort((a, b) => b.value - a.value);
});

const isEditing = ref(false);
const editText = ref('');
const editTitle = ref('');
const editAxisLabel = ref('');

// Calculate Nice Ticks for X Axis
const maxDataValue = computed(() => {
    if (!items.value.length) return 100;
    return Math.max(...items.value.map(i => i.value));
});

const getNiceUpperBound = (max: number) => {
    if (max <= 0) return { max: 100, step: 20 };
    // Calculate nice step
    // Target ~5 ticks
    const targetTicks = 5;
    const rawStep = max / targetTicks;
    // Magnitude 10^x
    const mag = Math.floor(Math.log10(rawStep));
    const power = Math.pow(10, mag);
    
    // Normalized step (1..10)
    const norm = rawStep / power;
    let step: number;
    if (norm < 1.5) step = 1;      // 1, 10, 100...
    else if (norm < 3.5) step = 2; // 2, 20, 200...
    else if (norm < 7.5) step = 5; // 5, 50, 500...
    else step = 10;                // 10, 100, 1000...
    
    const niceStep = step * power;
    const niceMax = Math.ceil(max / niceStep) * niceStep;
    return { max: niceMax, step: niceStep };
};

const axisCalculations = computed(() => getNiceUpperBound(maxDataValue.value));
const axisMax = computed(() => axisCalculations.value.max);
const axisTicks = computed(() => {
    const { max, step } = axisCalculations.value;
    const ticks: number[] = [];
    for (let i = 0; i <= max; i += step) {
        ticks.push(i);
    }
    return ticks;
});


const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num); 
};

// Simplified formatter for axis ticks (e.g. 1.5k if needed, but standard is fine for now)
const formatAxisTick = (num: number) => {
     return new Intl.NumberFormat('id-ID').format(num);
};

const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
];

const getColor = (index: number) => colors[index % colors.length];

const openEditModal = () => {
    editTitle.value = title.value;
    editAxisLabel.value = axisLabel.value;
    // serialize items to text
    editText.value = items.value.map(i => `${i.label} | ${i.value}`).join('\n');
    isEditing.value = true;
};

const saveChanges = () => {
    const lines = editText.value.split('\n').filter(l => l.trim());
    const newItems = lines.map((line) => {
        // Try Pipe format first: Label | Value
        const parts = line.split('|').map(s => s.trim());
        let label: string | undefined;
        let valStr: string | undefined;

        if (parts.length >= 2) {
            label = parts[0];
            valStr = parts[1];
        } else {
            // Try Regex for "Label (Value [Unit])"
            // Example: English (1.528 Million)
            const match = line.match(/^(.+?)\s*\(\s*([\d.,]+)[^)]*\)\s*$/);
            if (match) {
                label = match[1].trim();
                valStr = match[2]; // Clean raw number part
            } else {
                return null;
            }
        }

        if (label && valStr) {
             // Parse Value
             // Handle 1.528 as 1528 if logic suggests, or just float.
             let val = parseFloat(valStr.replace(/[^0-9.]/g, ''));
             
             // Special handling for the user's "1.528" vs "609" consistency (thousands dot)
             if (valStr.includes('.') && val < 10) { 
                if (valStr.match(/\.\d{3}\b/)) {
                     val = parseFloat(valStr.replace(/\./g, ''));
                }
             }

             return {
                 label,
                 value: val
             } as DataItem;
        }
        return null;
    }).filter((x): x is DataItem => x !== null);

    props.updateAttributes!({
        items: newItems,
        title: editTitle.value,
        axisLabel: editAxisLabel.value
    });
    isEditing.value = false;
};
</script>

<style scoped>
/* Scoped styles */
</style>
