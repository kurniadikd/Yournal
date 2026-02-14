<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useLanguageStore } from '@/stores/language';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

const emit = defineEmits(['close']);

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const languageStore = useLanguageStore();
const authStore = useAuthStore();
const { t, locale } = useI18n();

// Admin bisa melihat semua bahasa
const isAdmin = computed(() => authStore.isAdmin);

// Route detection - show target language only in /app
const route = useRoute();
const isInApp = computed(() => route.path.startsWith('/app'));

const localBahasaAsal = ref('');
const localBahasaTarget = ref('');

const isLanguageListOpen = ref(false);
const selectionMode = ref<'asal' | 'target' | null>(null);

// BARU: Computed property untuk mendapatkan nama bahasa yang sedang aktif
const currentSelection = computed(() => {
  if (selectionMode.value === 'asal') {
    return localBahasaAsal.value;
  }
  if (selectionMode.value === 'target') {
    return localBahasaTarget.value;
  }
  return null;
});

const openLanguageList = (mode: 'asal' | 'target') => {
  selectionMode.value = mode;
  isLanguageListOpen.value = true;
};

const closeLanguageList = () => {
  isLanguageListOpen.value = false;
};

const languageListTitle = computed(() => {
  if (selectionMode.value === 'asal') {
    return t('i_speak_modal_title');
  }
  return t('i_learn_modal_title');
});

const currentLanguageOptions = computed(() => {
  if (selectionMode.value === 'asal') {
    return opsiAsalLokal.value;
  }
  if (selectionMode.value === 'target') {
    return opsiTargetLokal.value;
  }
  return [];
});

const selectLanguage = (nama: string) => {
  if (selectionMode.value === 'asal') {
    // Jika bahasa yang dipilih adalah bahasa target saat ini, lakukan SWAP
    if (nama === localBahasaTarget.value) {
      localBahasaTarget.value = localBahasaAsal.value;
      localBahasaAsal.value = nama;
    } else {
      localBahasaAsal.value = nama;
      // Jika tidak sengaja sama (harusnya tidak terjadi dengan logika swap di atas, tapi jaga-jaga)
      if (localBahasaAsal.value === localBahasaTarget.value) {
        // Cari bahasa lain untuk target
        const other = opsiTargetLokal.value.find((b) => b.nama !== nama);
        if (other) localBahasaTarget.value = other.nama;
      }
    }
  } else if (selectionMode.value === 'target') {
    // Jika bahasa yang dipilih adalah bahasa asal saat ini, lakukan SWAP
    if (nama === localBahasaAsal.value) {
      localBahasaAsal.value = localBahasaTarget.value;
      localBahasaTarget.value = nama;
    } else {
      localBahasaTarget.value = nama;
      if (localBahasaTarget.value === localBahasaAsal.value) {
        const other = opsiAsalLokal.value.find((b) => b.nama !== nama);
        if (other) localBahasaAsal.value = other.nama;
      }
    }
  }
  closeLanguageList();
};

// Admin melihat semua bahasa, user biasa hanya bahasa aktif
const daftarLengkapAsal = computed(() => {
  if (isAdmin.value) {
    return languageStore.opsiBahasa; // Semua bahasa untuk admin
  }
  // FILTER KETAT: User biasa hanya boleh melihat bahasa dengan is_active_source = true
  return languageStore.opsiBahasa.filter((b) => b.is_active_source);
});

const daftarLengkapTarget = computed(() => {
  if (isAdmin.value) {
    return languageStore.opsiBahasa; // Semua bahasa untuk admin
  }
  // FILTER KETAT: User biasa hanya boleh melihat bahasa dengan is_active_target = true
  return languageStore.opsiBahasa.filter((b) => b.is_active_target);
});

// [MODIFIKASI] User minta bahasa lawan tetap muncul agar bisa di-swap
const opsiAsalLokal = computed(() => {
  // Return semua daftar tanpa filter bahasa target
  return daftarLengkapAsal.value;
});
const opsiTargetLokal = computed(() => {
  // Return semua daftar tanpa filter bahasa asal
  return daftarLengkapTarget.value;
});
const selectedAsalDisplay = computed(() =>
  daftarLengkapAsal.value.find((b) => b.nama === localBahasaAsal.value),
);
const selectedTargetDisplay = computed(() =>
  daftarLengkapTarget.value.find((b) => b.nama === localBahasaTarget.value),
);

const handleSimpan = () => {
  languageStore.setLanguages(localBahasaAsal.value, localBahasaTarget.value);

  // Update locale i18n
  if (selectedAsalDisplay.value?.kodeBahasa) {
    locale.value = selectedAsalDisplay.value.kodeBahasa;
  }

  emit('close');
};

onMounted(async () => {
  await languageStore.init();

  // Jika admin, pastikan kita mengambil daftar bahasa lengkap (termasuk yang tidak aktif)
  if (isAdmin.value) {
    await languageStore.fetchAdminLanguages();
  }

  localBahasaAsal.value = languageStore.bahasaAsal;
  localBahasaTarget.value = languageStore.bahasaTarget;

  // Set initial locale
  if (selectedAsalDisplay.value?.kodeBahasa) {
    locale.value = selectedAsalDisplay.value.kodeBahasa;
  }
});

watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      // [MODIFIKASI] Pastikan admin mendapat list lengkap saat modal dibuka (bukan hanya saat onMounted)
      // Ini menangani kasus user login -> modal dibuka tanpa refresh page
      if (isAdmin.value) {
        await languageStore.fetchAdminLanguages();
      }
      localBahasaAsal.value = languageStore.bahasaAsal;
      localBahasaTarget.value = languageStore.bahasaTarget;
    }
  },
);
</script>

<template>
  <TransitionRoot :show="props.isOpen" as="template">
    <Dialog @close="emit('close')" class="relative z-50">
      
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/50" />
      </TransitionChild>
      
      <div class="fixed inset-0 flex w-screen items-center justify-center p-4">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="modal-box relative mx-4 w-full max-w-sm rounded-4xl p-6 shadow-2xl"
          :style="{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-background)' }"
          >
            <!-- Header -->
            <div class="relative flex items-center justify-center mb-6">
              <h2 class="text-2xl font-bold text-[var(--color-on-background)]">{{ $t('choose_language') }}</h2>
              <button @click="emit('close')" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <hr class="my-4 border-[var(--color-outline-variant)]" />

            <div class="space-y-4 text-center">
              
              <div>
                <label class="block text-lg font-medium text-[var(--color-on-background)]">{{ $t('i_speak') }}</label>
                <button @click="openLanguageList('asal')" class="mt-2 flex w-full items-center rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container)] p-3 text-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]"
                :style="{ color: 'var(--color-on-background)' }">
                  <img :src="languageStore.getFlagUrlByCode(selectedAsalDisplay?.kodeBahasa, '4x3')" class="mr-3 h-4 w-6 rounded-sm object-cover" :alt="selectedAsalDisplay ? $t('lang_' + selectedAsalDisplay.kodeBahasa) : ''">
                  <span class="flex-grow text-left">{{ selectedAsalDisplay ? $t('lang_' + selectedAsalDisplay.kodeBahasa) : '' }}</span>
                  <svg class="h-5 w-5 text-[var(--color-outline)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 7.03 7.78a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.97-2.91a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
                </button>
              </div>

              <!-- Only show target language section when in /app - with smooth animation -->
              <Transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 max-h-0 -translate-y-2"
                enter-to-class="opacity-100 max-h-32 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 max-h-32 translate-y-0"
                leave-to-class="opacity-0 max-h-0 -translate-y-2"
              >
                <div v-if="isInApp" class="overflow-hidden">
                  <label class="block text-lg font-medium text-[var(--color-on-background)]">{{ $t('i_learn') }}</label>
                  <button @click="openLanguageList('target')" class="mt-2 flex w-full items-center rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container)] p-3 text-lg shadow-sm focus:ring-2 focus:ring-[var(--color-primary)]"
                  :style="{ color: 'var(--color-on-background)' }">
                    <img :src="languageStore.getFlagUrlByCode(selectedTargetDisplay?.kodeBahasa, '4x3')" class="mr-3 h-4 w-6 rounded-sm object-cover" :alt="selectedTargetDisplay ? $t('lang_' + selectedTargetDisplay.kodeBahasa) : ''">
                    <span class="flex-grow text-left">{{ selectedTargetDisplay ? $t('lang_' + selectedTargetDisplay.kodeBahasa) : '' }}</span>
                    <svg class="h-5 w-5 text-[var(--color-outline)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 7.03 7.78a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.97-2.91a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
                  </button>
                </div>
              </Transition>
            </div>
            
            <button @click="handleSimpan" class="mt-8 w-full rounded-xl px-4 py-3 text-lg font-bold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-inverse-primary)]"
            :style="{ backgroundColor: 'var(--color-primary)' }">
              {{ $t('save_and_close') }}
            </button>

            <TransitionRoot :show="isLanguageListOpen" as="template">
              <Dialog @close="closeLanguageList" class="relative z-[60]">
                <TransitionChild
                  as="template"
                  enter="duration-200 ease-out"
                  enter-from="opacity-0"
                  enter-to="opacity-100"
                  leave="duration-150 ease-in"
                  leave-from="opacity-100"
                  leave-to="opacity-0"
                >
                  <div class="fixed inset-0 bg-black/60" />
                </TransitionChild>

                  <div class="fixed inset-0 flex w-screen items-center justify-center p-4">
                    <TransitionChild
                      as="template"
                      enter="duration-200 ease-out"
                      enter-from="opacity-0 scale-95"
                      enter-to="opacity-100 scale-100"
                      leave="duration-150 ease-in"
                      leave-from="opacity-100 scale-100"
                      leave-to="opacity-0 scale-95"
                    >
                      <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-4xl p-6 text-left align-middle shadow-xl transition-all"
                      :style="{ backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-background)' }">
                        
                        <!-- Header Seragam -->
                        <div class="relative flex items-center justify-center mb-4">
                          <DialogTitle as="h3" class="text-xl font-bold leading-6 text-[var(--color-on-background)]">
                            {{ languageListTitle }}
                          </DialogTitle>
                          <button @click="closeLanguageList" class="absolute right-0 top-0 p-1 text-[var(--color-outline)] hover:text-[var(--color-on-background)] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <div class="mt-4 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar">
                          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 py-1">
                            <button
                              v-for="bahasa in currentLanguageOptions"
                              :key="bahasa.nama"
                              @click="selectLanguage(bahasa.nama)"
                              :class="[
                                'flex w-full items-center rounded-xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] border',
                                bahasa.nama === currentSelection
                                  ? 'bg-[var(--color-primary-container)] border-[var(--color-primary)] text-[var(--color-on-primary-container)]'
                                  : 'border-transparent hover:bg-[var(--color-surface-container)] text-[var(--color-on-background)]',
                                // Admin: redup jika bahasa tidak aktif
                                isAdmin && ((selectionMode === 'asal' && !bahasa.is_active_source) || (selectionMode === 'target' && !bahasa.is_active_target)) ? 'opacity-60' : ''
                              ]"
                            >
                                <img 
                                :src="languageStore.getFlagUrlByCode(bahasa.kodeBahasa, '4x3')" 
                                class="mr-3 h-5 w-7 flex-shrink-0 rounded-sm object-cover shadow-sm" 
                                :alt="$t('lang_' + bahasa.kodeBahasa)"
                              >
                              <div class="flex flex-col min-w-0 flex-1">
                                <span class="truncate font-medium text-base">{{ $t('lang_' + bahasa.kodeBahasa) }}</span>
                              </div>
                              
                              <span 
                                v-if="isAdmin && ((selectionMode === 'asal' && !bahasa.is_active_source) || (selectionMode === 'target' && !bahasa.is_active_target))"
                                class="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-wider"
                              >
                                Off
                              </span>
                              
                              <!-- Selected Checkmark -->
                              <svg v-if="bahasa.nama === currentSelection" class="ml-2 h-5 w-5 text-[var(--color-primary)]" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <!-- Footer / Batal Button -->
                        <div class="mt-6 pt-4 border-t border-[var(--color-outline-variant)]">
                          <button
                            type="button"
                            class="inline-flex w-full justify-center rounded-xl border border-[var(--color-outline)] px-4 py-3 text-base font-medium transition-colors hover:bg-[var(--color-surface-container)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                            @click="closeLanguageList"
                            :style="{ color: 'var(--color-on-background)' }"
                          >
                            {{ $t('cancel') }}
                          </button>
                        </div>
                      </DialogPanel>
                    </TransitionChild>
                  </div>
              </Dialog>
            </TransitionRoot>
            
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
