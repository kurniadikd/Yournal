<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useDraggable, useWindowSize, useStorage, useClipboard } from '@vueuse/core';
import {
  api,
  aiLogs,
  aiLogAutoScroll,
  aiLogCount,
  aiLogPendingCount,
  aiLogErrorCount,
  clearAiLogs,
  type AiLogEntry,
} from '@/utils/api';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const emit = defineEmits(['close']);

// --- Monitor data (fetched locally, replaces store polling) ---
interface AiMonitorData {
  total_requests: number;
  api_keys: Array<{ id: number; masked_key: string }>;
  completion_models: string[];
  default_tts_model: string;
  server_time: number;
  mode: string;
}

const isCollapsed = useStorage('log-ai-collapsed', false);
const isStatusCollapsed = useStorage('log-ai-status-collapsed', false);
const monitorData = ref<AiMonitorData | null>(null);
const isMonitorLoading = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function fetchMonitorData() {
  isMonitorLoading.value = true;
  try {
    const res = await api.get('/admin/ai/monitor/');
    monitorData.value = res.data as AiMonitorData;
  } catch (e) {
    // silent
  } finally {
    isMonitorLoading.value = false;
  }
}

function startPolling(intervalMs = 10000) {
  stopPolling();
  fetchMonitorData();
  pollTimer = setInterval(fetchMonitorData, intervalMs);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// --- Draggable (same pattern as PaletWarna.vue) ---
const panelRef = ref<HTMLElement | null>(null);
const dragHandleRef = ref<HTMLElement | null>(null);
const chatContainerRef = ref<HTMLElement | null>(null);
const { copy } = useClipboard({ legacy: true });
const lastCopiedId = ref<string | null>(null);

const handleCopy = (text: string, id: string) => {
  copy(text);
  lastCopiedId.value = id;
  setTimeout(() => {
    if (lastCopiedId.value === id) {
      lastCopiedId.value = null;
    }
  }, 2000);
};

const { width: windowWidth, height: windowHeight } = useWindowSize();

let pointerDownPos = { x: 0, y: 0 };

const position = useStorage('log-ai-position', {
  x: windowWidth.value - 420,
  y: 80,
});

const { x, y, isDragging } = useDraggable(panelRef, {
  initialValue: position.value,
  handle: dragHandleRef,
  onEnd: () => {
    if (!panelRef.value) return;
    const rect = panelRef.value.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Boundary check
    if (x.value < 0) x.value = 0;
    else if (x.value + rect.width > winW) x.value = winW - rect.width;
    if (y.value < 0) y.value = 0;
    else if (y.value + rect.height > winH) y.value = winH - rect.height;

    position.value = { x: x.value, y: y.value };
  },
});

const panelStyle = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px)`,
}));

// --- Expand/Collapse for log entries ---
const expandedIds = ref(new Set<string>());
const toggleExpand = (id: string) => {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
};

// --- Auto-scroll ---
const scrollToBottom = () => {
  if (!aiLogAutoScroll.value || !chatContainerRef.value) return;
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
};

watch(aiLogCount, () => {
  scrollToBottom();
});

// --- Keep in view on resize ---
watch([windowWidth, windowHeight], () => {
  ensureInBounds();
});

// --- Helpers ---

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const typeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    completion: 'psychology',
    lesson: 'school',
    question: 'quiz',
    essay: 'edit_note',
    translate: 'translate',
    tts: 'record_voice_over',
    image: 'image',
    plan_lesson: 'calendar_today',
    generate_questions: 'help',
    other: 'smart_toy',
  };
  return icons[type] || icons.other;
};

const statusColor = (status: string): string => {
  if (status === 'success') return 'var(--color-success)';
  if (status === 'error') return 'var(--color-error)';
  return 'var(--color-tertiary)';
};

// --- Mode badge text ---
const modeText = computed(() => monitorData.value?.mode || '—');
const modelsList = computed(() => monitorData.value?.completion_models?.join(', ') || '—');
const keyCount = computed(() => monitorData.value?.api_keys?.length || 0);
const totalRequests = computed(() => monitorData.value?.total_requests ?? '—');

// --- Ensure within bounds ---
const ensureInBounds = () => {
  nextTick(() => {
    if (!panelRef.value) return;

    const rect = panelRef.value.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let newX = x.value;
    let newY = y.value;

    if (rect.right > winW) {
      newX = winW - rect.width - 10;
    }
    if (rect.bottom > winH) {
      newY = winH - rect.height - 10;
    }
    if (rect.left < 0) {
      newX = 10;
    }
    if (rect.top < 0) {
      newY = 10;
    }

    x.value = newX;
    y.value = newY;
    position.value = { x: newX, y: newY };
  });
};

// --- Handle Collapse ---
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  // Ensure we are in bounds after layout change
  nextTick(() => ensureInBounds());
};

const handlePointerDown = (e: MouseEvent) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
};

const handlePointerUp = (e: MouseEvent) => {
  const dx = Math.abs(e.clientX - pointerDownPos.x);
  const dy = Math.abs(e.clientY - pointerDownPos.y);

  if (dx < 5 && dy < 5) {
    toggleCollapse();
  }
};

// --- Lifecycle ---
onMounted(() => {
  ensureInBounds();
  startPolling(10000);
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="panelRef"
      :class="[
        'fixed top-0 left-0 z-[9999] overflow-visible',
        { 'pointer-events-none': isDragging },
      ]"
      :style="panelStyle"
    >
      <Transition name="morph" mode="out-in">
        <!-- Mode: BUBBLE (Collapsed) -->
        <div v-if="isCollapsed" 
          key="bubble"
          ref="dragHandleRef"
          class="w-14 h-14 flex items-center justify-center group cursor-pointer rounded-full 
                 bg-[var(--color-surface-container)] text-[var(--color-on-surface)] 
                 border border-[var(--color-outline)]/40 shadow-2xl pointer-events-auto"
          @mousedown="handlePointerDown"
          @mouseup="handlePointerUp"
        >
          <span class="material-symbols-outlined text-3xl text-[var(--color-primary)] transition-transform group-hover:scale-110">smart_toy</span>
          
          <!-- Badge -->
          <div v-if="aiLogCount > 0" 
            class="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-[var(--color-primary)] text-[var(--color-on-primary)] text-[10px] font-bold rounded-full border-2 border-[var(--color-surface-container)]">
            {{ aiLogCount > 99 ? '99+' : aiLogCount }}
          </div>
        </div>

        <!-- Mode: PANEL (Expanded) -->
        <div v-else 
          key="panel" 
          class="flex flex-col w-80 md:w-96 h-auto max-h-[90vh] overflow-hidden rounded-2xl 
                 bg-[var(--color-surface-container)] text-[var(--color-on-surface)] 
                 border border-[var(--color-outline)]/40 shadow-2xl pointer-events-auto"
        >
          <!-- Drag Handle -->
          <div
            ref="dragHandleRef"
            class="w-full h-5 flex-shrink-0 flex justify-center items-center cursor-grab active:cursor-grabbing"
            style="touch-action: none;"
          >
            <div class="w-8 h-1 rounded-full bg-[var(--color-outline-variant)]"></div>
          </div>

        <!-- Header -->
        <div class="flex-shrink-0 flex items-center justify-between px-4 pb-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-[var(--color-primary)]">smart_toy</span>
            <h2 class="text-sm font-bold text-[var(--color-on-surface)] tracking-wide">AI Log</h2>
          </div>
          <div class="flex items-center gap-1">
            <button @click="aiLogAutoScroll = !aiLogAutoScroll"
              class="p-1 rounded-lg transition-colors"
              :class="aiLogAutoScroll ? 'text-[var(--color-primary)]' : 'text-[var(--color-outline)]'"
              :title="aiLogAutoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'">
              <span class="material-symbols-outlined text-base">vertical_align_bottom</span>
            </button>
            <button @click="isStatusCollapsed = !isStatusCollapsed"
              class="p-1 rounded-lg transition-colors"
              :class="isStatusCollapsed ? 'text-[var(--color-outline)]' : 'text-[var(--color-primary)]'"
              :title="isStatusCollapsed ? 'Show Status' : 'Hide Status'">
              <span class="material-symbols-outlined text-base">{{ isStatusCollapsed ? 'monitoring' : 'info' }}</span>
            </button>
            <button @click="clearAiLogs()"
              class="p-1 rounded-lg text-[var(--color-outline)] hover:text-[var(--color-error)] transition-colors"
              title="Clear logs">
              <span class="material-symbols-outlined text-base">delete_sweep</span>
            </button>
            <button @click="toggleCollapse()"
              class="p-1 rounded-lg text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors"
              title="Minimize">
              <span class="material-symbols-outlined text-base">unfold_less</span>
            </button>
            <button @click="emit('close')"
              class="p-1 rounded-lg text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors"
              title="Close">
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        <!-- Status Bar -->
        <Transition name="expand">
          <div v-if="!isStatusCollapsed" class="flex-shrink-0 mx-3 mb-2 p-2.5 rounded-xl bg-[var(--color-surface-container-high)] text-[10px] space-y-1 overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Mode</span>
              <span class="font-mono font-bold text-[var(--color-primary)]">{{ modeText }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Models</span>
              <span class="font-mono text-[var(--color-on-surface)] max-w-[65%] truncate text-right" :title="modelsList">{{ modelsList }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Keys</span>
              <span class="font-mono text-[var(--color-on-surface)]">{{ keyCount }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Total Requests</span>
              <span class="font-mono text-[var(--color-on-surface)]">{{ totalRequests }}</span>
            </div>
            <div v-if="isMonitorLoading" class="flex justify-center pt-0.5">
              <LoadingSpinner size="xs" />
            </div>
          </div>
        </Transition>

        <!-- Chat Log -->
        <div ref="chatContainerRef"
          class="flex-1 max-h-[45vh] overflow-y-auto px-3 pb-3 space-y-2 custom-scrollbar">

          <div v-if="aiLogs.length === 0"
            class="flex flex-col items-center justify-center h-24 text-[var(--color-outline-variant)]">
            <span class="material-symbols-outlined text-3xl mb-1">forum</span>
            <span class="text-xs">Belum ada log AI</span>
          </div>

          <div v-for="entry in aiLogs" :key="entry.id" class="space-y-1">
            <!-- Timestamp -->
            <div class="flex items-center gap-1.5 text-[9px] text-[var(--color-outline)] px-1">
              <span class="material-symbols-outlined" style="font-size: 12px;">{{ typeIcon(entry.type) }}</span>
              <span class="uppercase font-bold tracking-wider">{{ entry.type }}</span>
              <span>{{ formatTime(entry.timestamp) }}</span>
              <span v-if="entry.durationMs > 0" class="ml-auto font-mono">{{ formatDuration(entry.durationMs) }}</span>
            </div>

            <!-- Input Bubble (User / Right side) -->
            <div class="flex justify-end items-center group/bubble">
              <!-- Copy button -->
              <div class="mr-2 flex-shrink-0 self-stretch flex items-center">
                <button @click.stop="handleCopy(entry.input, entry.id + '-in')"
                  class="p-1 rounded-lg text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-all flex items-center justify-center bg-[var(--color-surface-container-high)] shadow-sm"
                  :title="lastCopiedId === (entry.id + '-in') ? 'Copied!' : 'Copy input'">
                  <span class="material-symbols-outlined !text-sm">
                    {{ lastCopiedId === (entry.id + '-in') ? 'done' : 'content_copy' }}
                  </span>
                </button>
              </div>
              <div @click="toggleExpand(entry.id)"
                class="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-md cursor-pointer transition-colors
                         bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]">
                <p class="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                  {{ entry.input }}
                </p>
              </div>
            </div>

            <!-- Output Bubble (AI / Left side) -->
            <div class="flex justify-start items-center group/bubble">
              <div @click="toggleExpand(entry.id)"
                class="max-w-[85%] px-3 py-2 rounded-2xl rounded-tl-md cursor-pointer transition-colors relative"
                :class="entry.status === 'error'
                  ? 'bg-[var(--color-error-container)] text-[var(--color-on-error-container)]'
                  : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]'">
                <!-- Pending indicator -->
                <div v-if="entry.status === 'pending'" class="flex items-center gap-2 text-[11px]">
                  <LoadingSpinner size="xs" />
                  <span class="text-[var(--color-on-surface-variant)]">Menunggu respons…</span>
                </div>
                <!-- Response text -->
                <p v-else class="text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                  {{ entry.output }}
                </p>
              </div>

              <!-- Copy button -->
              <div v-if="entry.status !== 'pending' && entry.output" 
                class="ml-2 flex-shrink-0 self-stretch flex items-center">
                <button @click.stop="handleCopy(entry.output, entry.id + '-out')"
                  class="p-1 rounded-lg text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-all flex items-center justify-center bg-[var(--color-surface-container-high)] shadow-sm"
                  :title="lastCopiedId === (entry.id + '-out') ? 'Copied!' : 'Copy response'">
                  <span class="material-symbols-outlined !text-sm">
                    {{ lastCopiedId === (entry.id + '-out') ? 'done' : 'content_copy' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Metadata badges -->
            <div v-if="entry.metadata && (entry.metadata.model || entry.metadata.endpoint)"
              class="flex flex-wrap gap-1 px-1">
              <span v-if="entry.metadata.model"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold
                       bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]">
                <span class="material-symbols-outlined" style="font-size: 10px;">neurology</span>
                {{ entry.metadata.model }}
              </span>
              <span v-if="entry.metadata.keyIndex !== undefined"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono
                       bg-[var(--color-tertiary-container)] text-[var(--color-on-tertiary-container)]">
                <span class="material-symbols-outlined" style="font-size: 10px;">key</span>
                #{{ entry.metadata.keyIndex }}
              </span>
              <span v-if="entry.metadata.mode"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-mono
                       bg-[var(--color-outline)]/20 text-[var(--color-on-surface-variant)]">
                <span class="material-symbols-outlined" style="font-size: 10px;">settings_applications</span>
                {{ entry.metadata.mode }}
              </span>
              <span
                class="inline-flex items-center w-2 h-2 rounded-full ml-auto"
                :style="{ backgroundColor: statusColor(entry.status) }"
              ></span>
            </div>
          </div>
        </div>

        <!-- Footer: Log count -->
        <div class="flex-shrink-0 flex items-center justify-between px-4 py-1.5 text-[9px] text-[var(--color-outline)] border-t border-[var(--color-outline-variant)]/30">
          <span>{{ aiLogCount }} entri</span>
          <span v-if="aiLogErrorCount > 0" class="text-[var(--color-error)] font-bold">{{ aiLogErrorCount }} error</span>
        </div>
      </div>
    </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-outline-variant);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}

/* Transition: Morph (Production Quality) */
.morph-enter-active,
.morph-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform, opacity;
}

.morph-enter-from,
.morph-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 120px;
  opacity: 1;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
